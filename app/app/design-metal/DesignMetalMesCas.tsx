"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { loadDesignMetalRowsAction, type DesignMetalRow } from "./actions";
import { loadDmHistoryAction, type DmHistoryRow } from "./history-actions";
import { FieldBlocked } from "@/components/history/history-shared";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":   { color: "#e07070" },
  "Chassis Dent All": { color: "#4ade80" },
  "Définitif Résine": { color: "#c4a882" },
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

function fmtTime(s: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function todayStr(): string {
  return new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}

/** Format a Date to YYYY-MM-DD using LOCAL time (not UTC — avoids timezone shift) */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `dateStr` (YYYY-MM-DD) */
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/** "24 – 28 juin 2026" */
function weekLabel(monday: string): string {
  const mon = new Date(monday + "T12:00:00");
  const fri = new Date(monday + "T12:00:00");
  fri.setDate(fri.getDate() + 4);
  const mDay = mon.getDate();
  const fDay = fri.getDate();
  const fMonth = fri.toLocaleDateString("fr-FR", { month: "long" });
  const fYear = fri.getFullYear();
  if (mon.getMonth() === fri.getMonth()) {
    return `${mDay} – ${fDay} ${fMonth} ${fYear}`;
  }
  const mMonth = mon.toLocaleDateString("fr-FR", { month: "short" });
  return `${mDay} ${mMonth} – ${fDay} ${fMonth} ${fYear}`;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: "14px 16px", textAlign: "center", flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Detail helpers (same as DesignMetalHistory) ─────────────────────────────

function Check({ val }: { val: boolean | null }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 22, borderRadius: 5, background: val ? "rgba(74,222,128,0.12)" : "transparent", border: val ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.12)", color: val ? "#4ade80" : "transparent", fontSize: 12, fontWeight: 700 }}>
      {val ? "✓" : ""}
    </div>
  );
}

function Bool({ val }: { val: boolean | null }) {
  if (val === null) return <span style={{ color: "#444" }}>—</span>;
  return val
    ? <span style={{ color: "#4ade80", fontWeight: 600 }}>Oui</span>
    : <span style={{ color: "#f87171", fontWeight: 600 }}>Non</span>;
}

function Txt({ val, color }: { val: string | null; color?: string }) {
  if (!val) return <span style={{ color: "#444" }}>—</span>;
  return <span style={{ color: color ?? "#ddd", fontWeight: 400 }}>{val}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#aaa", textAlign: "center" as const }}>{label}</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 6, padding: "6px 8px", fontSize: 11, textAlign: "center" as const, fontWeight: 400, color: "#fff" }}>{children}</div>
    </div>
  );
}

function FieldOrBlocked({ label, blocked, children }: { label: string; blocked?: boolean; children: React.ReactNode }) {
  if (blocked) return <FieldBlocked label={label} />;
  return <Field label={label}>{children}</Field>;
}

// ─── Detail modal for a completed case ───────────────────────────────────────

function CaseDetailModal({ row, onClose }: { row: DmHistoryRow; onClose: () => void }) {
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
  const isArgoat = row.nature_du_travail === "Chassis Argoat";
  const isPeek = row.peek && isArgoat;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 20, width: 420, maxHeight: "80vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{row.case_number}</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor, fontWeight: 600 }}>{row.nature_du_travail}</span>
          {isPeek && (
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, background: "rgba(181,194,179,0.15)", border: "1px solid rgba(181,194,179,0.4)", color: "#b5c2b3" }}>PEEK</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#4ade80", fontWeight: 700 }}>✓ Terminé</span>
        </div>

        {/* Dates */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Création</div>
            <div style={{ fontSize: 11, color: "#fff" }}>{fmtDate(row.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Expédition</div>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{fmtDate(row.date_expedition)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Validé le</div>
            <div style={{ fontSize: 11, color: "#c0c0c0" }}>{fmtDate(row.completed_at)}</div>
          </div>
          {row.validated_by_name && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Validé par</div>
              <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{row.validated_by_name}</div>
            </div>
          )}
        </div>

        {/* Design châssis */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, background: "#141414", border: "1px solid #222", borderRadius: 7, padding: "8px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Design châssis</div>
          {row.design_chassis_at ? (
            <span style={{ fontSize: 11, color: "#e0e0e0", fontWeight: 500 }}>
              {fmtDate(row.design_chassis_at)}
              <span style={{ marginLeft: 6, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 3, padding: "0 5px", fontWeight: 700 }}>
                {fmtTime(row.design_chassis_at)}
              </span>
            </span>
          ) : <span style={{ color: "#444" }}>—</span>}
        </div>

        {/* Detail fields */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldOrBlocked label="N° Dent All" blocked={isArgoat}>
              {isArgoat ? null : <Txt val={row.dentall_case_number} />}
            </FieldOrBlocked>
          </div>
          <div style={{ flex: 1 }}>
            <FieldOrBlocked label="Envoyé DentAll" blocked={isArgoat}>
              {isArgoat ? null : <Check val={row.envoye_dentall} />}
            </FieldOrBlocked>
          </div>
          <div style={{ flex: 1 }}>
            <FieldOrBlocked label="Réception métal" blocked={isArgoat}>
              {isArgoat ? null : <span style={{ fontSize: 11, color: "#fff" }}>{fmtDate(row.reception_metal_date)}</span>}
            </FieldOrBlocked>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Field label="Type de dents"><Txt val={row.type_de_dents} color="#7c8196" /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Modèle à faire"><Bool val={row.modele_a_faire_ok} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            {row.type_de_dents === "Pas de dents"
              ? <FieldBlocked label="Teinte" />
              : <Field label="Teinte"><Txt val={row.teintes_associees} /></Field>
            }
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Active case card ────────────────────────────────────────────────────────

function ActiveCard({ row }: { row: DesignMetalRow }) {
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
  const dm = row.sector_design_metal;
  const isLate = row.date_expedition ? new Date(row.date_expedition + "T00:00:00") < new Date(todayStr() + "T00:00:00") : false;
  const isPeek = dm?.peek && row.nature_du_travail === "Chassis Argoat";

  const steps: string[] = [];
  if (dm?.design_chassis) steps.push("Design châssis ✓");
  if (dm?.modele_a_faire_ok) steps.push("Modèle ✓");
  if (dm?.envoye_dentall) steps.push("Envoyé DentAll ✓");
  if (dm?.reception_metal_date) steps.push("Réception métal ✓");
  const pending: string[] = [];
  if (!dm?.design_chassis) pending.push("Design châssis");
  if (!dm?.modele_a_faire_ok) pending.push("Modèle à faire");

  return (
    <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 16px", borderLeft: `3px solid ${isPeek ? "#b5c2b3" : natColor}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: "white" }}>{row.case_number}</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor, fontWeight: 600 }}>{row.nature_du_travail}</span>
          {isPeek && (
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, background: "rgba(181,194,179,0.15)", border: "1px solid rgba(181,194,179,0.4)", color: "#b5c2b3" }}>PEEK</span>
          )}
          {(row as any)._on_hold && (
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b" }}>EN PAUSE</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: isLate ? "#f87171" : "#666", fontWeight: isLate ? 700 : 400 }}>
          {isLate ? "⚠ " : ""}Exp. {fmtDate(row.date_expedition)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
        {steps.length > 0 && <span style={{ color: "#4ade80" }}>{steps.join(" · ")}</span>}
        {steps.length > 0 && pending.length > 0 && <span style={{ color: "#333" }}> — </span>}
        {pending.length > 0 && <span style={{ color: "#666" }}>En attente : {pending.join(", ")}</span>}
        {steps.length === 0 && pending.length === 0 && <span style={{ color: "#555" }}>Aucune donnée renseignée</span>}
      </div>
    </div>
  );
}

// ─── Completed case card (compact, clickable) ────────────────────────────────

function DoneCard({ row, onClick }: { row: DmHistoryRow; onClick: () => void }) {
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
  return (
    <div onClick={onClick} style={{ background: "#161616", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "border-color 150ms" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#ccc" }}>{row.case_number}</span>
        <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>{fmtTime(row.completed_at)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: natColor, fontWeight: 600 }}>{row.nature_du_travail}</span>
        {row.peek && row.nature_du_travail === "Chassis Argoat" && (
          <span style={{ fontSize: 8, fontWeight: 800, padding: "0px 4px", borderRadius: 3, background: "rgba(181,194,179,0.15)", border: "1px solid rgba(181,194,179,0.4)", color: "#b5c2b3" }}>PEEK</span>
        )}
      </div>
    </div>
  );
}

// ─── Interactive chart with week navigation ──────────────────────────────────

const CHART_HEIGHT = 120;

function WeekChart({ history, monday, onSelectDay, selectedDay }: {
  history: DmHistoryRow[];
  monday: string;
  onSelectDay: (dateStr: string | null) => void;
  selectedDay: string | null;
}) {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  const todayDate = todayStr();

  const dayData = useMemo(() => {
    const result: { dateStr: string; count: number; dayLabel: string; dayNum: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const ds = addDays(monday, i);
      const d = new Date(ds + "T12:00:00");
      result.push({
        dateStr: ds,
        count: history.filter(r => r.completed_at?.slice(0, 10) === ds).length,
        dayLabel: days[i],
        dayNum: String(d.getDate()),
      });
    }
    return result;
  }, [history, monday]);

  const max = Math.max(...dayData.map(d => d.count), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: CHART_HEIGHT, marginBottom: 6 }}>
        {dayData.map((d, i) => {
          const isToday = d.dateStr === todayDate;
          const isSelected = d.dateStr === selectedDay;
          const barH = d.count === 0 ? 3 : Math.max(8, Math.round((d.count / max) * (CHART_HEIGHT - 20)));
          const isFuture = d.dateStr > todayDate;

          return (
            <div key={i}
              onClick={() => {
                if (isFuture) return;
                onSelectDay(isSelected ? null : d.dateStr);
              }}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                cursor: isFuture ? "default" : "pointer", height: "100%", position: "relative",
              }}>
              {/* Count label */}
              {d.count > 0 && (
                <div style={{
                  fontSize: 13, fontWeight: 800, marginBottom: 4,
                  color: isSelected ? "#fff" : isToday ? "#818cf8" : "#ccc",
                }}>{d.count}</div>
              )}
              {/* Bar */}
              <div style={{
                width: "100%", maxWidth: 60, borderRadius: "6px 6px 0 0",
                height: barH,
                background: isFuture
                  ? "rgba(255,255,255,0.04)"
                  : isSelected
                    ? "rgba(129,140,248,0.55)"
                    : isToday
                      ? "rgba(129,140,248,0.35)"
                      : d.count > 0
                        ? "rgba(74,222,128,0.3)"
                        : "rgba(74,222,128,0.08)",
                border: isSelected ? "1px solid rgba(129,140,248,0.7)" : "1px solid transparent",
                borderBottom: "none",
                transition: "all 200ms",
              }} />
            </div>
          );
        })}
      </div>
      {/* Day labels */}
      <div style={{ display: "flex", gap: 6 }}>
        {dayData.map((d, i) => {
          const isToday = d.dateStr === todayDate;
          const isSelected = d.dateStr === selectedDay;
          return (
            <div key={i} style={{ flex: 1, textAlign: "center", cursor: d.dateStr > todayDate ? "default" : "pointer" }}
              onClick={() => { if (d.dateStr <= todayDate) onSelectDay(isSelected ? null : d.dateStr); }}>
              <div style={{ fontSize: 11, color: isSelected ? "#818cf8" : isToday ? "#818cf8" : "#999", fontWeight: isSelected || isToday ? 700 : 500, marginTop: 4 }}>{d.dayLabel}</div>
              <div style={{ fontSize: 12, color: isSelected ? "#818cf8" : isToday ? "#bbb" : "#666", fontWeight: isSelected || isToday ? 700 : 500 }}>{d.dayNum}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day detail panel (shown when clicking a day) ────────────────────────────

function DayPanel({ dateStr, rows, onSelectRow }: { dateStr: string; rows: DmHistoryRow[]; onSelectRow: (r: DmHistoryRow) => void }) {
  const d = new Date(dateStr + "T12:00:00");
  const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const sorted = [...rows].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div style={{ marginTop: 12, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginBottom: 10, textTransform: "capitalize" }}>
        {label} — {sorted.length} cas
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: 12 }}>Aucun cas ce jour.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          {sorted.map(row => <DoneCard key={row.id} row={row} onClick={() => onSelectRow(row)} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DesignMetalMesCas() {
  const [prodRows, setProdRows] = useState<DesignMetalRow[]>([]);
  const [histRows, setHistRows] = useState<DmHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [detailRow, setDetailRow] = useState<DmHistoryRow | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  useEffect(() => {
    import("@/app/app/user-info-action").then(m => m.getUserInfoAction()).then(info => setCurrentUserId(info.userId));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [prod, hist] = await Promise.all([loadDesignMetalRowsAction(), loadDmHistoryAction()]);
    setProdRows(prod);
    setHistRows(hist);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter to current user's cases
  const myActive = prodRows.filter(r => r._updated_by === currentUserId);
  const myHistory = histRows.filter(r => r._validated_by === currentUserId);

  // Stats (always based on current real week)
  const today = todayStr();
  const currentMonday = mondayOf(today);
  const doneToday = myHistory.filter(r => r.completed_at?.slice(0, 10) === today);
  const currentFriday = addDays(currentMonday, 4);
  const doneThisWeek = myHistory.filter(r => {
    const d = r.completed_at?.slice(0, 10);
    return d && d >= currentMonday && d <= currentFriday;
  });

  // Displayed week (navigable)
  const displayedMonday = addDays(currentMonday, weekOffset * 7);
  const displayedFriday = addDays(displayedMonday, 4);
  const isCurrentWeek = weekOffset === 0;
  const isFutureWeek = displayedMonday > today;
  const displayedWeekHistory = myHistory.filter(r => {
    const d = r.completed_at?.slice(0, 10);
    return d && d >= displayedMonday && d <= displayedFriday;
  });

  // Cases for selected day
  const selectedDayCases = selectedDay
    ? myHistory.filter(r => r.completed_at?.slice(0, 10) === selectedDay)
    : [];

  if (loading) {
    return <div style={{ padding: 40, color: "#555", fontSize: 13, textAlign: "center" }}>Chargement…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "0 0 20px" }}>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          <StatCard value={myActive.length} label="En cours" color="#818cf8" />
          <StatCard value={doneToday.length} label="Aujourd'hui" color="#4ade80" />
          <StatCard value={doneThisWeek.length} label="Cette semaine" color="#f59e0b" />
          <StatCard value={myHistory.length} label="Total" color="#e0e0e0" />
        </div>

        {/* ── En cours ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>◉</span> En cours ({myActive.length})
          </div>
          {myActive.length === 0 ? (
            <div style={{ padding: 24, color: "#333", fontSize: 12, textAlign: "center", background: "#1a1a1a", borderRadius: 8, border: "1px solid #222" }}>
              Aucun cas en cours vous concernant.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myActive.map(row => <ActiveCard key={row.id} row={row} />)}
            </div>
          )}
        </div>

        {/* ── Terminés aujourd'hui ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>✓</span> Terminés aujourd'hui ({doneToday.length})
          </div>
          {doneToday.length === 0 ? (
            <div style={{ padding: 24, color: "#333", fontSize: 12, textAlign: "center", background: "#161616", borderRadius: 8, border: "1px solid #1e1e1e" }}>
              Aucun cas terminé aujourd'hui.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {[...doneToday]
                .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
                .map(row => <DoneCard key={row.id} row={row} onClick={() => setDetailRow(row)} />)}
            </div>
          )}
        </div>

        {/* ── Activité par semaine ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>📊</span> Activité — {displayedWeekHistory.length} cas
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => { setWeekOffset(w => w - 1); setSelectedDay(null); }}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 14, padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>◀</button>
              <span style={{ fontSize: 11, color: "#777", fontWeight: 500, minWidth: 170, textAlign: "center" }}>{weekLabel(displayedMonday)}</span>
              <button onClick={() => { if (!isFutureWeek) { setWeekOffset(w => w + 1); setSelectedDay(null); } }}
                disabled={isFutureWeek}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: isFutureWeek ? "#333" : "#aaa", fontSize: 14, padding: "3px 10px", borderRadius: 6, cursor: isFutureWeek ? "not-allowed" : "pointer", fontWeight: 700 }}>▶</button>
              {!isCurrentWeek && (
                <button onClick={() => { setWeekOffset(0); setSelectedDay(null); }}
                  style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.3)", color: "#818cf8", fontSize: 10, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, marginLeft: 4 }}>Aujourd'hui</button>
              )}
            </div>
          </div>
          <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: "16px 20px" }}>
            <WeekChart history={myHistory} monday={displayedMonday} onSelectDay={setSelectedDay} selectedDay={selectedDay} />
            {selectedDay && (
              <DayPanel dateStr={selectedDay} rows={selectedDayCases} onSelectRow={setDetailRow} />
            )}
          </div>
        </div>

      </div>

      {/* ── Reload button ── */}
      <div style={{ flexShrink: 0, padding: "8px 0 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={load} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>↻ Rafraîchir</button>
      </div>

      {/* ── Detail modal ── */}
      {detailRow && <CaseDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}
