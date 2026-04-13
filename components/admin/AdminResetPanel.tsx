"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminResetSectorsAction } from "@/app/app/admin/actions";

const ALL_SECTORS = [
  { code: "design_metal", label: "Design Métal", icon: "🧱" },
  { code: "design_resine", label: "Design Résine", icon: "🧪" },
  { code: "usinage_titane", label: "Usinage Titane", icon: "⚙️" },
  { code: "usinage_resine", label: "Usinage Résine", icon: "🦷" },
  { code: "finition", label: "Finition", icon: "✅" },
];

export function AdminResetPanel() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<"all" | "selected" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function toggleSector(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  }

  async function handleReset(mode: "all" | "selected") {
    setLoading(true);
    setResult(null);
    try {
      const sectors = mode === "all" ? null : selected;
      await adminResetSectorsAction(sectors);
      setResult({
        ok: true,
        message:
          mode === "all"
            ? "Tous les tableaux ont été réinitialisés."
            : `${selected.length} secteur(s) réinitialisé(s).`,
      });
      setSelected([]);
      setConfirm(null);
      router.refresh();
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        padding: "20px 24px",
        border: "1px solid #3a1a1a",
        borderRadius: 12,
        background: "rgba(120,40,40,0.08)",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: "#f87171" }}>
        ⚠️ Zone de réinitialisation
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        Réservé aux tests. Cette action supprime les données des secteurs sélectionnés.
      </div>

      {/* Résultat */}
      {result && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: result.ok ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: result.ok ? "#4ade80" : "#f87171",
            fontSize: 13,
          }}
        >
          {result.ok ? "✓" : "✗"} {result.message}
        </div>
      )}

      {/* Sélection secteurs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 600 }}>
          SÉLECTIONNER LES SECTEURS À RÉINITIALISER
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALL_SECTORS.map((s) => {
            const active = selected.includes(s.code);
            return (
              <button
                key={s.code}
                onClick={() => toggleSector(s.code)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: active ? "1px solid #f87171" : "1px solid #333",
                  background: active ? "rgba(248,113,113,0.12)" : "transparent",
                  color: active ? "#f87171" : "#888",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                }}
              >
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Boutons d'action */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

        {/* Reset secteurs sélectionnés */}
        {selected.length > 0 && confirm !== "selected" && (
          <button
            onClick={() => setConfirm("selected")}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #f87171",
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Réinitialiser {selected.length} secteur{selected.length > 1 ? "s" : ""}
          </button>
        )}

        {/* Confirmation reset sélection */}
        {confirm === "selected" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#f87171" }}>Confirmer ?</span>
            <button
              onClick={() => void handleReset("selected")}
              disabled={loading}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #f87171",
                background: "rgba(248,113,113,0.2)",
                color: "#f87171",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {loading ? "..." : "Oui, réinitialiser"}
            </button>
            <button
              onClick={() => setConfirm(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "transparent",
                color: "#888",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Annuler
            </button>
          </div>
        )}

        {/* Reset tout */}
        {confirm !== "all" && (
          <button
            onClick={() => setConfirm("all")}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #7f1d1d",
              background: "rgba(127,29,29,0.2)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            🗑️ Tout réinitialiser
          </button>
        )}

        {/* Confirmation reset tout */}
        {confirm === "all" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#fca5a5" }}>
              ⚠️ Supprimer TOUS les dossiers ?
            </span>
            <button
              onClick={() => void handleReset("all")}
              disabled={loading}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #7f1d1d",
                background: "rgba(127,29,29,0.3)",
                color: "#fca5a5",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {loading ? "..." : "Oui, tout supprimer"}
            </button>
            <button
              onClick={() => setConfirm(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "transparent",
                color: "#888",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
