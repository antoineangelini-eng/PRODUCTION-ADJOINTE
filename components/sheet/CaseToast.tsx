"use client";
import { useEffect, useState } from "react";

export type ToastCase = {
  id: string;
  case_number: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical?: boolean | null;
};

type ToastItem = ToastCase & { toastId: string; visible: boolean };

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#e07070" },
  "Chassis Dent All":  { color: "#4ade80" },
  "Définitif Résine":  { color: "#c4a882" },
  "Provisoire Résine": { color: "#9487a8" },
};

export function CaseToastContainer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (toastId: string) => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      display: "flex", flexDirection: "column", gap: 8,
      zIndex: 9999, pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const color = NATURE_META[t.nature_du_travail ?? ""]?.color ?? "#4ade80";
        const dateStr = t.date_expedition
          ? new Date(t.date_expedition.slice(0,10) + "T00:00:00").toLocaleDateString("fr-FR")
          : null;
        return (
          <div key={t.toastId} style={{
            pointerEvents: "auto",
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px",
            background: "#1a1a1a",
            border: `1px solid ${color}40`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            minWidth: 240,
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? "translateX(0)" : "translateX(20px)",
            transition: "opacity 250ms ease, transform 250ms ease",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                  Cas {t.case_number}
                </span>
                {t.nature_du_travail && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                    background: color + "15", border: `1px solid ${color}40`, color,
                  }}>{t.nature_du_travail}</span>
                )}
              </div>
              {dateStr && (
                <div style={{ fontSize: 11, color: "#aaa" }}>
                  Expédition · {dateStr}
                </div>
              )}
            </div>
            <button onClick={() => onDismiss(t.toastId)} style={{
              background: "none", border: "none", color: "#555",
              cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0,
            }}
              onMouseEnter={e => e.currentTarget.style.color = "white"}
              onMouseLeave={e => e.currentTarget.style.color = "#555"}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}

// Banner persistant (pas d'auto-dismiss) — pour IncomingCasesBanner
export function useIncomingBanner() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function addToasts(cases: ToastCase[]) {
    const newToasts: ToastItem[] = cases.map(c => ({
      ...c,
      toastId: `${c.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      visible: true,
    }));
    setToasts(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = newToasts.filter(t => !existingIds.has(t.id));
      return [...prev, ...toAdd];
    });
  }

  function dismiss(toastId: string) {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }

  function dismissAll() {
    setToasts([]);
  }

  return { toasts, addToasts, dismiss, dismissAll };
}

export function useCaseToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function addToasts(cases: ToastCase[]) {
    const newToasts: ToastItem[] = cases.map(c => ({
      ...c,
      toastId: `${c.id}-${Date.now()}`,
      visible: false,
    }));

    setToasts(prev => [...prev, ...newToasts]);

    // Anime l'entrée
    setTimeout(() => {
      setToasts(prev => prev.map(t =>
        newToasts.find(n => n.toastId === t.toastId)
          ? { ...t, visible: true }
          : t
      ));
    }, 50);

    // Disparaît après 4s
    setTimeout(() => {
      setToasts(prev => prev.map(t =>
        newToasts.find(n => n.toastId === t.toastId)
          ? { ...t, visible: false }
          : t
      ));
      setTimeout(() => {
        setToasts(prev => prev.filter(t =>
          !newToasts.find(n => n.toastId === t.toastId)
        ));
      }, 300);
    }, 4000);
  }

  function dismiss(toastId: string) {
    setToasts(prev => prev.map(t => t.toastId === toastId ? { ...t, visible: false } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 300);
  }

  return { toasts, addToasts, dismiss };
}
