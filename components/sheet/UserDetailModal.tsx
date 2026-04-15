"use client";
import { useEffect, useState } from "react";
import { loadUserDetailAction, type UserDetailData, type Period } from "@/app/app/admin/dashboard-actions";

const ACTION_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  CASE_CREATED:               { label: "Création",         color: "#60a5fa", icon: "✦" },
  case_created:               { label: "Création",         color: "#60a5fa", icon: "✦" },
  DESIGN_METAL_CELL_UPDATE:   { label: "Modification",     color: "#94a3b8", icon: "✎" },
  DESIGN_METAL_COMPLETED:     { label: "Validation secteur", color: "#4ade80", icon: "→" },
  DESIGN_RESINE_CELL_UPDATE:  { label: "Modification",     color: "#94a3b8", icon: "✎" },
  DESIGN_RESINE_COMPLETED:    { label: "Validation secteur", color: "#4ade80", icon: "→" },
  USINAGE_TITANE_CELL_UPDATE: { label: "Modification",     color: "#94a3b8", icon: "✎" },
  USINAGE_TITANE_COMPLETED:   { label: "Validation secteur", color: "#4ade80", icon: "→" },
  USINAGE_RESINE_CELL_UPDATE: { label: "Modification",     color: "#94a3b8", icon: "✎" },
  USINAGE_RESINE_COMPLETED:   { label: "Validation secteur", color: "#4ade80", icon: "→" },
  FINITION_CELL_UPDATE:       { label: "Modification",     color: "#94a3b8", icon: "✎" },
  CASE_COMPLETED:             { label: "Dossier validé",   color: "#f59e0b", icon: "★" },
};

function fmtSector(s: string | null): string {
  switch (s) {
    case "design_metal": return "DM";
    case "design_resine": return "DR";
    case "usinage_titane": return "UT";
    case "usinage_resine": return "UR";
    case "finition": return "FI";
    default: return s ?? "—";
  }
}

function fmtDT(s: string): string {
  const d = new Date(s);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function UserDetailModal({ userId, period, onClose }: {
  userId: string;
  period: Period;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserDetailAction(userId, period)
      .then(setData)
      .catch(e => setError(e.message ?? "Erreur"));
  }, [userId, period]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 12,
          maxWidth: 900, width: "100%", maxHeight: "85vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
            {data?.name ?? "Chargement…"}
          </div>
          {data && (
            <div style={{ fontSize: 11, color: "#888" }}>
              {data.totalActions} action{data.totalActions > 1 ? "s" : ""} sur {data.cases.length} cas
            </div>
          )}
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "transparent", border: "1px solid #2a2a2a",
            color: "#888", padding: "4px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer",
          }}>✕ Fermer</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
          {!data && !error && <div style={{ color: "#666", fontSize: 12 }}>Chargement…</div>}

          {data && data.cases.length === 0 && (
            <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 40 }}>
              Aucune activité sur cette période.
            </div>
          )}

          {data && data.cases.map(c => (
            <div key={c.caseId} style={{
              border: "1px solid #1e1e1e", borderRadius: 8, marginBottom: 10,
              background: "#111", overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 12px", borderBottom: "1px solid #1e1e1e",
                display: "flex", gap: 10, alignItems: "center", background: "#0f0f0f",
              }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#e0e0e0" }}>N° {c.caseNumber ?? "—"}</span>
                {c.nature && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: "rgba(255,255,255,0.05)", color: "#aaa",
                    border: "1px solid #2a2a2a",
                  }}>{c.nature}</span>
                )}
                <span style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>
                  {c.actions.length} action{c.actions.length > 1 ? "s" : ""}
                </span>
              </div>
              <div>
                {c.actions.map((a, i) => {
                  const meta = ACTION_LABEL[a.type] ?? { label: a.type, color: "#666", icon: "·" };
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "6px 12px",
                      borderBottom: i < c.actions.length - 1 ? "1px solid #151515" : "none",
                      alignItems: "center",
                    }}>
                      <span style={{
                        color: meta.color, fontSize: 13, width: 16, textAlign: "center",
                      }}>{meta.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, minWidth: 130 }}>
                        {meta.label}
                      </span>
                      {a.sector && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 3,
                          background: "rgba(255,255,255,0.05)", color: "#888",
                        }}>{fmtSector(a.sector)}</span>
                      )}
                      {a.fields.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                          {a.fields.slice(0, 5).map(f => (
                            <span key={f} style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 3,
                              background: "rgba(129,140,248,0.08)", color: "#9ca3af",
                              border: "1px solid rgba(129,140,248,0.15)",
                            }}>{f}</span>
                          ))}
                          {a.fields.length > 5 && (
                            <span style={{ fontSize: 10, color: "#666" }}>+{a.fields.length - 5}</span>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>
                        {fmtDT(a.at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
