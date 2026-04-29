"use client";
import React from "react";
import ReactDOM from "react-dom";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PhysicalBadge } from "@/components/sheet/PhysicalBadge";
import {
  loadUsinageResineRowsAction,
  saveUsinageResineCellAction,
  completeUsinageResineBatchAction,
  deleteCaseAction,
  removeCaseFromSectorAction,
  type UsinageResineRow,
  type BatchResult,
} from "@/app/app/usinage-resine/actions";
import { buildUrPrintJobAction } from "@/app/app/usinage-resine/print-actions";
import { DeleteConfirmModal } from "@/components/sheet/DeleteConfirmModal";
import { toggleOnHoldAction } from "@/lib/on-hold";
import { OnHoldReasonModal, OnHoldReasonTooltip } from "@/components/sheet/OnHoldModal";
import type { ToastCase } from "@/components/sheet/CaseToast";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#e07070" },
  "Chassis Dent All":  { color: "#4ade80" },
  "Définitif Résine":  { color: "#c4a882" },
  "Provisoire Résine": { color: "#9487a8" },
  "Deflex":            { color: "#a78bfa" },
  "Complet":           { color: "#38bdf8" },
};
const MACHINE_OPTIONS = [
  { value: "PM1", color: "#7c8196" },
  { value: "PM2", color: "#5a9ba8" },
  { value: "PM3", color: "#a87a90" },
  { value: "PM4", color: "#f59e0b" },
];
const TYPE_DENTS_OPTIONS = [
  { value: "Dents usinées",      color: "#7c8196" },
  { value: "Dents du commerce", color: "#f59e0b" },
  { value: "Pas de dents", color: "#ef4444" },
  { value: "Dents imprimées", color: "#a78bfa" },
];
const BG_CARD = "#1e1e1e", BG_LABEL_ROW = "#181818", BG_VAL_ROW = "#1e1e1e";
const BG_LABEL_SAISIE = "#151515", BG_VAL_SAISIE = "#161616";
const BD_LIGHT = "1px solid #242424", BD_MED = "1px solid #252525", BD_STRONG = "2px solid #2e2e2e";
const CARD_KEYFRAMES = `
@keyframes card-new { 0%{box-shadow:0 0 0 2px rgba(74,222,128,0.8)} 60%{box-shadow:0 0 0 2px rgba(74,222,128,0.3)} 100%{box-shadow:none} }
@keyframes card-found { 0%{box-shadow:0 0 0 2px transparent} 10%{box-shadow:0 0 0 2px rgba(74,222,128,0.9)} 100%{box-shadow:0 0 0 2px transparent} }`;

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date); let added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) added++; }
  return d;
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}
function fmtDT(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d.getTime())) return null;
  return { date: d.toLocaleDateString("fr-FR"), time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
}
function sortByExp(rows: UsinageResineRow[]) {
  return [...rows].sort((a, b) => {
    const aH = (a as any)._on_hold ? 1 : 0;
    const bH = (b as any)._on_hold ? 1 : 0;
    if (aH !== bH) return aH - bH;
    return (a.date_expedition ?? "9999").localeCompare(b.date_expedition ?? "9999");
  });
}
function Lbl({ children, color = "#e0e0e0" }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color, lineHeight: 1, display: "block", textAlign: "center" }}>{children}</span>;
}
function Val({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span style={{ fontSize: 12, color: muted ? "#3a3a3a" : "#d0d0d0", fontWeight: 500, display: "block", textAlign: "center" }}>{children}</span>;
}
function OuiBadge() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /><span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Oui</span></div>;
}
function NonBadge() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", display: "inline-block" }} /><span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>Non</span></div>;
}
function BoolBadge({ val }: { val: boolean | null | undefined }) {
  if (val === true) return <OuiBadge />;
  if (val === false) return <NonBadge />;
  return <Val muted>—</Val>;
}
function TimeBadge({ dt }: { dt: { date: string; time: string } | null }) {
  if (!dt) return <Val muted>—</Val>;
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 11, color: "#aaa" }}>{dt.date}</span><span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 5, padding: "1px 10px" }}>{dt.time}</span></div>;
}
const MFR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DFR = ["Lu","Ma","Me","Je","Ve","Sa","Di"];
function MiniCalendar({ value, onSelect, onClose, rect }: { value: string; onSelect: (d: string) => void; onClose: () => void; rect: DOMRect }) {
  const today = new Date(); const init = value ? new Date(value + "T00:00:00") : today;
  const [view, setView] = useState({ year: init.getFullYear(), month: init.getMonth() });
  const ref = useRef<HTMLDivElement>(null);
  const top = rect.bottom + 260 > window.innerHeight ? rect.top - 264 : rect.bottom + 4;
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    setTimeout(() => document.addEventListener("mousedown", h), 0); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const sel = value ? new Date(value + "T00:00:00") : null;
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
        <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{MFR[month]} {year}</span>
        <button onClick={() => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, padding: "0 6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DFR.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", fontWeight: 600 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iT = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const iS = sel && day === sel.getDate() && month === sel.getMonth() && year === sel.getFullYear();
          return <button key={i} onClick={() => pick(day)} style={{ background: iS ? "#4ade80" : iT ? "rgba(74,222,128,0.12)" : "none", border: iT && !iS ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent", color: iS ? "#000" : "white", borderRadius: 5, fontSize: 11, padding: "4px 2px", cursor: "pointer", fontWeight: iS ? 700 : 400 }}
            onMouseEnter={e => { if (!iS) (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if (!iS) (e.target as HTMLButtonElement).style.background = iT ? "rgba(74,222,128,0.12)" : "none"; }}>{day}</button>;
        })}
      </div>
      <button onClick={() => { onSelect(""); onClose(); }} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid #3d3d3d", borderRadius: 6, color: "#555", fontSize: 11, padding: "5px 0", cursor: "pointer" }}>Effacer</button>
    </div>
  );
}
function focusNav(el: HTMLElement, dir: "left"|"right"|"up"|"down") {
  const nav = el.dataset.nav; if (!nav) return;
  const [rowId, colPart] = nav.split("_col_"); const col = parseInt(colPart);
  if (dir === "right" || dir === "left") { const next = dir === "right" ? col + 1 : col - 1; document.querySelector<HTMLElement>(`[data-nav="${rowId}_col_${next}"]`)?.focus(); return; }
  const allCards = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-row]"));
  const idx = allCards.findIndex(c => c.dataset.navRow === rowId);
  const nextCard = allCards[dir === "down" ? idx + 1 : idx - 1];
  if (nextCard) nextCard.querySelector<HTMLElement>(`[data-nav$="_col_${col}"]`)?.focus();
}
function InlineText({ value, onSave, onFocusChange, placeholder = "—", navAttr }: { value: string|null; onSave:(v:string)=>void; onFocusChange?:(f:boolean)=>void; placeholder?:string; navAttr?:string }) {
  const [focused, setFocused] = React.useState(false);
  return <input data-nav={navAttr} defaultValue={value ?? ""} placeholder={focused ? "" : placeholder}
    onFocus={() => { setFocused(true); onFocusChange?.(true); }}
    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSave(e.currentTarget.value); e.currentTarget.blur(); return; } if (!navAttr) return; const el = e.currentTarget; if (e.key === "ArrowRight" && el.selectionEnd === el.value.length) { e.preventDefault(); focusNav(el,"right"); } else if (e.key === "ArrowLeft" && el.selectionStart === 0) { e.preventDefault(); focusNav(el,"left"); } else if (e.key === "ArrowDown") { e.preventDefault(); focusNav(el,"down"); } else if (e.key === "ArrowUp") { e.preventDefault(); focusNav(el,"up"); } }}
    onBlur={e => { setFocused(false); onFocusChange?.(false); onSave(e.currentTarget.value); }}
    style={{ padding: "3px 7px", border: focused ? "1px solid #4ade80" : "1px solid #2a2a2a", background: focused ? "rgba(74,222,128,0.06)" : "#1a1a1a", color: "white", fontSize: 12, borderRadius: 5, outline: "none", transition: "all 150ms", width: "90%", boxSizing: "border-box" as const, display: "block", textAlign: "center" }} />;
}
function MachineDropdown({ options, value, onChange, buttonStyle }: {
  options: { value: string; color: string }[];
  value: string;
  onChange: (v: string) => void;
  buttonStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0, openUp: false });

  React.useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) {
        const dropdown = document.getElementById("machine-dropdown-portal");
        if (dropdown && !dropdown.contains(target)) setOpen(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = (options.length + 1) * 32 + 14; // estimation hauteur
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left + rect.width / 2,
        openUp,
      });
    }
    setOpen(o => !o);
  }

  const selected = options.find(o => o.value === value);

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6,
          border: selected ? `1px solid ${selected.color}55` : "1px solid #333",
          background: selected ? `${selected.color}18` : "#1e1e1e",
          color: selected ? selected.color : "#555",
          fontSize: 12, fontWeight: 700, cursor: "pointer", minWidth: 68, justifyContent: "center",
          ...buttonStyle }}>
        {selected ? selected.value : "—"}
        <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div id="machine-dropdown-portal"
          style={{ position: "fixed",
            top: pos.openUp ? undefined : pos.top,
            bottom: pos.openUp ? (window.innerHeight - pos.top) : undefined,
            left: pos.left, transform: "translateX(-50%)",
            background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 8, padding: 5,
            zIndex: 9999, display: "flex", flexDirection: "column", gap: 2, minWidth: 80,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
          <button onClick={e => { e.stopPropagation(); onChange(""); setOpen(false); }}
            style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: !value ? "#2a2a2a" : "transparent", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" as const }}>—</button>
          {options.map(o => (
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

function SelectMachine({ value, onChange }: { value:string; onChange:(v:string)=>void; navAttr?:string }) {
  return <MachineDropdown options={MACHINE_OPTIONS} value={value} onChange={onChange} />;
}
function SelectTypeDents({ value, onChange, navAttr }: { value:string; onChange:(v:string)=>void; navAttr?:string }) {
  const color = TYPE_DENTS_OPTIONS.find(o => o.value === value)?.color ?? "#555";
  const navKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { if (!navAttr) return; const el = e.currentTarget as unknown as HTMLElement; el.dataset.nav = navAttr; if (e.key === "ArrowRight") { e.preventDefault(); focusNav(el,"right"); } else if (e.key === "ArrowLeft") { e.preventDefault(); focusNav(el,"left"); } };
  return <div style={{ position:"relative", display:"inline-flex", width:"auto", maxWidth:150 }}><select data-nav={navAttr} value={value} onChange={e => onChange(e.target.value)} onKeyDown={navKeyDown} style={{ padding:"3px 22px 3px 8px", border:`1px solid ${color}40`, background:value?`${color}15`:"#1a1a1a", color:value?color:"#3a3a3a", fontSize:11, fontWeight:600, borderRadius:5, cursor:"pointer", outline:"none", appearance:"none", WebkitAppearance:"none", width:"100%" }}><option value="" style={{ background:"#111", color:"#555" }}>—</option>{TYPE_DENTS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background:"#111", color:o.color, fontWeight:600 }}>{o.value}</option>)}</select><svg viewBox="0 0 10 6" width="9" height="9" style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", opacity:0.7 }} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg></div>;
}

// ─── Champ N° disque (saisie libre) ──────────────────────────────────────────

function DisqueInput({ value, onSave, onFocusChange, navAttr }: {
  value: string | null;
  onSave: (v: string) => void;
  onFocusChange?: (f: boolean) => void;
  navAttr?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [local, setLocal] = React.useState(value ?? "");
  React.useEffect(() => { setLocal(value ?? ""); }, [value]);

  function handleBlur() {
    setFocused(false);
    onFocusChange?.(false);
    onSave(local.trim());
  }

  const borderColor = focused ? "1px solid #4ade80" : "1px solid #2a2a2a";

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", width: "90%" }}>
      <input
        data-nav={navAttr}
        value={local}
        placeholder={focused ? "" : "—"}
        onFocus={() => { setFocused(true); onFocusChange?.(true); }}
        onChange={e => setLocal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); return; }
          if (!navAttr) return;
          const el = e.currentTarget;
          if (e.key === "ArrowRight" && el.selectionEnd === el.value.length) { e.preventDefault(); focusNav(el, "right"); }
          else if (e.key === "ArrowLeft" && el.selectionStart === 0) { e.preventDefault(); focusNav(el, "left"); }
          else if (e.key === "ArrowDown") { e.preventDefault(); focusNav(el, "down"); }
          else if (e.key === "ArrowUp") { e.preventDefault(); focusNav(el, "up"); }
        }}
        onBlur={handleBlur}
        style={{ padding: "3px 7px", border: borderColor, background: focused ? "rgba(74,222,128,0.06)" : "#1a1a1a", color: "white", fontSize: 12, borderRadius: 5, outline: "none", transition: "border-color 150ms", width: "100%", boxSizing: "border-box" as const, display: "block", textAlign: "center" }}
      />
    </div>
  );
}

export function UsinageResineTable({ focusId, lotFilledIds, onReload, onReloadFull, onSelectionChange, onNewCases, onBannerClear }: {
  focusId: string|null; lotFilledIds?: Set<string>;
  onReload?: (fn:()=>void)=>void; onReloadFull?: (fn:()=>void)=>void; lotPanel?: React.ReactNode;
  onSelectionChange?: (b:boolean)=>void; onNewCases?: (c:ToastCase[])=>void;
  onBannerClear?: () => void;
}) {
  const onBannerClearRef = useRef(onBannerClear); onBannerClearRef.current = onBannerClear;
  const [currentUserId,setCurrentUserId]=useState("");
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(()=>{import("@/app/app/user-info-action").then(m=>m.getUserInfoAction()).then(info=>{setCurrentUserId(info.userId);setIsAdmin(info.isAdmin);});},[]);
  const [rows, setRows]             = useState<UsinageResineRow[]>([]);
  const [newRowIds, setNewRowIds]   = useState<Set<string>>(new Set());
  const [hasUnsorted, setHasUnsorted] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string|null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchPending, setBatchPending] = useState(false);
  const [batchResult, setBatchResult]   = useState<BatchResult|null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [editingDate, setEditingDate] = useState<{caseId:string;column:string;value:string;rect:DOMRect}|null>(null);
  const [holdBusy, setHoldBusy] = useState<string|null>(null);
  const [holdModalCaseId, setHoldModalCaseId] = useState<string|null>(null);
  const [reasonTooltip, setReasonTooltip] = useState<{id:string;rect:{top:number;left:number;width:number;bottom:number}}|null>(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [dualMachineIds, setDualMachineIds] = useState<Set<string>>(new Set());
  const [dualDisqueIds, setDualDisqueIds]   = useState<Set<string>>(new Set());
  const onNewCasesRef = useRef(onNewCases); onNewCasesRef.current = onNewCases;

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const fresh = (await loadUsinageResineRowsAction()) ?? [];
      if (silent) {
        // Détection seulement — on ne met PAS à jour le tableau,
        // les cas entreront au prochain refresh réel (action utilisateur ou 3 min d'inactivité).
        setRows(prev => {
          const prevIds = new Set(prev.map(r => String(r.id)));
          const incoming = fresh.filter(r => !prevIds.has(String(r.id)));
          if (incoming.length > 0) {
            onNewCasesRef.current?.(incoming.map(r => ({ id: String(r.id), case_number: r.case_number, date_expedition: r.date_expedition, nature_du_travail: r.nature_du_travail })));
          }
          return prev;
        });
      } else {
        setRows(sortByExp(fresh));
        setHasUnsorted(false);
        onBannerClearRef.current?.();
      }
    } catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onReload?.(() => load(true)); }, [load, onReload]);
  useEffect(() => { onReloadFull?.(() => load(false)); }, [load, onReloadFull]);

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
      if (Date.now() - lastActivityRef.current > 3 * 60 * 1000) {
        lastActivityRef.current = Date.now();
        load();
      }
    }, 30_000);
    return () => clearInterval(itv);
  }, [load]);

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const { countSectorActiveAction } = await import("./pending-count-action");
      const c = await countSectorActiveAction("usinage_resine");
      if (alive) setPendingCount(Math.max(0, c - rows.length));
    };
    tick();
    const itv = setInterval(tick, 30_000);
    return () => { alive = false; clearInterval(itv); };
  }, [rows.length]);
  const urgentCount = pendingCount;
  useEffect(() => { onSelectionChange?.(checkedIds.size > 0 || editingDate !== null || isEditing); }, [checkedIds, editingDate, isEditing, onSelectionChange]);
  useEffect(() => {
    if (!focusId || loading || rows.length === 0) return;
    const found = rows.find(r => r.case_number === focusId);
    if (!found) { setSearchNotFound(true); return; }
    setSearchNotFound(false);
    setTimeout(() => document.getElementById(`card-ur-${found.id}`)?.scrollIntoView({ behavior:"smooth", block:"center" }), 100);
  }, [focusId, loading, rows]);

  function handlePauseClick(caseId: string) {
    const row = rows.find(r => String(r.id) === caseId);
    if ((row as any)?._on_hold) { doToggleHold(caseId, null); }
    else { setHoldModalCaseId(caseId); }
  }

  async function doToggleHold(caseId: string, reason: string | null) {
    if (holdBusy) return;
    setHoldBusy(caseId);
    setHoldModalCaseId(null);
    try {
      const res = await toggleOnHoldAction(caseId, "usinage_resine", reason);
      if (res.ok) {
        setRows(prev => prev.map(r => String(r.id) === caseId ? { ...r, _on_hold: res.nowOnHold, _on_hold_at: res.nowOnHold ? new Date().toISOString() : null, _on_hold_reason: res.nowOnHold ? reason : null } as any : r));
        if (res.nowOnHold) setCheckedIds(prev => { const n = new Set(prev); n.delete(caseId); return n; });
      }
    } finally { setHoldBusy(null); }
  }

  function patchRow(caseId: string, sector: "ur"|"case", column: string, value: any) {
    setRows(prev => prev.map(r => {
      if (String(r.id) !== caseId) return r;
      if (sector === "ur") return { ...r, sector_usinage_resine: { ...(r as any).sector_usinage_resine, [column]: value } };
      return { ...r, [column]: value };
    }));
  }

  async function saveCell(caseId: string, column: string, value: any) {
    const fd = new FormData(); fd.set("case_id", caseId); fd.set("column", column);
    if (column === "usinage_with_reception") { fd.set("kind", "json"); fd.set("value", String(value)); }
    else { fd.set("kind", typeof value === "boolean" ? "boolean" : "text"); fd.set("value", String(value ?? "")); }
    await saveUsinageResineCellAction(fd);
  }

  function validateUrRow(row: any): string[] {
    const ur = row.sector_usinage_resine ?? {};
    const missing: string[] = [];
    if (!ur.usinage_dents_resine) missing.push("Usinage dents résine");
    // Machine, N° disque et étiquette ne bloquent plus la validation
    return missing;
  }

  async function handleBatch() {
    if (checkedIds.size === 0 || batchPending) return;
    const blockers: { case_id: string | null; error_message: string }[] = [];
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const miss = validateUrRow(row);
      if (miss.length > 0) {
        blockers.push({ case_id: id, error_message: `Cas ${row.case_number} — champs manquants : ${miss.join(", ")}` });
      }
    }
    // Vérification : date de réception résine ne dépasse pas la date d'expédition
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const ur = (row as any).sector_usinage_resine ?? {};
      const receptionDate = ur.reception_resine_at?.slice(0, 10);
      const expeditionDate = (row as any).date_expedition?.slice(0, 10);
      if (receptionDate && expeditionDate && receptionDate > expeditionDate) {
        const fmtR = new Date(receptionDate + "T00:00:00").toLocaleDateString("fr-FR");
        const fmtE = new Date(expeditionDate + "T00:00:00").toLocaleDateString("fr-FR");
        blockers.push({ case_id: id, error_message: `Cas ${row.case_number} : date de réception résine (${fmtR}) postérieure à la date d'expédition (${fmtE}). Validation impossible.` });
      }
    }
    if (blockers.length > 0) {
      setBatchResult({ okIds: [], errors: blockers });
      return;
    }
    setBatchPending(true);
    const fd = new FormData(); checkedIds.forEach(id => fd.append("case_ids", id));
    const result = await completeUsinageResineBatchAction(null, fd);
    setBatchResult(result); setBatchPending(false);
    if (result.okIds.length > 0 && result.errors.length === 0) setTimeout(() => setBatchResult(null), 4000);
    if (result.okIds.length > 0) {
      // ── Impression Zebra via relais local ──
      const relayUrl = process.env.NEXT_PUBLIC_PRINT_RELAY_URL || "http://192.168.1.30:3001";
      for (const okId of result.okIds) {
        const row = rows.find(r => String(r.id) === okId);
        if (!row) continue;
        const ur = (row as any).sector_usinage_resine ?? {};
        const dr = (row as any).sector_design_resine  ?? {};
        const dm = (row as any).sector_design_metal   ?? {};
        const printTD = ur.type_de_dents_override ?? dm.type_de_dents ?? dr.type_de_dents ?? "";
        const printDentsImp = printTD === "Dents imprimées";
        buildUrPrintJobAction({
          caseNumber: row.case_number ?? okId,
          nature: row.nature_du_travail ?? null,
          teinte:  ur.teintes_override ?? dr.teintes_associees ?? dm.teintes_associees ?? null,
          machine: printDentsImp ? null : (ur.identite_machine ?? null),
          machine2: printDentsImp ? null : (ur.identite_machine_2 ?? null),
          disque:  printDentsImp ? null : (ur.numero_disque ?? null),
          disque2: printDentsImp ? null : (ur.numero_disque_2 ?? null),
          nbBlocs: ur.nb_blocs_override ?? dr.nb_blocs_de_dents ?? null,
          modele:  row.nature_du_travail === "Chassis Argoat" ? false : Boolean(dr.modele_a_realiser_ok ?? dm.modele_a_faire_ok),
          base:    dr.base_type ?? null,
          baseQty: dr.base_qty ?? 1,
          machineBase: ur.machine_base ?? null,
          numeroBase1: ur.numero_base_1 ?? null,
          numeroBase2: ur.numero_base_2 ?? null,
        }).then(job => {
          if (!job || !relayUrl) return;
          fetch(`${relayUrl}/print`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zpl: job.zpl, printerIp: job.printerIp }),
          }).catch(() => {});
        }).catch(() => {});
      }
      setCheckedIds(prev => { const n = new Set(prev); result.okIds.forEach(id => n.delete(id)); return n; });
      // Refresh complet : enlève les cas validés ET fait entrer les nouveaux cas du bandeau
      load();
    }
  }

  async function handleDeleteFromSector(caseId: string) {
    const fd = new FormData(); fd.set("case_id", caseId);
    const res = await removeCaseFromSectorAction(fd);
    if ((res as any)?.error) { alert(`Erreur: ${(res as any).error}`); return; }
    setRows(prev => prev.filter(r => String(r.id) !== caseId));
    setConfirmDeleteId(null);
  }
  async function handleDeleteFromAll(caseId: string) {
    const fd = new FormData(); fd.set("case_id", caseId);
    const res = await deleteCaseAction(fd);
    if ((res as any)?.error) { alert(`Erreur: ${(res as any).error}`); return; }
    setRows(prev => prev.filter(r => String(r.id) !== caseId));
    setConfirmDeleteId(null);
  }

  if (loading) return <div style={{ padding:32, color:"#555", fontSize:13 }}>Chargement…</div>;
  if (error) return <div style={{ padding:20 }}><div style={{ color:"#f87171", fontSize:13 }}>Erreur : {error}</div><button onClick={() => load()} style={{ marginTop:8, border:"1px solid #f87171", background:"none", color:"#f87171", padding:"4px 10px", cursor:"pointer", borderRadius:4, fontSize:12 }}>Réessayer</button></div>;

  const grid2: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr", padding:"6px 14px", gap:"0 12px", alignItems:"center", justifyItems:"center", minHeight:28 };
  const grid3: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"6px 14px", gap:"0 10px", alignItems:"center", justifyItems:"center", minHeight:28 };
  const vals2: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr", padding:"5px 14px 7px", gap:"0 12px", alignItems:"center", justifyItems:"center" };
  const vals3: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"5px 14px 7px", gap:"0 10px", alignItems:"center", justifyItems:"center" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0, background:"#111" }}>
      <style dangerouslySetInnerHTML={{ __html: CARD_KEYFRAMES }} />
      {editingDate && (
        <MiniCalendar value={editingDate.value} rect={editingDate.rect}
          onSelect={date => { patchRow(editingDate.caseId,"ur",editingDate.column,date||null); saveCell(editingDate.caseId,editingDate.column,date||null); setEditingDate(null); }}
          onClose={() => setEditingDate(null)} />
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10, background:"#111", padding:"0 8px 10px 8px", borderBottom:"1px solid #1e1e1e", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {!searchNotFound && <span style={{ fontSize:12, color:"#ccc", padding:"4px 14px", background:"#1e1e1e", border:"1px solid #2e2e2e", borderRadius:20, fontWeight:600 }}>{searchFilter ? `${rows.filter(r=>(r.case_number??"").includes(searchFilter)).length} / ` : ""}{rows.length} dossier{rows.length>1?"s":""}</span>}
          <input
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value.replace(/\D/g,""))}
            placeholder="Rechercher..."
            style={{ padding:"4px 10px", border:"1px solid #333", background:"#1a1a1a", color:"white", fontSize:12, borderRadius:6, width:120, outline:"none", fontFamily:"monospace" }}
          />
          {urgentCount > 0 && (
            <span style={{ fontSize: 12, color: "#f59e0b", padding: "4px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 20, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
              {urgentCount} cas en attente
            </span>
          )}
          {searchNotFound && focusId && <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:"#1a0f0f", border:"1px solid rgba(239,68,68,0.4)", borderRadius:7 }}><span style={{ fontSize:12, color:"#f87171" }}>Cas <strong style={{ color:"white" }}>"{focusId}"</strong> introuvable</span><button onClick={() => setSearchNotFound(false)} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:14 }}>×</button></div>}
          {hasUnsorted && <button onClick={() => { setRows(p => sortByExp(p)); setHasUnsorted(false); setNewRowIds(new Set()); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:7, cursor:"pointer", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.3)", color:"#4ade80", fontSize:12, fontWeight:700 }} onMouseEnter={e => e.currentTarget.style.background="rgba(74,222,128,0.15)"} onMouseLeave={e => e.currentTarget.style.background="rgba(74,222,128,0.08)"}>↕ Trier par expédition</button>}
          {batchResult?.okIds.length ? <span style={{ fontSize:12, color:"#4ade80", padding:"5px 12px", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:7 }}>✓ {batchResult.okIds.length} envoyé{batchResult.okIds.length>1?"s":""}</span> : null}
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
        <button onClick={handleBatch} disabled={batchPending||checkedIds.size===0}
          style={{ padding:"8px 18px", border:checkedIds.size===0?"1px solid #3a3a3a":"1px solid #4ade80", background:checkedIds.size===0?"#1e1e1e":"rgba(74,222,128,0.08)", color:checkedIds.size===0?"#e0e0e0":"#4ade80", cursor:checkedIds.size===0?"not-allowed":"pointer", borderRadius:8, fontWeight:700, fontSize:13, transition:"all 160ms" }}>
          {batchPending?"Validation...":checkedIds.size===0?"Sélectionner des dossiers":`Valider ${checkedIds.size} dossier${checkedIds.size>1?"s":""}`}
        </button>
      </div>
      <div style={{ overflowY:"auto", flex:1, minHeight:0, padding:"12px 8px 80px" }}>
        {rows.length===0 && <div style={{ color:"#333", fontSize:13, textAlign:"center", paddingTop:40 }}>Aucun dossier en cours.</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px, 1fr))", gap:10 }}>
          {(() => {
            // Regrouper les rows par case_number
            const filtered = rows.filter(r => !searchFilter || (r.case_number ?? "").includes(searchFilter));
            const groups: UsinageResineRow[][] = [];
            const seen = new Map<string, number>();
            for (const row of filtered) {
              const cn = row.case_number ?? String(row.id);
              if (seen.has(cn)) {
                groups[seen.get(cn)!].push(row);
              } else {
                seen.set(cn, groups.length);
                groups.push([row]);
              }
            }
            return groups.map(group => {
              if (group.length === 1) {
                const row = group[0];
                return renderCard(row, false);
              }
              // Groupe multi — conteneur commun
              return (
                <div key={`grp-${group[0].case_number}`} style={{ border:"2px solid #3a3a3a", borderRadius:14, overflow:"hidden", background:"#0f0f0f", alignSelf:"start" }}>
                  {group.map((row, i) => (
                    <React.Fragment key={row.id}>
                      {i > 0 && <div style={{ margin:"0 12px", borderTop:"1px dashed #444" }} />}
                      {renderCard(row, true)}
                    </React.Fragment>
                  ))}
                </div>
              );
            });

            function renderCard(row: UsinageResineRow, inGroup: boolean) {
            const ur = (row as any).sector_usinage_resine ?? {};
            const dr = (row as any).sector_design_resine  ?? {};
            const dm = (row as any).sector_design_metal   ?? {};
            const nat = row.nature_du_travail ?? "";
            const natColor = NATURE_META[nat]?.color ?? "#666";
            const isChecked = checkedIds.has(String(row.id));
            const isFocused = focusId === row.case_number;
            const isNew = newRowIds.has(String(row.id));
            const isLotFilled = lotFilledIds?.has(String(row.id)) ?? false;
            const isDone = Boolean(ur.usinage_dents_resine);
            const isOnHold = Boolean((row as any)._on_hold);
            const effectiveTD = ur.type_de_dents_override ?? dm.type_de_dents ?? dr.type_de_dents ?? "";
            const isDentsImprimees = effectiveTD === "Dents imprimées";
            const dt = fmtDT(dr.design_dents_resine_at);
            return (
              <div key={row.id} id={`card-ur-${row.id}`} data-nav-row={String(row.id)} style={{ background:BG_CARD, border: inGroup ? "none" : `1px solid ${isChecked?"#2d4d3a":isDone?"#2d3d35":isLotFilled?"#2d2b4a":"#272727"}`, borderRadius: inGroup ? 0 : 12, overflow:"hidden", animation:isFocused?"card-found 2s ease forwards":isNew?"card-new 2.5s ease forwards":"none", transition:"border-color 150ms, opacity 300ms", opacity:isOnHold?0.45:1, ...(!inGroup ? {alignSelf:"start"} : {}) }}>
                <div style={{ height:3, background:natColor, opacity:0.8 }} />
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"2px solid #2a2a2a" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <button onClick={() => handlePauseClick(String(row.id))} disabled={holdBusy===String(row.id)} title={isOnHold?"Réactiver le cas":"Mettre en attente"} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontSize:15, lineHeight:1, color:isOnHold?"#f59e0b":"#555", transition:"color 150ms", opacity:holdBusy===String(row.id)?0.4:1 }} onMouseEnter={e => { if(!isOnHold) e.currentTarget.style.color="#f59e0b"; }} onMouseLeave={e => { if(!isOnHold) e.currentTarget.style.color="#555"; }}>{isOnHold?"▶":"⏸"}</button>
                      <span style={{ fontSize:18, fontWeight:800, color:"white", lineHeight:1 }}>{row.case_number}</span>
                      {nat && <span style={{ display:"inline-flex", padding:"2px 9px", borderRadius:5, fontSize:10, fontWeight:700, background:`${natColor}18`, border:`1px solid ${natColor}40`, color:natColor, whiteSpace:"nowrap" }}>{nat}</span>}
                      {isOnHold && <button onClick={(e) => { const r=(e.currentTarget as HTMLElement).getBoundingClientRect(); setReasonTooltip(prev=>prev?.id===String(row.id)?null:{id:String(row.id),rect:{top:r.top,left:r.left,width:r.width,bottom:r.bottom}}); }} style={{ fontSize:9, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:4, padding:"1px 6px", cursor:"pointer" }}>En attente {(row as any)._on_hold_reason?"💬":""}</button>}
                    </div>
                    {row.is_physical && <PhysicalBadge size="md" />}
                    {(row as any).sent_by_name && <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600, whiteSpace: "nowrap" as const }}>via {(row as any).sent_by_name}</span>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {(() => { const rawExp = row.date_expedition?.slice(0,10) ?? ""; const today = new Date().toISOString().split("T")[0]; const expColor = rawExp && rawExp < today ? "#f87171" : rawExp && rawExp === today ? "#f59e0b" : "#e0e0e0"; return (
                    <div style={{ textAlign:"right" }}><span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:expColor, display:"block", marginBottom:2 }}>Expédition</span><span style={{ fontSize:13, color:expColor, fontWeight:700 }}>{fmtDate(row.date_expedition)}</span></div>
                    ); })()}
                    {isOnHold ? (
                      <span style={{ fontSize:12, color:"#f59e0b" }} title="En attente">⏸</span>
                    ) : (
                      <input type="checkbox" checked={isChecked} onChange={e => { const id=String(row.id); setCheckedIds(prev => { const n=new Set(prev); e.target.checked?n.add(id):n.delete(id); return n; }); }} style={{ width:15, height:15, cursor:"pointer", accentColor:"#4ade80", flexShrink:0 }} />
                    )}
                    {(isAdmin || !(row as any).created_by || (row as any).created_by === currentUserId) && <button onClick={() => setConfirmDeleteId(String(row.id))} title="Supprimer le cas" style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:14, padding:4, opacity:0.6, transition:"opacity 150ms" }} onMouseEnter={e => e.currentTarget.style.opacity="1"} onMouseLeave={e => e.currentTarget.style.opacity="0.6"}>🗑</button>}
                  </div>
                </div>
                <div style={{ ...grid2, background:BG_LABEL_ROW, borderBottom:BD_LIGHT }}><Lbl>Date de création</Lbl><Lbl>Type de dents</Lbl></div>
                <div style={{ ...vals2, background:BG_VAL_ROW, borderBottom:BD_MED }}><Val>{fmtDate(row.created_at)}</Val><span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:6, background:(TYPE_DENTS_OPTIONS.find(o=>o.value===effectiveTD)?.color??"#555")+"18", border:`1px solid ${(TYPE_DENTS_OPTIONS.find(o=>o.value===effectiveTD)?.color??"#555")}44`, color:TYPE_DENTS_OPTIONS.find(o=>o.value===effectiveTD)?.color??"#555", fontSize:12, fontWeight:700 }}>{effectiveTD||"—"}</span></div>
                {(nat === "Deflex" || nat === "Complet") && (() => {
                  const bqty = dr.base_qty ?? 1;
                  const isImprimee = dr.base_type === "Imprimée";
                  const baseColor = isImprimee ? "#a78bfa" : "#f59e0b";
                  if (isImprimee) {
                    // Imprimée : juste le badge Base, pas de Machine ni N° Base
                    return (<>
                      <div style={{ ...grid2, background:BG_LABEL_ROW, borderBottom:BD_LIGHT }}><Lbl>Base</Lbl><div/></div>
                      <div style={{ ...vals2, background:BG_VAL_ROW, borderBottom:BD_MED }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:6, background:baseColor+"18", border:`1px solid ${baseColor}44`, color:baseColor, fontSize:12, fontWeight:700 }}>{dr.base_type}{dr.base_type && <span style={{opacity:0.7}}>×{bqty}</span>}</span>
                        <div/>
                      </div>
                    </>);
                  }
                  // Usinée : Base | Machine | N° Base
                  return (<>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"4px 10px", background:BG_LABEL_SAISIE, borderBottom:BD_LIGHT }}>
                      <Lbl>Base</Lbl>
                      <Lbl color="#7c8196">Machine</Lbl>
                      <Lbl color="#4ade80">{bqty >= 2 ? "N° Base 1 / N° Base 2" : "N° Base"}</Lbl>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"5px 14px 7px", gap:"0 12px", alignItems:"center", justifyItems:"center", background:BG_VAL_SAISIE, borderBottom:BD_MED }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:6, background:baseColor+"18", border:`1px solid ${baseColor}44`, color:baseColor, fontSize:12, fontWeight:700 }}>{dr.base_type || "—"}{dr.base_type && <span style={{opacity:0.7}}>×{bqty}</span>}</span>
                      <SelectMachine value={ur.machine_base ?? ""} onChange={v => { patchRow(String(row.id),"ur","machine_base",v||null); saveCell(String(row.id),"machine_base",v||null); }} />
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <InlineText value={ur.numero_base_1 ?? null} onFocusChange={setIsEditing} navAttr={`${row.id}_base1`} onSave={v => { patchRow(String(row.id),"ur","numero_base_1",v||null); saveCell(String(row.id),"numero_base_1",v||null); }} />
                        {bqty >= 2 && <>
                          <span style={{color:"#555",fontSize:10}}>/</span>
                          <InlineText value={ur.numero_base_2 ?? null} onFocusChange={setIsEditing} navAttr={`${row.id}_base2`} onSave={v => { patchRow(String(row.id),"ur","numero_base_2",v||null); saveCell(String(row.id),"numero_base_2",v||null); }} />
                        </>}
                      </div>
                    </div>
                  </>);
                })()}
                {dr.commentaire_complet && (
                  <div style={{ padding:"5px 10px", background:"rgba(245,158,11,0.06)", borderBottom:BD_LIGHT, fontSize:11, color:"#f59e0b" }}>
                    <span style={{ fontWeight:700, marginRight:4 }}>Note :</span>{dr.commentaire_complet}
                  </div>
                )}
                <div style={{ ...grid3, background:BG_LABEL_ROW, borderBottom:BD_LIGHT }}><Lbl>Design résine</Lbl><Lbl>Date &amp; heure</Lbl><Lbl>Modèle</Lbl></div>
                <div style={{ ...vals3, background:BG_VAL_ROW, borderBottom:BD_MED }}>{dr.design_dents_resine?<OuiBadge/>:<Val muted>—</Val>}<TimeBadge dt={dt}/><BoolBadge val={nat === "Chassis Argoat" ? false : (dr.modele_a_realiser_ok??dm.modele_a_faire_ok??null)} /></div>
                <div style={{ ...grid2, background:BG_LABEL_ROW, borderBottom:BD_LIGHT }}><Lbl color="#4ade80">Blocs</Lbl><Lbl color="#4ade80">Teinte</Lbl></div>
                <div style={{ ...vals2, background:"#1b1b1b", borderBottom:BD_STRONG }}>
                  <InlineText value={ur.nb_blocs_override??dr.nb_blocs_de_dents??null} onFocusChange={setIsEditing} navAttr={`${row.id}_col_1`} onSave={v => { patchRow(String(row.id),"ur","nb_blocs_override",v||null); saveCell(String(row.id),"nb_blocs_override",v||null); }} />
                  <InlineText value={ur.teintes_override??dr.teintes_associees??dm.teintes_associees??null} onFocusChange={setIsEditing} navAttr={`${row.id}_col_2`} onSave={v => { patchRow(String(row.id),"ur","teintes_override",v||null); saveCell(String(row.id),"teintes_override",v||null); }} />
                </div>
                <div style={{ ...grid2, background:BG_LABEL_SAISIE, borderBottom:BD_LIGHT }}><Lbl color="#4ade80">Production</Lbl><Lbl color="#4ade80">Réception</Lbl></div>
                <div style={{ ...vals2, background:BG_VAL_SAISIE, borderBottom:BD_MED }}>
                  <button onClick={() => { const newVal=!isDone; patchRow(String(row.id),"ur","usinage_dents_resine",newVal); if(newVal){const j1=addBusinessDays(new Date(),1).toISOString().split("T")[0];patchRow(String(row.id),"ur","reception_resine_at",j1);saveCell(String(row.id),"usinage_with_reception",JSON.stringify({usinage_dents_resine:true,reception_resine_at:j1}));}else{patchRow(String(row.id),"ur","reception_resine_at",null);saveCell(String(row.id),"usinage_with_reception",JSON.stringify({usinage_dents_resine:false,reception_resine_at:null}));} }} style={{ background:isDone?"rgba(74,222,128,0.15)":"#232323", border:isDone?"1px solid rgba(74,222,128,0.4)":"1px solid #333", color:isDone?"#4ade80":"#555", padding:"3px 0", borderRadius:5, cursor:"pointer", fontWeight:700, fontSize:12, transition:"all 150ms", width:"90%", textAlign:"center" as const }}>{isDone?"✓ Usiné":"—"}</button>
                  {(() => { const isReceptionLate = ur.reception_resine_at && row.date_expedition?.slice(0,10) && ur.reception_resine_at.slice(0,10) > row.date_expedition.slice(0,10); return (
                  <button onClick={e => { const rect=e.currentTarget.getBoundingClientRect(); setEditingDate({caseId:String(row.id),column:"reception_resine_at",value:ur.reception_resine_at?.slice(0,10)??"",rect}); }} style={{ background:isReceptionLate?"rgba(248,113,113,0.1)":"#1a1a1a", border:isReceptionLate?"1px solid rgba(248,113,113,0.3)":"1px solid #2a2a2a", borderRadius:5, color:isReceptionLate?"#f87171":ur.reception_resine_at?"#d0d0d0":"#3a3a3a", fontWeight:isReceptionLate?700:undefined, fontSize:12, cursor:"pointer", padding:"3px 0", width:"90%", textAlign:"center" as const, transition:"background 100ms" }} onMouseEnter={e => e.currentTarget.style.background=isReceptionLate?"rgba(248,113,113,0.15)":"#222"} onMouseLeave={e => e.currentTarget.style.background=isReceptionLate?"rgba(248,113,113,0.1)":"#1a1a1a"}>{ur.reception_resine_at?fmtDate(ur.reception_resine_at.slice(0,10)):"—"}</button>
                  ); })()}
                </div>
                {/* ── Machine / N° disque — double-clic active le mode double ── */}
                {(() => {
                  const rid = String(row.id);
                  if (isDentsImprimees) {
                    return (<>
                      <div style={{ ...grid2, background:BG_LABEL_SAISIE, borderBottom:BD_LIGHT }}>
                        <Lbl color="#7c8196">Machine</Lbl>
                        <Lbl color="#7c8196">N° disque</Lbl>
                      </div>
                      <div style={{ ...vals2, background:"repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, #1b1b1b 4px, #1b1b1b 8px)", borderBottom:BD_STRONG }}>
                        <span style={{ color:"rgba(239,68,68,0.4)", fontSize:13 }}>⊘</span>
                        <span style={{ color:"rgba(239,68,68,0.4)", fontSize:13 }}>⊘</span>
                      </div>
                    </>);
                  }
                  const hasDualMachine = dualMachineIds.has(rid) || Boolean(ur.identite_machine_2);
                  const hasDualDisque  = dualDisqueIds.has(rid) || Boolean(ur.numero_disque_2);
                  const showDualRow = hasDualMachine || hasDualDisque;
                  return (<>
                    <div style={{ ...grid2, background:BG_LABEL_SAISIE, borderBottom:BD_LIGHT }}>
                      <Lbl color="#7c8196">Machine{showDualRow ? "s" : ""}</Lbl>
                      <Lbl color="#7c8196">N° disque{showDualRow ? "s" : ""}</Lbl>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:BG_VAL_SAISIE, padding:"5px 14px 7px", gap:"0 12px", alignItems:"stretch", justifyItems:"center" }}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setDualMachineIds(p => new Set(p).add(rid));
                        setDualDisqueIds(p => new Set(p).add(rid));
                      }}>
                      {/* Colonne Machine(s) */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                        <SelectMachine value={ur.identite_machine??""} onChange={v => { patchRow(rid,"ur","identite_machine",v||null); saveCell(rid,"identite_machine",v||null); }} />
                        {hasDualMachine && (
                          <SelectMachine value={ur.identite_machine_2??""} onChange={v => { patchRow(rid,"ur","identite_machine_2",v||null); saveCell(rid,"identite_machine_2",v||null); }} />
                        )}
                      </div>
                      {/* Colonne Disque(s) */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, width:"100%" }}
                        onDoubleClick={e => { e.stopPropagation(); setDualDisqueIds(p => new Set(p).add(rid)); }}>
                        <DisqueInput value={ur.numero_disque??null} onFocusChange={setIsEditing} navAttr={`${row.id}_col_4`}
                          onSave={v => { patchRow(rid,"ur","numero_disque",v||null); saveCell(rid,"numero_disque",v||null); }} />
                        {hasDualDisque && (
                          <DisqueInput value={ur.numero_disque_2??null} onFocusChange={setIsEditing} navAttr={`${row.id}_col_5`}
                            onSave={v => { patchRow(rid,"ur","numero_disque_2",v||null); saveCell(rid,"numero_disque_2",v||null); }} />
                        )}
                      </div>
                    </div>
                  </>);
                })()}
              </div>
            );
          } // end renderCard
          })()}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmDeleteId && (() => {
        const row = rows.find(r => String(r.id) === confirmDeleteId);
        return (
          <DeleteConfirmModal
            caseNumber={row?.case_number ?? null}
            sectorLabel="Usinage Résine"
            onDeleteFromSector={() => handleDeleteFromSector(confirmDeleteId)}
            onDeleteFromAll={() => handleDeleteFromAll(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
      {holdModalCaseId && (() => {
        const r = rows.find(r => String(r.id) === holdModalCaseId);
        return <OnHoldReasonModal caseNumber={r?.case_number ?? ""} presetReasons={["__other_first__", "Teinte", "Attente matière"]} onConfirm={(reason) => doToggleHold(holdModalCaseId, reason || null)} onCancel={() => setHoldModalCaseId(null)} />;
      })()}
      {reasonTooltip && (() => {
        const r = rows.find(r => String(r.id) === reasonTooltip.id);
        return <OnHoldReasonTooltip reason={(r as any)?._on_hold_reason} onHoldAt={(r as any)?._on_hold_at} anchorRect={reasonTooltip.rect} onClose={() => setReasonTooltip(null)} />;
      })()}
    </div>
  );
}
