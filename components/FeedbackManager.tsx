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
  const [editRow, setEditRow]     = useState<FeedbackRow | null>(null);
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
    setEditRow(row); setNote(row.note_admin ?? ""); setStatut(row.statut);
  }

  function closeEdit() { setEditRow(null); }

  async function save() {
    if (!editRow) return;
    setSaving(true);
    await updateFeedbackAction(editRow.id, statut, note.trim() || null);
    setSaving(false);
    setEditRow(null);
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
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18, paddingBottom: 16 }}>
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
            return (
              <div key={row.id} style={{
                background: "#1c1c1c", border: "1px solid #232323", borderRadius: 10,
                opacity: row.statut === "refuse" ? 0.6 : 1,
                transition: "opacity 150ms",
                borderLeft: `3px solid ${pm.color}`,
              }}>
                <div style={{ padding: "14px 18px" }}>
                  {/* Ligne 1 : titre + secteur + statut + bouton traiter */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{row.titre}</span>
                    {row.sector && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#666" }}>{SECTOR_LABELS[row.sector] ?? row.sector}</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: sm.color + "15", border: `1px solid ${sm.color}35`, color: sm.color, flexShrink: 0 }}>
                      {sm.icon} {sm.label}
                    </span>
                    <button onClick={() => openEdit(row)}
                      style={{ fontSize: 11, padding: "6px 16px", borderRadius: 6, border: "1px solid rgba(129,140,248,0.5)", background: "rgba(129,140,248,0.1)", color: "#818cf8", fontWeight: 600, cursor: "pointer", transition: "all 150ms", flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(129,140,248,0.2)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.7)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(129,140,248,0.1)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)"; }}
                    >
                      Traiter
                    </button>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{row.description}</div>

                  {/* Auteur + date */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#444" }}>
                    <span style={{ color: "#aaa", fontWeight: 600 }}>{row.display_name ?? row.email}</span>
                    <span style={{ color: "#2a2a2a" }}>·</span>
                    <span title={new Date(row.created_at).toLocaleString("fr-FR")}>{relativeDate(row.created_at)}</span>
                  </div>
                  {row.note_admin && (
                    <div style={{ marginTop: 10, fontSize: 11, color: "#7c8196", background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.15)", borderRadius: 6, padding: "8px 12px", lineHeight: 1.4 }}>
                      Note admin : {row.note_admin}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Modale de traitement */}
      {editRow && (
        <div onClick={closeEdit} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 24, width: 440, maxWidth: "90vw" }}>

            {/* Info du ticket */}
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{editRow.titre}</span>
                {editRow.sector && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#666" }}>{SECTOR_LABELS[editRow.sector] ?? editRow.sector}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>{editRow.description}</div>
              <div style={{ fontSize: 10, color: "#555" }}>
                {editRow.display_name ?? editRow.email} · {relativeDate(editRow.created_at)}
              </div>
            </div>

            {/* Choix du statut */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Statut</div>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.entries(STATUT_META).map(([key, meta]) => (
                  <button key={key} onClick={() => setStatut(key as any)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 7, cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                      border: `1px solid ${statut === key ? meta.color + "80" : "#2a2a2a"}`,
                      background: statut === key ? meta.color + "18" : "transparent",
                      color: statut === key ? meta.color : "#555",
                      transition: "all 150ms",
                    }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note admin */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Note pour l{"'"}utilisateur</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optionnel..." rows={2}
                style={{ width: "100%", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 7, color: "white", fontSize: 12, padding: "10px 12px", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={closeEdit}
                style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "8px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "8px 22px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
