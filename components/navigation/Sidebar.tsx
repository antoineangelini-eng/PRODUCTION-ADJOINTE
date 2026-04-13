"use client";
import { useState } from "react";
import NavLink from "@/components/navigation/NavLinkClient";
import {
  IconAdmin, IconDesignMetal, IconDesignResine,
  IconUsinageTitane, IconUsinageResine, IconFinition, IconGlobal,
} from "@/components/navigation/SidebarIcons";

type Props = { sector: string; sectors: string[]; isAdmin: boolean };

const SECTOR_NAV = [
  { code: "design_metal",   path: "/app/design-metal",   label: "Design Métal",   icon: <IconDesignMetal /> },
  { code: "design_resine",  path: "/app/design-resine",  label: "Design Résine",  icon: <IconDesignResine /> },
  { code: "usinage_titane", path: "/app/usinage-titane", label: "Usinage Titane", icon: <IconUsinageTitane /> },
  { code: "usinage_resine", path: "/app/usinage-resine", label: "Usinage Résine", icon: <IconUsinageResine /> },
  { code: "finition",       path: "/app/finition",       label: "Finition",       icon: <IconFinition /> },
];

export function Sidebar({ sectors, isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  // Pour non-admin, filtrer les secteurs de l'utilisateur (hors "admin")
  const userSectorLinks = isAdmin
    ? SECTOR_NAV
    : SECTOR_NAV.filter((s) => sectors.includes(s.code));

  return (
    <div style={{ width: 58, flexShrink: 0, position: "relative" }}>
      <aside
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          position: "fixed", top: 58, left: 0,
          height: "calc(100vh - 58px)",
          width: open ? 220 : 58,
          transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#0d0d0d",
          overflow: "hidden", zIndex: 20,
          boxShadow: open ? "6px 0 32px rgba(0,0,0,0.6)" : "none",
        }}
      >
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 8px" }}>
          {isAdmin && (
            <>
              <NavLink href="/app/admin" icon={<IconAdmin />} expanded={open}>Admin</NavLink>
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "6px 10px" }} />
              <div style={{
                fontSize: 9, color: "#444", padding: "4px 12px 2px",
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                whiteSpace: "nowrap",
                opacity: open ? 1 : 0,
                transition: "opacity 150ms ease",
              }}>
                Secteurs
              </div>
            </>
          )}

          {!isAdmin && userSectorLinks.length > 1 && (
            <div style={{
              fontSize: 9, color: "#444", padding: "4px 12px 2px",
              fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              whiteSpace: "nowrap",
              opacity: open ? 1 : 0,
              transition: "opacity 150ms ease",
            }}>
              Mes secteurs
            </div>
          )}

          {userSectorLinks.map((s) => (
            <NavLink key={s.code} href={s.path} icon={s.icon} expanded={open}>{s.label}</NavLink>
          ))}

          {!isAdmin && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "6px 10px" }} />
              <NavLink href="/app/admin" icon={<IconGlobal />} expanded={open}>Vue globale</NavLink>
            </>
          )}
        </nav>
      </aside>
    </div>
  );
}
