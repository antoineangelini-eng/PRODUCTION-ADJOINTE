"use client";
import { useRef, useState, useCallback } from "react";
import { DesignResineTable } from "@/components/sheet/DesignResineTable";
import { DesignResineLotPanel } from "@/components/sheet/DesignResineLotPanel";
import { useIncomingBanner } from "@/components/sheet/CaseToast";
import { IncomingCasesBanner } from "@/components/sheet/IncomingCasesBanner";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";

export function DesignResinePageClient({ focusId }: { focusId: string | null }) {
  const [isBusy, setIsBusy] = useState(false);
  const { toasts, addToasts, dismiss, dismissAll } = useIncomingBanner();
  const reloadRef = useRef<() => void>(() => {});
  const reloadFullRef = useRef<() => void>(() => {});

  // Lot panel
  const [lotOpen, setLotOpen] = useState(false);

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  const handleReloadFull = useCallback((fn: () => void) => { reloadFullRef.current = fn; }, []);
  const { hasPending, confirmRefresh } = usePollingRefresh(() => reloadRef.current?.(), isBusy);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Bouton saisie en lot */}
      <div style={{ flexShrink: 0, padding: "8px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setLotOpen(v => !v)}
          style={{
            padding: "7px 16px",
            background: lotOpen ? "rgba(129,140,248,0.15)" : "#1e1e1e",
            border: lotOpen ? "1px solid rgba(129,140,248,0.5)" : "1px solid rgba(129,140,248,0.3)",
            borderRadius: 8,
            color: "#7c8196",
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

      <RealtimeBanner hasPending={hasPending} isBusy={isBusy} onRefresh={confirmRefresh} />
      <IncomingCasesBanner toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} onIntegrate={() => reloadRef.current?.()} />

      {/* Lot panel */}
      <DesignResineLotPanel
        open={lotOpen}
        onOpenChange={setLotOpen}
        onSaved={() => {
          reloadFullRef.current?.();
        }}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <DesignResineTable
          focusId={focusId}
          onReload={handleReload}
          onReloadFull={handleReloadFull}
          onSelectionChange={setIsBusy}
          onNewCases={addToasts}
          onBannerClear={dismissAll}
        />
      </div>
    </div>
  );
}
