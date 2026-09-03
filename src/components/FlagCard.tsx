type Props = {
  src: string;
  alt: string;
  shaking?: boolean;
  className?: string;
};

/** Fixed-height box + object-contain keeps the column from jumping between a
 *  1:2 flag and a square one. Behind the flag: a pearl-white haze so white and
 *  pale bands (Japan, Poland, Nigeria) don't dissolve into the dark ground,
 *  then the flag's own colours bloomed over it. */
export default function FlagCard({ src, alt, shaking = false, className = "" }: Props) {
  return (
    <div className={`relative w-full ${shaking ? "shake" : ""} ${className}`}>
      {/* Sized by insets rather than a scale transform: this card renders inside
          the round's preserve-3d flip, where a transformed child gets its own
          plane and can sort in front of the flag it is meant to sit behind. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[4%] -top-6 -bottom-6"
        style={{
          background:
            "radial-gradient(ellipse 58% 54% at 50% 48%, rgba(247,245,238,0.40) 0%, rgba(240,236,225,0.20) 48%, rgba(234,230,218,0.06) 74%, rgba(234,230,218,0) 100%)",
          filter: "blur(16px)",
        }}
      />
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-[180px] w-full object-contain opacity-40 sm:h-[220px]"
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
