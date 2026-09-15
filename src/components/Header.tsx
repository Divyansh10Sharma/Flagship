import { motion, useReducedMotion } from "motion/react";
import Logo from "./Logo";
import ModeToggle, { type Mode } from "./ModeToggle";

type Props = {
  streak: number;
  email: string | null;
  onAuth: () => void;
  /** Only passed where switching is allowed — hidden mid-game. */
  mode?: Mode;
  onMode?: (m: Mode) => void;
};

export default function Header({ streak, email, onAuth, mode, onMode }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      data-app-header="true"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-5"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Logo size={24} />
        <span
          className={`display text-[19px] leading-none ${mode ? "hidden sm:inline" : ""}`}
          style={{ color: "var(--brass)", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          Flagship
        </span>
      </span>

      <div className="flex justify-center">
        {mode && onMode && <ModeToggle mode={mode} onChange={onMode} />}
      </div>

      <div className="flex items-center justify-end gap-2">
        {streak > 0 && (
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            /* Dark ink, not gold: the cartouche is a mid-tone brass plaque, so
               gold-on-gold all but disappears. Struck into the metal is both
               more legible and truer to how a real tag is engraved. */
            className="cartouche ledger flex h-9 items-center gap-1.5"
            style={{
              color: "#2b1d08",
              fontWeight: 700,
              textShadow: "0 1px 0 rgba(255,238,190,0.45)",
            }}
            title={`${streak} day streak`}
          >
            <span className="ledger" style={{ color: "inherit" }}>
              day
            </span>
            <span className="figures" style={{ fontWeight: 700 }}>
              {streak}
            </span>
          </motion.span>
        )}

        {/* Signed in, the brass medallion stands on its own; signed out it needs
            a label, since an empty frame gives no hint that it is the way in. */}
        {email ? (
          <button
            type="button"
            onClick={onAuth}
            className="block h-10 w-10 shrink-0"
            aria-label={`Signed in as ${email}`}
          >
            <img
              src="/avatar.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onAuth}
            className="btn btn-ghost h-9 px-3"
            aria-label="Sign in"
          >
            <span className="text-muted">Sign in</span>
          </button>
        )}
      </div>
    </motion.header>
  );
}
