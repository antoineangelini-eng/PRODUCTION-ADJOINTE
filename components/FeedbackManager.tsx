"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadAllFeedbackAction, updateFeedbackAction, type FeedbackRow } from "@/app/app/feedback-actions";

const STATUT_META: Record<string, { label: string; color: string; icon: string }> = {
  ouvert:   { label: "Ouvert",    color: "#7c8196", icon: "📩" },
  en_cours: { label: "En cours",  color: "#f59e0b", icon: "⚙️" },
  fait:     { label: "Fait",      color: "#4ade80", icon: "✅" },
  refuse:   { label: "Refusé",    color: "#f87171", icon: "✕" },
};

const PRIO_META: Record<string, { label: string; color: string }> = {
  faible: { label: "Faible",  color: "#a3a3a3" },
  normal: { label: "Moyen",   color: "#7c8196" },
  haute:  { label: "Urgent",  color: "#f87171" },
};

const SECTOR_LABELS: Record<string, string> = {
  design_metal:   "DM", design_resine: "DR", usinage_titane: "UT",
  usinage_resine: "UR", finition: "FIN", admin: "Admin",
};

function relativeDate(s: string): string {
  const now = Date.now();
  const d = new Date(s).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

type ViewMode = "actifs" | "historique";

export function FeedbackManager({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [rows, setRows]           = useState<FeedbackRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState<ViewMode>("actifs");
  const [editId, setEditId]       = useState<string | null>(null);
  const [note, setNote]           = useState("");
  const [statut, setStatut]       = useState<FeedbackRow["statut"]>("ouvert");
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadAllFeedbackAction();
    setRows(data);
    onCountChange?.(data.filter(r => r.statut === "ouvert").length);
    setLoading(false);
  }, [onCountChange]);
  useEffect(() => { load(); }, [load]);

  // Séparer actifs (ouvert + en_cours) et historique (fait + refuse)
  const actifs = rows.filter(r => r.statut === "ouvert" || r.statut === "en_cours");
  const historique = rows.filter(r => r.statut === "fait" || r.statut === "refuse");
  const displayed = viewMode === "actifs" ? actifs : historique;

  const counts = { ouvert: 0, en_cours: 0, fait: 0, refuse: 0 } as Record<string, number>;
  rows.forEach(r => { counts[r.statut] = (counts[r.statut] ?? 0) + 1; });

  // Barre de progression
  const total = rows.length;
  const resolved = counts.fait + counts.refuse;
  const progressPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  function openEdit(row: FeedbackRow) {
    setEditId(row.id); setNote(row.note_admin ?? ""); setStatut(row.statut);
  }

  async function save() {
    if (!editId) return;
    setSaving(true);
    await updateFeedbackAction(editId, statut, note.trim() || null);
    setSaving(false);
    setEditId(null);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Statistiques en haut */}
      <div style={{ padding: "14px 0 8px", flexShrink: 0 }}>
        {/* Compteurs rapides */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {Object.entries(STATUT_META).map(([key, meta]) => (
            <div key={key} style={{
              flex: 1, textAlign: "center", padding: "8px 0",
              background: "#161616", border: "1px solid #222", borderRadius: 8,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{counts[key] ?? 0}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                {meta.icon} {meta.label}
              </div>
            </div>
          ))}
        </div>

        {/* Barre de progression */}
        {total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>Progression globale</span>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>{resolved}/{total} traités ({progressPct}%)</span>
            </div>
            <div style={{ height: 4, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width 300ms ease",
                width: `${progressPct}%`,
                background: progressPct === 100 ? "#4ade80" : "linear-gradient(90deg, #7c8196, #4ade80)",
              }} />
            </div>
          </div>
        )}

        {/* Toggle Actifs / Historique */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => setViewMode("actifs")}
            style={{
              padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: viewMode === "actifs" ? "1px solid rgba(129,140,248,0.5)" : "1px solid #2a2a2a",
              background: viewMode === "actifs" ? "rgba(129,140,248,0.1)" : "transparent",
              color: viewMode === "actifs" ? "#7c8196" : "#555",
              transition: "all 150ms",
            }}>
            Actifs ({actifs.length})
          </button>
          <button onClick={() => setViewMode("historique")}
            style={{
              padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: viewMode === "historique" ? "1px solid rgba(74,222,128,0.5)" : "1px solid #2a2a2a",
              background: viewMode === "historique" ? "rgba(74,222,128,0.1)" : "transparent",
              color: viewMode === "historique" ? "#4ade80" : "#555",
              transition: "all 150ms",
            }}>
            Historique ({historique.length})
          </button>
          <button onClick={load} style={{ marginLeft: "auto", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 13, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }} title="Rafraîchir">↻</button>
        </div>
      </div>

      {/* Liste */}
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6, paddingBottom: 16 }}>
        {loading ? <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement...</div>
          : displayed.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{viewMode === "actifs" ? "🎉" : "📂"}</div>
              <div style={{ fontSize: 13, color: "#555" }}>
                {viewMode === "actifs" ? "Aucun ticket actif — tout est traité !" : "Aucun ticket dans l'historique."}
              </div>
            </div>
          )
          : displayed.map(row => {
            const sm = STATUT_META[row.statut];
            const pm = PRIO_META[row.priorite];
            const isEdit = editId === row.id;
            return (
              <div key={row.id} style={{
                background: "#1c1c1c", border: `1px solid ${isEdit ? "#333" : "#232323"}`, borderRadius: 10, overflow: "hidden",
                opacity: row.statut === "refuse" ? 0.6 : 1,
                transition: "opacity 150ms",
              }}>
                {/* En-tête */}
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* Bande de priorité */}
                  <div style={{
                    width: 3, alignSelf: "stretch", borderRadius: 2, flexShrink: 0,
                    background: pm.color,
                  }} />

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{row.titre}</span>
                      {row.sector && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#666" }}>{SECTOR_LABELS[row.sector] ?? row.sector}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6, lineHeight: 1.5 }}>{row.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#444" }}>
                      <span>{row.email}</span>
                      <span style={{ color: "#2a2a2a" }}>·</span>
                      <span title={new Date(row.created_at).toLocaleString("fr-FR")}>{relativeDate(row.created_at)}</span>
                    </div>
                    {row.note_admin && !isEdit && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "#7c8196", background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.15)", borderRadius: 6, padding: "6px 10px", lineHeight: 1.4 }}>
                        Note admin : {row.note_admin}
                      </div>
                    )}
                  </div>

                  {/* Statut + bouton */}
                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sm.color + "15", border: `1px solid ${sm.color}35`, color: sm.color }}>
                      {sm.icon} {sm.label}
                    </span>
                    <button onClick={() => isEdit ? setEditId(null) : openEdit(row)}
                      style={{ fontSize: 10, padding: "3px 10px", borderRadius: 5, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#888", cursor: "pointer", transition: "all 150ms" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#ccc"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#888"; }}
                    >
                      {isEdit ? "Annuler" : "Traiter"}
                    </button>
                  </div>
                </div>

                {/* Panneau traitement */}
                {isEdit && (
                  <div style={{ background: "#141414", borderTop: "1px solid #1e1e1e", padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {Object.entries(STATUT_META).map(([key, meta]) => (
                        <button key={key} onClick={() => setStatut(key as any)}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, border: `1px solid ${statut === key ? meta.color + "80" : "#2a2a2a"}`, background: statut === key ? meta.color + "15" : "transparent", color: statut === key ? meta.color : "#555", transition: "all 150ms" }}>
                          {meta.icon} {meta.label}
                        </button>
                      ))}
                    </div>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note pour l'utilisateur (optionnel)..." rows={2}
                      style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "white", fontSize: 11, padding: "7px 10px", outline: "none", resize: "none" as const, boxSizing: "border-box" as const, fontFamily: "inherit", marginBottom: 8 }} />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={save} disabled={saving}
                        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "6px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {saving ? "..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
