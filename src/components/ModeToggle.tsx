import { motion, useReducedMotion } from "motion/react";

export type Mode = "flags" | "map";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "flags", label: "Flags" },
  { value: "map", label: "Map" },
];

type Props = { mode: Mode; onChange: (m: Mode) => void };

export default function ModeToggle({ mode, onChange }: Props) {
  const reduce = useReducedMotion();

  return (
    <div role="radiogroup" aria-label="Game mode" className="mode-toggle relative flex h-9 items-center p-[3px]">
      {OPTIONS.map((o) => {
        const on = o.value === mode;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className="ledger relative z-10 h-full min-w-[58px] px-3"
            style={{
              color: on ? "#2b1d08" : "var(--muted)",
              fontWeight: on ? 700 : 500,
              transition: "color 200ms",
            }}
          >
            {on && (
              <motion.span
                layoutId="mode-thumb"
                className="mode-thumb absolute inset-0 -z-10"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
