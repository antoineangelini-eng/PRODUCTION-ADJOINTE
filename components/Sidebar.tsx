"use client";
import { useState, useEffect } from "react";
import NavLink from "@/components/navigation/NavLinkClient";
import { getFeedbackCountAction } from "@/app/app/feedback-actions";

type Props = { sector: string; isAdmin: boolean };

function sectorToPath(sector: string) {
  switch (sector) {
    case "design_metal":   return "/app/design-metal";
    case "design_resine":  return "/app/design-resine";
    case "usinage_titane": return "/app/usinage-titane";
    case "usinage_resine": return "/app/usinage-resine";
    case "finition":       return "/app/finition";
    case "admin":          return "/app/admin";
    default:               return "/app";
  }
}

const SIDEBAR_W_CLOSED = 58;
const SIDEBAR_W_OPEN   = 210;

function SectionLabel({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      fontSize: 10, color: "#3a3a3a", padding: "12px 10px 5px",
      fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const,
      whiteSpace: "nowrap" as const, borderTop: "1px solid #1e1e1e", marginTop: 4,
    }}>
      {label}
    </div>
  );
}

export function Sidebar({ sector, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    getFeedbackCountAction().then(setFeedbackCount);
    const interval = setInterval(() => {
      getFeedbackCountAction().then(setFeedbackCount);
    }, 120_000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <div style={{ width: SIDEBAR_W_CLOSED, flexShrink: 0, position: "relative" }}>
      <aside
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          position: "fixed", top: 58, left: 0,
          height: "calc(100vh - 58px)",
          width: open ? SIDEBAR_W_OPEN : SIDEBAR_W_CLOSED,
          transition: "width 180ms ease",
          background: "#0c0c0c", borderRight: "1px solid #1e1e1e",
          overflow: "hidden", zIndex: 20,
          boxShadow: open ? "6px 0 20px rgba(0,0,0,0.6)" : "none",
        }}
      >
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 6px" }}>
          <NavLink href="/app" icon="🏠" expanded={open}>Accueil</NavLink>

          {isAdmin ? (
            <>
              {/* Admin avec badge */}
              <div style={{ position: "relative" }}>
                <NavLink href="/app/admin" icon="🛠️" expanded={open}>Admin</NavLink>
                {feedbackCount > 0 && (
                  <div style={{
                    position: "absolute", top: 5, right: open ? 8 : 5,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: "#7c8196", color: "white",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", pointerEvents: "none",
                    transition: "right 180ms ease",
                    zIndex: 1,
                  }}>
                    {feedbackCount > 99 ? "99+" : feedbackCount}
                  </div>
                )}
              </div>

              <SectionLabel label="Secteurs" visible={open} />
              <NavLink href="/app/design-metal"   icon="🧱" expanded={open}>Design Métal</NavLink>
              <NavLink href="/app/design-resine"  icon="🧪" expanded={open}>Design Résine</NavLink>
              <NavLink href="/app/usinage-titane" icon="⚙️" expanded={open}>Usinage Titane</NavLink>
              <NavLink href="/app/usinage-resine" icon="🦷" expanded={open}>Usinage Résine</NavLink>
              <NavLink href="/app/finition"       icon="✅" expanded={open}>Finition</NavLink>
              <SectionLabel label="Outils" visible={open} />
              <NavLink href="/app/admin/dashboard" icon="📊" expanded={open}>Tableau de bord</NavLink>
              <NavLink href="/app/history" icon="📖" expanded={open}>Historique</NavLink>
            </>
          ) : (
            <>
              <NavLink href={sectorToPath(sector)} icon="📌" expanded={open}>Mon secteur</NavLink>
              <NavLink href="/app/history"         icon="📖" expanded={open}>Historique</NavLink>
              <NavLink href="/app/admin"           icon="🗺️" expanded={open}>Vue globale</NavLink>
            </>
          )}
        </nav>
      </aside>
    </div>
  );
}
