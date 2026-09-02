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
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="flex items-center justify-between gap-3 py-4"
    >
      <span className="expanded text-[22px] leading-none text-chalk">Flagship</span>

      <div className="flex items-center gap-2">
        {streak > 0 && (
          <span
            className="tabular flex h-9 items-center gap-1 rounded-full border border-edge bg-raise px-3 text-[14px] text-gold"
            title={`${streak} day streak`}
          >
            <span aria-hidden="true">🔥</span>
            {streak}
          </span>
        )}

        <button
          type="button"
          onClick={onAuth}
          className="flex h-9 min-w-9 items-center justify-center rounded-full border border-edge bg-raise px-3 text-[14px] text-muted"
          aria-label={email ? `Signed in as ${email}` : "Sign in"}
        >
          {email ? (
            <span className="text-chalk uppercase">{email[0]}</span>
          ) : (
            "Sign in"
          )}
        </button>
      </div>
    </motion.header>
  );
}
