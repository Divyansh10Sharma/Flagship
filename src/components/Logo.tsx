/** Flag on a mast — the "flag" and the "ship" of the name in one mark. */
export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* mast */}
      <path d="M6 2.5V21.5" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" />
      {/* pennant */}
      <path
        d="M6 4h11.5l-3 3.4 3 3.4H6z"
        fill="var(--brass)"
      />
      {/* waterline */}
      <path
        d="M2 19.2c1.6 0 1.6 1.1 3.2 1.1s1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1"
        stroke="var(--sea)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
