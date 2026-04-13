"use client";
import React, { useState } from "react";
import { submitFeedbackAction } from "@/app/app/feedback-actions";

export function FeedbackButton() {
  const [open, setOpen]         = useState(false);
  const [titre, setTitre]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priorite, setPriorite] = useState<"faible"|"normal"|"haute">("normal");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string|null>(null);

  async function submit() {
    if (!titre.trim() || !desc.trim()) return;
    setSaving(true); setError(null);
    const res = await submitFeedbackAction(titre, desc, priorite);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setTitre(""); setDesc(""); setPriorite("normal"); }, 1800);
  }

  const PRIO = [
    { value: "faible", label: "Faible",  color: "#a3a3a3" },
    { value: "normal", label: "Normal",  color: "#818cf8" },
    { value: "haute",  label: "Urgent",  color: "#f87171" },
  ];

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        title="Suggérer une amélioration"
        style={{
          height: 30, padding: "0 12px", borderRadius: 6,
          background: "transparent", border: "1px solid #2e2e2e",
          color: "#666", fontSize: 11, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          transition: "all 150ms",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)"; e.currentTarget.style.color = "#818cf8"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.color = "#666"; }}
      >
        💡 Amélioration
      </button>

      {/* Modale */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 20, width: 380 }}>

            {done ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Merci pour ta suggestion !</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>Elle sera traitée prochainement.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 16 }}>
                  💡 Suggérer une amélioration
                </div>

                {/* Titre */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#666", marginBottom: 4 }}>Titre</div>
                  <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex : Ajouter un tri par date..."
                    style={{ width: "100%", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, color: "white", fontSize: 12, padding: "7px 10px", outline: "none", boxSizing: "border-box" as const }} />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#666", marginBottom: 4 }}>Description</div>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Décris le besoin ou le problème..." rows={3}
                    style={{ width: "100%", background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, color: "white", fontSize: 12, padding: "7px 10px", outline: "none", resize: "none" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
                </div>

                {/* Priorité */}
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
                  <button onClick={() => setOpen(false)} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                  <button onClick={submit} disabled={saving || !titre.trim() || !desc.trim()}
                    style={{ background: !titre.trim() || !desc.trim() ? "#1e1e1e" : "rgba(129,140,248,0.1)", border: !titre.trim() || !desc.trim() ? "1px solid #2e2e2e" : "1px solid rgba(129,140,248,0.4)", color: !titre.trim() || !desc.trim() ? "#555" : "#818cf8", padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
