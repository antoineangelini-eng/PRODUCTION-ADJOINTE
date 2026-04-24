"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UsinageResineTable } from "@/components/sheet/UsinageResineTable";
import { UsinageResineLotPanel } from "@/components/sheet/UsinageResineLotPanel";
import { useIncomingBanner, type ToastCase } from "@/components/sheet/CaseToast";
import { IncomingCasesBanner } from "@/components/sheet/IncomingCasesBanner";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";

// ─── Constantes visuelles cohérentes avec UsinageResineTable ─────────────────
const PAGE_PX = "8px"; // même padding horizontal que le tableau

export function UsinageResinePageClient({ focusId }: { focusId: string | null; hideHeader?: boolean }) {
  // Lot panel
  const [lotOpen, setLotOpen]           = useState(false);
  const [lotFilledIds, setLotFilledIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());

  // Polling / realtime
  const [isBusy, setIsBusy]         = useState(false);
  const { toasts, addToasts, dismiss, dismissAll } = useIncomingBanner();
  const reloadRef                   = useRef<() => void>(() => {});
  const reloadFullRef               = useRef<() => void>(() => {});

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  const handleReloadFull = useCallback((fn: () => void) => { reloadFullRef.current = fn; }, []);
  usePollingRefresh(() => reloadRef.current?.(), isBusy);

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
      <IncomingCasesBanner toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} onIntegrate={() => reloadRef.current?.()} />

      {/* ── Lot panel ────────────────────────────────────────────────────────── */}
      <UsinageResineLotPanel
        open={lotOpen}
        onOpenChange={setLotOpen}
        onSaved={(ids: string[]) => {
          setLotFilledIds(prev => new Set([...prev, ...ids]));
          // Recharge le tableau (non-silent) pour que les valeurs saisies s'affichent
          reloadFullRef.current?.();
        }}
      />

      {/* ── Tableau ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <UsinageResineTable
          focusId={focusId}
          lotFilledIds={lotFilledIds}
          onReload={handleReload}
          onReloadFull={handleReloadFull}
          onSelectionChange={busy => setIsBusy(busy)}
          onNewCases={handleNewCases}
          onBannerClear={dismissAll}
          lotPanel={null}
        />
      </div>

    </div>
  );
}
