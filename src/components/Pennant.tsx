/** Attempt marker. A signal pennant, struck through once it is spent. */
export default function Pennant({ spent }: { spent: boolean }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
      <path d="M1 1.5V12.5" stroke="var(--edge)" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M1.8 2.4h13l-3.4 4.6 3.4 4.6h-13z"
        fill={spent ? "var(--miss)" : "transparent"}
        stroke={spent ? "var(--miss)" : "var(--edge)"}
        strokeWidth="1.1"
        strokeLinejoin="round"
        style={{ transition: "fill 200ms linear, stroke 200ms linear" }}
      />
    </svg>
  );
}
