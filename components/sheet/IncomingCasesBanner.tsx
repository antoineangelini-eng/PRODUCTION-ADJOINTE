"use client";
import type { ToastCase } from "@/components/sheet/CaseToast";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#4ade80" },
  "Chassis Dent All":  { color: "#5a9ba8" },
  "Définitif Résine":  { color: "#a87a90" },
  "Provisoire Résine": { color: "#9487a8" },
  "Définitif":         { color: "#f59e0b" },
  "Définitif Bimax":   { color: "#f97316" },
  "Définitif FD":      { color: "#f59e0b" },
  "Deflex":            { color: "#a78bfa" },
};

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

type Item = ToastCase & { toastId: string; visible: boolean };

export function IncomingCasesBanner({ toasts }: {
  toasts: Item[];
  onDismiss?: (toastId: string) => void;
  onDismissAll?: () => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      margin: "8px 20px 0",
      padding: "8px 12px",
      background: "rgba(74,222,128,0.06)",
      border: "1px solid rgba(74,222,128,0.35)",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "#4ade80",
        fontSize: 12,
        fontWeight: 700,
        paddingRight: 10,
        borderRight: "1px solid rgba(74,222,128,0.25)",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
        {toasts.length} nouveau{toasts.length > 1 ? "x" : ""} cas en attente
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
        {toasts.map(t => {
          const color = NATURE_META[t.nature_du_travail ?? ""]?.color ?? "#4ade80";
          return (
            <div key={t.toastId} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 10px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${color}40`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 6,
              fontSize: 11,
            }}>
              <span style={{ color: "white", fontWeight: 700 }}>N° {t.case_number ?? "—"}</span>
              {t.nature_du_travail && (
                <span style={{ color, fontWeight: 600 }}>{t.nature_du_travail}</span>
              )}
              <span style={{ color: "#aaa" }}>Exp. {fmtDate(t.date_expedition)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
