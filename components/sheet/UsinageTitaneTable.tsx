"use client";
import React from "react";
import ReactDOM from "react-dom";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  loadUsinageTitaneRowsAction,
  saveUsinageTitaneCellAction,
  completeUsinageTitaneBatchAction,
  deleteCaseAction,
  type UsinageTitaneRow,
  type BatchResult,
} from "@/app/app/usinage-titane/actions";

// ── Constantes ───────────────────────────────────────────────────
const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#4ade80" },
  "Chassis Dent All":  { color: "#5a9ba8" },
  "Définitif Résine":  { color: "#a87a90" },
  "Provisoire Résine": { color: "#9487a8" },
};

const MACHINE_UT_OPTIONS = [
  { value: "WM1", color: "#7c8196" },
  { value: "WM2", color: "#5a9ba8" },
  { value: "WM3", color: "#a87a90" },
  { value: "WM4", color: "#f59e0b" },
];

const SEARCH_KEYFRAMES = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes row-found {
  0%   { background: transparent; box-shadow: inset 0 0 0 2px transparent; }
  8%   { background: rgba(74,222,128,0.35); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.9); }
  20%  { background: rgba(74,222,128,0.18); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  35%  { background: rgba(74,222,128,0.30); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.8); }
  50%  { background: rgba(74,222,128,0.14); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.5); }
  65%  { background: rgba(74,222,128,0.22); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  80%  { background: rgba(74,222,128,0.10); box-shadow: inset 0 0 0 1px rgba(74,222,128,0.3); }
  100% { background: rgba(255,255,255,0.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
}`;

const TH_BG = "#111";

const thBase: React.CSSProperties = {
  padding: "6px 10px", fontWeight: 700, fontSize: 10, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#e0e0e0", background: TH_BG, border: "none",
  whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.2,
  textAlign: "center", verticalAlign: "bottom",
};
const thRead:   React.CSSProperties = { ...thBase, color: "#e0e0e0" };
const thEdit:   React.CSSProperties = { ...thBase, color: "#4ade80" };
const thSticky: React.CSSProperties = { ...thBase, color: "#ffffff", textAlign: "left", position: "sticky", left: 0, zIndex: 10, background: TH_BG };

const tdBase: React.CSSProperties = {
  padding: "0 8px", whiteSpace: "nowrap", fontSize: 12, textAlign: "center",
  border: "none", verticalAlign: "middle", height: 70,
};
const tdSticky: React.CSSProperties = { ...tdBase, textAlign: "left", position: "sticky", left: 0, zIndex: 2, fontWeight: 700, fontSize: 13 };

// ── Helpers ──────────────────────────────────────────────────────
function getRowBg(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "rgba(74,222,128,0.10)";
  if (isActive)  return "#1f2321";
  if (isHovered) return "#222222";
  return "#1a1a1a";
}
function getRowBorder(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "rgba(74,222,128,0.32)";
  if (isActive)  return "rgba(255,255,255,0.10)";
  if (isHovered) return "#383838";
  return "#2b2b2b";
}
function getRowShadow(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "0 0 0 1px rgba(74,222,128,0.10), 0 8px 24px rgba(0,0,0,0.30)";
  if (isActive)  return "0 0 0 1px rgba(255,255,255,0.06), 0 16px 34px rgba(0,0,0,0.34)";
  if (isHovered) return "0 8px 20px rgba(0,0,0,0.22)";
  return "0 4px 12px rgba(0,0,0,0.18)";
}
function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date); let added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) added++; }
  return d;
}

// ── Sous-composants ──────────────────────────────────────────────
function NatureBadge({ nature }: { nature: string | null }) {
  if (!nature) return <span style={{ color: "#555" }}>—</span>;
  const meta = NATURE_META[nature] ?? { color: "#aaa" };
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: meta.color + "18", border: `1px solid ${meta.color}50`, color: meta.color }}>{nature}</span>;
}

function BoolReadOnly({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) return <span style={{ color: "#555" }}>—</span>;
  return value
    ? <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80", fontWeight: 700, fontSize: 11 }}>Oui</div>
    : <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 700, fontSize: 11 }}>Non</div>;
}

function DateTimeCell({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#555" }}>—</span>;
  const d = new Date(value); if (isNaN(d.getTime())) return <span style={{ color: "#555" }}>—</span>;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 12, color: "white" }}>{d.toLocaleDateString("fr-FR")}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "white", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 4, padding: "1px 7px" }}>
        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

function SelectMachineUT({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      const portal = document.getElementById("machine-ut-portal");
      if (portal && portal.contains(e.target as Node)) return;
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = MACHINE_UT_OPTIONS.find(o => o.value === value);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropH = 140;
      const top = rect.bottom + dropH > window.innerHeight ? rect.top - dropH - 4 : rect.bottom + 4;
      setPos({ top, left: rect.left + rect.width / 2 });
    }
    setOpen(o => !o);
  }

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, border: selected ? `1px solid ${selected.color}55` : "1px solid #333", background: selected ? `${selected.color}18` : "#1e1e1e", color: selected ? selected.color : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer", minWidth: 68, justifyContent: "center" }}>
        {selected ? selected.value : "—"}
        <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div id="machine-ut-portal"
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)", background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 8, padding: 5, zIndex: 9999, display: "flex", flexDirection: "column", gap: 2, minWidth: 80, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
          <button onClick={e => { e.stopPropagation(); onChange(""); setOpen(false); }}
            style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: !value ? "#2a2a2a" : "transparent", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" as const }}>—</button>
          {MACHINE_UT_OPTIONS.map(o => (
            <button key={o.value} onClick={e => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
              style={{ padding: "4px 10px", borderRadius: 5, border: value === o.value ? `1px solid ${o.color}55` : "1px solid transparent", background: value === o.value ? `${o.color}20` : "transparent", color: o.color, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" as const }}>
              {o.value}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Calendrier ───────────────────────────────────────────────────
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Lu","Ma","Me","Je","Ve","Sa","Di"];

function MiniCalendar({ value, onSelect, onClose, rect }: { value: string; onSelect: (date: string) => void; onClose: () => void; rect: DOMRect }) {
  const today = new Date();
  const init = value ? new Date(value + "T00:00:00") : today;
  const [view, setView] = useState({ year: init.getFullYear(), month: init.getMonth() });
  const ref = useRef<HTMLDivElement>(null);
  const calH = 250;
  const top = rect.bottom + calH > window.innerHeight ? rect.top - calH - 4 : rect.bottom + 4;

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const { year, month } = view;
  const total = new Date(year, month + 1, 0).getDate();
  const first = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const pick = (day: number) => { const mm = String(month + 1).padStart(2, "0"); const dd = String(day).padStart(2, "0"); onSelect(`${year}-${mm}-${dd}`); onClose(); };

  return (
    <div ref={ref} style={{ position: "fixed", zIndex: 9999, top, left: rect.left, background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 10, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.8)", minWidth: 224, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, padding: "0 6px" }}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{MONTHS_FR[month]} {year}</span>
        <button onClick={() => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, padding: "0 6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS_FR.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", fontWeight: 600, padding: "2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iT = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const iS = selected && day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
          return <button key={i} onClick={() => pick(day)}
            style={{ background: iS ? "#4ade80" : iT ? "rgba(74,222,128,0.12)" : "none", border: iT && !iS ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent", color: iS ? "#000" : "white", borderRadius: 5, fontSize: 11, padding: "4px 2px", cursor: "pointer", fontWeight: iS ? 700 : 400 }}
            onMouseEnter={e => { if (!iS) (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if (!iS) (e.target as HTMLButtonElement).style.background = iT ? "rgba(74,222,128,0.12)" : "none"; }}>{day}</button>;
        })}
      </div>
      <button onClick={() => { onSelect(""); onClose(); }} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid #3d3d3d", borderRadius: 6, color: "#555", fontSize: 11, padding: "5px 0", cursor: "pointer" }}>Effacer la date</button>
    </div>
  );
}

function InlineTextInput({ value, onSave, width = 100 }: { value: string | null; onSave: (v: string) => void; width?: number }) {
  const [focused, setFocused] = React.useState(false);
  const [local, setLocal] = React.useState(value ?? "");
  React.useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input value={local} placeholder={focused ? "" : "—"} onFocus={() => setFocused(true)}
      onChange={e => setLocal(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSave(local); e.currentTarget.blur(); } }}
      onBlur={() => { setFocused(false); onSave(local); }}
      style={{ padding: "3px 8px", border: focused ? "1px solid #4ade80" : "1px solid transparent", background: focused ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.05)", color: "white", width, fontSize: 13, textAlign: "center", borderRadius: 6, outline: "none", transition: "all 150ms" }}
    />
  );
}


// ── Cellule avec mode H/B activable au double-clic ──────────────
function HBCell({ active, onToggle, tdStyle, simple, dual }: {
  active: boolean;
  onToggle: () => void;
  tdStyle: React.CSSProperties;
  simple: React.ReactNode;
  dual: React.ReactNode;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <td
      style={{ ...tdStyle, position: "relative", cursor: "default" }}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => { e.stopPropagation(); onToggle(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Contenu fixe dans hauteur 70px */}
      <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active ? dual : simple}
      </div>
      {/* Flèches haut/bas discrètes au hover */}
      {hovered && (
        <div
          onClick={e => { e.stopPropagation(); onToggle(); }}
          onDoubleClick={e => e.stopPropagation()}
          title={active ? "Revenir en mode simple" : "Activer Haut / Bas"}
          style={{ position: "absolute", top: "50%", right: 5, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 1, cursor: "pointer", padding: "3px 2px", borderRadius: 4, background: active ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)" }}>
          <svg viewBox="0 0 8 5" width="8" height="5" fill="none" stroke={active ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.45)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l3-3 3 3"/></svg>
          <svg viewBox="0 0 8 5" width="8" height="5" fill="none" stroke={active ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.45)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l3 3 3-3"/></svg>
        </div>
      )}
    </td>
  );
}

// ── Composant double Haut/Bas ────────────────────────────────────
function DualMachine({ valueH, valueB, onChangeH, onChangeB }: {
  valueH: string; valueB: string;
  onChangeH: (v: string) => void; onChangeB: (v: string) => void;
}) {
  const [open, setOpen] = React.useState<"h"|"b"|null>(null);
  const btnHRef = React.useRef<HTMLButtonElement>(null);
  const btnBRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      const portal = document.getElementById("machine-dual-portal");
      if (portal && portal.contains(e.target as Node)) return;
      const ref = open === "h" ? btnHRef.current : btnBRef.current;
      if (ref && ref.contains(e.target as Node)) return;
      setOpen(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleOpen(which: "h"|"b", e: React.MouseEvent) {
    e.stopPropagation();
    const ref = which === "h" ? btnHRef.current : btnBRef.current;
    if (open === which) { setOpen(null); return; }
    if (ref) {
      const rect = ref.getBoundingClientRect();
      const dropH = 140;
      const top = rect.bottom + dropH > window.innerHeight ? rect.top - dropH - 4 : rect.bottom + 4;
      setPos({ top, left: rect.left + rect.width / 2 });
    }
    setOpen(which);
  }

  function renderBtn(which: "h"|"b") {
    const value = which === "h" ? valueH : valueB;
    const sel = MACHINE_UT_OPTIONS.find(o => o.value === value);
    const ref = which === "h" ? btnHRef : btnBRef;
    const labelColor = which === "h" ? "#5a9ba8" : "#f59e0b";
    const labelText  = which === "h" ? "Haut" : "Bas";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 4px 2px 6px", borderRadius: 6, borderLeft: `2px solid ${labelColor}40`, background: "rgba(255,255,255,0.02)" }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: labelColor, width: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>{labelText}</span>
        <button ref={ref} onClick={e => handleOpen(which, e)}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5,
            border: sel ? `1px solid ${sel.color}55` : `1px solid ${labelColor}20`,
            background: sel ? `${sel.color}18` : `${labelColor}08`,
            color: sel ? sel.color : "#444", fontSize: 11, fontWeight: 700, cursor: "pointer", minWidth: 46, justifyContent: "center" }}>
          {sel ? sel.value : "—"}
          <svg viewBox="0 0 10 6" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M1 1l4 4 4-4" /></svg>
        </button>
      </div>
    );
  }

  const activeValue = open === "h" ? valueH : valueB;
  const activeChange = open === "h" ? onChangeH : onChangeB;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      {renderBtn("h")}
      {renderBtn("b")}
      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div id="machine-dual-portal"
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)",
            background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 8, padding: 5,
            zIndex: 9999, display: "flex", flexDirection: "column", gap: 2, minWidth: 80,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
          <button onClick={e => { e.stopPropagation(); activeChange(""); setOpen(null); }}
            style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: !activeValue ? "#2a2a2a" : "transparent", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>—</button>
          {MACHINE_UT_OPTIONS.map(o => (
            <button key={o.value} onClick={e => { e.stopPropagation(); activeChange(o.value); setOpen(null); }}
              style={{ padding: "4px 10px", borderRadius: 5, border: activeValue === o.value ? `1px solid ${o.color}55` : "1px solid transparent", background: activeValue === o.value ? `${o.color}20` : "transparent", color: o.color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {o.value}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function DualText({ valueH, valueB, onSaveH, onSaveB, width = 90 }: {
  valueH: string | null; valueB: string | null;
  onSaveH: (v: string) => void; onSaveB: (v: string) => void;
  width?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 4px 2px 6px", borderRadius: 6, borderLeft: "2px solid rgba(34,211,238,0.4)", background: "rgba(255,255,255,0.02)" }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: "#5a9ba8", width: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Haut</span>
        <InlineTextInput value={valueH} onSave={onSaveH} width={width} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 4px 2px 6px", borderRadius: 6, borderLeft: "2px solid rgba(245,158,11,0.4)", background: "rgba(255,255,255,0.02)" }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: "#f59e0b", width: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Bas</span>
        <InlineTextInput value={valueB} onSave={onSaveB} width={width} />
      </div>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────
export function UsinageTitaneTable({ focusId, onReload, onSelectionChange, onNewCases }: {
  focusId: string | null;
  onReload?: (fn: () => void) => void;
  onSelectionChange?: (busy: boolean) => void;
  onNewCases?: (cases: { id: string; case_number: string | null; date_expedition: string | null; nature_du_travail: string | null }[]) => void;
}) {
  const onNewCasesRef = useRef(onNewCases); onNewCasesRef.current = onNewCases;
  const [rows, setRows]               = useState<UsinageTitaneRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const [batchResult, setBatchResult]   = useState<BatchResult | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [foundRowId, setFoundRowId]   = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<{ caseId: string; column: string; value: string; rect: DOMRect } | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const fresh = (await loadUsinageTitaneRowsAction()) ?? [];
      if (silent) {
        setRows(prev => {
          const prevIds = new Set(prev.map(r => String(r.id)));
          const incoming = fresh.filter(r => !prevIds.has(String(r.id)));
          if (incoming.length > 0) {
            onNewCasesRef.current?.(incoming.map(r => ({
              id: String(r.id),
              case_number: r.case_number,
              date_expedition: r.date_expedition,
              nature_du_travail: r.nature_du_travail,
            })));
          }
          return fresh;
        });
      } else {
        setRows(fresh);
      }
    }
    catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onReload?.(() => load(true)); }, [load, onReload]);
  useEffect(() => {
    onSelectionChange?.(checkedIds.size > 0 || confirmDeleteId !== null);
  }, [checkedIds, confirmDeleteId, onSelectionChange]);

  // Auto-refresh après 5 min d'inactivité
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, []);
  useEffect(() => {
    const itv = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
        lastActivityRef.current = Date.now();
        load();
      }
    }, 30_000);
    return () => clearInterval(itv);
  }, [load]);

  // Tri par date d'expédition — les plus urgents (proches) d'abord
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.date_expedition ? new Date(a.date_expedition).getTime() : Number.POSITIVE_INFINITY;
      const db = b.date_expedition ? new Date(b.date_expedition).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [rows]);

  // Cas en attente : cas actifs en BDD pour ce secteur qui ne sont PAS encore
  // dans le tableau affiché (le tableau se rafraîchira automatiquement dans
  // ≤5 min ou à la prochaine validation).
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const { countSectorActiveAction } = await import("./pending-count-action");
      const c = await countSectorActiveAction("usinage_titane");
      if (alive) setPendingCount(Math.max(0, c - rows.length));
    };
    tick();
    const itv = setInterval(tick, 30_000);
    return () => { alive = false; clearInterval(itv); };
  }, [rows.length]);
  const urgentCount = pendingCount;

  useEffect(() => {
    if (!focusId || loading || rows.length === 0) return;
    const found = rows.find(r => r.case_number === focusId);
    if (!found) { setSearchNotFound(true); setFoundRowId(null); return; }
    setSearchNotFound(false); setActiveRowId(String(found.id)); setFoundRowId(String(found.id));
    setTimeout(() => document.getElementById(`row-ut-${found.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    const t = setTimeout(() => setFoundRowId(null), 2200);
    return () => clearTimeout(t);
  }, [focusId, loading, rows]);

  function patchRow(caseId: string, field: "ut" | "case", column: string, value: any) {
    setRows(prev => prev.map(r => {
      if (String(r.id) !== caseId) return r;
      if (field === "ut") return { ...r, sector_usinage_titane: { ...r.sector_usinage_titane, [column]: value } } as typeof r;
      return { ...r, [column]: value } as typeof r;
    }));
  }

  async function saveCell(caseId: string, column: string, value: any) {
    const fd = new FormData(); fd.set("case_id", caseId); fd.set("column", column);
    if (column === "envoye_usinage_with_j1") { fd.set("kind", "json"); fd.set("value", String(value)); }
    else { fd.set("kind", typeof value === "boolean" ? "boolean" : "text"); fd.set("value", String(value ?? "")); }
    await saveUsinageTitaneCellAction(fd);
  }

  function validateUtRow(row: any): string[] {
    const ut = row.sector_usinage_titane ?? {};
    const missing: string[] = [];
    if (!ut.envoye_usinage)       missing.push("Envoyé usinage");
    if (!ut.envoye_usinage_at)    missing.push("Date envoyé usinage");
    if (ut.mode_hb_machine) {
      if (!ut.machine_ut_h)       missing.push("Machine HAUT");
      if (!ut.machine_ut_b)       missing.push("Machine BAS");
    } else if (!ut.machine_ut)    missing.push("Machine");
    if (ut.mode_hb_calcul) {
      if (!ut.numero_calcul_h)    missing.push("N° calcul HAUT");
      if (!ut.numero_calcul_b)    missing.push("N° calcul BAS");
    } else if (!ut.numero_calcul) missing.push("N° calcul");
    if (ut.mode_hb_brut) {
      if (!ut.nombre_brut_h)      missing.push("Brut HAUT");
      if (!ut.nombre_brut_b)      missing.push("Brut BAS");
    } else if (!ut.nombre_brut)   missing.push("Brut");
    if (!ut.reception_metal_at)   missing.push("Réception métal");
    return missing;
  }

  async function handleBatch() {
    if (checkedIds.size === 0 || batchPending) return;
    // Pré-validation : tous les champs requis doivent être remplis
    const blockers: { case_id: string | null; error_message: string }[] = [];
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const miss = validateUtRow(row);
      if (miss.length > 0) {
        blockers.push({ case_id: id, error_message: `Cas ${row.case_number} — champs manquants : ${miss.join(", ")}` });
      }
    }
    if (blockers.length > 0) {
      setBatchResult({ okIds: [], errors: blockers });
      return;
    }
    setBatchPending(true);
    const fd = new FormData(); checkedIds.forEach(id => fd.append("case_ids", id));
    const result = await completeUsinageTitaneBatchAction(null, fd);
    setBatchResult(result); setBatchPending(false);
    if (result.okIds.length > 0 && result.errors.length === 0) setTimeout(() => setBatchResult(null), 4000);
    if (result.okIds.length > 0) {
      setRows(prev => prev.filter(r => !result.okIds.includes(String(r.id))));
      setCheckedIds(prev => { const n = new Set(prev); result.okIds.forEach(id => n.delete(id)); return n; });
    }
  }

  async function handleDelete(caseId: string) {
    const fd = new FormData(); fd.set("case_id", caseId);
    await deleteCaseAction(fd);
    setRows(prev => prev.filter(r => String(r.id) !== caseId));
    setConfirmDeleteId(null);
  }

  if (loading) return <div style={{ padding: 20, color: "#555", fontSize: 13 }}>Chargement…</div>;
  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ color: "#f87171", fontSize: 13 }}>Erreur : {error}</div>
      <button onClick={() => load()} style={{ marginTop: 8, border: "1px solid #f87171", background: "none", color: "#f87171", padding: "4px 10px", cursor: "pointer", borderRadius: 4, fontSize: 12 }}>Réessayer</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#111" }}>
      <style dangerouslySetInnerHTML={{ __html: SEARCH_KEYFRAMES }} />

      {editingDate && (
        <MiniCalendar value={editingDate.value} rect={editingDate.rect}
          onSelect={date => { patchRow(editingDate.caseId, "ut", editingDate.column, date || null); saveCell(editingDate.caseId, editingDate.column, date || null); setEditingDate(null); }}
          onClose={() => setEditingDate(null)} />
      )}

      {/* Barre validation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, zIndex: 10, background: "#111", padding: "0 8px 10px 8px", borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
          {!searchNotFound && <span style={{ fontSize: 12, color: "#bdbdbd", padding: "4px 14px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, fontWeight: 600 }}>{rows.length} dossier{rows.length > 1 ? "s" : ""}</span>}
          {urgentCount > 0 && (
            <span style={{ fontSize: 12, color: "#f59e0b", padding: "4px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 20, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b", animation: "pulse 2s infinite" }} />
              {urgentCount} cas en attente
            </span>
          )}
          {searchNotFound && focusId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#1a0f0f", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 7 }}>
              <span style={{ fontSize: 12, color: "#f87171" }}>Cas <strong style={{ color: "white" }}>"{focusId}"</strong> introuvable</span>
              <button onClick={() => setSearchNotFound(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
          )}
          {batchResult?.okIds.length ? <span style={{ fontSize: 12, color: "#4ade80", padding: "5px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 7 }}>✓ {batchResult.okIds.length} envoyé{batchResult.okIds.length > 1 ? "s" : ""}</span> : null}
          {batchResult?.errors.length ? (
            <div style={{ display:"flex", flexDirection:"column" as const, gap:4, maxWidth:560, padding:"8px 12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:"#f87171", fontWeight:700 }}>✕ {batchResult.errors.length} validation{batchResult.errors.length>1?"s":""} bloquée{batchResult.errors.length>1?"s":""}</span>
                <button onClick={()=>setBatchResult(null)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:14, padding:0 }}>×</button>
              </div>
              {batchResult.errors.slice(0,4).map((e,i)=>(
                <div key={i} style={{ fontSize:11, color:"#fca5a5", lineHeight:1.4 }}>{e.error_message}</div>
              ))}
              {batchResult.errors.length>4 && <div style={{ fontSize:10, color:"#f87171", fontStyle:"italic" }}>… et {batchResult.errors.length-4} autre{batchResult.errors.length-4>1?"s":""}</div>}
            </div>
          ) : null}
        </div>
        <button onClick={handleBatch} disabled={batchPending || checkedIds.size === 0}
          style={{ padding: "8px 18px", border: checkedIds.size === 0 ? "1px solid #3a3a3a" : "1px solid #4ade80", background: checkedIds.size === 0 ? "#1e1e1e" : "rgba(74,222,128,0.08)", color: checkedIds.size === 0 ? "#e0e0e0" : "#4ade80", cursor: checkedIds.size === 0 ? "not-allowed" : "pointer", borderRadius: 8, fontWeight: 700, fontSize: 13, transition: "all 160ms" }}>
          {batchPending ? "Validation..." : checkedIds.size === 0 ? "Sélectionner des dossiers" : `Valider ${checkedIds.size} dossier${checkedIds.size > 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0, padding: "0 8px 80px 8px" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: "0 8px", width: "100%", tableLayout: "auto" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 5, background: TH_BG }}>
            <tr>
              <th style={{ ...thSticky, paddingLeft: 12, paddingBottom: 10 }}>N° cas</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>Création</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>Expédition</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>Nature</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>Design Châssis</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>
                Date &amp; Heure
                <div style={{ marginTop: 3, fontSize: 9, color: "#666", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Design châssis terminé</div>
              </th>
              <th style={{ ...thEdit, paddingBottom: 10 }}>Envoyé usinage</th>
              <th style={{ ...thEdit, paddingBottom: 10 }}>
                Date &amp; Heure
                <div style={{ marginTop: 3, fontSize: 9, color: "#4ade8099", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Envoyé en usinage</div>
              </th>
<th style={{ ...thEdit, paddingBottom: 10 }}>Machine</th>
<th style={{ ...thEdit, paddingBottom: 10 }}>N° calcul</th>
<th style={{ ...thEdit, paddingBottom: 10 }}>Brut</th>
              <th style={{ ...thEdit, paddingBottom: 10 }}>Réception métal</th>
              <th style={{ ...thRead, paddingBottom: 10 }}>Modèle à faire</th>
              <th style={{ ...thEdit, paddingBottom: 10 }}>Sél.</th>
              <th style={{ ...thBase, paddingBottom: 10, color: TH_BG }}></th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={17} style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun dossier en cours.</td></tr>
            )}

            {sortedRows.map(row => {
              const ut = (row as any).sector_usinage_titane ?? {};
              const dm = (row as any).sector_design_metal ?? {};
              const nat      = row.nature_du_travail ?? "";
              const natColor = NATURE_META[nat]?.color ?? "#666";
              const isChecked = checkedIds.has(String(row.id));
              const isHovered = hoveredId === String(row.id);
              const isActive  = activeRowId === String(row.id);
              const isFound   = foundRowId === String(row.id);

              const rowBg     = getRowBg(isChecked, isHovered, isActive);
              const rowBorder = getRowBorder(isChecked, isHovered, isActive);
              const rowShadow = getRowShadow(isChecked, isHovered, isActive);
              const accentColor = isChecked ? "#4ade80" : natColor;

              const tdCard: React.CSSProperties = { ...tdBase, background: isFound ? "transparent" : rowBg, borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`, borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`, borderLeft: "none", borderRight: "none", transition: "background 160ms, border-color 160ms" };
              const tdCardFirst: React.CSSProperties = { ...tdSticky, background: isFound ? "transparent" : rowBg, paddingLeft: 12, borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`, borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`, borderLeft: `1px solid ${isFound ? "transparent" : rowBorder}`, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, boxShadow: isFound ? "none" : `inset 4px 0 0 ${accentColor}cc, ${rowShadow}`, transition: "background 160ms, border-color 160ms, box-shadow 160ms" };
              const tdCardLast: React.CSSProperties = { ...tdBase, background: isFound ? "transparent" : rowBg, borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`, borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`, borderRight: `1px solid ${isFound ? "transparent" : rowBorder}`, borderTopRightRadius: 14, borderBottomRightRadius: 14, boxShadow: isFound ? "none" : rowShadow, transition: "background 160ms, border-color 160ms" };

              const rawDate = ut.reception_metal_at ? ut.reception_metal_at.slice(0, 10) : "";

              return (
                <tr key={row.id} id={`row-ut-${row.id}`}
                  onClick={() => setActiveRowId(String(row.id))}
                  onMouseEnter={() => setHoveredId(String(row.id))}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer", animation: isFound ? "row-found 2.2s ease-in-out forwards" : "none", background: isFound ? undefined : "transparent" }}>

                  {/* N° cas */}
                  <td style={tdCardFirst}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 24, padding: "2px 8px", borderRadius: 8, color: "#ffffff", background: isActive ? "rgba(255,255,255,0.04)" : "transparent", border: isActive ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent", transition: "all 160ms" }}>
                      {row.case_number}
                    </div>
                  </td>

                  <td style={tdCard}>{row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                  <td style={tdCard}>{row.date_expedition ? new Date(row.date_expedition).toLocaleDateString("fr-FR") : "—"}</td>
                  <td style={tdCard}><NatureBadge nature={nat} /></td>
                  <td style={tdCard}><BoolReadOnly value={dm.design_chassis ?? null} /></td>
                  <td style={tdCard}><DateTimeCell value={dm.design_chassis_at ?? null} /></td>

                  {/* Envoyé usinage */}
                  <td style={tdCard}>
                    <button onClick={e => {
                      e.stopPropagation();
                      const newVal = !Boolean(ut.envoye_usinage);
                      patchRow(String(row.id), "ut", "envoye_usinage", newVal);
                      const now = new Date().toISOString();
                      if (newVal) {
                        const j1 = addBusinessDays(new Date(), 1).toISOString().split("T")[0];
                        patchRow(String(row.id), "ut", "envoye_usinage_at", now);
                        patchRow(String(row.id), "ut", "delai_j1_date", j1);
                        patchRow(String(row.id), "ut", "reception_metal_at", j1);
                        saveCell(String(row.id), "envoye_usinage_with_j1", JSON.stringify({ envoye_usinage: true, envoye_usinage_at: now, delai_j1_date: j1 }));
                        saveCell(String(row.id), "reception_metal_at", j1);
                      } else {
                        patchRow(String(row.id), "ut", "envoye_usinage_at", null);
                        patchRow(String(row.id), "ut", "delai_j1_date", null);
                        patchRow(String(row.id), "ut", "reception_metal_at", null);
                        saveCell(String(row.id), "envoye_usinage_with_j1", JSON.stringify({ envoye_usinage: false, envoye_usinage_at: null, delai_j1_date: null }));
                        saveCell(String(row.id), "reception_metal_at", null);
                      }
                    }}
                      style={{ background: ut.envoye_usinage ? "rgba(74,222,128,0.15)" : "transparent", border: ut.envoye_usinage ? "1px solid rgba(74,222,128,0.4)" : "1px solid #ffffff", padding: "3px 8px", cursor: "pointer", color: ut.envoye_usinage ? "#4ade80" : "transparent", width: 36, height: 26, borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                      {ut.envoye_usinage ? "✓" : ""}
                    </button>
                  </td>

                  {/* Date & heure envoyé en usinage */}
                  <td style={tdCard}><DateTimeCell value={ut.envoye_usinage_at ?? null} /></td>

                  {/* Machine — double-clic pour H/B */}
                  <HBCell
                    active={Boolean(ut.mode_hb_machine)}
                    onToggle={() => { const n = !ut.mode_hb_machine; patchRow(String(row.id), "ut", "mode_hb_machine", n); saveCell(String(row.id), "mode_hb_machine", n); }}
                    tdStyle={tdCard}
                    simple={<SelectMachineUT value={ut.machine_ut ?? ""} onChange={v => { patchRow(String(row.id), "ut", "machine_ut", v || null); saveCell(String(row.id), "machine_ut", v || null); }} />}
                    dual={<DualMachine
                      valueH={ut.machine_ut_h ?? ""}
                      valueB={ut.machine_ut_b ?? ""}
                      onChangeH={v => { patchRow(String(row.id), "ut", "machine_ut_h", v || null); saveCell(String(row.id), "machine_ut_h", v || null); }}
                      onChangeB={v => { patchRow(String(row.id), "ut", "machine_ut_b", v || null); saveCell(String(row.id), "machine_ut_b", v || null); }}
                    />}
                  />

                  {/* N° calcul — double-clic pour H/B */}
                  <HBCell
                    active={Boolean(ut.mode_hb_calcul)}
                    onToggle={() => { const n = !ut.mode_hb_calcul; patchRow(String(row.id), "ut", "mode_hb_calcul", n); saveCell(String(row.id), "mode_hb_calcul", n); }}
                    tdStyle={tdCard}
                    simple={<InlineTextInput value={ut.numero_calcul ?? null} width={110} onSave={v => { patchRow(String(row.id), "ut", "numero_calcul", v || null); saveCell(String(row.id), "numero_calcul", v || null); }} />}
                    dual={<DualText
                      valueH={ut.numero_calcul_h ?? null}
                      valueB={ut.numero_calcul_b ?? null}
                      onSaveH={v => { patchRow(String(row.id), "ut", "numero_calcul_h", v || null); saveCell(String(row.id), "numero_calcul_h", v || null); }}
                      onSaveB={v => { patchRow(String(row.id), "ut", "numero_calcul_b", v || null); saveCell(String(row.id), "numero_calcul_b", v || null); }}
                      width={100}
                    />}
                  />

                  {/* Brut — double-clic pour H/B */}
                  <HBCell
                    active={Boolean(ut.mode_hb_brut)}
                    onToggle={() => { const n = !ut.mode_hb_brut; patchRow(String(row.id), "ut", "mode_hb_brut", n); saveCell(String(row.id), "mode_hb_brut", n); }}
                    tdStyle={tdCard}
                    simple={<InlineTextInput value={ut.nombre_brut ?? null} width={90} onSave={v => { patchRow(String(row.id), "ut", "nombre_brut", v || null); saveCell(String(row.id), "nombre_brut", v || null); }} />}
                    dual={<DualText
                      valueH={ut.nombre_brut_h ?? null}
                      valueB={ut.nombre_brut_b ?? null}
                      onSaveH={v => { patchRow(String(row.id), "ut", "nombre_brut_h", v || null); saveCell(String(row.id), "nombre_brut_h", v || null); }}
                      onSaveB={v => { patchRow(String(row.id), "ut", "nombre_brut_b", v || null); saveCell(String(row.id), "nombre_brut_b", v || null); }}
                      width={80}
                    />}
                  />

                  {/* Réception métal */}
                  <td style={{ ...tdCard, cursor: "pointer" }} onClick={e => { e.stopPropagation(); setEditingDate({ caseId: String(row.id), column: "reception_metal_at", value: rawDate, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() }); }}>
                    <span style={{ color: rawDate ? "white" : "#555", borderBottom: "1px solid #333", padding: "2px 6px" }}>
                      {rawDate ? new Date(rawDate + "T00:00:00").toLocaleDateString("fr-FR") : "—"}
                    </span>
                  </td>

                  {/* Modèle à faire */}
                  <td style={tdCard}>
                    {dm.modele_a_faire_ok
                      ? <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80", fontWeight: 700, fontSize: 11 }}>Oui</div>
                      : <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 700, fontSize: 11 }}>Non</div>}
                  </td>

                  {/* Sélection */}
                  <td style={tdCard} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: isChecked ? "rgba(74,222,128,0.18)" : "#181818", border: "1.5px solid rgba(255,255,255,0.85)", boxShadow: isChecked ? "0 0 0 3px rgba(74,222,128,0.12)" : "none", transition: "all 160ms ease" }}>
                      <input type="checkbox" checked={isChecked}
                        onChange={e => { setCheckedIds(prev => { const n = new Set(prev); e.target.checked ? n.add(String(row.id)) : n.delete(String(row.id)); return n; }); }}
                        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#4ade80", margin: 0 }} />
                    </div>
                  </td>

                  {/* Supprimer */}
                  <td style={tdCardLast}>
                    {confirmDeleteId === String(row.id) ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: "#f87171", whiteSpace: "nowrap" }}>Supprimer ?</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          <button onClick={e => { e.stopPropagation(); handleDelete(String(row.id)); }} style={{ padding: "2px 8px", border: "1px solid #f87171", background: "rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", fontSize: 10, fontWeight: 700, borderRadius: 4 }}>Oui</button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }} style={{ padding: "2px 7px", border: "1px solid #444", background: "transparent", color: "#888", cursor: "pointer", fontSize: 10, borderRadius: 4 }}>Non</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(String(row.id)); }}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid #2a2a2a", background: "transparent", color: "#555", cursor: "pointer", transition: "all 150ms" }}
                        onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(239,68,68,0.5)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
                        onMouseLeave={e => { e.currentTarget.style.border = "1px solid #2a2a2a"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555"; }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
