/** A pennant on a mast — the flag and the ship of the name in one mark. */
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/pennant.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      className="block shrink-0 select-none"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
