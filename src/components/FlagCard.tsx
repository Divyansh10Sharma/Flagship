type Props = {
  src: string;
  alt: string;
  shrunk?: boolean;
  shaking?: boolean;
  className?: string;
};

/** Real flags have no rounded corners, so 6px and a hairline is as far as it
 *  goes. Fixed-height box + object-contain keeps the column from jumping
 *  between a 1:2 flag and a square one. */
export default function FlagCard({
  src,
  alt,
  shrunk = false,
  shaking = false,
  className = "",
}: Props) {
  return (
    <div
      className={`flex justify-center ${shaking ? "shake" : ""} ${className}`}
      style={{
        transform: shrunk ? "scale(0.6)" : "scale(1)",
        transformOrigin: "top center",
        transition: "transform 200ms ease-out",
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-[180px] w-auto max-w-full rounded-[6px] border border-edge object-contain sm:h-[220px]"
      />
    </div>
  );
}
