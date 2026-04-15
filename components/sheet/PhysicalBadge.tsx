"use client";

/**
 * Petit badge "P" marron — indique un cas physique (inséré à la main).
 * S'affiche à côté du n° de cas partout dans l'app.
 */
export function PhysicalBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? 18 : 15;
  const font = size === "md" ? 11 : 10;
  return (
    <span
      title="Cas physique inséré"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #8b5a2b 0%, #6b4423 100%)",
        color: "#f5e6d3",
        fontSize: font,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        border: "1px solid #4a2f17",
        boxShadow: "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      P
    </span>
  );
}
