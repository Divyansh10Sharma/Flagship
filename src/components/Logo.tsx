/** A pennant on a mast — the flag and the ship of the name in one mark. */
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M6 2.5V21.5" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.8 3.6h11.4l-3.2 3.5 3.2 3.5H6.8z" fill="var(--brass)" />
      <path d="M6.8 12.4h7.6l-2.2 2.4 2.2 2.4H6.8z" fill="var(--miss)" opacity="0.85" />
      <path
        d="M2.2 19.6c1.6 0 1.6 1.1 3.2 1.1s1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1"
        stroke="var(--sea)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
