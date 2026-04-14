"use client";
import { useState } from "react";

const SECTORS = [
  { code: "design_metal",    label: "Design Métal" },
  { code: "design_resine",   label: "Design Résine" },
  { code: "usinage_titane",  label: "Usinage Titane" },
  { code: "usinage_resine",  label: "Usinage Résine" },
  { code: "finition",        label: "Finition" },
];

import { adminResetSectorsAction } from "@/app/app/admin/actions";

type ResetState = "idle" | "confirm" | "pending" | "done" | "error";

function ResetButton({
  label, description, danger,
  onConfirm,
}: {
  label: string;
  description: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [state, setState] = useState<ResetState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConfirm() {
    setState("pending");
    try {
      await onConfirm();
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Erreur");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const borderColor = danger ? "#f87171" : "#f59e0b";
  const bgColor     = danger ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)";

  return (
    <div style={{
      border: `1px solid ${state === "confirm" ? borderColor : "#1a1a1a"}`,
      borderRadius: 10, padding: "14px 18px",
      background: state === "confirm" ? bgColor : "#111",
      transition: "all 200ms",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 11, color: "#555" }}>{description}</div>
        </div>

        {state === "idle" && (
          <button
            onClick={() => setState("confirm")}
            style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700,
              border: `1px solid ${borderColor}`, background: "transparent",
              color: borderColor, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Réinitialiser
          </button>
        )}

        {state === "confirm" && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: borderColor, fontWeight: 700, alignSelf: "center" }}>Confirmer ?</span>
            <button
              onClick={handleConfirm}
              style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, border: `1px solid ${borderColor}`, background: bgColor, color: borderColor, cursor: "pointer" }}
            >
              Oui
            </button>
            <button
              onClick={() => setState("idle")}
              style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}
            >
              Non
            </button>
          </div>
        )}

        {state === "pending" && (
          <span style={{ fontSize: 12, color: "#555", flexShrink: 0 }}>En cours...</span>
        )}

        {state === "done" && (
          <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>✓ Réinitialisé</span>
        )}

        {state === "error" && (
          <span style={{ fontSize: 12, color: "#f87171", flexShrink: 0 }}>{errorMsg}</span>
        )}
      </div>
    </div>
  );
}

async function callReset(sectors: string[] | null) {
  await adminResetSectorsAction(sectors);
}

export function AdminResetPanel() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Administration</h1>
      <p style={{ fontSize: 12, color: "#555", marginBottom: 32 }}>
        Ces actions sont irréversibles. Les données supprimées ne peuvent pas être récupérées.
      </p>

      {/* Reset global */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Réinitialisation complète
        </div>
        <ResetButton
          label="Tout réinitialiser"
          description="Supprime tous les dossiers, tous les secteurs, tous les événements."
          danger
          onConfirm={() => callReset(null)}
        />
      </div>

      {/* Reset par secteur */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Réinitialisation par secteur
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SECTORS.map(s => (
            <ResetButton
              key={s.code}
              label={s.label}
              description={`Vide les données de ${s.label} et retire les dossiers de la file.`}
              onConfirm={() => callReset([s.code])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
