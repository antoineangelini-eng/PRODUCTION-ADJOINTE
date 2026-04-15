"use client";
import { useRef, useState, useCallback } from "react";
import { UsinageTitaneTable } from "@/components/sheet/UsinageTitaneTable";
import { useIncomingBanner } from "@/components/sheet/CaseToast";
import { IncomingCasesBanner } from "@/components/sheet/IncomingCasesBanner";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";

export function UsinageTitanePageClient({ focusId }: { focusId: string | null }) {
  const [isBusy, setIsBusy] = useState(false);
  const { toasts, addToasts, dismiss, dismissAll } = useIncomingBanner();
  const reloadRef = useRef<() => void>(() => {});

  const handleReload = useCallback((fn: () => void) => { reloadRef.current = fn; }, []);
  const { hasPending, confirmRefresh } = usePollingRefresh(() => reloadRef.current?.(), isBusy);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RealtimeBanner hasPending={hasPending} isBusy={isBusy} onRefresh={confirmRefresh} />
      <IncomingCasesBanner toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <UsinageTitaneTable
          focusId={focusId}
          onReload={handleReload}
          onSelectionChange={setIsBusy}
          onNewCases={addToasts}
        />
      </div>
    </div>
  );
}
