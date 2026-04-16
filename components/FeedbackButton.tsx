"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  submitFeedbackAction,
  loadMyFeedbackAction,
  getMyResolvedCountAction,
  markFeedbackSeenAction,
  type FeedbackRow,
} from "@/app/app/feedback-actions";

const PRIO_META: Record<string, { label: string; color: string }> = {
  faible: { label: "Faible", color: "#a3a3a3" },
  normal: { label: "Normal", color: "#7c8196" },
  haute:  { label: "Urgent", color: "#f87171" },
};

const STATUT_META: Record<string, { label: string; color: string; icon: string }> = {
  ouvert:  { label: "En attente", color: "#7c8196", icon: "📩" },
  en_cours:{ label: "En cours",   color: "#f59e0b", icon: "⚙️" },
  fait:    { label: "Validé",     color: "#4ade80", icon: "✅" },
  refuse:  { label: "Refusé",     color: "#f87171", icon: "✕" },
};

export function FeedbackButton() {
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<"new"|"history">("new");
  const [titre, setTitre]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priorite, setPriorite] = useState<"faible"|"normal"|"haute">("normal");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string|null>(null);

  // History
  const [history, setHistory]   = useState<FeedbackRow[]>([]);
  const [loadingH, setLoadingH] = useState(false);

  // Notification badge
  const [resolvedCount, setResolvedCount] = useState(0);

  // Poll resolved count every 60s
  useEffect(() => {
    let active = true;
    const check = async () => {
      try { const c = await getMyResolvedCountAction(); if (active) setResolvedCount(c); } catch {}
    };
    check();
    const t = setInterval(check, 60_000);
    return () => { active = false; clearInterval(t); };
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingH(true);
    try {
      const data = await loadMyFeedbackAction();
      setHistory(data);
      // Mark unseen resolved ones as seen
      const unseen = data.filter(r => (r.statut === "fait" || r.statut === "refuse") && !(r as any).seen_by_user);
      if (unseen.length > 0) {
        await markFeedbackSeenAction(unseen.map(r => r.id));
        setResolvedCount(0);
      }
    } catch {}
    setLoadingH(false);
  }, []);

  useEffect(() => {
    if (open && tab === "history") loadHistory();
  }, [open, tab, loadHistory]);

  async function submit() {
    if (!titre.trim() || !desc.trim()) return;
    setSaving(true); setError(null);
    const res = await submitFeedbackAction(titre, desc, priorite);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    setDone(true);
    setTimeout(() => { setDone(false); setTitre(""); setDesc(""); setPriorite("normal"); }, 1800);
  }

  function handleClose() {
    setOpen(false);
    setDone(false);
    setTab("new");
  }

  const PRIO = [
    { value: "faible", label: "Faible",  color: "#a3a3a3" },
    { value: "normal", label: "Normal",  color: "#7c8196" },
    { value: "haute",  label: "Urgent",  color: "#f87171" },
  ];

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        title="Suggérer une amélioration"
        style={{
          position: "relative",
          height: 30, padding: "0 12px", borderRadius: 6,
          background: "transparent", border: "1px solid #2e2e2e",
          color: "#666", fontSize: 11, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          transition: "all 150ms",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)"; e.currentTarget.style.color = "#7c8196"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.color = "#666"; }}
      >
        💡 Amélioration
        {resolvedCount > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            minWidth: 16, height: 16, borderRadius: 999,
            background: "#4ade80", color: "#000",
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
            boxShadow: "0 0 6px rgba(74,222,128,0.6)",
            animation: "pulse-notif 2s infinite",
          }}>
            {resolvedCount}
          </span>
        )}
      </button>

      <style>{`@keyframes pulse-notif { 0%,100%{box-shadow:0 0 6px rgba(74,222,128,0.4)} 50%{box-shadow:0 0 12px rgba(74,222,128,0.7)} }`}</style>

      {/* Modale */}
      {open && (
        <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, width: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header + Tabs */}
            <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>
                💡 Améliorations
              </div>
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2a2a", marginBottom: 0 }}>
                {([
                  { key: "new" as const, label: "Nouvelle demande" },
                  { key: "history" as const, label: "Mes demandes" },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: "8px 16px", fontSize: 11, fontWeight: 700,
                      background: "transparent", border: "none", cursor: "pointer",
                      color: tab === t.key ? "#7c8196" : "#555",
                      borderBottom: tab === t.key ? "2px solid #7c8196" : "2px solid transparent",
                      marginBottom: -1, transition: "color 150ms",
                    }}>
                    {t.label}
                    {t.key === "history" && resolvedCount > 0 && (
                      <span style={{
                        marginLeft: 6, minWidth: 14, height: 14, borderRadius: 999,
                        background: "#4ade80", color: "#000", fontSize: 8, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "0 3px", verticalAlign: "middle",
                      }}>{resolvedCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 20px" }}>

              {/* ── Nouvelle demande ── */}
              {tab === "new" && (
                done ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Merci pour ta suggestion !</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>Elle sera traitée prochainement.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#666", marginBottom: 4 }}>Titre</div>
                      <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex : Ajouter un tri par date..."
                        style={{ width: "100%", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, color: "white", fontSize: 12, padding: "7px 10px", outline: "none", boxSizing: "border-box" as const }} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#666", marginBottom: 4 }}>Description</div>
                      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Décris le besoin ou le problème..." rows={3}
                        style={{ width: "100%", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, color: "white", fontSize: 12, padding: "7px 10px", outline: "none", resize: "none" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#666", marginBottom: 6 }}>Priorité</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {PRIO.map(p => (
                          <button key={p.value} onClick={() => setPriorite(p.value as any)}
                            style={{ flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, border: `1px solid ${priorite === p.value ? p.color + "80" : "#2a2a2a"}`, background: priorite === p.value ? p.color + "15" : "transparent", color: priorite === p.value ? p.color : "#555", transition: "all 150ms" }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>✕ {error}</div>}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={handleClose} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                      <button onClick={submit} disabled={saving || !titre.trim() || !desc.trim()}
                        style={{ background: !titre.trim() || !desc.trim() ? "#1e1e1e" : "rgba(129,140,248,0.1)", border: !titre.trim() || !desc.trim() ? "1px solid #2e2e2e" : "1px solid rgba(129,140,248,0.4)", color: !titre.trim() || !desc.trim() ? "#555" : "#7c8196", padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                        {saving ? "…" : "Envoyer"}
                      </button>
                    </div>
                  </>
                )
              )}

              {/* ── Historique ── */}
              {tab === "history" && (
                loadingH ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#555", fontSize: 12 }}>Chargement…</div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#444", fontSize: 12 }}>Aucune demande envoyée.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {history.map(fb => {
                      const st = STATUT_META[fb.statut] ?? STATUT_META.ouvert;
                      const pr = PRIO_META[fb.priorite] ?? PRIO_META.normal;
                      const isResolved = fb.statut === "fait" || fb.statut === "refuse";
                      const wasUnseen = isResolved && !(fb as any).seen_by_user;
                      return (
                        <div key={fb.id} style={{
                          background: wasUnseen ? "rgba(74,222,128,0.04)" : "#141414",
                          border: `1px solid ${wasUnseen ? "rgba(74,222,128,0.25)" : "#222"}`,
                          borderRadius: 10, padding: "12px 14px",
                          borderLeft: `3px solid ${st.color}`,
                          transition: "all 200ms",
                        }}>
                          {/* Header : titre + statut */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "white", flex: 1 }}>{fb.titre}</div>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: st.color + "15", border: `1px solid ${st.color}40`,
                              color: st.color, whiteSpace: "nowrap", flexShrink: 0,
                            }}>
                              {st.icon} {st.label}
                            </span>
                          </div>

                          {/* Description */}
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 6, lineHeight: 1.4 }}>
                            {fb.description.length > 120 ? fb.description.slice(0, 120) + "…" : fb.description}
                          </div>

                          {/* Meta : date + priorité */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#555" }}>
                            <span>{new Date(fb.created_at).toLocaleDateString("fr-FR")}</span>
                            <span style={{ color: pr.color, fontWeight: 600 }}>{pr.label}</span>
                          </div>

                          {/* Note admin */}
                          {fb.note_admin && (
                            <div style={{
                              marginTop: 8, padding: "8px 10px", borderRadius: 6,
                              background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)",
                              fontSize: 11, color: "#a5b0d8", lineHeight: 1.4,
                            }}>
                              <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#7c8196", marginBottom: 2, display: "block" }}>Réponse admin</span>
                              {fb.note_admin}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
