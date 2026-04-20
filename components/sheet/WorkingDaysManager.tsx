"use client";
import { useEffect, useState, useCallback } from "react";
import { loadWorkingDaysAction, saveWorkingDaysAction } from "@/app/app/admin/actions";

const NATURES = [
  { name: "Chassis Argoat",    color: "#e07070", default: 5 },
  { name: "Chassis Dent All",  color: "#4ade80", default: 5 },
  { name: "Définitif Résine",  color: "#c4a882", default: 3 },
  { name: "Provisoire Résine", color: "#9487a8", default: 3 },
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function WorkingDaysManager() {
  const [config, setConfig]   = useState<Record<string, number>>({});
  const [states, setStates]   = useState<Record<string, SaveState>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await loadWorkingDaysAction();
    const map: Record<string, number> = {};
    for (const n of NATURES) map[n.name] = n.default; // defaults
    for (const r of rows) map[r.nature] = r.days;
    setConfig(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setDays(nature: string, delta: number) {
    setConfig(prev => ({
      ...prev,
      [nature]: Math.max(1, Math.min(30, (prev[nature] ?? 5) + delta)),
    }));
    // Reset saved state on change
    setStates(prev => ({ ...prev, [nature]: "idle" }));
  }

  async function save(nature: string) {
    setStates(prev => ({ ...prev, [nature]: "saving" }));
    try {
      await saveWorkingDaysAction(nature, config[nature] ?? 5);
      setStates(prev => ({ ...prev, [nature]: "saved" }));
      setTimeout(() => setStates(prev => ({ ...prev, [nature]: "idle" })), 2000);
    } catch {
      setStates(prev => ({ ...prev, [nature]: "error" }));
      setTimeout(() => setStates(prev => ({ ...prev, [nature]: "idle" })), 3000);
    }
  }

  if (loading) return <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>;

  return (
    <div style={{ maxWidth: 520, padding: "10px 0" }}>
      <p style={{ fontSize: 11, color: "#555", marginBottom: 20 }}>
        Délai de livraison calculé automatiquement à la création du cas (jours ouvrés, hors week-ends).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {NATURES.map((nat, i) => {
          const days  = config[nat.name] ?? nat.default;
          const state = states[nat.name] ?? "idle";
          const isLast = i === NATURES.length - 1;

          return (
            <div key={nat.name} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 0",
              borderBottom: isLast ? "none" : "1px solid #1e1e1e",
            }}>
              {/* Dot couleur */}
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: nat.color, flexShrink: 0 }} />

              {/* Nom nature */}
              <span style={{ fontSize: 13, color: "#d0d0d0", fontWeight: 500, flex: 1 }}>{nat.name}</span>

              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <button
                  onClick={() => setDays(nat.name, -1)}
                  style={{ width: 28, height: 28, background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "6px 0 0 6px", color: "#aaa", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 100ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1e1e1e"}
                >−</button>
                <div style={{ width: 40, textAlign: "center", fontSize: 14, fontWeight: 700, color: "white", background: "#161616", borderTop: "1px solid #2a2a2a", borderBottom: "1px solid #2a2a2a", height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {days}
                </div>
                <button
                  onClick={() => setDays(nat.name, +1)}
                  style={{ width: 28, height: 28, background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "0 6px 6px 0", color: "#aaa", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 100ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1e1e1e"}
                >+</button>
              </div>

              {/* Label */}
              <span style={{ fontSize: 10, color: "#555", width: 70 }}>
                jour{days > 1 ? "s" : ""} ouvré{days > 1 ? "s" : ""}
              </span>

              {/* Bouton sauvegarder */}
              <button
                onClick={() => save(nat.name)}
                disabled={state === "saving"}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: state === "saving" ? "not-allowed" : "pointer", transition: "all 150ms",
                  background: state === "saved" ? "rgba(74,222,128,0.15)" : state === "error" ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.08)",
                  border: state === "saved" ? "1px solid rgba(74,222,128,0.5)" : state === "error" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(74,222,128,0.3)",
                  color: state === "saved" ? "#4ade80" : state === "error" ? "#f87171" : "#4ade80",
                  minWidth: 100,
                }}
              >
                {state === "saving" ? "Sauvegarde…"
                  : state === "saved" ? "✓ Sauvegardé"
                  : state === "error" ? "✕ Erreur"
                  : "Sauvegarder"}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
