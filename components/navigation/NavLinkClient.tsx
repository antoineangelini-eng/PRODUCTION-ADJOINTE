"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
};

export default function NavLinkClient({ href, icon, children, expanded = true }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/app" && pathname.startsWith(href));
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: expanded ? "9px 10px" : "9px 6px",
          borderRadius: 10,
          border: isActive ? "1px solid #333" : "1px solid transparent",
          background: isActive ? "#1a1a1a" : "transparent",
          color: isActive ? "white" : "#888",
          textDecoration: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          transition: "background 140ms, color 140ms, border-color 140ms, padding 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Initiale toujours visible */}
        <span style={{
          minWidth: 28,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: isActive ? "rgba(255,255,255,0.14)" : hovered ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.06)",
          border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          flexGrow: 0,
          color: isActive ? "#ffffff" : "#e8e8e8",
          transition: "color 140ms, background 140ms, border-color 140ms",
          boxSizing: "border-box",
        }}>
          {icon}
        </span>

        {/* Label inline quand sidebar ouverte */}
        {expanded && (
          <span style={{
            fontSize: 13,
            fontWeight: isActive ? 700 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {children}
          </span>
        )}
      </Link>

      {/* Tooltip flottant quand sidebar fermée */}
      {!expanded && hovered && (
        <div style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#1e1e1e",
          border: "1px solid #333",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 600,
          color: "white",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          {children}
          {/* Petite flèche gauche */}
          <div style={{
            position: "absolute",
            left: -5,
            top: "50%",
            transform: "translateY(-50%)",
            width: 8,
            height: 8,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRight: "none",
            borderTop: "none",
            rotate: "45deg",
          }} />
        </div>
      )}
    </div>
  );
}
