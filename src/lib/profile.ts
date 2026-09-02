import { supabase } from "./supabase";

export type Profile = { id: string; username: string; avatar: string | null };

export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

/** Same rule as the check constraint, so bad input never reaches the network. */
export function usernameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < 3) return "At least 3 characters.";
  if (n.length > 24) return "24 characters at most.";
  if (!USERNAME_RE.test(n)) return "Letters, numbers, hyphens and underscores only.";
  return null;
}

/** True while the username is still the one derived from the account id. */
export const isDefaultUsername = (name: string) => /^player-[0-9a-f]{8,16}$/.test(name);

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as Profile) ?? null;
}

/** Goes through the security-definer RPC — a plain select can't see other
 *  people's rows, so it would call every name free. */
export async function checkUsername(candidate: string): Promise<boolean | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("username_available", {
    candidate: candidate.trim(),
  });
  if (error) return null;
  return Boolean(data);
}

export type SaveResult = { ok: true; username: string } | { ok: false; error: string };

export async function saveUsername(userId: string, name: string): Promise<SaveResult> {
  if (!supabase) return { ok: false, error: "Sign-in isn't set up on this build yet." };
  const problem = usernameProblem(name);
  if (problem) return { ok: false, error: problem };

  const username = name.trim();
  const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);

  if (error) {
    // 23505 = someone claimed it between the check and the save.
    if (error.code === "23505") return { ok: false, error: "That name was just taken." };
    if (error.code === "23514") return { ok: false, error: "That name has characters we can't use." };
    return { ok: false, error: "Couldn't save that right now." };
  }
  return { ok: true, username };
}
