"use client";

/**
 * Badge "P" — indique un cas physique (inséré à la main).
 * Pastille circulaire ambrée avec dégradé chaud et finition type jeton.
 */
export function PhysicalBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const d = size === "md" ? 18 : 15;
  const fs = size === "md" ? 10 : 9;
  return (
    <span
      title="Cas physique inséré"
      aria-label="Cas physique"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: d,
        height: d,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 25%, #e8b87a 0%, #b07a44 55%, #6b3f1d 100%)",
        color: "#fff4e1",
        fontSize: fs,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        boxShadow:
          "inset 0 1px 0.5px rgba(255,230,190,0.55), inset 0 -1px 1px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.45)",
        flexShrink: 0,
        userSelect: "none",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        textShadow: "0 1px 1px rgba(0,0,0,0.35)",
      }}
    >
      P
    </span>
  );
}
