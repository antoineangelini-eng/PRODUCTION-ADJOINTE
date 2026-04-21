"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadUnreadAnnouncementsAction,
  dismissAnnouncementAction,
  type Announcement,
} from "@/app/app/admin/announcement-actions";

export function AnnouncementsBanner({ sectorCode }: { sectorCode: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const data = await loadUnreadAnnouncementsAction(sectorCode);
    setAnnouncements(data);
  }, [sectorCode]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(id: string) {
    setDismissed(prev => new Set(prev).add(id));
    await dismissAnnouncementAction(id);
  }

  function dismissAll() {
    for (const a of visible) {
      dismiss(a.id);
    }
  }

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{
      margin: "8px 20px 0",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      {visible.map(a => (
        <div key={a.id} style={{
          padding: "8px 14px",
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 8,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          animation: "fadeIn 300ms ease-out",
        }}>
          {/* Icône */}
          <span style={{
            fontSize: 14, lineHeight: 1, marginTop: 1, flexShrink: 0,
          }}>📢</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {a.title && (
              <div style={{
                fontSize: 12, fontWeight: 700, color: "#a5b4fc",
                marginBottom: a.message ? 2 : 0,
              }}>
                {a.title}
              </div>
            )}
            {a.message && (
              <div style={{
                fontSize: 12, color: "#c4c4cc",
                whiteSpace: "pre-wrap", lineHeight: 1.4,
              }}>
                {a.message}
              </div>
            )}
          </div>

          {/* Bouton fermer */}
          <button
            onClick={() => dismiss(a.id)}
            title="Marquer comme lu"
            style={{
              width: 22, height: 22, borderRadius: 6,
              background: "transparent", border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8", fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            ✕
          </button>
        </div>
      ))}

      {visible.length > 1 && (
        <button
          onClick={dismissAll}
          style={{
            alignSelf: "flex-end",
            padding: "3px 10px", fontSize: 10, fontWeight: 600,
            borderRadius: 4, cursor: "pointer",
            background: "transparent", border: "1px solid rgba(99,102,241,0.2)",
            color: "#818cf8", transition: "all 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          Tout marquer comme lu
        </button>
      )}
    </div>
  );
}
