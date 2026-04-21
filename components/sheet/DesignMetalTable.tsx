"use client";
import React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { PhysicalBadge } from "@/components/sheet/PhysicalBadge";
import {
  saveDesignMetalCellAction,
  saveTypeDeDentsAction,
  completeDesignMetalBatchAction,
  loadDesignMetalRowsAction,
  updateCaseInfoAction,
  deleteCaseAction,
  removeCaseFromSectorAction,
  toggleCasePhysicalAction,
  type BatchResult,
  type DesignMetalRow,
} from "@/app/app/design-metal/actions";
import { DeleteConfirmModal } from "@/components/sheet/DeleteConfirmModal";
import { toggleOnHoldAction } from "@/lib/on-hold";

const TYPE_OPTIONS = [
  { value: "Dents usinées", color: "#7c8196" },
  { value: "Dents du commerce", color: "#f59e0b" },
];

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat": { color: "#e07070" },
  "Chassis Dent All": { color: "#4ade80" },
  "Définitif Résine": { color: "#c4a882" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const TH_BG = "#111";

const thBase: React.CSSProperties = {
  padding: "6px 10px",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#e0e0e0",
  background: TH_BG,
  border: "none",
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: 1.2,
  textAlign: "center",
  verticalAlign: "bottom",
};

const thRead: React.CSSProperties = { ...thBase, color: "#e0e0e0" };
const thEdit: React.CSSProperties = { ...thBase, color: "#4ade80" };
const thSticky: React.CSSProperties = {
  ...thBase,
  color: "#e0e0e0",
  textAlign: "left",
  position: "sticky",
  left: 0,
  zIndex: 10,
  background: TH_BG,
};

const tdBase: React.CSSProperties = {
  padding: "0 8px",
  whiteSpace: "nowrap",
  fontSize: 12,
  textAlign: "center",
  border: "none",
  verticalAlign: "middle",
  height: 50,
};

const tdSticky: React.CSSProperties = {
  ...tdBase,
  textAlign: "left",
  position: "sticky",
  left: 0,
  zIndex: 2,
  fontWeight: 700,
  fontSize: 13,
};

const tdDisabled: React.CSSProperties = {
  ...tdBase,
  background:
    "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)",
  color: "rgba(239,68,68,0.4)",
};

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes row-found {
  0%   { background: transparent;            box-shadow: inset 0 0 0 2px transparent; }
  8%   { background: rgba(74,222,128,0.35);  box-shadow: inset 0 0 0 2px rgba(74,222,128,0.9); }
  20%  { background: rgba(74,222,128,0.18);  box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  35%  { background: rgba(74,222,128,0.30);  box-shadow: inset 0 0 0 2px rgba(74,222,128,0.8); }
  50%  { background: rgba(74,222,128,0.14);  box-shadow: inset 0 0 0 2px rgba(74,222,128,0.5); }
  65%  { background: rgba(74,222,128,0.22);  box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  80%  { background: rgba(74,222,128,0.10);  box-shadow: inset 0 0 0 1px rgba(74,222,128,0.3); }
  100% { background: rgba(255,255,255,0.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type CellRule = "disabled" | "red" | "green" | undefined;
function getCellRule(column: string, nature: string): CellRule {
  switch (nature) {
    case "Chassis Argoat":
      if (["dentall_case_number", "envoye_dentall", "reception_metal_date"].includes(column))
        return "disabled";
      if (column === "modele_a_faire_ok") return "green";
      return undefined;
    case "Chassis Dent All":
    case "Définitif Résine":
      if (column === "modele_a_faire_ok") return "red";
      return undefined;
    default:
      return undefined;
  }
}

// ── États visuels des lignes ──────────────────────────────────────────────────

function getRowBg(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "rgba(74,222,128,0.10)";
  if (isActive) return "#1f2321";
  if (isHovered) return "#222222";
  return "#1a1a1a";
}

function getRowBorder(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "rgba(74,222,128,0.32)";
  if (isActive) return "rgba(255,255,255,0.10)";
  if (isHovered) return "#383838";
  return "#2b2b2b";
}

function getRowShadow(isChecked: boolean, isHovered: boolean, isActive: boolean) {
  if (isChecked) return "0 0 0 1px rgba(74,222,128,0.10), 0 8px 24px rgba(0,0,0,0.30)";
  if (isActive) return "0 0 0 1px rgba(255,255,255,0.06), 0 16px 34px rgba(0,0,0,0.34)";
  if (isHovered) return "0 8px 20px rgba(0,0,0,0.22)";
  return "0 4px 12px rgba(0,0,0,0.18)";
}

// ─── Calendrier ──────────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function MiniCalendar({
  value,
  onSelect,
  onClose,
  rect,
}: {
  value: string;
  onSelect: (d: string) => void;
  onClose: () => void;
  rect: DOMRect;
}) {
  const today = new Date();
  const init = value ? new Date(value + "T00:00:00") : today;
  const [view, setView] = useState({ year: init.getFullYear(), month: init.getMonth() });
  const ref = useRef<HTMLDivElement>(null);
  const top = rect.bottom + 260 > window.innerHeight ? rect.top - 264 : rect.bottom + 4;

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const sel = value ? new Date(value + "T00:00:00") : null;
  const { year, month } = view;
  const total = new Date(year, month + 1, 0).getDate();
  const first = (() => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const pick = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onSelect(`${year}-${mm}-${dd}`);
    onClose();
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        zIndex: 9999,
        top,
        left: rect.left,
        background: "#1a1a1a",
        border: "1px solid #3d3d3d",
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        minWidth: 224,
        userSelect: "none",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}
      >
        <button
          onClick={() =>
            setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }))
          }
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, padding: "0 6px" }}
        >
          ‹
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={() =>
            setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }))
          }
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, padding: "0 6px" }}
        >
          ›
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS_FR.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iT =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const iS =
            sel && day === sel.getDate() && month === sel.getMonth() && year === sel.getFullYear();

          return (
            <button
              key={i}
              onClick={() => pick(day)}
              style={{
                background: iS ? "#4ade80" : iT ? "rgba(74,222,128,0.12)" : "none",
                border: iT && !iS ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent",
                color: iS ? "#000" : "white",
                borderRadius: 5,
                fontSize: 11,
                padding: "4px 2px",
                cursor: "pointer",
                fontWeight: iS ? 700 : 400,
              }}
              onMouseEnter={(e) => {
                if (!iS) (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!iS)
                  (e.target as HTMLButtonElement).style.background = iT
                    ? "rgba(74,222,128,0.12)"
                    : "none";
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          onSelect("");
          onClose();
        }}
        style={{
          marginTop: 8,
          width: "100%",
          background: "none",
          border: "1px solid #3d3d3d",
          borderRadius: 6,
          color: "#555",
          fontSize: 11,
          padding: "5px 0",
          cursor: "pointer",
        }}
      >
        Effacer
      </button>
    </div>
  );
}

function InlineTextInput({
  defaultValue,
  maxLength,
  width,
  onSave,
}: {
  defaultValue: string;
  maxLength?: number;
  width: number;
  onSave: (v: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      defaultValue={defaultValue}
      maxLength={maxLength}
      placeholder={focused ? "" : "—"}
      onFocus={() => setFocused(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave(e.currentTarget.value);
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        setFocused(false);
        onSave(e.currentTarget.value);
      }}
      style={{
        padding: "3px 8px",
        border: focused ? "1px solid #4ade80" : "1px solid #2a2a2a",
        background: focused ? "rgba(74,222,128,0.06)" : "#151515",
        color: "white",
        width,
        fontSize: 12,
        textAlign: "center",
        borderRadius: 7,
        outline: "none",
        transition: "all 150ms",
      }}
    />
  );
}

function ModeleIndicator({ rule, caseId, currentValue, onToggle }: { rule: CellRule; caseId: string; currentValue: boolean | null; onToggle: (caseId: string, newValue: boolean) => void }) {
  // Valeur affichée : la valeur manuelle (currentValue) a priorité, sinon on déduit de la règle
  const isOui = currentValue !== null ? currentValue : rule === "green";
  const isNon = currentValue !== null ? !currentValue : rule === "red";

  if (!isOui && !isNon) return <span style={{ color: "#3a3a3a" }}>—</span>;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(caseId, !isOui); }}
      style={{
        display: "inline-flex",
        padding: "2px 8px",
        borderRadius: 5,
        background: isOui ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.08)",
        border: isOui ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(239,68,68,0.25)",
        color: isOui ? "#4ade80" : "#f87171",
        fontWeight: 700,
        fontSize: 11,
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {isOui ? "Oui" : "Non"}
    </button>
  );
}

const COLUMNS = [
  { key: "case_number", header: "N° cas", editable: false, sticky: true, type: undefined, column: undefined },
  { key: "created_at", header: "Création", editable: false, type: undefined, column: undefined },
  { key: "date_expedition", header: "Expédition", editable: true, type: undefined, column: undefined },
  { key: "nature_du_travail", header: "Nature", editable: true, type: undefined, column: undefined },
  { key: "design_chassis", header: "Design Châssis", editable: true, type: "boolean", column: "design_chassis" },
  { key: "design_chassis_at", header: "Date & Heure", sub: "Design châssis terminé", editable: false, type: undefined, column: undefined },
  { key: "dentall_case_number", header: "N° Dent All", editable: true, type: "text", column: "dentall_case_number" },
  { key: "envoye_dentall", header: "Envoyé DentAll", editable: true, type: "boolean", column: "envoye_dentall" },
  { key: "reception_metal_date", header: "Réception métal", editable: true, type: "date", column: "reception_metal_date" },
  { key: "type_de_dents", header: "Type de dents", editable: true, type: "select", column: "type_de_dents" },
  { key: "modele_a_faire_ok", header: "Modèle à faire", editable: true, type: "indicator", column: "modele_a_faire_ok" },
  { key: "teintes_associees", header: "Teintes", editable: true, type: "text", column: "teintes_associees" },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export function DesignMetalTable({
  focusId,
  currentUserId,
  currentSector,
  isAdmin = false,
  onReload,
  onSelectionChange,
}: {
  focusId: string | null;
  currentUserId: string;
  currentSector: string;
  isAdmin?: boolean;
  onReload?: (fn: () => void) => void;
  onSelectionChange?: (b: boolean) => void;
}) {
  const [rows, setRows] = useState<DesignMetalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [editingDate, setEditingDate] = useState<{ caseId: string; column: string; rect: DOMRect } | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [foundRowId, setFoundRowId] = useState<string | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [holdBusy, setHoldBusy] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await loadDesignMetalRowsAction();
      setRows(data);
    } catch (e: any) {
      if (!silent) setError(e?.message ?? "Erreur inconnue");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onReload?.(() => load(true));
  }, [load, onReload]);

  useEffect(() => {
    onSelectionChange?.(checkedIds.size > 0 || editingDate !== null);
  }, [checkedIds, editingDate, onSelectionChange]);

  useEffect(() => {
    if (!focusId || loading || rows.length === 0) return;
    const found = rows.find((r) => r.case_number === focusId);
    if (!found) {
      setSearchNotFound(true);
      setFoundRowId(null);
      return;
    }
    setSearchNotFound(false);
    setActiveRowId(String(found.id));
    setFoundRowId(String(found.id));
    setTimeout(() => {
      document.getElementById(`row-dm-${found.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    const t = setTimeout(() => setFoundRowId(null), 2200);
    return () => clearTimeout(t);
  }, [focusId, loading, rows]);

  function patchRow(caseId: string, sectorKey: string | null, column: string, value: any) {
    setRows((prev) =>
      prev.map((row) => {
        if (String(row.id) !== caseId) return row;
        if (!sectorKey) return { ...row, [column]: value };
        return { ...row, [sectorKey]: { ...(row as any)[sectorKey], [column]: value } };
      })
    );
  }

  async function handleTogglePhysical(caseId: string, currentPhysical: boolean) {
    const newPhysical = !currentPhysical;
    // Optimistic : toggle le badge immédiatement
    patchRow(caseId, null, "is_physical", newPhysical);
    // Si on MARQUE physique → modèle passe à false
    if (newPhysical) {
      patchRow(caseId, "sector_design_metal", "modele_a_faire_ok", false);
    }
    try {
      await toggleCasePhysicalAction(caseId);
      // Recharger les données pour récupérer la vraie valeur modèle restaurée côté serveur
      await load(true);
    } catch {
      patchRow(caseId, null, "is_physical", currentPhysical);
      if (newPhysical) {
        // Rollback : recharger pour retrouver la valeur d'origine
        await load(true);
      }
    }
  }

  async function handleToggleHold(caseId: string) {
    if (holdBusy) return;
    setHoldBusy(caseId);
    try {
      const res = await toggleOnHoldAction(caseId, "design_metal");
      if (res.ok) {
        setRows(prev => prev.map(r => String(r.id) === caseId ? { ...r, _on_hold: res.nowOnHold, _on_hold_at: res.nowOnHold ? new Date().toISOString() : null } as any : r));
        if (res.nowOnHold) setCheckedIds(prev => { const n = new Set(prev); n.delete(caseId); return n; });
      }
    } finally { setHoldBusy(null); }
  }

  async function saveBool(caseId: string, column: string, current: boolean) {
    const newVal = !current;
    patchRow(caseId, "sector_design_metal", column, newVal);
    if (column === "design_chassis") {
      patchRow(caseId, "sector_design_metal", "design_chassis_at", newVal ? new Date().toISOString() : null);
    }
    if (column === "envoye_dentall" && newVal) {
      const recep = toDateString(addBusinessDays(new Date(), 3));
      patchRow(caseId, "sector_design_metal", "reception_metal_date", recep);
      const fd2 = new FormData();
      fd2.set("case_id", caseId);
      fd2.set("column", "reception_metal_date");
      fd2.set("kind", "date");
      fd2.set("value", recep);
      saveDesignMetalCellAction(fd2);
    }
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("column", column);
    fd.set("kind", "boolean");
    fd.set("current", String(current));
    await saveDesignMetalCellAction(fd);
  }

  async function autoFillOnSelect(row: DesignMetalRow) {
    const caseId = String(row.id);
    const dm = row.sector_design_metal ?? {} as any;
    const isArgoat = row.nature_du_travail === "Chassis Argoat";
    const now = new Date().toISOString();

    // design_chassis = true + date/heure
    if (!dm.design_chassis) {
      patchRow(caseId, "sector_design_metal", "design_chassis", true);
      patchRow(caseId, "sector_design_metal", "design_chassis_at", now);
      const fd = new FormData();
      fd.set("case_id", caseId); fd.set("column", "design_chassis"); fd.set("kind", "boolean"); fd.set("current", "false");
      saveDesignMetalCellAction(fd);
    }

    // envoye_dentall + reception_metal (sauf Chassis Argoat)
    if (!isArgoat && !dm.envoye_dentall) {
      patchRow(caseId, "sector_design_metal", "envoye_dentall", true);
      const recep = toDateString(addBusinessDays(new Date(), 3));
      patchRow(caseId, "sector_design_metal", "reception_metal_date", recep);
      const fd = new FormData();
      fd.set("case_id", caseId); fd.set("column", "envoye_dentall"); fd.set("kind", "boolean"); fd.set("current", "false");
      saveDesignMetalCellAction(fd);
      const fd2 = new FormData();
      fd2.set("case_id", caseId); fd2.set("column", "reception_metal_date"); fd2.set("kind", "date"); fd2.set("value", recep);
      saveDesignMetalCellAction(fd2);
    }
  }

  async function saveText(caseId: string, column: string, value: string) {
    patchRow(caseId, "sector_design_metal", column, value || null);
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("column", column);
    fd.set("kind", "text");
    fd.set("value", value);
    await saveDesignMetalCellAction(fd);
  }

  async function saveDate(caseId: string, column: string, value: string) {
    patchRow(caseId, "sector_design_metal", column, value || null);
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("column", column);
    fd.set("kind", "date");
    fd.set("value", value);
    await saveDesignMetalCellAction(fd);
  }

  async function saveTypeDeDents(caseId: string, value: string) {
    patchRow(caseId, "sector_design_metal", "type_de_dents", value);
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("value", value);
    await saveTypeDeDentsAction(fd);
  }

  async function saveCaseInfo(caseId: string, field: string, value: string) {
    patchRow(caseId, null, field, value === "" ? null : value);
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("field", field);
    fd.set("value", value);
    await updateCaseInfoAction(fd);
  }

  function validateDmRow(row: any): string[] {
    const dm = row.sector_design_metal ?? {};
    const nature = row.nature_du_travail ?? "";
    const missing: string[] = [];
    if (!dm.design_chassis)        missing.push("Design châssis");
    if (!dm.design_chassis_at)     missing.push("Date design châssis");
    // Les champs DentAll ne s'appliquent qu'aux natures qui passent par DentAll
    if (nature !== "Chassis Argoat") {
      if (!dm.envoye_dentall)        missing.push("Envoyé DentAll");
      if (!dm.reception_metal_date)  missing.push("Réception métal");
    }
    if (!dm.type_de_dents)         missing.push("Type de dents");
    if (dm.modele_a_faire_ok === null || dm.modele_a_faire_ok === undefined) missing.push("Modèle à faire");
    if (!dm.teintes_associees)     missing.push("Teintes");
    return missing;
  }

  async function handleBatch() {
    if (checkedIds.size === 0 || batchPending) return;
    const blockers: { case_id: string | null; error_message: string }[] = [];
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const miss = validateDmRow(row);
      if (miss.length > 0) {
        blockers.push({ case_id: id, error_message: `Cas ${row.case_number} — champs manquants : ${miss.join(", ")}` });
      }
    }
    // Vérification : date de réception métal ne dépasse pas la date d'expédition
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const dm = (row as any).sector_design_metal ?? {};
      const receptionDate = dm.reception_metal_date?.slice(0, 10);
      const expeditionDate = (row as any).date_expedition?.slice(0, 10);
      if (receptionDate && expeditionDate && receptionDate > expeditionDate) {
        const fmtR = new Date(receptionDate + "T00:00:00").toLocaleDateString("fr-FR");
        const fmtE = new Date(expeditionDate + "T00:00:00").toLocaleDateString("fr-FR");
        blockers.push({ case_id: id, error_message: `Cas ${row.case_number} : date de réception métal (${fmtR}) postérieure à la date d'expédition (${fmtE}). Validation impossible.` });
      }
    }
    if (blockers.length > 0) {
      setBatchResult({ okIds: [], errors: blockers });
      return;
    }
    setBatchPending(true);
    const fd = new FormData();
    checkedIds.forEach((id) => fd.append("case_ids", id));
    const result = await completeDesignMetalBatchAction(null, fd);
    setBatchResult(result);
    setBatchPending(false);
    if (result.okIds.length > 0 && result.errors.length === 0) {
      setTimeout(() => setBatchResult(null), 4000);
    }
    setCheckedIds(new Set());
    await load();
  }

  async function handleDeleteFromSector(caseId: string) {
    const fd = new FormData(); fd.set("case_id", caseId);
    const result = await removeCaseFromSectorAction(fd);
    if (result?.error) { alert(result.error); return; }
    setConfirmDeleteId(null);
    setRows(prev => prev.filter(r => String(r.id) !== caseId));
  }

  async function handleDeleteFromAll(caseId: string) {
    const fd = new FormData();
    fd.set("case_id", caseId);
    const result = await deleteCaseAction(fd);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setConfirmDeleteId(null);
    setRows((prev) => prev.filter((r) => String(r.id) !== caseId));
  }

  if (loading) return <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>;

  if (error)
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "#f87171", fontSize: 13 }}>Erreur : {error}</div>
        <button
          onClick={() => load()}
          style={{
            marginTop: 8,
            border: "1px solid #f87171",
            background: "none",
            color: "#f87171",
            padding: "4px 10px",
            cursor: "pointer",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          Réessayer
        </button>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#111" }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {editingDate && (
        <MiniCalendar
          value={(() => {
            const row = rows.find((r) => String(r.id) === editingDate.caseId);
            const dm = (row as any)?.sector_design_metal ?? {};
            return editingDate.column === "date_expedition"
              ? row?.date_expedition?.slice(0, 10) ?? ""
              : dm[editingDate.column]?.slice(0, 10) ?? "";
          })()}
          rect={editingDate.rect}
          onSelect={(date) => {
            editingDate.column === "date_expedition"
              ? saveCaseInfo(editingDate.caseId, "date_expedition", date)
              : saveDate(editingDate.caseId, editingDate.column, date);
            setEditingDate(null);
          }}
          onClose={() => setEditingDate(null)}
        />
      )}

      {/* ── Barre de contrôle ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#111",
          padding: "0 8px 10px 8px",
          borderBottom: "1px solid #1e1e1e",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
          {!searchNotFound && (
            <span
              style={{
                fontSize: 12,
                color: "#bdbdbd",
                padding: "4px 14px",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              {rows.length} dossier{rows.length > 1 ? "s" : ""}
            </span>
          )}

          {searchNotFound && focusId && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "#1a0f0f",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 7,
              }}
            >
              <span style={{ fontSize: 12, color: "#f87171" }}>
                Cas <strong style={{ color: "white" }}>"{focusId}"</strong> introuvable
              </span>
              <button
                onClick={() => setSearchNotFound(false)}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}
              >
                ×
              </button>
            </div>
          )}

          {batchResult?.okIds.length ? (
            <span
              style={{
                fontSize: 12,
                color: "#4ade80",
                padding: "5px 12px",
                background: "rgba(74,222,128,0.06)",
                border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: 7,
              }}
            >
              ✓ {batchResult.okIds.length} envoyé{batchResult.okIds.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button
            onClick={handleBatch}
            disabled={batchPending || checkedIds.size === 0}
            style={{
              padding: "8px 18px",
              border: checkedIds.size === 0 ? "1px solid #3a3a3a" : "1px solid #4ade80",
              background: checkedIds.size === 0 ? "#1e1e1e" : "rgba(74,222,128,0.08)",
              color: checkedIds.size === 0 ? "#e0e0e0" : "#4ade80",
              cursor: checkedIds.size === 0 ? "not-allowed" : "pointer",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              transition: "all 160ms",
            }}
          >
            {batchPending
              ? "Validation..."
              : checkedIds.size === 0
              ? "Sélectionner des dossiers"
              : `Valider ${checkedIds.size} dossier${checkedIds.size > 1 ? "s" : ""}`}
          </button>

          {batchResult?.errors.length ? (
            <div
              style={{
                border: "1px solid #5a2a2a",
                background: "rgba(120,40,40,0.15)",
                padding: 10,
                borderRadius: 8,
                maxWidth: 480,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Dossiers non envoyés</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {batchResult.errors.map((e, i) => (
                  <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                    {e.error_message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Tableau ── */}
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0, padding: "0 8px 80px 8px" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: "0 8px", width: "100%", tableLayout: "auto" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 5, background: TH_BG }}>
            <tr>
              {COLUMNS.map((col) => {
                const style = col.sticky
                  ? { ...thSticky, paddingLeft: 12, paddingBottom: 10 }
                  : col.editable
                  ? { ...thEdit, paddingBottom: 10 }
                  : { ...thRead, paddingBottom: 10 };
                return (
                  <th key={col.key} style={style}>
                    {col.header}
                    {(col as any).sub && (
                      <div style={{ marginTop: 3, fontSize: 9, color: "#666", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                        {(col as any).sub}
                      </div>
                    )}
                  </th>
                );
              })}
              <th style={{ ...thEdit, paddingBottom: 10 }}>Sél.</th>
              <th style={{ ...thBase, paddingBottom: 10, color: TH_BG }}></th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>
                  Aucun dossier.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const dm = (row as any).sector_design_metal ?? {};
              const nat = row.nature_du_travail ?? "";
              const natColor = NATURE_META[nat]?.color ?? "#666";
              const isChecked = checkedIds.has(String(row.id));
              const isHovered = hoveredId === String(row.id);
              const isActive = activeRowId === String(row.id);
              const isFound = foundRowId === String(row.id);
              const isOnHold = Boolean((row as any)._on_hold);

              const rowBg = getRowBg(isChecked, isHovered, isActive);
              const rowBorder = getRowBorder(isChecked, isHovered, isActive);
              const rowShadow = getRowShadow(isChecked, isHovered, isActive);

              const tdCard: React.CSSProperties = {
                ...tdBase,
                background: isFound ? "transparent" : rowBg,
                borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderLeft: "none",
                borderRight: "none",
                transition: "background 160ms, border-color 160ms, box-shadow 160ms",
                boxShadow: isFound ? "none" : "none",
              };

              const accentColor = isChecked ? "#4ade80" : natColor;

              const tdCardFirst: React.CSSProperties = {
                ...tdSticky,
                background: isFound ? "transparent" : rowBg,
                paddingLeft: 12,
                borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderLeft: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderTopLeftRadius: 14,
                borderBottomLeftRadius: 14,
                boxShadow: isFound ? "none" : `inset 4px 0 0 ${accentColor}cc, ${rowShadow}`,
                transition: "background 160ms, border-color 160ms, box-shadow 160ms",
              };

              const tdCardLast: React.CSSProperties = {
                ...tdBase,
                background: isFound ? "transparent" : rowBg,
                borderTop: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderBottom: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderRight: `1px solid ${isFound ? "transparent" : rowBorder}`,
                borderTopRightRadius: 14,
                borderBottomRightRadius: 14,
                transition: "background 160ms, border-color 160ms",
                boxShadow: isFound ? "none" : rowShadow,
              };

              return (
                <tr
                  key={row.id}
                  id={`row-dm-${row.id}`}
                  onClick={() => setActiveRowId(String(row.id))}
                  onMouseEnter={() => setHoveredId(String(row.id))}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    cursor: "pointer",
                    animation: isFound ? "row-found 2.2s ease-in-out forwards" : "none",
                    background: isFound ? undefined : "transparent",
                    opacity: isOnHold ? 0.45 : 1,
                    transition: "opacity 300ms",
                  }}
                >
                  {COLUMNS.map((col) => {
                    if (col.key === "case_number")
                      return (
                        <td key={col.key} style={tdCardFirst}
                          onDoubleClick={(e) => { e.stopPropagation(); handleTogglePhysical(String(row.id), Boolean(row.is_physical)); }}
                          title="Double-clic pour basculer physique / numérique"
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "default" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleHold(String(row.id)); }}
                              disabled={holdBusy === String(row.id)}
                              title={isOnHold ? "Réactiver le cas" : "Mettre en attente"}
                              style={{
                                background:"none", border:"none", padding:0, cursor:"pointer",
                                fontSize:13, lineHeight:1, color: isOnHold ? "#f59e0b" : "#555",
                                transition:"color 150ms", opacity: holdBusy === String(row.id) ? 0.4 : 1,
                              }}
                              onMouseEnter={e => { if (!isOnHold) e.currentTarget.style.color = "#f59e0b"; }}
                              onMouseLeave={e => { if (!isOnHold) e.currentTarget.style.color = "#555"; }}
                            >
                              {isOnHold ? "▶" : "⏸"}
                            </button>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 24,
                                padding: "2px 8px",
                                borderRadius: 8,
                                color: "#ffffff",
                                background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                                border: isActive ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                                transition: "all 160ms",
                              }}
                            >
                              {row.case_number ?? "—"}
                            </div>
                            {row.is_physical && <PhysicalBadge />}
                            {isOnHold && <span style={{ fontSize:9, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:4, padding:"1px 6px" }}>En attente</span>}
                          </div>
                        </td>
                      );

                    if (col.key === "created_at") {
                      const d = row.created_at ? new Date(row.created_at) : null;
                      return (
                        <td key={col.key} style={tdCard}>
                          {d ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                              <span style={{ fontSize: 11, color: "#d0d0d0" }}>{d.toLocaleDateString("fr-FR")}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#4ade80",
                                  background: "rgba(74,222,128,0.1)",
                                  border: "1px solid rgba(74,222,128,0.2)",
                                  borderRadius: 4,
                                  padding: "0 5px",
                                }}
                              >
                                {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: "#3a3a3a" }}>—</span>
                          )}
                        </td>
                      );
                    }

                    if (col.key === "date_expedition") {
                      const raw = row.date_expedition?.slice(0, 10) ?? "";
                      return (
                        <td
                          key={col.key}
                          style={{ ...tdCard, cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDate({ caseId: String(row.id), column: "date_expedition", rect: e.currentTarget.getBoundingClientRect() });
                          }}
                        >
                          {(() => { const today = new Date().toISOString().split("T")[0]; const expColor = raw && raw < today ? "#f87171" : raw && raw === today ? "#f59e0b" : raw ? "#d0d0d0" : "#3a3a3a"; return (
                          <span style={{ fontSize: 12, color: expColor, fontWeight: raw && raw <= today ? 700 : undefined }}>
                            {raw ? fmtDate(raw) : "—"}
                          </span>
                          ); })()}
                        </td>
                      );
                    }

                    if (col.key === "nature_du_travail") {
                      const c = NATURE_META[nat]?.color ?? "#888";
                      return (
                        <td key={col.key} style={tdCard}>
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                            <select
                              value={nat}
                              onChange={(e) => saveCaseInfo(String(row.id), "nature_du_travail", e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: "3px 22px 3px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                                background: c + "15",
                                border: `1px solid ${c}50`,
                                color: c,
                                borderRadius: 6,
                                outline: "none",
                                cursor: "pointer",
                                appearance: "none",
                                WebkitAppearance: "none",
                                minWidth: 120,
                              }}
                            >
                              <option value="Chassis Argoat" style={{ background: "#111", color: "#e07070" }}>Chassis Argoat</option>
                              <option value="Chassis Dent All" style={{ background: "#111", color: "#4ade80" }}>Chassis Dent All</option>
                              <option value="Définitif Résine" style={{ background: "#111", color: "#c4a882" }}>Définitif Résine</option>
                            </select>
                            <svg viewBox="0 0 10 6" width="9" height="9" style={{ position: "absolute", right: 7, pointerEvents: "none", opacity: 0.7 }} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg>
                          </div>
                        </td>
                      );
                    }

                    if (col.key === "design_chassis_at") {
                      const raw = dm.design_chassis_at;
                      if (!raw) return <td key={col.key} style={tdCard}><span style={{ color: "#3a3a3a" }}>—</span></td>;
                      const d = new Date(raw);
                      return (
                        <td key={col.key} style={tdCard}>
                          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                            <span style={{ fontSize: 11, color: "#aaa" }}>{d.toLocaleDateString("fr-FR")}</span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#4ade80",
                                background: "rgba(74,222,128,0.1)",
                                border: "1px solid rgba(74,222,128,0.2)",
                                borderRadius: 4,
                                padding: "0 5px",
                              }}
                            >
                              {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    const rule = getCellRule(col.column ?? col.key, nat);
                    if (rule === "disabled")
                      return (
                        <td
                          key={col.key}
                          style={{
                            ...tdCard,
                            background: `repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, ${rowBg} 4px, ${rowBg} 8px)`,
                            color: "rgba(239,68,68,0.4)",
                          }}
                        >
                          ⊘
                        </td>
                      );

                    if (col.type === "indicator") return (
                      <td key={col.key} style={tdCard}>
                        <ModeleIndicator
                          rule={rule}
                          caseId={String(row.id)}
                          currentValue={dm.modele_a_faire_ok ?? null}
                          onToggle={(id, newVal) => saveBool(id, "modele_a_faire_ok", !newVal)}
                        />
                      </td>
                    );

                    if (col.type === "select") {
                      const cur = dm[col.column!] ?? "";
                      const meta = TYPE_OPTIONS.find((o) => o.value === cur) ?? { color: "#555" };
                      return (
                        <td key={col.key} style={tdCard}>
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <select
                              value={cur}
                              onChange={(e) => saveTypeDeDents(String(row.id), e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: "3px 22px 3px 8px",
                                border: `1px solid ${meta.color}50`,
                                background: meta.color + "15",
                                color: meta.color,
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 6,
                                cursor: "pointer",
                                outline: "none",
                                appearance: "none",
                                WebkitAppearance: "none",
                                minWidth: 110,
                              }}
                            >
                              <option value="" style={{ background: "#111", color: "#555" }}>—</option>
                              {TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} style={{ background: "#111", color: o.color, fontWeight: 600 }}>
                                  {o.value}
                                </option>
                              ))}
                            </select>
                            <svg viewBox="0 0 10 6" width="9" height="9" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.7 }} fill="none" stroke={meta.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg>
                          </div>
                        </td>
                      );
                    }

                    if (col.type === "boolean") {
                      const cur = Boolean(dm[col.column!]);
                      return (
                        <td key={col.key} style={tdCard}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveBool(String(row.id), col.column!, cur);
                            }}
                            style={{
                              background: cur ? "rgba(74,222,128,0.15)" : "#232323",
                              border: cur ? "1px solid rgba(74,222,128,0.4)" : "1px solid #ffffff",
                              color: cur ? "#4ade80" : "#555",
                              padding: "3px 8px",
                              cursor: "pointer",
                              width: 36,
                              height: 24,
                              borderRadius: 7,
                              fontWeight: 700,
                              fontSize: 12,
                              transition: "all 150ms",
                            }}
                          >
                            {cur ? "✓" : ""}
                          </button>
                        </td>
                      );
                    }

                    if (col.type === "text") {
                      const w = col.column === "dentall_case_number" ? 80 : col.column === "teintes_associees" ? 60 : 90;
                      return (
                        <td key={col.key} style={tdCard} onClick={(e) => e.stopPropagation()}>
                          <InlineTextInput defaultValue={dm[col.column!] ?? ""} width={w} onSave={(v) => saveText(String(row.id), col.column!, v)} />
                        </td>
                      );
                    }

                    if (col.type === "date") {
                      const raw = dm[col.column!]?.slice(0, 10) ?? "";
                      const isReceptionLate = col.column === "reception_metal_date" && raw && row.date_expedition?.slice(0, 10) && raw > row.date_expedition.slice(0, 10);
                      return (
                        <td
                          key={col.key}
                          style={{ ...tdCard, cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDate({ caseId: String(row.id), column: col.column!, rect: e.currentTarget.getBoundingClientRect() });
                          }}
                        >
                          <span style={{ fontSize: 12, color: isReceptionLate ? "#f87171" : raw ? "#d0d0d0" : "#3a3a3a", fontWeight: isReceptionLate ? 700 : undefined }}>
                            {raw ? fmtDate(raw) : "—"}
                          </span>
                        </td>
                      );
                    }

                    return <td key={col.key} style={tdCard}><span style={{ color: "#3a3a3a" }}>—</span></td>;
                  })}

                  {/* ── Checkbox sélection ── */}
                  <td style={tdCard} onClick={(e) => e.stopPropagation()}>
                    {isOnHold ? (
                      <span style={{ fontSize:10, color:"#f59e0b" }} title="En attente">⏸</span>
                    ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: isChecked ? "rgba(74,222,128,0.18)" : "#181818",
                        border: "1.5px solid rgba(255,255,255,0.85)",
                        boxShadow: isChecked
                          ? "0 0 0 3px rgba(74,222,128,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.03)",
                        transition: "all 160ms ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCheckedIds((prev) => {
                            const n = new Set(prev);
                            checked ? n.add(String(row.id)) : n.delete(String(row.id));
                            return n;
                          });
                          if (checked) autoFillOnSelect(row);
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          cursor: "pointer",
                          accentColor: "#4ade80",
                          margin: 0,
                        }}
                      />
                    </div>
                    )}
                  </td>

                  {/* ── Supprimer ── */}
                  <td style={tdCardLast}>
                    {!(isAdmin || !(row as any).created_by || (row as any).created_by === currentUserId) ? (
                      <span style={{ fontSize: 9, color: "#333" }} title="Seul le créateur peut supprimer">—</span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(String(row.id)); }}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 7,
                          border: "1px solid #2a2a2a", background: "transparent",
                          color: "#555", cursor: "pointer", transition: "all 150ms",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.border = "1px solid rgba(239,68,68,0.5)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid #2a2a2a"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555"; }}
                      >
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

      {confirmDeleteId && (() => {
        const row = rows.find(r => String(r.id) === confirmDeleteId);
        return (
          <DeleteConfirmModal
            caseNumber={row?.case_number ?? null}
            sectorLabel="Design Métal"
            onDeleteFromSector={() => handleDeleteFromSector(confirmDeleteId)}
            onDeleteFromAll={() => handleDeleteFromAll(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
    </div>
  );
}