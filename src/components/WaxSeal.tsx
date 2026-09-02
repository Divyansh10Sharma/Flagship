/** A pressed wax seal. The irregular border-radius is what stops it reading as
 *  a circle with a gradient — real wax spreads unevenly. */
export default function WaxSeal({
  size = 44,
  label = "F",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: "47% 53% 51% 49% / 49% 47% 53% 51%",
        background:
          "radial-gradient(circle at 34% 30%, #b8402f 0%, #8c2f23 45%, #66200f 100%)",
        boxShadow:
          "0 1px 0 rgba(255,190,170,0.28) inset, 0 -2px 5px rgba(0,0,0,0.45) inset, 0 6px 14px -8px rgba(0,0,0,0.9)",
      }}
    >
      <span
        className="fell"
        style={{
          fontSize: size * 0.46,
          color: "#f0d2c6",
          opacity: 0.8,
          textShadow: "0 -1px 0 rgba(0,0,0,0.5)",
        }}
      >
        {label}
      </span>
    </span>
  );
}
