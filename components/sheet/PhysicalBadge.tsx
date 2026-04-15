"use client";

/**
 * Petit badge "P" marron — indique un cas physique (inséré à la main).
 * Design épuré, monochrome, s'intègre discrètement à côté du n° de cas.
 */
export function PhysicalBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const h = size === "md" ? 18 : 14;
  const fs = size === "md" ? 10 : 9;
  return (
    <span
      title="Cas physique inséré"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: h,
        minWidth: h,
        padding: "0 4px",
        borderRadius: 3,
        background: "rgba(139, 90, 43, 0.18)",
        color: "#c9a47d",
        fontSize: fs,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 0.5,
        border: "1px solid rgba(139, 90, 43, 0.45)",
        flexShrink: 0,
        userSelect: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      P
    </span>
  );
}
