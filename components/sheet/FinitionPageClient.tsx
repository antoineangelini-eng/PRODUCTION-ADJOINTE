"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { FinitionTable } from "@/components/sheet/FinitionTable";
import { FinitionScanner } from "@/components/sheet/FinitionScanner";
import { getFinitionStatsAction, type ScanValidateItem } from "@/app/app/finition/actions";
import { usePollingRefresh } from "@/hooks/usePollingRefresh";

type Tab = "all" | "today" | "tomorrow" | "late" | "prio_today" | "prio_j1" | "prio_j2";

export function FinitionPageClient(_props: { hideHeader?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [receptionMode, setReceptionMode] = useState<"metal" | "resine">("metal");
  const [stats, setStats] = useState({
    validatedToday: 0, totalToday: 0, late: 0, countToday: 0, countTomorrow: 0, prioToday: 0, prioJ1: 0, prioJ2: 0,
  });
  const [scanResults, setScanResults] = useState<ScanValidateItem[] | null>(null);
  const reloadRef = useRef<(() => void) | null>(null);

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
    <div style={{ display:"flex", height:"100%" }}>
      {/* ── Colonne gauche : en-tête + tableau ── */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", height:"100%" }}>
        <div style={{ flexShrink:0, background:"#0b0b0b", padding:"10px 20px 0", borderBottom:"1px solid #1a1a1a" }}>
          <div style={{ marginBottom:10 }}>
            <h1 style={{ margin:0, fontSize:18 }}>Finition</h1>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:0 }}>
            {/* Tous les dossiers — hors groupe */}
            {(() => {
              const t = TABS[0];
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding:"8px 18px", background:"transparent", border:"none",
                  borderBottom: isActive ? "2px solid #4ade80" : "2px solid transparent",
                  color: isActive ? "#4ade80" : "white",
                  cursor:"pointer", fontSize:13, fontWeight: isActive ? 700 : 400,
                  transition:"all 150ms",
                }}>
                  {t.label}
                </button>
              );
            })()}

            {/* Séparateur */}
            <div style={{ width:1, height:32, background:"#444", margin:"0 10px", alignSelf:"center" }} />

            {/* Groupe Réception */}
            <div style={{ display:"flex", flexDirection:"column", borderRadius:"10px 10px 0 0", overflow:"hidden", border:"1px solid #2a2a2a", borderBottom:"none" }}>
              <div style={{ padding:"5px 16px", background:"#1a1a1a" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#ccc", textTransform:"uppercase", letterSpacing:"0.1em" }}>Réception</span>
              </div>
              <div style={{ display:"flex", gap:0, background:"#111" }}>
              {TABS.slice(1).map(t => {
                const isActive = tab === t.id;
                const isLate   = t.id === "late";
                const isToday  = t.id === "today";
                const activeColor = isLate ? "#f87171" : isToday ? "#f59e0b" : "#4ade80";
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    padding:"8px 18px", background: isActive ? "rgba(255,255,255,0.03)" : "transparent", border:"none",
                    borderBottom: isActive ? `2px solid ${activeColor}` : "2px solid transparent",
                    color: isActive ? activeColor : "#999",
                    cursor:"pointer", fontSize:12, fontWeight: isActive ? 700 : 500,
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

            {/* Séparateur */}
            <div style={{ width:1, height:32, background:"#444", margin:"0 10px", alignSelf:"center" }} />

            {/* Groupe Priorité */}
            <div style={{ display:"flex", flexDirection:"column", borderRadius:"10px 10px 0 0", overflow:"hidden", border:"1px solid #2a2a2a", borderBottom:"none" }}>
              <div style={{ padding:"5px 16px", background:"#1a1a1a" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#ccc", textTransform:"uppercase", letterSpacing:"0.1em" }}>Priorité</span>
              </div>
              <div style={{ display:"flex", gap:0, background:"#111" }}>
                {([
                  { id: "prio_today" as Tab, label: "Urgent",  count: stats.prioToday, color: "#ef4444" },
                  { id: "prio_j1"    as Tab, label: "J+1",     count: stats.prioJ1,    color: "#f59e0b" },
                  { id: "prio_j2"    as Tab, label: "J+2",     count: stats.prioJ2,    color: "#a78bfa" },
                ]).map(t => {
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                      padding:"8px 18px", background: isActive ? "rgba(255,255,255,0.03)" : "transparent", border:"none",
                      borderBottom: isActive ? `2px solid ${t.color}` : "2px solid transparent",
                      color: isActive ? t.color : "#999",
                      cursor:"pointer", fontSize:12, fontWeight: isActive ? 700 : 500,
                      transition:"all 150ms", display:"flex", alignItems:"center", gap:5,
                    }}>
                      {t.label}
                      {t.count > 0 && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                          <span style={{ fontSize:8, color: t.color, lineHeight:1 }}>●</span>
                          <span style={{ fontSize:11, color: t.color, fontWeight:700 }}>{t.count}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <FinitionTable
            filter={tab}
            onReload={fn => { reloadRef.current = fn; }}
            highlightId={highlightId}
            onSelectionChange={setIsBusy}
            receptionMode={receptionMode}
            onReceptionModeChange={setReceptionMode}
            scanValidateResults={scanResults}
            onDismissScanResults={() => setScanResults(null)}
          />
        </div>
      </div>

      {/* ── Colonne droite : scanner aligné en haut ── */}
      <div style={{
        flexShrink:0, width:280, borderLeft:"1px solid #1a1a1a",
        background:"#0b0b0b", display:"flex", flexDirection:"column",
        height:"100%", minHeight:0, overflow:"hidden",
      }}>
        <FinitionScanner
          onValidated={handleValidated}
          onScanValidateResults={setScanResults}
          validatedToday={stats.validatedToday}
          totalToday={stats.totalToday}
          late={stats.late}
          receptionMode={receptionMode}
          onReceptionModeChange={setReceptionMode}
        />
      </div>
    </div>
  );
}
