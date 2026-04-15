"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UsinageResineTable } from "@/components/sheet/UsinageResineTable";
import { UsinageResineLotPanel } from "@/components/sheet/UsinageResineLotPanel";
import { useIncomingBanner, type ToastCase } from "@/components/sheet/CaseToast";
import { IncomingCasesBanner } from "@/components/sheet/IncomingCasesBanner";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";
import { useRouter } from "next/navigation";

// ─── Constantes visuelles cohérentes avec UsinageResineTable ─────────────────
const PAGE_PX = "8px"; // même padding horizontal que le tableau

export function UsinageResinePageClient({ focusId }: { focusId: string | null; hideHeader?: boolean }) {
  const router = useRouter();

  // Recherche
  const [searchInput, setSearchInput]     = useState("");
  const [activeFocus, setActiveFocus]     = useState<string | null>(focusId);
  const [searchFocused, setSearchFocused] = useState(false);

  // Lot panel
  const [lotOpen, setLotOpen]           = useState(false);
  const [lotFilledIds, setLotFilledIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());

  // Polling / realtime
  const [isBusy, setIsBusy]         = useState(false);
  const { toasts, addToasts, dismiss, dismissAll } = useIncomingBanner();
  const reloadRef                   = useRef<() => void>(() => {});

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  usePollingRefresh(() => reloadRef.current?.(), isBusy);

  function handleSearch() {
    const v = searchInput.trim();
    if (!v) return;
    setActiveFocus(v);
    router.replace(`?focus=${encodeURIComponent(v)}`, { scroll: false });
  }

  function handleNewCases(cases: ToastCase[]) {
    addToasts(cases);
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
      background: "#111",
    }}>

      {/* ── En-tête de page ──────────────────────────────────────────────────── */}
      <div style={{
        padding: `16px ${PAGE_PX} 0 ${PAGE_PX}`,
        background: "#111",
        flexShrink: 0,
      }}>

        {/* Titre */}
        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#e0e0e0",
          margin: "0 0 14px 0",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}>
          Usinage Résine
        </h1>

        {/* Barre recherche + bouton saisie en lot */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          {/* Zone recherche */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              color: "white",           // ← blanc, lisible
              letterSpacing: "0.01em",
            }}>
              Rechercher un cas
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                placeholder="N° du cas..."
                style={{
                  padding: "6px 10px",
                  background: searchFocused ? "rgba(74,222,128,0.04)" : "#1e1e1e",
                  border: searchFocused ? "1px solid rgba(74,222,128,0.4)" : "1px solid #2e2e2e",
                  borderRadius: 7,
                  color: "white",
                  fontSize: 12,
                  outline: "none",
                  width: 140,
                  transition: "all 150ms",
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: "6px 14px",
                  background: "#1e1e1e",
                  border: "1px solid #2e2e2e",
                  borderRadius: 7,
                  color: "#ccc",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.color = "#ccc"; }}
              >
                Rechercher
              </button>
            </div>
          </div>

          {/* Saisie en lot — violet, ouvre directement le panel */}
          <button
            onClick={() => setLotOpen(v => !v)}
            style={{
              padding: "8px 18px",
              background: lotOpen ? "rgba(129,140,248,0.15)" : "#1e1e1e",
              border: lotOpen ? "1px solid rgba(129,140,248,0.5)" : "1px solid rgba(129,140,248,0.3)",
              borderRadius: 8,
              color: "#7c8196",          // ← violet constant (ouvert ou fermé)
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(129,140,248,0.12)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = lotOpen ? "rgba(129,140,248,0.15)" : "#1e1e1e"; e.currentTarget.style.borderColor = lotOpen ? "rgba(129,140,248,0.5)" : "rgba(129,140,248,0.3)"; }}
          >
            {lotOpen ? "✕ Fermer le lot" : "Saisie en lot"}
          </button>
        </div>

        {/* Séparateur */}
        <div style={{ height: 1, background: "#1e1e1e", margin: `0 0 0 0` }} />
      </div>

      {/* ── Bandeau realtime ─────────────────────────────────────────────────── */}
      <RealtimeBanner hasPending={false} isBusy={isBusy} onRefresh={() => reloadRef.current?.()} />
      <IncomingCasesBanner toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} />

      {/* ── Lot panel ────────────────────────────────────────────────────────── */}
      <UsinageResineLotPanel
        open={lotOpen}
        onOpenChange={setLotOpen}
        onSaved={(ids: string[]) => {
          setLotFilledIds(prev => new Set([...prev, ...ids]));
          // Recharge le tableau pour que les pancartes affichent les valeurs saisies en lot
          reloadRef.current?.();
        }}
      />

      {/* ── Tableau ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <UsinageResineTable
          focusId={activeFocus}
          lotFilledIds={lotFilledIds}
          onReload={handleReload}
          onSelectionChange={busy => setIsBusy(busy)}
          onNewCases={handleNewCases}
          lotPanel={null}
        />
      </div>

    </div>
  );
}
