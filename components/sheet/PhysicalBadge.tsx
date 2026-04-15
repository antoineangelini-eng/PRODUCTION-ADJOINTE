"use client";

/**
 * Badge « Physique » — pill pêche avec point rouge.
 * Indique un cas inséré à la main via double-scan.
 */
export function PhysicalBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const fs = size === "md" ? 12 : 11;
  const pad = size === "md" ? "4px 11px 4px 12px" : "3px 10px 3px 11px";
  const dot = size === "md" ? 8 : 7;
  const gap = size === "md" ? 8 : 7;
  return (
    <span
      title="Cas physique inséré"
      aria-label="Cas physique"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        padding: pad,
        background: "#f5c4b3",
        border: "1px solid #d89f8a",
        borderRadius: 999,
        color: "#893521",
        fontSize: fs,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 0.1,
        userSelect: "none",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span>Physique</span>
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, #c85a3d 0%, #893521 75%)",
          boxShadow: "0 0 4px rgba(137,53,33,0.6)",
          flexShrink: 0,
        }}
      />
    </span>
  );
}
