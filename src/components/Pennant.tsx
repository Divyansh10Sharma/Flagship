/** Attempt marker: a signal pennant that goes oxblood once it is spent. */
export default function Pennant({ spent }: { spent: boolean }) {
  return (
    <svg width="20" height="15" viewBox="0 0 20 15" aria-hidden="true">
      <path d="M1.5 1.5V13.5" stroke="var(--edge)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M2.4 2.6h14l-3.6 4.9 3.6 4.9h-14z"
        fill={spent ? "var(--miss)" : "transparent"}
        stroke={spent ? "#5c1c12" : "var(--edge)"}
        strokeWidth="1.1"
        strokeLinejoin="round"
        style={{ transition: "fill 220ms ease, stroke 220ms ease" }}
      />
    </svg>
  );
}
