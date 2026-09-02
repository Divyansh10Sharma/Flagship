import { motion, useReducedMotion } from "motion/react";

type Props = {
  streak: number;
  email: string | null;
  onAuth: () => void;
};

export default function Header({ streak, email, onAuth }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between gap-3 py-5"
    >
      <span className="expanded relative text-[22px] leading-none">
        <span className="ink-gradient">Flagship</span>
        <span
          className="absolute -bottom-1.5 left-0 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--iris), var(--azure) 60%, transparent)",
          }}
          aria-hidden="true"
        />
      </span>

      <div className="flex items-center gap-2">
        {streak > 0 && (
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="tabular flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] text-gold"
            style={{
              background: "color-mix(in srgb, var(--gold) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
            }}
            title={`${streak} day streak`}
          >
            <span aria-hidden="true" className="text-[13px]">
              🔥
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
              className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium uppercase text-chalk"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--iris), var(--azure))",
              }}
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
