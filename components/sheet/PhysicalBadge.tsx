"use client";

/**
 * Badge « Physique » — style pêche d'origine, taille compacte.
 */
export function PhysicalBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const fs = size === "md" ? 10 : 9;
  const pad = size === "md" ? "2px 7px" : "2px 6px";
  const dot = size === "md" ? 5 : 4;
  return (
    <span
      title="Cas physique"
      aria-label="Cas physique"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
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
