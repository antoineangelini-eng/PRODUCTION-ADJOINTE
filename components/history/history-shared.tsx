// Shared helpers for all sector history cards
// Import this file in each sector's History component

import React, { useState } from "react";
import { PhysicalBadge } from "@/components/sheet/PhysicalBadge";

export const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#e07070" },
  "Chassis Dent All":  { color: "#4ade80" },
  "Définitif Résine":  { color: "#c4a882" },
  "Provisoire Résine": { color: "#9487a8" },
};

export function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

export function fmtDT(s: string | null): React.ReactNode {
  if (!s) return <span style={{ color: "#444" }}>—</span>;
  const d = new Date(s);
  return (
    <span style={{ fontSize: 11, color: "#e0e0e0", fontWeight: 500, whiteSpace: "nowrap" }}>
      {d.toLocaleDateString("fr-FR")}
      <span style={{ marginLeft: 6, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 3, padding: "0 5px", fontWeight: 700 }}>
        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </span>
  );
}

export function latestDate(a: string | null, b: string | null): string | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

export function Check({ val }: { val: boolean | null }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 22, borderRadius: 5, background: val ? "rgba(74,222,128,0.12)" : "transparent", border: val ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.12)", color: val ? "#4ade80" : "transparent", fontSize: 12, fontWeight: 700 }}>
      {val ? "✓" : ""}
    </div>
  );
}

export function Bool({ val }: { val: boolean | null }) {
  if (val === null) return <span style={{ color: "#444" }}>—</span>;
  return val
    ? <span style={{ color: "#4ade80", fontWeight: 600 }}>Oui</span>
    : <span style={{ color: "#f87171", fontWeight: 600 }}>Non</span>;
}

export function Txt({ val, color }: { val: string | null; color?: string }) {
  if (!val) return <span style={{ color: "#444" }}>—</span>;
  return <span style={{ color: color ?? "#e0e0e0", fontWeight: 400 }}>{val}</span>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#aaa", textAlign: "center" as const }}>{label}</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 6, padding: "6px 8px", fontSize: 11, textAlign: "center" as const, fontWeight: 400, color: "#fff" }}>
        {children}
      </div>
    </div>
  );
}

export function FieldBlocked({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#888", textAlign: "center" as const }}>{label}</div>
      <div style={{ borderRadius: 6, padding: "6px 8px", minHeight: 33, background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(239,68,68,0.3)", fontSize: 13 }}>⊘</span>
      </div>
    </div>
  );
}

export function ReopenModal({ caseNumber, natureDuTravail, dateExpedition, sectorLabel, saving, error, onClose, onConfirm, note, setNote }: {
  caseNumber: string | null; natureDuTravail: string | null; dateExpedition: string | null;
  sectorLabel: string; saving: boolean; error: string | null;
  onClose: () => void; onConfirm: () => void;
  note?: string; setNote?: (v: string) => void;
}) {
  const natColor = NATURE_META[natureDuTravail ?? ""]?.color ?? "#555";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 20, width: 360 }}>
        <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{caseNumber}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor }}>{natureDuTravail}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>Expédition : {fmtDate(dateExpedition)}</div>
        </div>
        <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#e0e0e0", marginBottom: 12 }}>
          Réinsertion dans <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{sectorLabel}</span>
        </div>
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#f59e0b", marginBottom: 14 }}>
          ⚠ Les données existantes sont conservées. Le cas repassera en actif.
        </div>
        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>✕ {error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          <button onClick={onConfirm} disabled={saving} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "…" : "↩ Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryFilters({ count, natFilter, setNatFilter, yearFilter, setYearFilter, search, setSearch, years, onReload }: {
  count: number; natFilter: string; setNatFilter: (v: string) => void;
  yearFilter: string; setYearFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  years: string[]; onReload: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 12px", flexShrink: 0, flexWrap: "wrap" as const }}>
      <span style={{ fontSize: 12, color: "#ccc", padding: "4px 12px", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
        {count} dossier{count > 1 ? "s" : ""} terminé{count > 1 ? "s" : ""}
      </span>
      <select value={natFilter} onChange={e => setNatFilter(e.target.value)}
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "white", fontSize: 11, padding: "5px 8px", borderRadius: 6, outline: "none" }}>
        <option value="" style={{ background: "#1a1a1a", color: "#aaa" }}>Toutes les natures</option>
        {Object.keys(NATURE_META).map(n => <option key={n} value={n} style={{ background: "#1a1a1a", color: "white" }}>{n}</option>)}
      </select>
      {years.length > 1 && (
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: yearFilter ? "white" : "#666", fontSize: 11, padding: "5px 8px", borderRadius: 6, outline: "none" }}>
          <option value="">Toutes les années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° du cas..."
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "white", fontSize: 11, padding: "5px 10px", borderRadius: 6, outline: "none", width: 150 }} />
      <button onClick={onReload} style={{ marginLeft: "auto", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 13, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>↻</button>
    </div>
  );
}

export function CardShell({ row, accentColor, open, onToggle, onReopen, children, summaryExtra }: {
  row: { case_number: string | null; nature_du_travail: string | null; created_at: string | null; date_expedition: string | null; completed_at: string | null; is_physical?: boolean; validated_by_name?: string | null; sent_by_name?: string | null };
  accentColor: string; open: boolean;
  onToggle: () => void; onReopen: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  summaryExtra?: React.ReactNode;
}) {
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
  return (
    <div onClick={onToggle} style={{ background: "#1c1c1c", border: `1px solid ${open ? natColor + "60" : "#272727"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 200ms", display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ padding: "10px 12px", borderTop: `3px solid ${natColor}`, background: open ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 200ms" }}>

        {/* N° + nature + ✓ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{row.case_number}</span>
            {row.is_physical && <PhysicalBadge />}
            <span style={{ display: "inline-flex", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor }}>{row.nature_du_travail}</span>
          </div>
          <span style={{ fontSize: 9, color: "#4ade80" }}>✓</span>
        </div>

        {/* Dates + extra */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10, alignItems: "center", flexWrap: "wrap" as const }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Création</div>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 400 }}>{fmtDate(row.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Expédition</div>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{fmtDate(row.date_expedition)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Validé le</div>
            <div style={{ fontSize: 11, color: "#c0c0c0", fontWeight: 400 }}>{fmtDate(row.completed_at)}</div>
          </div>
          {row.validated_by_name && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Validé par</div>
              <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{row.validated_by_name}</div>
            </div>
          )}
          {row.sent_by_name && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Reçu de</div>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{row.sent_by_name}</div>
            </div>
          )}
          {summaryExtra}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onReopen}
            style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid rgba(245,158,11,0.6)", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}>
            ↩ Réinsérer
          </button>
          <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", color: open ? "#ccc" : "#555", fontSize: 10 }}>
            {open ? "▲" : "▼"}
          </div>
        </div>
      </div>

      {/* Panneau déroulé */}
      {open && children && (
        <div style={{ background: "#141414", borderTop: `1px solid ${natColor}20`, padding: "14px 12px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
