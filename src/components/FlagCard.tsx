type Props = {
  src: string;
  alt: string;
  shrunk?: boolean;
  shaking?: boolean;
  className?: string;
};

/** Fixed-height box + object-contain keeps the column from jumping between a
 *  1:2 flag and a square one. The bloom behind it is the flag's own colour. */
export default function FlagCard({
  src,
  alt,
  shrunk = false,
  shaking = false,
  className = "",
}: Props) {
  return (
    <div
      className={`relative w-full ${shaking ? "shake" : ""} ${className}`}
      style={{
        transform: shrunk ? "scale(0.6)" : "scale(1)",
        transformOrigin: "top center",
        transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-[180px] w-full object-contain opacity-45 sm:h-[220px]"
        style={{ filter: "blur(38px) saturate(170%)", transform: "scale(1.15)" }}
      />
      <img
        src={src}
        alt={alt}
        data-flag="true"
        draggable={false}
        className="relative h-[180px] w-full object-contain sm:h-[220px]"
        style={{ filter: "drop-shadow(0 24px 50px rgba(0,0,0,0.9))" }}
      />
    </div>
  );
}
