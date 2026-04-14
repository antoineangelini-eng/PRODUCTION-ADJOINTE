"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DesignMetalTable } from "@/components/sheet/DesignMetalTable";
import { CaseToastContainer, type ToastCase } from "@/components/sheet/CaseToast";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";
import { createCaseAction } from "@/app/app/design-metal/actions";
import { DesignMetalHistory } from "@/app/app/design-metal/DesignMetalHistory";

const NATURE_OPTIONS = [
  { value: "Chassis Argoat",   color: "#4ade80" },
  { value: "Chassis Dent All", color: "#22d3ee" },
  { value: "Définitif Résine", color: "#f472b6" },
];

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  background: "#121212",
  border: "1px solid #2a2a2a",
  borderRadius: 7,
  color: "#ffffff",
  fontSize: 12,
  outline: "none",
  height: 34,
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 34, padding: "0 14px",
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 7, color: "#ffffff",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8,
};

export function DesignMetalPageClient({ focusId }: { focusId: string | null }) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"production" | "historique">("production");

  // Production state
  const [searchInput,   setSearchInput]   = useState("");
  const [activeFocus,   setActiveFocus]   = useState<string | null>(focusId);
  const [searchFocused, setSearchFocused] = useState(false);
  const [caseNumber,    setCaseNumber]    = useState("");
  const [nature,        setNature]        = useState("");
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState<string | null>(null);
  const [isBusy,        setIsBusy]        = useState(false);
  const [toasts,        setToasts]        = useState<ToastCase[]>([]);
  const reloadRef = useRef<() => void>(() => {});

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  usePollingRefresh(() => reloadRef.current?.(), isBusy);

  function handleSearch() {
    const v = searchInput.trim();
    if (!v) return;
    setActiveFocus(v);
    router.replace(`?focus=${encodeURIComponent(v)}`, { scroll: false });
  }

  async function handleCreate() {
    if (!caseNumber.trim() || !nature) return;
    setCreating(true); setCreateError(null);
    try {
      const fd = new FormData();
      fd.set("case_number", caseNumber.trim());
      fd.set("nature_du_travail", nature);
      await createCaseAction(fd);
      setCaseNumber(""); setNature("");
      reloadRef.current?.();
    } catch (e: any) {
      setCreateError(e?.message ?? "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  const selectedNature = NATURE_OPTIONS.find(o => o.value === nature);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#111111" }}>

      {/* ── En-tête avec onglets ─────────────────────────────────────────── */}
      <div style={{ padding: "18px 16px 0 16px", background: "#111111", flexShrink: 0 }}>
        <h1 style={{ margin: "0 0 14px 0", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
          Design Métal
        </h1>

        {/* Onglets */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e" }}>
          {(["production", "historique"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 22px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", background: "transparent", border: "none",
              borderBottom: activeTab === tab ? "2px solid #4ade80" : "2px solid transparent",
              color: activeTab === tab ? "#4ade80" : "#555",
              transition: "all 150ms", marginBottom: -1,
            }}>
              {tab === "production" ? "⚙ Production" : "📋 Historique"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Production ───────────────────────────────────────────────────── */}
      {activeTab === "production" && (
        <>
          <div style={{ padding: "14px 16px", background: "#111111", flexShrink: 0, borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 28, flexWrap: "wrap" as const }}>

              {/* Créer */}
              <div style={{ display: "flex", flexDirection: "column" as const }}>
                <div style={labelStyle}>Créer un cas</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                  <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                    placeholder="N° du cas"
                    style={{ ...inputStyle, width: 110 }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.45)"; e.currentTarget.style.background = "rgba(74,222,128,0.03)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#121212"; }}
                  />
                  <div style={{ position: "relative" }}>
                    <select value={nature} onChange={e => setNature(e.target.value)}
                      style={{ ...inputStyle, minWidth: 160, padding: "7px 30px 7px 10px", appearance: "none", WebkitAppearance: "none", cursor: "pointer", color: selectedNature ? selectedNature.color : "#7a7a7a", background: selectedNature ? `${selectedNature.color}12` : "#121212", border: selectedNature ? `1px solid ${selectedNature.color}55` : "1px solid #2a2a2a", fontWeight: selectedNature ? 600 : 500 }}>
                      <option value="" style={{ background: "#111111", color: "#7a7a7a" }}>Nature</option>
                      {NATURE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#111111", color: o.color }}>{o.value}</option>)}
                    </select>
                    <svg viewBox="0 0 10 6" width="10" height="10" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.7 }} fill="none" stroke="#8a8a8a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg>
                  </div>
                  <button onClick={handleCreate} disabled={creating || !caseNumber.trim() || !nature}
                    style={{ height: 34, padding: "0 16px", background: creating || !caseNumber.trim() || !nature ? "#121212" : "rgba(74,222,128,0.10)", border: creating || !caseNumber.trim() || !nature ? "1px solid #2a2a2a" : "1px solid rgba(74,222,128,0.55)", borderRadius: 7, color: creating || !caseNumber.trim() || !nature ? "#5f5f5f" : "#4ade80", fontSize: 12, fontWeight: 700, cursor: creating || !caseNumber.trim() || !nature ? "not-allowed" : "pointer" }}>
                    {creating ? "…" : "Créer"}
                  </button>
                  {createError && <span style={{ fontSize: 11, color: "#f87171" }}>{createError}</span>}
                </div>
              </div>

              {/* Rechercher */}
              <div style={{ display: "flex", flexDirection: "column" as const }}>
                <div style={labelStyle}>Rechercher un cas</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="N° du cas..."
                    style={{ ...inputStyle, width: 160, background: searchFocused ? "rgba(74,222,128,0.03)" : "#121212", border: searchFocused ? "1px solid rgba(74,222,128,0.45)" : "1px solid #2a2a2a" }}
                  />
                  <button onClick={handleSearch} style={secondaryButtonStyle}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.background = "#202020"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#1a1a1a"; }}>
                    Rechercher
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <DesignMetalTable
              focusId={activeFocus}
              currentUserId=""
              currentSector=""
              onReload={handleReload}
              onSelectionChange={setIsBusy}
            />
          </div>

          <CaseToastContainer
            toasts={toasts as any}
            onDismiss={(toastId: string) => setToasts(prev => prev.filter(x => x.id !== toastId))}
          />
        </>
      )}

      {/* ── Historique ───────────────────────────────────────────────────── */}
      {activeTab === "historique" && (
        <div style={{ flex: 1, minHeight: 0, padding: "0 16px 16px", overflow: "hidden", display: "flex", flexDirection: "column" as const }}>
          <DesignMetalHistory />
        </div>
      )}
    </div>
  );
}
