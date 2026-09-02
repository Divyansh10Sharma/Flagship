import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SyncState } from "../hooks/useSyncStatus";

const COPY: Record<Exclude<SyncState, "hidden">, string> = {
  // No full stop on the three dotted states — the animated dots finish them.
  offline: "Waiting for connection. Your progress is safe on this device",
  pending: "Catching up",
  syncing: "Saving to your account",
  synced: "Saved to your account",
  failed: "Couldn't reach the server. Your progress is safe here and will sync later.",
  guest: "Saved on this device. Sign in to keep it anywhere.",
};

const TONE: Record<Exclude<SyncState, "hidden">, string> = {
  offline: "var(--gold)",
  pending: "var(--gold)",
  syncing: "var(--muted)",
  synced: "var(--hit)",
  failed: "var(--muted)",
  guest: "var(--muted)",
};

/** A looping dot cycle reads as working on it. A spinner reads as blocked. */
const WORKING = new Set<SyncState>(["offline", "pending", "syncing"]);

export default function SyncStatus({ state }: { state: SyncState }) {
  const reduce = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {state !== "hidden" && (
          <motion.div
            key={state}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            className={`max-w-[520px] rounded-full border border-edge bg-raise px-4 py-2.5 text-center text-[13px] leading-snug ${
              state === "offline" && !reduce ? "breathe" : ""
            }`}
            style={{ color: TONE[state] }}
          >
            {COPY[state]}
            {WORKING.has(state) && (
              <span aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={
                      reduce
                        ? { opacity: 0.6 }
                        : {
                            animation: `dotpulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                            display: "inline-block",
                          }
                    }
                  >
                    .
                  </span>
                ))}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
