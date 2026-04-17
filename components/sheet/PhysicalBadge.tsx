"use client";

/**
 * Badge « Physique » — pastille compacte rouge/sombre.
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
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.35)",
        borderRadius: 4,
        color: "#f87171",
        fontSize: fs,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        userSelect: "none",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: "#f87171",
          flexShrink: 0,
        }}
      />
      <span>Phys.</span>
    </span>
  );
}
