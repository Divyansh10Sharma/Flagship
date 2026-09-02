import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { supabase } from "../lib/supabase";
import UsernameField from "./UsernameField";

type Props = {
  open: boolean;
  email: string | null;
  userId: string | null;
  username: string | null;
  onClose: () => void;
  onSignedIn: (userId: string) => void;
  onSignedOut: () => void;
  onUsernameSaved: (username: string) => void;
};

/** Supabase's own wording is written for developers ("Email signups are
 *  disabled", "Invalid login credentials"). A player should never read that. */
function friendlyAuthError(err: { code?: string; message?: string }): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();

  if (code === "email_provider_disabled" || code === "signup_disabled" || msg.includes("signups are disabled"))
    return "New accounts are turned off right now.";
  if (code === "invalid_credentials" || msg.includes("invalid login"))
    return "That email and password don't match.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
    return "That email already has an account. Sign in instead.";
  if (code === "weak_password" || msg.includes("password should be"))
    return "Use a password of at least 6 characters.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || msg.includes("rate limit"))
    return "Too many tries. Give it a minute.";
  if (code === "email_not_confirmed") return "Confirm your email address first.";
  if (code === "validation_failed" || msg.includes("unable to validate email"))
    return "Check the email address.";
  return "That didn't work. Try again in a moment.";
}

export default function AuthSheet({
  open,
  email,
  userId,
  username,
  onClose,
  onSignedIn,
  onSignedOut,
  onUsernameSaved,
}: Props) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Sign-in isn't set up on this build yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fn =
        mode === "in"
          ? supabase.auth.signInWithPassword({ email: value, password })
          : supabase.auth.signUp({ email: value, password });
      const { data, error: err } = await fn;
      if (err) {
        setError(friendlyAuthError(err));
        return;
      }
      // Sign-up returns a user but NO session when "Confirm email" is still on
      // in the Supabase dashboard. Keying off data.user would leave the header
      // showing an account while every write is rejected by row-level security.
      const id = data.session?.user?.id;
      if (!id) {
        setError("Check your inbox to confirm this address, then sign in.");
        return;
      }
      setValue("");
      setPassword("");
      onSignedIn(id);
      onClose();
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    onSignedOut();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(4,8,15,0.82)" }}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={email ? "Account" : "Sign in"}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="surface surface-lit fixed inset-x-4 top-1/2 z-50 mx-auto w-auto max-w-[440px] -translate-y-1/2 p-6 sm:inset-x-0"
          >
            {email ? (
              <>
                <p className="text-[17px] text-chalk">Signed in as {email}</p>
                <p className="mt-2 text-[15px] text-muted">
                  Your days sync to this account automatically.
                </p>

                {userId && username && (
                  <div className="mt-6 border-t border-edge pt-5">
                    <UsernameField
                      userId={userId}
                      username={username}
                      onSaved={onUsernameSaved}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={signOut}
                  className="btn btn-ghost mt-6 h-12 w-full text-[15px]"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn mt-2 h-12 w-full text-[15px] text-muted hover:text-chalk"
                >
                  Close
                </button>
              </>
            ) : (
              <form onSubmit={submit}>
                <h2 className="expanded text-[26px] leading-none">
                  {mode === "in" ? "Sign in" : "Create account"}
                </h2>
                <p className="mt-2 text-[15px] text-muted">
                  Your streak follows you to any device.
                </p>

                <input
                  type="email"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  className="field mt-5 h-12 w-full px-3 placeholder:text-muted"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                  className="field mt-2 h-12 w-full px-3 placeholder:text-muted"
                />

                {error && <p className="mt-3 text-[14px] text-miss">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-accent mt-5 h-12 w-full text-[15px]"
                >
                  {busy ? "One moment" : mode === "in" ? "Sign in" : "Create account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "in" ? "up" : "in");
                    setError("");
                  }}
                  className="btn mt-2 h-12 w-full text-[15px] text-muted hover:text-chalk"
                >
                  {mode === "in" ? "Create an account instead" : "I already have an account"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
