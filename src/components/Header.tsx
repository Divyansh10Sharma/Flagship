import { motion, useReducedMotion } from "motion/react";
import Logo from "./Logo";

type Props = {
  streak: number;
  email: string | null;
  onAuth: () => void;
};

export default function Header({ streak, email, onAuth }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      data-app-header="true"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between gap-3 py-5"
    >
      <span className="flex items-center gap-2.5">
        <Logo size={24} />
        <span
          className="display text-[19px] leading-none"
          style={{ color: "var(--brass)", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          Flagship
        </span>
      </span>

      <div className="flex items-center gap-2">
        {streak > 0 && (
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="ledger tabular flex h-9 items-center gap-1.5 px-3 text-brass"
            style={{
              background: "rgba(10,8,6,0.5)",
              border: "1px solid color-mix(in srgb, var(--gold) 34%, transparent)",
              boxShadow:
                "0 2px 6px rgba(0,0,0,0.5) inset, 0 1px 0 rgba(255,226,170,0.08)",
            }}
            title={`${streak} day streak`}
          >
            <span className="ledger" style={{ color: "inherit" }}>
              day
            </span>
            {streak}
          </motion.span>
        )}

        <button
          type="button"
          onClick={onAuth}
          className="btn btn-ghost h-9 min-w-9 px-3 text-[14px]"
          aria-label={email ? `Signed in as ${email}` : "Sign in"}
        >
          {email ? (
            <span
              className="fell flex h-6 w-6 items-center justify-center text-[14px] uppercase"
              style={{ background: "var(--brass)", color: "#2b1d08" }}
            >
              {email[0]}
            </span>
          ) : (
            <span className="text-muted">Sign in</span>
          )}
        </button>
      </div>
    </motion.header>
  );
}
