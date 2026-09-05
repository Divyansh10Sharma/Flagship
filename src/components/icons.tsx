/**
 * Brass emblems for the log.
 *
 * These are photographs of cast metal, not drawings — hand-built SVG gets the
 * silhouette right but cannot reach the pitting, verdigris and worn highlights
 * the design calls for. All six are sliced from one generated sheet
 * (assets-src/brassItems.png, via scripts/slice-icons.mjs) so they share a
 * light direction and a patina; generating them separately drifts visibly once
 * they sit in a column together.
 *
 * Each file is letterboxed into a 256px square, so a single `size` lays them
 * out on a common optical scale despite differing aspect ratios.
 */

type IconProps = {
  size?: number;
  className?: string;
  /** Sink the emblem into the surface beneath it rather than sitting it on
   *  top. Essential on the brass plate, where gold-on-gold otherwise reads as
   *  a sticker; also flattering on parchment, where it looks stamped in. */
  blend?: boolean;
};

function Emblem({ src, size = 24, className = "", blend = false }: IconProps & { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        mixBlendMode: blend ? "multiply" : undefined,
      }}
    />
  );
}

export const CompassRose = (p: IconProps) => <Emblem src="/icons/compass.webp" {...p} />;
export const ArrowRight = (p: IconProps) => <Emblem src="/icons/arrow.webp" {...p} />;
export const Anchor = (p: IconProps) => <Emblem src="/icons/anchor.webp" {...p} />;
export const Ledger = (p: IconProps) => <Emblem src="/icons/logbook.webp" {...p} />;
export const Flame = (p: IconProps) => <Emblem src="/icons/flame.webp" {...p} />;
export const Trophy = (p: IconProps) => <Emblem src="/icons/trophy.webp" {...p} />;
