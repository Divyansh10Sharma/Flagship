/**
 * The chart table. A navigator's map of the Atlantic laid out under low warm
 * light — the paper itself is the backdrop, not a scene rendered on top of it.
 *
 * The image is deliberately near-black (under 12% luminance) so it can sit
 * behind chalk text without contrast work. Everything else here is light: a
 * lantern falloff that breathes, and a vignette that pulls the corners down.
 *
 * `cover` on a fixed layer, so the chart crops rather than stretches — the
 * compass roses stay circular on every aspect ratio.
 */
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--void)",
          backgroundImage: 'url("/chart.webp")',
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />

      {/* lantern standing off to the right, low and warm */}
      <div
        className="absolute lantern-glow"
        style={{
          right: "-18%",
          top: "14%",
          width: "85vh",
          height: "85vh",
          background:
            "radial-gradient(circle, rgba(201,146,43,0.16) 0%, rgba(201,146,43,0.05) 42%, transparent 70%)",
        }}
      />

      {/* vignette — corners fall away, centre stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 80% at 50% 12%, transparent 22%, rgba(6,5,4,0.55) 70%, rgba(6,5,4,0.94) 100%)",
        }}
      />
    </div>
  );
}
