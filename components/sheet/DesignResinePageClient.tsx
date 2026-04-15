"use client";
import { useRef, useState, useCallback } from "react";
import { DesignResineTable } from "@/components/sheet/DesignResineTable";
import { CaseToastContainer, useCaseToasts } from "@/components/sheet/CaseToast";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";

export function DesignResinePageClient({ focusId }: { focusId: string | null }) {
  const [isBusy, setIsBusy] = useState(false);
  const { toasts, addToasts, dismiss } = useCaseToasts();
  const reloadRef = useRef<() => void>(() => {});

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  const { hasPending, confirmRefresh } = usePollingRefresh(() => reloadRef.current?.(), isBusy);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RealtimeBanner hasPending={hasPending} isBusy={isBusy} onRefresh={confirmRefresh} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <DesignResineTable
          focusId={focusId}
          onReload={handleReload}
          onSelectionChange={setIsBusy}
          onNewCases={addToasts}
        />
      </div>
      <CaseToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
