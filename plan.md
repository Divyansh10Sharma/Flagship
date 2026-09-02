# Flagship — build plan

A daily flag-guessing game. Build this exactly as specified. Everything you need is here.

---

## 0. Rules for you, the agent

- **Do not ask clarifying questions.** If something is unspecified, pick the obvious option and list your choices at the end.
- Build in the phase order in §9. Get each phase running before starting the next.
- No test suite, no Storybook, no README, no CI, no Docker. This is a weekend project.
- No component library. No shadcn init. No GSAP, no Spline, no Aceternity. The only animation dependency is `motion`.
- One file per component, colocated styles via Tailwind classes. Don't split into `ui/` primitives.
- Don't run `npm run build` repeatedly to check your work. Run `npm run dev` once and keep it running.
- Don't refactor code you just wrote. Write it correctly the first time.
- Type things loosely where it saves time. `any` is acceptable in glue code.

---

## 1. What this is

Player opens the site, hits **Play today**. They get three flags, one at a time. Under each flag is a search field: tapping it reveals every country in the world as a scrollable list, and typing filters it down. You pick from the list — there are no multiple-choice options, so there's no guessing by elimination. Three attempts per flag.

- Correct on attempt 1 → **5 points**
- Correct on attempt 2 → **3 points**
- Correct on attempt 3 → **1 point**
- Out of attempts → **0 points**

After each flag resolves (win or lose), the country is revealed with one fact and the flag shown large. After three flags: today's total, the streak, the multiplier that was applied, and a recap of all three countries with their facts.

Everyone playing on the same date gets the **same three flags** — the selection is seeded by date. This makes streaks and scores mean something and stops people rerolling by refreshing.

The three flags ramp in difficulty: a widely-known country first, then a mid-tier one, then something genuinely hard. See §5.

Because there's no option list to work backwards from, each miss unlocks a hint: after the first wrong guess the region appears, after the second the capital's first letter. Without this, tier-3 flags are a wall and people quit on round 3.

One play per day. Coming back the same day shows the completed results screen, not a new game.

The name is **Flagship**, set as the wordmark in the header, the `<title>`, and the `name` field in `package.json`. Write it as one word, capital F, no tagline underneath it — the game explains itself in three seconds and a tagline would just be filler.

**Refreshing mid-game never loses progress.** Not at the flag boundary, not mid-guess, not during a reveal. See §6.

---

## 2. Stack

- **Vite + React 18 + TypeScript** — not Next.js. This app has no server needs; SSR auth would cost an hour for nothing.
- **Tailwind CSS v4** via `@tailwindcss/vite` (`@import "tailwindcss";` in `index.css` — there is no `tailwind.config.js` in v4, theme tokens go in CSS via `@theme`).
- **motion** (`npm i motion`, import from `motion/react`).
- **canvas-confetti** for the correct-answer burst.
- **@supabase/supabase-js** for auth + database.
- Deploy target: Vercel or Netlify, static build.

```bash
npm create vite@latest flagship -- --template react-ts
cd flagship
npm i motion canvas-confetti @supabase/supabase-js
npm i -D tailwindcss @tailwindcss/vite @types/canvas-confetti
```

---

## 3. Country data — generate it once, at build time

**Do not call any API at runtime.** Write `scripts/fetch-countries.mjs`, run it once with `node scripts/fetch-countries.mjs`, and commit the output to `src/data/countries.json`. The game then works instantly with zero network calls and zero rate limits.

### Critical API detail

`restcountries.com/v3.1/all` **returns 400 unless you pass `?fields=`**, and it accepts **a maximum of 10 fields per request**. So make two requests and merge on `cca2`:

```
https://restcountries.com/v3.1/all?fields=name,cca2,capital,region,subregion,population,area,flags,coatOfArms,independent

https://restcountries.com/v3.1/all?fields=cca2,languages,currencies,borders,timezones,tld,car,unMember,landlocked,continents
```

If either request fails, print the status and body and stop — don't fall back to partial data.

### Output shape

Write an array of:

```ts
{
  code: string;        // cca2, uppercase, e.g. "IN"
  name: string;        // name.common
  capital: string | null;
  region: string;
  subregion: string | null;
  population: number;
  area: number;
  flagPng: string;     // flags.png  (this is already a flagcdn.com URL — free, no key)
  flagSvg: string;     // flags.svg
  coatOfArms: string | null;  // coatOfArms.svg — may be missing, handle null
  languages: string[]; // Object.values(languages)
  currency: string | null;    // first currency's name
  currencySymbol: string | null;
  borders: number;     // borders?.length ?? 0
  landlocked: boolean;
  drivingSide: string; // car.side
  tld: string | null;  // tld[0]
  tier: 1 | 2 | 3;     // difficulty, computed — see below
  searchKey: string;   // lowercased, accent-stripped name — see §7
}
```

### The pool is all 195

`unMember === true` gives you the 193 UN member states. Add the two permanent observers by code — Vatican City (`VA`) and Palestine (`PS`) — and you have exactly 195:

```js
const keep = c => c.unMember === true || c.cca2 === "VA" || c.cca2 === "PS";
```

No population floor. Every flag is in play.

### Difficulty tier

Assign from population, since recognisability tracks it closely enough and costs nothing:

- `tier 1` — population ≥ 20,000,000 (roughly 90 countries)
- `tier 2` — 5,000,000 to 20,000,000 (roughly 55)
- `tier 3` — under 5,000,000 (roughly 50)

Log the count per tier when the script runs. If any tier has fewer than 30 countries, the buckets are wrong — check the filter before continuing.

Sort by `code` so the file is stable in git.

---

## 4. Facts

`src/lib/facts.ts` — a pure function `factFor(country): string`. No API, no LLM. Pick one template deterministically from the country code hash so a country always tells you the same fact:

1. `${capital} is the capital, and about ${formatPop(population)} people live in ${name}.`
2. `${name} covers ${formatArea(area)} km² of ${subregion}.`
3. Languages: 1 → `Everyone here speaks ${lang}.` / 2–3 → `${a}, ${b} and ${c} are all official here.`
4. `Money here is the ${currency}${symbol ? ` (${symbol})` : ""}.`
5. Borders: `0 && !landlocked` → `${name} is surrounded by water — no land borders at all.` / `landlocked` → `${name} is landlocked, hemmed in by ${borders} neighbours.` / else → `${name} shares a land border with ${borders} countries.`
6. `They drive on the ${drivingSide} here, and websites end in ${tld}.`

Skip any template whose data is null and fall through to the next. Template 1 is the guaranteed fallback.

`formatPop`: 1.4B / 230M / 5.4M / 800K. `formatArea`: thousands separators with Indian-agnostic `toLocaleString("en-US")`.

The **image** shown with each fact is the large flag (`flagSvg`) plus the coat of arms beside it when `coatOfArms` is non-null.

---

## 5. Game logic — pure functions, no React

### `src/lib/date.ts`
`todayKey()` → local-time `YYYY-MM-DD` (**not** `toISOString()`, that's UTC and will roll the day over at 5:30am for Indian players). `daysBetween(a, b)`.

### `src/lib/daily.ts`
Seeded PRNG so the day's flags are fixed:

```ts
function hashString(s: string): number   // FNV-1a or similar, returns uint32
function mulberry32(seed: number): () => number
```

`getDailyRounds(dateKey: string)` returns three country codes:
- Seed with `hashString(dateKey)`.
- Round 1 is a random tier-1 country, round 2 a tier-2, round 3 a tier-3. Difficulty ramps across the day.
- Return `string[]` — just the three codes. No option lists, no distractors; the player picks from all 195 every time.

Same date in, same output out, every time, on every device.

### `src/lib/scoring.ts`
```ts
POINTS_BY_ATTEMPT = [5, 3, 1]      // index = attempt number - 1
multiplierFor(streak: number): number
```
Streak here **includes today**:

| Streak | Multiplier |
|---|---|
| 1 | 1.0× |
| 2–3 | 1.1× |
| 4–6 | 1.25× |
| 7–13 | 1.5× |
| 14–29 | 1.75× |
| 30+ | 2.0× |

`finalScore = Math.round(base * multiplier)`. Max base is 15, so a 30-day streak day caps at 30.

### `src/lib/streak.ts`
```ts
computeStreak(playedDates: string[], today: string): number
```
Sort descending, walk backwards from `today` (or from yesterday if today isn't played yet), counting consecutive days, stop at the first gap. **Always recompute from the full list of played dates** — never store an incrementing counter. This makes the guest→account merge in §7 correct for free.

---

## 6. Storage

### Guest (localStorage)

Single key `flagship:v1`:

```ts
{
  version: 1,
  days: { [dateKey: string]: DayResult },
  inProgress: InProgress | null,   // survives refresh mid-game
  syncedDates: string[]            // which days are confirmed written to Supabase
}
```

```ts
type RoundResult = { code: string; attempts: number; points: number; solved: boolean };
type DayResult = { date: string; rounds: RoundResult[]; base: number; multiplier: number; final: number };
type InProgress = {
  date: string;
  roundIndex: 0 | 1 | 2;
  phase: "guessing" | "revealed";  // so a refresh during a reveal returns to the reveal
  wrongGuesses: string[][];        // per round, country codes already guessed wrong
  results: RoundResult[];          // rounds finished so far
};
```

Streak, total points and longest streak are **derived** from `days`, never stored.

### Resume rules — get these exactly right

- Write `inProgress` **after every single guess**, right or wrong, and again on every phase change. Not once per round. Someone who closes the tab after their second wrong guess on flag 2 comes back to flag 2 with both wrong countries still struck out, both hints still showing, and one attempt left.
- Also write on the `visibilitychange` event when the page becomes hidden. Mobile browsers kill backgrounded tabs without warning.
- On load: if `inProgress` exists and `inProgress.date === todayKey()`, restore straight into the game — skip the home screen entirely and go to that round, that phase, with those lockouts. If the date doesn't match, discard it silently.
- The rounds themselves are never stored, only the round *index*. They're regenerated from the date seed, which is why the seeding in §5 has to be deterministic.
- Clear `inProgress` when the day completes and `days[date]` is written.

Wrap all reads in try/catch — corrupt JSON must reset to an empty state, not white-screen the app. If `version` isn't 1, wipe and start fresh.

### Logged in (Supabase)

Run this once in the Supabase SQL editor:

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

create table public.daily_results (
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

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own results" on public.daily_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Auth: email + password.** In Supabase → Authentication → Sign In / Providers, turn **off** "Confirm email". No SMTP setup, no OAuth console, works in every browser instantly. Google sign-in is a later addition, not part of this build.

### Sync rules

- On app load: read localStorage always. If there's a session, also `select *` from `daily_results` and merge.
- **Merge = union by date.** If a date exists in both, the higher `final_score` wins. Then `upsert` any local-only days to Supabase, and write the merged set back to localStorage.
- Streak is recomputed from the merged date list. Someone who played 5 days as a guest and then signs in keeps their 5-day streak. This is the whole point of the merge — get it right.
- On finishing a day: **write localStorage first, then** upsert to Supabase if signed in. Never block the results screen on a network call. On success, push the date into `syncedDates`.
- Anything in `days` that isn't in `syncedDates` is pending. Flush all pending days on: app load with a session, sign-in, and the window `online` event. This is the whole retry mechanism — no queue library, no exponential backoff.
- localStorage is always the source of truth for the UI. Supabase is a backup that catches up when it can. The player should never be able to tell the difference.
- On sign-out: keep localStorage as-is.

---

## 7. Screens

Single-page, state machine in `App.tsx`: `home | playing | results`.

**Header** — wordmark left; streak pill (`🔥 6`) and either "Sign in" or the user's email initial, right.

**Home** — the hero is a large flag, slowly cross-fading between random flags on a 2.5s interval, with the game name and a single **Play today** button. Below: today's date, your streak and current multiplier, lifetime points. If today is already played, the button reads **See today's results** instead.

**Round** — `Flag 2 of 3` progress, three attempt dots that fill in red as you miss, the flag card, and the country picker below it. Wrong pick: the card shakes, that country is struck out in the list, a hint appears. Correct pick: card flips to the reveal.

### The country picker

This is the main interaction in the game. Build it properly. `src/components/CountryPicker.tsx`.

**Behaviour**

- Closed state: a full-width field reading `Which country?` with a small chevron. It is a real `<input readOnly>`-looking button, not a native `<select>` — native selects can't be styled and look wrong on Android.
- Tapping or focusing it opens the list showing **all 195 countries**, alphabetical, each row a flagless country name (no flag thumbnails — that would give the answer away). Scrollable.
- Typing filters live. No debounce; 195 rows is nothing.
- Selecting a row submits that guess immediately. No separate confirm button — a second tap is a second chance to lose your nerve, and it costs a tap on mobile.
- Already-guessed countries stay in the list but are struck through, dimmed to 40%, and unselectable. They're not removed — seeing your wrong guesses is part of the game.
- Escape closes. Clicking outside closes. Closing without picking costs nothing.

**Filtering**

Match against a normalised key: lowercase, strip diacritics with `s.normalize("NFD").replace(/\p{Diacritic}/gu, "")`, strip apostrophes, hyphens and periods. Precompute this as `searchKey` in the data file so it's not recomputed on every keystroke. Do the same normalisation to the query.

Rank results: names *starting with* the query first, then names *containing* it, each group alphabetical. Typing "in" should put India and Indonesia above Argentina.

Ship an alias map (`src/lib/aliases.ts`) so people can type what they actually say. At minimum:

```
usa, us, america → United States      uk, britain, england → United Kingdom
uae, emirates → United Arab Emirates  holland → Netherlands
south korea → Korea (South)*          north korea → Korea (North)*
burma → Myanmar                       swaziland → Eswatini
ivory coast → Côte d'Ivoire           turkey → Türkiye
czech republic → Czechia              cape verde → Cabo Verde
macedonia → North Macedonia           vatican → Vatican City
drc, congo kinshasa → DR Congo        east timor → Timor-Leste
```

*Check what REST Countries actually returns as `name.common` for the Koreas and DR Congo and alias to that exact string — don't assume.

Aliases match on prefix too, so typing "ame" surfaces United States.

Empty results state: `No country matches "xyz"` in `--muted`. Not an error, no icon.

**Layout — this differs by screen size and it matters**

Desktop (≥640px): a dropdown panel anchored under the field, `max-height: 340px`, scrolls internally, 1px `--edge` border, `--raise` background. The flag stays visible above it.

Mobile (<640px): a bottom sheet that animates up from the bottom edge and covers roughly the lower 60% of the viewport, with the search input pinned at its top and the list scrolling below. **The flag card must stay visible above the sheet** — shrink the flag to about 60% of its size when the sheet is open, animated over 200ms. A player who can't see the flag while typing is playing from memory, which is a different and worse game. Test this with the on-screen keyboard actually open, on a real phone, not just a narrow desktop window.

**Keyboard** — arrow keys move a highlighted row, Enter selects it, the highlight scrolls into view with `block: "nearest"`. `role="combobox"` on the input, `role="listbox"` on the list, `role="option"` and `aria-selected` on rows, visible focus ring throughout.

**Performance** — render all 195 rows plainly. No virtualisation, no `react-window`. It's a 200-item list; anything else is wasted time.

### Hints

Below the attempt dots, revealed on miss. Both are plain sentences in `--muted`, fading in over 200ms:

- After miss 1: `It's in ${region}.` (use `subregion` when present — "Southeast Asia" is a better hint than "Asia", and more interesting.)
- After miss 2: `The capital starts with "${capital[0]}".` If `capital` is null, fall back to `It's ${landlocked ? "landlocked" : "on the coast"}.`

Hints persist through a refresh — they're derived from `wrongGuesses.length`, so nothing extra needs storing.

**Reveal** (in place, not a new screen) — country name large, the fact, coat of arms if present, points earned this round, and a **Next flag** button (**See results** on the third).

**Results** — total for the day with the base and multiplier shown separately (`11 × 1.25 = 14`), streak, then all three countries as cards with flag, fact and points. If the player is a guest, a persistent panel: *"Your streak is saved on this device. Sign in and it follows you everywhere."* with Sign in / Create account. If signed in, nothing.

**Auth sheet** — a modal, email + password, toggle between sign in and sign up, one error line. On success, run the merge and close.

### Connection status pill

A `position: fixed` pill at the bottom of the screen, centred, above the safe-area inset. It's the only chrome that persists across all three screens. `src/components/SyncStatus.tsx` plus a `useSyncStatus()` hook.

States, driven by `navigator.onLine`, the window `online`/`offline` events, and the pending-days count from §6:

| State | When | Text | Colour |
|---|---|---|---|
| `hidden` | Online, nothing pending, or 3s after `synced` | — renders nothing | — |
| `offline` | `navigator.onLine === false` | Waiting for connection. Your progress is safe on this device. | `--gold` |
| `pending` | Online, signed in, days waiting to sync | Catching up… | `--gold` |
| `syncing` | An upsert is in flight | Saving to your account | `--muted` |
| `synced` | Upsert succeeded | Saved to your account | `--hit` |
| `failed` | Upsert threw | Couldn't reach the server. Your progress is safe here and will sync later. | `--muted` |
| `guest` | No session, day just completed | Saved on this device. Sign in to keep it anywhere. | `--muted` |

Animation:
- The pill slides up 12px and fades in on appear, reverses on exit. Use Motion's `AnimatePresence` with `mode="wait"` so text swaps cross-fade instead of jumping.
- `offline`, `pending` and `syncing` get three trailing dots that pulse opacity 0.25 → 1 on a 1.2s loop, staggered 0.15s apart. This is the "animated text" — a looping dot cycle reads as *working on it*, a spinner reads as *blocked*.
- The pill itself breathes on `offline`: border colour oscillates between `--edge` and `--gold` over 2s. Nothing else moves.
- `synced` shows for 3 seconds then auto-hides. `offline` and `failed` stay until the state actually changes.
- Under `prefers-reduced-motion`, the pill appears and disappears with no transition and the dots are static.

The tone matters here. The pill is reassurance, not an error. Never the word "error", never "failed", never an exclamation mark. The player should read it and stop worrying.

To test it: DevTools → Network → Offline, finish a game, watch the pill, go back online, watch it flush.

---

## 8. Design direction

Follow this. Don't substitute your own.

**The one bold move:** on reveal, the flag's own colours flood the screen. Render the same flag image behind the card at `scale(1.8) blur(70px) opacity(0.45)`, cross-fading in over 500ms. Zero computation, and every reveal looks different because every flag is different. While the player is still guessing, the background stays neutral — a blurred colour wash would leak the answer.

Everything else stays quiet and flat. Flags are flat saturated colour fields, so the UI must not compete: no soft drop shadows, no glassmorphism, no gradient decoration.

**Palette** (CSS custom properties in `@theme`):
```
--slate:  #141821   page
--raise:  #1E2430   cards, buttons
--edge:   #2C3444   1px borders
--chalk:  #EDEFF3   text
--muted:  #8A93A6   secondary text
--hit:    #35D07F   correct
--miss:   #F04E56   wrong
--gold:   #F5C542   points and streak
```

**Type:** one family — **Archivo** from Google Fonts (weights 400, 500, 700 + the Expanded width for display). Country names and score numbers set in Archivo Expanded 700 at large sizes; that treatment *is* the design. Body at 400/16px, `--muted` for secondary. Sentence case everywhere. No all-caps labels, no tracked-out eyebrows above headings, no `→` glued to button text.

**Shape:** 14px radius on cards, 10px on buttons, full round on the streak pill and attempt dots. Flag images get 6px radius and a 1px `--edge` border — real flags have no rounded corners, so keep it subtle.

**Motion** — four moments only:
1. Page load: header, then hero, then button, 60ms apart, fade + 8px rise. Once.
2. Wrong answer: 300ms horizontal shake on the flag card, button dims to 40% and locks.
3. Correct answer: card flips on Y, confetti burst, colour flood in.
4. Score counting up on the results screen, ~800ms.

No hover-lift on every card. No scroll-triggered reveals. Wrap all of it in `prefers-reduced-motion` — under reduced motion, states change instantly and the colour flood appears without the fade.

**Mobile first.** Design at 380px, then let it breathe up to a 560px max-width column on desktop. This gets played on phones. Tap targets ≥ 48px, and picker rows ≥ 44px tall so a scrolling thumb doesn't misfire a guess. Long names like "Bosnia and Herzegovina" and "Saint Vincent and the Grenadines" must wrap to two lines rather than truncate or drop below 14px.

**Copy:** plain and short. "Play today", not "Begin Your Journey". On a miss: "It was Peru." not "Sorry! The correct answer was Peru!" Empty streak reads "Play today to start a streak."

---

## 9. Build order

**Phase 1 — Scaffold (10 min).** Vite app, Tailwind v4 wired, Archivo loaded, palette tokens in `index.css`, `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Blank page with the right background colour. Stop and confirm dev server runs.

**Phase 2 — Data (10 min).** `scripts/fetch-countries.mjs`, run it, verify `countries.json` has ~180 entries and that `flagPng` URLs load in a browser. Write `facts.ts` and log 10 sample facts to check they read like sentences.

**Phase 3 — Logic (15 min).** `date.ts`, `daily.ts`, `scoring.ts`, `streak.ts`, `storage.ts` (guest half only). No UI. Sanity check: `getDailyRounds("2026-09-02")` returns identical output across three calls.

**Phase 4 — Game UI (35 min).** Home → Round → Reveal → Results, guest-only, no auth. Fully playable end to end with a plain unstyled picker. This is the milestone that matters — if you're running long, everything after this is optional.

**Phase 5 — Country picker (25 min).** Filtering, aliases, ranking, keyboard nav, struck-out guesses, the desktop dropdown vs mobile sheet split, hints. Build this against a real phone viewport with the keyboard open.

**Phase 6 — Resume (10 min).** `inProgress` written after every guess and on `visibilitychange`, restored on load. Test by hard-refreshing at four different points: mid-round-1, after a wrong guess, during a reveal, and after round 3 but before the results render.

**Phase 7 — Auth + sync (20 min).** Supabase client, auth sheet, session listener, merge on sign-in, upsert on completion, pending-day flush.

**Phase 8 — Connection status (15 min).** `useSyncStatus`, the pill, the dot animation. Test offline in DevTools.

**Phase 9 — Polish (15 min).** The four motion moments, confetti, colour flood, reduced-motion, 380px pass, favicon + page title.

---

## 10. What the human needs to do

1. Create a project at supabase.com (free tier).
2. Settings → API → copy Project URL and `anon` public key into `.env.local`.
3. SQL Editor → paste and run the block in §6.
4. Authentication → Providers → Email → turn **off** "Confirm email".

---

## 11. Deploying to Vercel

The app is a static bundle. The browser talks to Supabase directly over HTTPS. There is no server, no API route, no serverless function, and therefore nothing that can go wrong between Vercel and the database — they never talk to each other.

Set up:

- Import the repo, framework preset **Vite**, build `npm run build`, output `dist`. Defaults are correct.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Settings → Environment Variables, for all three environments. **Vite inlines env vars at build time**, so adding them after a deploy does nothing until you redeploy.
- Only `VITE_`-prefixed vars reach the browser. Anything else is silently undefined in production and you'll get a blank page with `supabaseUrl is required` in the console.
- Vite is SPA-only; since this app has a single route and no client-side router, you don't need a rewrite rule. If you add routes later, you will.

Things worth knowing:

- **The anon key is meant to be public.** It ships in your JS bundle and that's fine — row-level security is what protects the data, which is why the policies in §6 are not optional. Never put the `service_role` key anywhere near this project.
- **CORS is already handled.** Supabase allows browser requests from any origin by default. No configuration needed for a new Vercel domain.
- **Free Supabase projects pause after 7 days with no database requests.** This is the one that will catch you. If nobody plays for a week, the project goes offline and stays offline until you click resume in the dashboard. The data isn't lost, but signed-in users get errors until you notice. Two mitigations: the app degrades gracefully (localStorage keeps working, the pill says waiting for connection, nothing crashes), and if you want it always-on, hit the database with anything once every few days — a free cron-job.org ping to a trivial endpoint is enough.
- Free tier is 500MB of database and 5GB of egress a month. This app stores a few hundred bytes per player per day. You will not get close.
- Add the Vercel domain under Supabase → Authentication → URL Configuration only if you later add Google sign-in or magic links. Email + password doesn't redirect, so it doesn't care what domain you're on.

## 12. Done when

- [ ] Three flags, three attempts, 5/3/1/0 scoring works.
- [ ] All 195 flags are in the pool, and difficulty ramps easy → medium → hard within a day.
- [ ] Picker opens showing all 195, filters as you type, and typing "usa", "uk", "holland" or "cote divoire" finds the right country.
- [ ] Typing "in" ranks India and Indonesia above Argentina.
- [ ] Wrong guesses stay visible in the list, struck out and unselectable.
- [ ] Hints appear after miss 1 and miss 2 and survive a refresh.
- [ ] On a real phone with the keyboard open, the flag is still visible while typing.
- [ ] Arrow keys + Enter work end to end without touching the mouse.
- [ ] Hard-refresh mid-round-1 → same flag, same state.
- [ ] Hard-refresh after two wrong guesses → both still struck out, both hints showing, one attempt left.
- [ ] Hard-refresh during a reveal → back to the reveal, not the next flag.
- [ ] Same three flags on two different browsers on the same date.
- [ ] Replaying the same day shows results, not a new game.
- [ ] Streak and multiplier correct across a simulated multi-day history (seed localStorage by hand to test).
- [ ] Play as guest → sign up → guest days and streak carry into the account.
- [ ] Sign in on a second browser → history and streak are there.
- [ ] Offline: finish a game with the network disabled. No crash, no error, pill says waiting for connection, score still shows. Re-enable the network and it syncs without a refresh.
- [ ] Works at 380px wide with no horizontal scroll.
- [ ] `prefers-reduced-motion: reduce` kills every animation.

## 13. Out of scope

Leaderboards, friends, sharing cards, hard mode, past-day replay, profile editing, Google sign-in, PWA, dark/light toggle (it's dark, that's it).
