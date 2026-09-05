/**
 * A pressed wax seal, photographed rather than drawn.
 *
 * The previous version built this from a radial gradient and an irregular
 * border-radius. That reads as a red disc no matter how the numbers are tuned:
 * wax gets its character from specular highlights on an uneven surface, the
 * crazed crust, and the way the stamped relief goes near-black in its recesses
 * — none of which a gradient can fake.
 */
export default function WaxSeal({ size = 56 }: { size?: number }) {
  return (
    <img
      src="/seal.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className="block shrink-0 select-none"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: "drop-shadow(0 3px 5px rgba(40,10,6,0.55))",
      }}
    />
  );
}
