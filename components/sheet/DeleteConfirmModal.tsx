"use client";

import { useState } from "react";

type DeleteMode = "sector" | "all";

export function DeleteConfirmModal({
  caseNumber,
  sectorLabel,
  onDeleteFromSector,
  onDeleteFromAll,
  onCancel,
}: {
  caseNumber: string | null;
  sectorLabel: string;
  onDeleteFromSector: () => void;
  onDeleteFromAll: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<DeleteMode | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!mode) return;
    setBusy(true);
    if (mode === "sector") {
      onDeleteFromSector();
    } else {
      onDeleteFromAll();
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: 12,
          padding: "20px 24px", maxWidth: 400, width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0", marginBottom: 4 }}>
          Supprimer le cas N° {caseNumber ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>
          Choisissez le type de suppression :
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {/* Option 1 : retirer de ce secteur */}
          <button
            onClick={() => setMode("sector")}
            style={{
              padding: "10px 14px", borderRadius: 8, cursor: "pointer",
              textAlign: "left", transition: "all 150ms",
              background: mode === "sector" ? "rgba(59,130,246,0.12)" : "#161616",
              border: `1px solid ${mode === "sector" ? "rgba(59,130,246,0.5)" : "#2a2a2a"}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: mode === "sector" ? "#60a5fa" : "#d0d0d0" }}>
              Retirer de {sectorLabel} uniquement
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              Le cas reste dans les autres secteurs où il est actif.
            </div>
          </button>

          {/* Option 2 : supprimer partout */}
          <button
            onClick={() => setMode("all")}
            style={{
              padding: "10px 14px", borderRadius: 8, cursor: "pointer",
              textAlign: "left", transition: "all 150ms",
              background: mode === "all" ? "rgba(239,68,68,0.1)" : "#161616",
              border: `1px solid ${mode === "all" ? "rgba(239,68,68,0.4)" : "#2a2a2a"}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: mode === "all" ? "#f87171" : "#d0d0d0" }}>
              Supprimer de tous les secteurs
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              Le cas et toutes ses données seront supprimés définitivement.
            </div>
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "7px 16px", fontSize: 12, fontWeight: 600,
              borderRadius: 6, cursor: "pointer",
              background: "#222", border: "1px solid #333", color: "#aaa",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!mode || busy}
            style={{
              padding: "7px 16px", fontSize: 12, fontWeight: 700,
              borderRadius: 6,
              cursor: !mode || busy ? "not-allowed" : "pointer",
              opacity: !mode ? 0.4 : 1,
              background: mode === "all" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${mode === "all" ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.4)"}`,
              color: mode === "all" ? "#f87171" : "#60a5fa",
              transition: "all 150ms",
            }}
          >
            {busy ? "Suppression…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
