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
  ouvert:   { label: "En attente", color: "#7c8196", icon: "📩" },
  en_cours: { label: "En cours",   color: "#f59e0b", icon: "⚙️" },
  fait:     { label: "Validé",     color: "#4ade80", icon: "✅" },
  refuse:   { label: "Refusé",     color: "#f87171", icon: "✕" },
};

function FeedbackCard({ fb }: { fb: FeedbackRow }) {
  const st = STATUT_META[fb.statut] ?? STATUT_META.ouvert;
  const pr = PRIO_META[fb.priorite] ?? PRIO_META.normal;
  const isResolved = fb.statut === "fait" || fb.statut === "refuse";
  const isNew = isResolved && !fb.seen_by_user;
  return (
    <div style={{
      background: isNew ? "rgba(74,222,128,0.04)" : "#141414",
      border: `1px solid ${isNew ? "rgba(74,222,128,0.25)" : "#222"}`,
      borderRadius: 10, padding: "12px 14px",
      borderLeft: `3px solid ${st.color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          {isNew && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", flexShrink: 0 }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{fb.titre}</span>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
          background: st.color + "15", border: `1px solid ${st.color}40`,
          color: st.color, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {st.icon} {st.label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 6, lineHeight: 1.4 }}>
        {fb.description.length > 120 ? fb.description.slice(0, 120) + "…" : fb.description}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#555" }}>
        <span>{new Date(fb.created_at).toLocaleDateString("fr-FR")}</span>
        <span style={{ color: pr.color, fontWeight: 600 }}>{pr.label}</span>
      </div>
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
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<"new" | "active" | "history">("new");

  // Form state
  const [titre, setTitre]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priorite, setPriorite] = useState<"faible" | "normal" | "haute">("normal");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Data
  const [allFeedback, setAllFeedback] = useState<FeedbackRow[]>([]);
  const [loadingFb, setLoadingFb]     = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);

  // ── Polling indépendant toutes les 30s ──
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const c = await getMyResolvedCountAction();
        if (active) setResolvedCount(c);
      } catch {}
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // ── Charger les feedbacks quand on ouvre un onglet qui en a besoin ──
  const loadFeedback = useCallback(async () => {
    setLoadingFb(true);
    try {
      const data = await loadMyFeedbackAction();
      setAllFeedback(data);
    } catch {}
    setLoadingFb(false);
  }, []);

  useEffect(() => {
    if (open && (tab === "active" || tab === "history")) loadFeedback();
  }, [open, tab, loadFeedback]);

  // ── Quand on ouvre "Mes demandes", marquer les résolu non-vus comme vus ──
  useEffect(() => {
    if (!open || tab !== "active") return;
    const unseen = allFeedback.filter(
      fb => (fb.statut === "fait" || fb.statut === "refuse") && !fb.seen_by_user
    );
    if (unseen.length === 0) return;

    // Marquer comme vus après un court délai (l'user a le temps de voir)
    const t = setTimeout(async () => {
      await markFeedbackSeenAction(unseen.map(r => r.id));
      // Mettre à jour localement
      setAllFeedback(prev =>
        prev.map(fb =>
          unseen.some(u => u.id === fb.id) ? { ...fb, seen_by_user: true } : fb
        )
      );
      setResolvedCount(0);
    }, 2000);
    return () => clearTimeout(t);
  }, [open, tab, allFeedback]);

  // Séparer les listes
  const activeFeedback = allFeedback.filter(fb => {
    // Actifs = ouvert/en_cours OU fait/refusé mais PAS ENCORE VU
    if (fb.statut === "ouvert" || fb.statut === "en_cours") return true;
    if ((fb.statut === "fait" || fb.statut === "refuse") && !fb.seen_by_user) return true;
    return false;
  });
  const historyFeedback = allFeedback.filter(fb => {
    // Historique = fait/refusé ET déjà vu
    return (fb.statut === "fait" || fb.statut === "refuse") && fb.seen_by_user;
  });

  async function submit() {
    if (!titre.trim() || !desc.trim()) return;
    setSaving(true); setError(null);
    const res = await submitFeedbackAction(titre, desc, priorite);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    setDone(true);
    setTimeout(() => { setDone(false); setTitre(""); setDesc(""); setPriorite("normal"); }, 1800);
  }

  function handleClose() { setOpen(false); setDone(false); }

  const PRIO = [
    { value: "faible", label: "Faible", color: "#a3a3a3" },
    { value: "normal", label: "Normal", color: "#7c8196" },
    { value: "haute",  label: "Urgent", color: "#f87171" },
  ];

  return (
    <>
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

      {open && (
        <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, width: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header + Tabs */}
            <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>
                💡 Améliorations
              </div>
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2a2a" }}>
                {([
                  { key: "new" as const, label: "Nouvelle demande", badge: 0 },
                  { key: "active" as const, label: "Mes demandes", badge: resolvedCount },
                  { key: "history" as const, label: "Historique", badge: 0 },
                ]).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: "8px 14px", fontSize: 11, fontWeight: 700,
                      background: "transparent", border: "none", cursor: "pointer",
                      color: tab === t.key ? "#7c8196" : "#555",
                      borderBottom: tab === t.key ? "2px solid #7c8196" : "2px solid transparent",
                      marginBottom: -1, transition: "color 150ms",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                    {t.label}
                    {t.badge > 0 && (
                      <span style={{
                        minWidth: 14, height: 14, borderRadius: 999,
                        background: "#4ade80", color: "#000", fontSize: 8, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "0 3px",
                      }}>{t.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

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

              {/* ── Mes demandes (actifs + résolu non vu) ── */}
              {tab === "active" && (
                loadingFb ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#555", fontSize: 12 }}>Chargement…</div>
                ) : activeFeedback.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#444", fontSize: 12 }}>Aucune demande en cours.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)}
                  </div>
                )
              )}

              {/* ── Historique (résolu + déjà vu) ── */}
              {tab === "history" && (
                loadingFb ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#555", fontSize: 12 }}>Chargement…</div>
                ) : historyFeedback.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#444", fontSize: 12 }}>Aucun ticket clôturé.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {historyFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)}
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
