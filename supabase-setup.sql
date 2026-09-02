-- Flagship — run once in the Supabase SQL editor.
-- Then: Authentication -> Sign In / Providers -> Email -> turn OFF "Confirm email".

-- ---------------------------------------------------------------- tables ----

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null,
  -- Unused for now. Plain text so it can later hold a country code ("IN"), an
  -- emoji, or a storage URL without another migration.
  avatar text,
  created_at timestamptz default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_-]{3,24}$')
);

-- Case-insensitive uniqueness: "Mira" and "mira" must not both exist.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create table if not exists public.daily_results (
  user_id uuid not null references auth.users on delete cascade,
  play_date date not null,
  base_score int not null,
  multiplier numeric(3,2) not null default 1,
  final_score int not null,
  rounds jsonb not null,
  created_at timestamptz default now(),
  primary key (user_id, play_date)
);

alter table public.profiles enable row level security;
alter table public.daily_results enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own results" on public.daily_results;
create policy "own results" on public.daily_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------ profile on signup ----
-- Default username is derived from the account id, so it is unique on day one
-- and the player can rename later. Never derived from the email address — that
-- would publish part of everyone's address on a public leaderboard.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  short text := substr(replace(new.id::text, '-', ''), 1, 8);
begin
  begin
    insert into public.profiles (id, username) values (new.id, 'player-' || short);
  exception when unique_violation then
    -- 8 hex chars colliding is vanishingly rare, but it must not break signup.
    insert into public.profiles (id, username)
    values (new.id, 'player-' || substr(replace(new.id::text, '-', ''), 1, 16))
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill anyone who signed up before this ran
insert into public.profiles (id, username)
select id, 'player-' || substr(replace(id::text, '-', ''), 1, 8)
from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------- username checking ----
-- Security definer on purpose. The "own profile" policy above means a client
-- SELECT can never see anyone else's row, so every name would look free. This
-- leaks a single boolean and nothing else.

create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    trim(candidate) ~ '^[a-zA-Z0-9_-]{3,24}$'
    and not exists (
      select 1 from public.profiles where lower(username) = lower(trim(candidate))
    );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ----------------------------------------------------------- leaderboards ----
-- Also security definer: the RLS policies restrict daily_results to its owner,
-- which is right for the game but makes a leaderboard impossible. These views
-- expose only the columns below — never anyone's round-by-round history.

create or replace view public.leaderboard
with (security_invoker = false)
as
with runs as (
  select
    user_id,
    play_date,
    -- consecutive days collapse to a constant, so each run gets its own group
    play_date - (row_number() over (partition by user_id order by play_date))::int as grp
  from public.daily_results
),
streaks as (
  select user_id, grp, count(*)::int as len, max(play_date) as ends
  from runs
  group by user_id, grp
),
agg as (
  select
    user_id,
    -- current_date is UTC; the 2-day window keeps a live streak from reading as
    -- broken for players whose local day is ahead of it.
    coalesce(max(len) filter (where ends >= current_date - 1), 0) as current_streak,
    coalesce(max(len), 0) as longest_streak
  from streaks
  group by user_id
),
totals as (
  select
    user_id,
    sum(final_score)::int as total_points,
    count(*)::int as days_played,
    max(play_date) as last_played
  from public.daily_results
  group by user_id
)
select
  p.id                          as user_id,
  p.username,
  p.avatar,
  coalesce(t.total_points, 0)   as total_points,
  coalesce(t.days_played, 0)    as days_played,
  coalesce(a.current_streak, 0) as current_streak,
  coalesce(a.longest_streak, 0) as longest_streak,
  t.last_played
from public.profiles p
left join totals t on t.user_id = p.id
left join agg    a on a.user_id = p.id;

create or replace view public.daily_leaderboard
with (security_invoker = false)
as
select
  d.play_date,
  d.user_id,
  p.username,
  p.avatar,
  d.base_score,
  d.multiplier,
  d.final_score
from public.daily_results d
join public.profiles p on p.id = d.user_id;

grant select on public.leaderboard to anon, authenticated;
grant select on public.daily_leaderboard to anon, authenticated;
