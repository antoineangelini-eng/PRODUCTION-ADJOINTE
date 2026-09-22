"use client";

export function RealtimeBanner({
  hasPending,
  isBusy,
  onRefresh,
}: {
  hasPending: boolean;
  isBusy: boolean;
  onRefresh: () => void;
}) {
  if (hasPending && isBusy) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6px 16px", gap: 8,
        background: "rgba(245,158,11,0.08)",
        borderBottom: "1px solid rgba(245,158,11,0.2)",
      }}>
        <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>
          Cas en attente
        </span>
        <span style={{ fontSize: 11, color: "#aaa" }}>
          — sera appliqué après votre sélection
        </span>
      </div>
    );
  }

  if (hasPending) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6px 16px", gap: 10,
        background: "rgba(74,222,128,0.08)",
        borderBottom: "1px solid rgba(74,222,128,0.2)",
      }}>
        <span style={{ fontSize: 12, color: "#aaa" }}>
          Modifications disponibles
        </span>
        <button
          onClick={onRefresh}
          style={{
            fontSize: 12, fontWeight: 700, color: "#4ade80",
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.35)",
            borderRadius: 6, padding: "3px 12px",
            cursor: "pointer", transition: "all 150ms",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.18)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.1)"}
        >
          Actualiser
        </button>
      </div>
    );
  }

  // Bouton refresh permanent (même sans modifications détectées)
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "4px 16px",
      borderBottom: "1px solid #1e1e1e",
    }}>
      <button
        onClick={onRefresh}
        style={{
          fontSize: 11, fontWeight: 600, color: "#888",
          background: "transparent",
          border: "1px solid #333",
          borderRadius: 6, padding: "3px 12px",
          cursor: "pointer", transition: "all 150ms",
          display: "flex", alignItems: "center", gap: 5,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#ccc"; e.currentTarget.style.borderColor = "#555"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#333"; }}
      >
        ↻ Actualiser
      </button>
    </div>
  );
}
