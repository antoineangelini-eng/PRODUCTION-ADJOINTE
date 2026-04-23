"use client";
import { useState, useEffect } from "react";
import { GlobalView }          from "@/components/sheet/GlobalView";
import { UsersManager }        from "@/components/sheet/UsersManager";
import { WorkingDaysManager }  from "@/components/sheet/WorkingDaysManager";
import { AdminResetPanel }     from "@/components/sheet/AdminResetPanel";
import { FeedbackManager }        from "@/components/FeedbackManager";
import { DashboardView }          from "@/components/sheet/DashboardView";
import { AnnouncementsManager }   from "@/components/sheet/AnnouncementsManager";
import { PrintersManager }        from "@/components/sheet/PrintersManager";
import { getFeedbackCountAction } from "@/app/app/feedback-actions";

type Tab = "dashboard" | "global" | "users" | "days" | "announcements" | "printers" | "reset" | "feedback";

const TABS: { id: Tab; label: string; color?: string }[] = [
  { id: "dashboard", label: "📊 Tableau de bord" },
  { id: "global",   label: "Vue globale" },
  { id: "users",    label: "Utilisateurs" },
  { id: "days",           label: "Jours ouvrés" },
  { id: "announcements", label: "📢 Nouveautés" },
  { id: "printers",      label: "🖨️ Imprimantes" },
  { id: "feedback",      label: "💡 Améliorations", color: "#7c8196" },
  { id: "reset",    label: "Réinitialisation", color: "#f87171" },
];

export function AdminPageClient() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    getFeedbackCountAction().then(setFeedbackCount);
    const interval = setInterval(() => getFeedbackCountAction().then(setFeedbackCount), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#111", padding: "16px 8px 0" }}>

      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0", margin: "0 0 14px 0", letterSpacing: "-0.01em", lineHeight: 1 }}>
        Admin
      </h1>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            borderRadius: "8px 8px 0 0", border: "1px solid transparent", borderBottom: "none",
            background: tab === t.id ? "#1a1a1a" : "transparent",
            color: tab === t.id ? "#ffffff" : "#888",
            borderColor: tab === t.id ? "#2a2a2a" : "transparent",
            transition: "all 150ms", position: "relative" as const,
          }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = "#ccc"; }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = "#888"; }}
          >
            {t.label}
            {t.id === "feedback" && feedbackCount > 0 && (
              <span style={{
                marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 17, height: 17, borderRadius: 9, padding: "0 4px",
                background: "#7c8196",
                color: "white",
                fontSize: 10, fontWeight: 800, verticalAlign: "middle",
                boxShadow: "0 0 0 2px rgba(129,140,248,0.2)",
              }}>
                {feedbackCount > 99 ? "99+" : feedbackCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, background: "#1a1a1a", border: "1px solid #272727", borderRadius: "0 10px 10px 10px", padding: "0 16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "dashboard" && <DashboardView />}
        {tab === "global"   && <GlobalView />}
        {tab === "users"    && <UsersManager />}
        {tab === "days"     && <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}><WorkingDaysManager /></div>}
        {tab === "announcements" && <AnnouncementsManager />}
        {tab === "printers"      && <PrintersManager />}
        {tab === "feedback" && <FeedbackManager onCountChange={setFeedbackCount} />}
        {tab === "reset"    && <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}><AdminResetPanel /></div>}
      </div>
    </div>
  );
}
