"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { FinitionTable } from "@/components/sheet/FinitionTable";
import { FinitionScanner } from "@/components/sheet/FinitionScanner";
import { getFinitionStatsAction } from "@/app/app/finition/actions";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";
import { RealtimeBanner } from "@/components/sheet/RealtimeBanner";
import { useIncomingBanner } from "@/components/sheet/CaseToast";
import { IncomingCasesBanner } from "@/components/sheet/IncomingCasesBanner";

type Tab = "all" | "today" | "tomorrow" | "late";

export function FinitionPageClient(_props: { hideHeader?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [stats, setStats] = useState({
    validatedToday: 0, totalToday: 0, late: 0, countToday: 0, countTomorrow: 0,
  });
  const reloadRef = useRef<(() => void) | null>(null);
  const { toasts, addToasts, dismiss, dismissAll } = useIncomingBanner();

  const refreshStats = useCallback(async () => {
    try { setStats(await getFinitionStatsAction()); } catch {}
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const { hasPending, confirmRefresh } = usePollingRefresh(() => {
    reloadRef.current?.();
    refreshStats();
  }, isBusy);

  function handleValidated() {
    reloadRef.current?.();
    refreshStats();
  }

  const TABS: { id: Tab; label: string; count?: number; countColor?: string }[] = [
    { id: "all",      label: "Tous les dossiers" },
    { id: "today",    label: "Aujourd'hui", count: stats.countToday,    countColor: "#f59e0b" },
    { id: "tomorrow", label: "Demain",      count: stats.countTomorrow, countColor: "#4ade80" },
    { id: "late",     label: "En retard",   count: stats.late,          countColor: "#f87171" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flexShrink:0, background:"#0b0b0b", padding:"10px 20px 0", borderBottom:"1px solid #1a1a1a" }}>
        <div style={{ marginBottom:10 }}>
          <h1 style={{ margin:0, fontSize:18 }}>Finition</h1>
        </div>
        <div style={{ display:"flex", gap:0 }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            const isToday  = t.id === "today";
            const isLate   = t.id === "late";
            const activeColor = isLate ? "#f87171" : isToday ? "#f59e0b" : "#4ade80";
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:"8px 18px", background:"transparent", border:"none",
                borderBottom: isActive ? `2px solid ${activeColor}` : "2px solid transparent",
                color: isActive ? activeColor : "white",
                cursor:"pointer", fontSize:13, fontWeight: isActive ? 700 : 400,
                transition:"all 150ms", display:"flex", alignItems:"center", gap:5,
              }}>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                    <span style={{ fontSize:8, color: t.countColor, lineHeight:1 }}>●</span>
                    <span style={{ fontSize:11, color: t.countColor, fontWeight:700 }}>{t.count}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <RealtimeBanner hasPending={hasPending} isBusy={isBusy} onRefresh={confirmRefresh} />
      <IncomingCasesBanner toasts={toasts} onDismiss={dismiss} onDismissAll={dismissAll} />

      <div style={{ flex:1, minHeight:0, display:"flex" }}>
        <div style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <FinitionTable
            filter={tab}
            onReload={fn => { reloadRef.current = fn; }}
            highlightId={highlightId}
            onSelectionChange={setIsBusy}
            onNewCases={addToasts}
          />
        </div>
        <div style={{
          flexShrink:0, width:280, borderLeft:"1px solid #1a1a1a",
          background:"#0b0b0b", display:"flex", flexDirection:"column", height:"100%",
        }}>
          <FinitionScanner
            onValidated={handleValidated}
            validatedToday={stats.validatedToday}
            totalToday={stats.totalToday}
            late={stats.late}
          />
        </div>
      </div>

    </div>
  );
}
