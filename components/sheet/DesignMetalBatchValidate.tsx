"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@/columns/types";
import {
  completeDesignMetalBatchAction,
  type BatchResult,
  saveDesignMetalCellAction,
} from "@/app/app/design-metal/actions";
import { TypeDeDentsSelect } from "@/components/sheet/TypeDeDentsSelect";
import { DesignMetalBoolCell } from "@/components/sheet/DesignMetalBoolCell";

// ── Logique destinations ────────────────────────────────────────
type SectorKey = "design_resine" | "usinage_titane" | "finition";

const SECTOR_META: Record<SectorKey, { label: string; color: string }> = {
  design_resine:  { label: "Design Résine",  color: "#818cf8" },
  usinage_titane: { label: "Usinage Titane", color: "#fb923c" },
  finition:       { label: "Finition",       color: "#facc15" },
};

function getTargets(nature: string): SectorKey[] {
  switch (nature) {
    case "Chassis Argoat":   return ["design_resine", "usinage_titane", "finition"];
    case "Chassis Dent All": return ["design_resine", "finition"];
    case "Définitif Résine": return ["design_resine", "finition"];
    default: return [];
  }
}

function SectorBadge({ sector, small = false }: { sector: SectorKey; small?: boolean }) {
  const s = SECTOR_META[sector];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "1px 6px" : "3px 9px",
      borderRadius: 6, fontSize: small ? 10 : 11, fontWeight: 700,
      background: s.color + "18", border: `1px solid ${s.color}44`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function DestinationPanel({
  selectedIds,
  rows,
}: {
  selectedIds: Set<string>;
  rows: any[];
}) {
  const selectedCases = rows.filter((r) => selectedIds.has(String(r.id)));
  if (selectedCases.length === 0) return null;

  const sectorToCases: Record<string, { case_number: string; id: string }[]> = {};
  for (const c of selectedCases) {
    for (const t of getTargets(c.nature_du_travail ?? "")) {
      if (!sectorToCases[t]) sectorToCases[t] = [];
      sectorToCases[t].push({ id: String(c.id), case_number: c.case_number ?? c.id });
    }
  }

  const allTargets = Object.keys(sectorToCases) as SectorKey[];
  const hasMixed = new Set(selectedCases.map((c) => c.nature_du_travail)).size > 1;

  if (allTargets.length === 0) return (
    <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
      Aucune destination détectée pour cette sélection.
    </div>
  );

  return (
    <div style={{
      marginTop: 10, border: "1px solid rgba(74,222,128,0.2)",
      borderRadius: 10, overflow: "hidden",
      background: "rgba(74,222,128,0.02)",
    }}>
      <div style={{
        padding: "7px 12px", borderBottom: "1px solid rgba(74,222,128,0.1)",
        fontSize: 11, color: "#555", letterSpacing: 0.5,
      }}>
        {hasMixed ? "RÉPARTITION DES ENVOIS" : "ENVERRA VERS"}
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {hasMixed ? (
          allTargets.map((sector) => {
            const cases = sectorToCases[sector];
            const s = SECTOR_META[sector];
            return (
              <div key={sector} style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "7px 10px", borderRadius: 8,
                background: s.color + "0d", border: `1px solid ${s.color}22`,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ color: s.color, fontWeight: 700, fontSize: 12, minWidth: 110 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: "#555" }}>
                  {cases.length} dossier{cases.length > 1 ? "s" : ""} :
                </span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {cases.map((c) => (
                    <span key={c.id} style={{
                      fontSize: 11, padding: "1px 6px", borderRadius: 4,
                      background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", color: "#aaa",
                    }}>{c.case_number}</span>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {allTargets.map((t) => <SectorBadge key={t} sector={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Règles visuelles ────────────────────────────────────────────
type CellRule = "disabled" | "red" | "green" | undefined;

function getCellRule(column: string, nature: string): CellRule {
  switch (nature) {
    case "Chassis Argoat":
      if (["dentall_case_number", "envoye_dentall", "reception_metal_date"].includes(column)) return "disabled";
      if (column === "modele_a_faire_ok") return "green";
      return undefined;
    case "Chassis Dent All":
      if (column === "modele_a_faire_ok") return "red";
      return undefined;
    case "Définitif Résine":
      if (column === "modele_a_faire_ok") return "red";
      return undefined;
    default:
      return undefined;
  }
}

function fmt(value: any, type: string) {
  if (value === null || value === undefined) return "—";
  if (type === "boolean") return value ? "✓" : "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(value + "T00:00:00").toLocaleDateString("fr-FR");
  if (typeof value === "string" && value.includes("T")) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("fr-FR");
  }
  return String(value);
}

function DateEditor({ defaultValue, onDone }: { defaultValue: string; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    try { (el as any).showPicker?.(); } catch {}
  }, []);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input ref={inputRef} name="value" type="date" defaultValue={defaultValue}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.form?.requestSubmit(); onDone(); e.currentTarget.blur(); }
          if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); e.currentTarget.value = ""; e.currentTarget.form?.requestSubmit(); onDone(); e.currentTarget.blur(); }
          if (e.key === "Escape") { e.preventDefault(); onDone(); e.currentTarget.blur(); }
        }}
        onBlur={(e) => { e.currentTarget.form?.requestSubmit(); onDone(); }}
        style={{ padding: "4px 6px", border: "1px solid #444", background: "transparent", color: "white", fontSize: 12 }}
      />
      <button type="button" onMouseDown={(e) => e.preventDefault()}
        onClick={() => { const el = inputRef.current; if (!el) return; el.value = ""; el.form?.requestSubmit(); onDone(); }}
        style={{ border: "1px solid #555", background: "transparent", color: "white", padding: "2px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
    </div>
  );
}

function ModeleIndicator({ rule }: { rule: CellRule }) {
  if (rule === "green") return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 6,
      background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)",
      color: "#4ade80", fontWeight: 700, fontSize: 11, userSelect: "none",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
      Oui
    </div>
  );
  if (rule === "red") return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 6,
      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
      color: "#f87171", fontWeight: 700, fontSize: 11, userSelect: "none",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} />
      Non
    </div>
  );
  return <span style={{ color: "#555" }}>—</span>;
}

// ── Styles ──────────────────────────────────────────────────────
const thBase: React.CSSProperties = {
  borderBottom: "1px solid #333", padding: "6px 8px",
  textAlign: "left", fontWeight: 600, whiteSpace: "nowrap",
  fontSize: 12, background: "#111",
};
const thRead: React.CSSProperties  = { ...thBase, color: "#555" };   // ← plus grisé
const thEdit: React.CSSProperties  = { ...thBase, color: "#4ade80" };
const thSticky: React.CSSProperties = {
  ...thBase, color: "white", position: "sticky", left: 0, zIndex: 2,
  boxShadow: "2px 0 8px rgba(0,0,0,0.5)",
};
const tdBase: React.CSSProperties = {
  padding: "6px 8px", borderBottom: "1px solid #1a1a1a",
  whiteSpace: "nowrap", fontSize: 12,
};
const tdRead: React.CSSProperties = {   // ← cellules lecture plus grises
  ...tdBase, color: "#666",
};
const tdSticky: React.CSSProperties = {
  ...tdBase, position: "sticky", left: 0,
  background: "#0b0b0b", zIndex: 1,
  boxShadow: "2px 0 8px rgba(0,0,0,0.5)", fontWeight: 600,
};
const tdDisabled: React.CSSProperties = {
  ...tdBase,
  background: "repeating-linear-gradient(135deg, #0e0e0e 0px, #0e0e0e 4px, #141414 4px, #141414 8px)",
  cursor: "not-allowed",
  color: "#2a2a2a",
};

// ── Composant principal ─────────────────────────────────────────
export function DesignMetalBatchValidate({
  rows, columns, focusId,
}: {
  rows: any[]; columns: ColumnDef[]; focusId: string | null;
}) {
  const router = useRouter();
  const batchFormRef = useRef<HTMLFormElement | null>(null);
  const [state, action, pending] = useActionState(completeDesignMetalBatchAction, null as BatchResult | null);
  const [editingDate, setEditingDate] = useState<{ caseId: string; column: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ caseId: string; column: string } | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const dateClearFormsRef = useRef<Map<string, HTMLFormElement>>(new Map());

  const idToCaseNumber = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(String(r.id), String(r.case_number ?? r.id));
    return m;
  }, [rows]);

  useEffect(() => {
    if (!state) return;
    router.refresh();
    batchFormRef.current?.reset();
    setCheckedIds(new Set());
  }, [state, router]);

  const batchFormId = "design-metal-batch-form";

  return (
    <div>
      {/* BATCH */}
      <form id={batchFormId} ref={batchFormRef} action={action}>
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={pending || checkedIds.size === 0} style={{
            padding: "9px 18px", border: "1px solid #4ade80",
            background: checkedIds.size === 0 ? "transparent" : "rgba(74,222,128,0.08)",
            color: checkedIds.size === 0 ? "#333" : "#4ade80",
            cursor: pending || checkedIds.size === 0 ? "not-allowed" : "pointer",
            borderColor: checkedIds.size === 0 ? "#333" : "#4ade80",
            borderRadius: 8, fontWeight: 700, fontSize: 13,
            transition: "all 160ms ease",
          }}>
            {pending
              ? "Validation en cours..."
              : checkedIds.size === 0
                ? "Sélectionner des dossiers"
                : `Valider ${checkedIds.size} dossier${checkedIds.size > 1 ? "s" : ""}`}
          </button>
          {state && (
            <div style={{ fontSize: 13 }}>
              {state.okIds.length > 0 && <span>✅ {state.okIds.length} envoyés</span>}
              {state.errors.length > 0 && <span style={{ marginLeft: 10 }}>❌ {state.errors.length} erreurs</span>}
            </div>
          )}
        </div>

        {/* Panel destinations dynamique */}
        <DestinationPanel selectedIds={checkedIds} rows={rows} />

        {state && state.errors.length > 0 && (
          <div style={{ marginTop: 10, border: "1px solid #5a2a2a", background: "rgba(120,40,40,0.15)", padding: 10, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Dossiers non envoyés</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {state.errors.map((e, idx) => (
                <li key={`${e.case_id}-${idx}`} style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{e.case_id ? idToCaseNumber.get(e.case_id) ?? e.case_id : "Sélection"}</span>
                  <span style={{ opacity: 0.8 }}> — {e.error_message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* Légende */}
      <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11, color: "#555", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", borderRadius: 3, display: "inline-block" }} />
          Modèle applicable
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 3, display: "inline-block" }} />
          Modèle non applicable
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 12, height: 12, borderRadius: 3, display: "inline-block",
            background: "repeating-linear-gradient(135deg, #0e0e0e 0px, #0e0e0e 3px, #141414 3px, #141414 6px)",
            border: "1px solid #222",
          }} />
          Non applicable (nature)
        </span>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: "auto", marginTop: 14 }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!selectedCell) return;
          if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            dateClearFormsRef.current.get(`${selectedCell.caseId}__${selectedCell.column}`)?.requestSubmit();
            setSelectedCell(null);
          }
          if (e.key === "Enter") { e.preventDefault(); setSelectedCell(null); }
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isEditable = col.db?.table === "sector_design_metal" &&
                  (col.type === "boolean" || col.type === "text" || col.type === "date") &&
                  col.key !== "modele_a_faire_ok";
                if (col.key === "case_number") return <th key={col.key} style={thSticky}>{col.header}</th>;
                if (col.key === "modele_a_faire_ok") return <th key={col.key} style={thRead}>{col.header}</th>;
                return <th key={col.key} style={isEditable ? thEdit : thRead}>{col.header}</th>;
              })}
              <th style={thEdit}>Sélection</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => {
              const nature = row.nature_du_travail ?? "";
              const isChecked = checkedIds.has(String(row.id));

              return (
                <tr key={row.id} id={`row-${row.id}`} style={
                  focusId && row.id === focusId
                    ? { outline: "2px solid #fff", outlineOffset: "-2px" }
                    : isChecked
                      ? { background: "rgba(74,222,128,0.03)" }
                      : undefined
                }>
                  {columns.map((col) => {
                    if (col.db === null) return <td key={col.key} style={col.key === "case_number" ? tdSticky : tdBase}>—</td>;

                    const { table, column } = col.db as any;
                    const value = table === "cases" ? row?.[column] : row?.[table]?.[column];
                    const rule = table === "sector_design_metal" ? getCellRule(column, nature) : undefined;

                    if (col.key === "case_number") return <td key={col.key} style={tdSticky}>{fmt(value, col.type)}</td>;

                    if (col.key === "modele_a_faire_ok") {
                      return <td key={col.key} style={tdBase}><ModeleIndicator rule={rule} /></td>;
                    }

                    if (rule === "disabled") {
                      return <td key={col.key} style={tdDisabled} title="Non applicable pour cette nature">—</td>;
                    }

                    if (table === "sector_design_metal" && col.type === "boolean") {
                      return (
                        <td key={col.key} style={tdBase}>
                          <DesignMetalBoolCell
                            key={`bool-${row.id}-${column}`}
                            caseId={String(row.id)}
                            column={column}
                            dbValue={Boolean(value)}
                          />
                        </td>
                      );
                    }

                    if (table === "sector_design_metal" && col.type === "text" && column === "type_de_dents") {
                      return (
                        <td key={col.key} style={tdBase}>
                          <TypeDeDentsSelect
                            key={`tdents-${row.id}`}
                            caseId={String(row.id)}
                            dbValue={value ?? null}
                          />
                        </td>
                      );
                    }

                    if (table === "sector_design_metal" && col.type === "text") {
                      return (
                        <td key={col.key} style={tdBase}>
                          <form action={saveDesignMetalCellAction}>
                            <input type="hidden" name="case_id" value={row.id} />
                            <input type="hidden" name="column" value={column} />
                            <input type="hidden" name="kind" value="text" />
                            <input name="value" defaultValue={value ?? ""}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.form?.requestSubmit(); e.currentTarget.blur(); } }}
                              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                              style={{ padding: "4px 6px", border: "1px solid #2a2a2a", background: "transparent", color: "white", minWidth: 100, fontSize: 12 }}
                            />
                          </form>
                        </td>
                      );
                    }

                    if (table === "sector_design_metal" && col.type === "date") {
                      const caseId = String(row.id);
                      const defaultValue = value ? String(value).slice(0, 10) : "";
                      const key = `${caseId}__${column}`;
                      const isEditing = editingDate?.caseId === caseId && editingDate?.column === column;
                      const isSelected = selectedCell?.caseId === caseId && selectedCell?.column === column;

                      if (!isEditing) {
                        const display = defaultValue ? defaultValue.split("-").reverse().join("/") : "—";
                        return (
                          <td key={col.key}
                            onClick={() => setSelectedCell({ caseId, column })}
                            onDoubleClick={() => { setSelectedCell({ caseId, column }); setEditingDate({ caseId, column }); }}
                            style={{ ...tdBase, cursor: "default", outline: isSelected ? "2px solid #fff" : "none", outlineOffset: "-2px" }}
                            title="Double-clic = éditer"
                          >
                            {display}
                            <form ref={(el) => { if (el) dateClearFormsRef.current.set(key, el); else dateClearFormsRef.current.delete(key); }}
                              action={saveDesignMetalCellAction} style={{ display: "none" }}>
                              <input type="hidden" name="case_id" value={caseId} />
                              <input type="hidden" name="column" value={column} />
                              <input type="hidden" name="kind" value="date" />
                              <input type="hidden" name="value" value="" />
                            </form>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={tdBase}>
                          <form action={saveDesignMetalCellAction}>
                            <input type="hidden" name="case_id" value={caseId} />
                            <input type="hidden" name="column" value={column} />
                            <input type="hidden" name="kind" value="date" />
                            <DateEditor defaultValue={defaultValue} onDone={() => { setEditingDate(null); setSelectedCell(null); }} />
                          </form>
                        </td>
                      );
                    }

                    // Lecture → grisé
                    return <td key={col.key} style={tdRead}>{fmt(value, col.type)}</td>;
                  })}

                  <td style={tdBase}>
                    <input
                      type="checkbox"
                      name="case_ids"
                      value={row.id}
                      form={batchFormId}
                      checked={isChecked}
                      onChange={(e) => {
                        setCheckedIds((prev) => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(String(row.id)) : next.delete(String(row.id));
                          return next;
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} style={{ padding: 12, color: "#555", fontSize: 12 }}>Aucun dossier.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
