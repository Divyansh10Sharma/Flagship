import { useEffect, useRef, useState } from "react";
import {
  checkUsername,
  isDefaultUsername,
  saveUsername,
  usernameProblem,
} from "../lib/profile";

type Props = {
  userId: string;
  username: string;
  onSaved: (username: string) => void;
};

type Check =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "taken" }
  | { kind: "invalid"; why: string }
  | { kind: "unreachable" };

export default function UsernameField({ userId, username, onSaved }: Props) {
  const [value, setValue] = useState(username);
  const [check, setCheck] = useState<Check>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const token = useRef(0);

  useEffect(() => setValue(username), [username]);

  const trimmed = value.trim();
  const unchanged = trimmed.toLowerCase() === username.toLowerCase();

  // Any edit invalidates the previous verdict.
  function edit(next: string) {
    setValue(next);
    setCheck({ kind: "idle" });
    setError("");
    setSaved(false);
    token.current++;
  }

  async function runCheck() {
    const problem = usernameProblem(trimmed);
    if (problem) {
      setCheck({ kind: "invalid", why: problem });
      return;
    }
    if (unchanged) {
      setCheck({ kind: "free" });
      return;
    }
    const mine = ++token.current;
    setCheck({ kind: "checking" });
    const free = await checkUsername(trimmed);
    if (mine !== token.current) return; // they kept typing
    if (free === null) setCheck({ kind: "unreachable" });
    else setCheck({ kind: free ? "free" : "taken" });
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await saveUsername(userId, trimmed);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      setCheck({ kind: "idle" });
      return;
    }
    setSaved(true);
    setCheck({ kind: "idle" });
    onSaved(res.username);
  }

  const verdict = () => {
    switch (check.kind) {
      case "checking":
        return <span style={{ color: "var(--sepia-soft)" }}>Checking…</span>;
      case "free":
        return (
          <span className="text-hit">
            {unchanged ? "This is your name." : `${trimmed} is free.`}
          </span>
        );
      case "taken":
        return <span className="text-miss">{trimmed} is taken.</span>;
      case "invalid":
        return <span style={{ color: "var(--sepia-soft)" }}>{check.why}</span>;
      case "unreachable":
        return <span style={{ color: "var(--sepia-soft)" }}>Couldn't check just now.</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <label htmlFor="username" className="ledger" style={{ color: "var(--sepia-soft)" }}>
        Your name on the leaderboard
      </label>

      <div className="mt-2 flex gap-2">
        <input
          id="username"
          value={value}
          onChange={(e) => edit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runCheck();
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={24}
          className="field h-12 min-w-0 flex-1 px-3 placeholder:text-muted"
          placeholder="pick a name"
        />
        <button
          type="button"
          onClick={runCheck}
          disabled={check.kind === "checking" || !trimmed}
          className="btn btn-ghost h-12 shrink-0 px-4 text-[15px]"
        >
          Check
        </button>
      </div>

      <p className="mt-2 min-h-[20px] text-[14px]" aria-live="polite">
        {error ? <span className="text-miss">{error}</span> : saved ? (
          <span className="text-hit">Saved.</span>
        ) : (
          verdict()
        )}
      </p>

      {isDefaultUsername(username) && check.kind === "idle" && !saved && (
        <p className="text-[14px]" style={{ color: "var(--sepia-soft)" }}>
          You're using the name we generated. Pick your own so people know you.
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || unchanged || check.kind !== "free"}
        className="btn btn-accent mt-3 h-12 w-full text-[15px]"
      >
        {saving ? "One moment" : "Save name"}
      </button>
    </div>
  );
}
