"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadDmHistoryAction, reopenCaseAction, type DmHistoryRow } from "./history-actions";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":   { color: "#4ade80" },
  "Chassis Dent All": { color: "#22d3ee" },
  "Définitif Résine": { color: "#f472b6" },
};

const SECTORS = [
  { code: "design_metal",   label: "Design Métal" },
  { code: "design_resine",  label: "Design Résine" },
  { code: "usinage_titane", label: "Usinage Titane" },
  { code: "usinage_resine", label: "Usinage Résine" },
  { code: "finition",       label: "Finition" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

function fmtDT(s: string | null): React.ReactNode {
  if (!s) return <span style={{ color: "#444" }}>—</span>;
  const d = new Date(s);
  return (
    <span style={{ fontSize: 11, color: "#e0e0e0", fontWeight: 500, whiteSpace: "nowrap" as const }}>
      {d.toLocaleDateString("fr-FR")}
      <span style={{ marginLeft: 6, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 3, padding: "0 5px", fontWeight: 700 }}>
        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </span>
  );
}

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

// ─── Label / valeur style carte UR ────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#aaa", textAlign: "center" as const }}>
        {label}
      </div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 6, padding: "6px 8px", fontSize: 11, textAlign: "center" as const, fontWeight: 400, color: "#ffffff" }}>
        {children}
      </div>
    </div>
  );
}

function FieldOrBlocked({ label, blocked, children }: { label: string; blocked?: boolean; children: React.ReactNode }) {
  if (blocked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#888", textAlign: "center" as const }}>{label}</div>
        <div style={{ borderRadius: 6, padding: "6px 8px", minHeight: 33, background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(239,68,68,0.3)", fontSize: 13 }}>⊘</span>
        </div>
      </div>
    );
  }
  return <Field label={label}>{children}</Field>;
}

// ─── Modale réinsertion ───────────────────────────────────────────────────────

function ReopenModal({ row, sectorCode, sectorLabel, onClose, onDone }: {
  row: DmHistoryRow; sectorCode: string; sectorLabel: string; onClose: () => void; onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";

  async function confirm() {
    setSaving(true); setError(null);
    const res = await reopenCaseAction(row.id, sectorCode);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    onDone(); onClose();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 20, width: 360 }}>
        <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{row.case_number}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor }}>{row.nature_du_travail}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>Expédition : {fmtDate(row.date_expedition)}</div>
        </div>
        <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#e0e0e0", marginBottom: 12 }}>
          Réinsertion dans <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{sectorLabel}</span>
        </div>
        <div style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#fb923c", marginBottom: 14 }}>
          ⚠ Les données existantes sont conservées. Le cas repassera en actif.
        </div>
        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>✕ {error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          <button onClick={confirm} disabled={saving} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "…" : "↩ Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Carte individuelle ───────────────────────────────────────────────────────

function HistoryCard({ row, onReopen }: { row: DmHistoryRow; onReopen: () => void }) {
  const currentSector = "design_metal";
  const currentSectorLabel = "Design Métal";
  const [open, setOpen] = useState(false);
  const natColor = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
  const isArgoat = row.nature_du_travail === "Chassis Argoat";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: "#1c1c1c",
        border: `1px solid ${open ? natColor + "60" : "#272727"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 200ms",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}>

      {/* ── En-tête carte ── */}
      <div style={{ padding: "10px 12px", borderTop: `3px solid ${natColor}`, background: open ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 200ms" }}>

        {/* Ligne 1 : N° cas + nature + badge terminé */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{row.case_number}</span>
            <span style={{ display: "inline-flex", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor }}>
              {row.nature_du_travail}
            </span>
          </div>
          <span style={{ fontSize: 9, color: "#4ade80" }}>✓</span>
        </div>

        {/* Ligne 2 : Création / Expédition / Validé / Design châssis */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" as const }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Création</div>
            <div style={{ fontSize: 11, color: "#ffffff", fontWeight: 400 }}>{fmtDate(row.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Expédition</div>
            <div style={{ fontSize: 11, color: "#ffffff", fontWeight: 500 }}>{fmtDate(row.date_expedition)}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", marginBottom: 1 }}>Validé le</div>
            <div style={{ fontSize: 11, color: "#c0c0c0", fontWeight: 400 }}>{fmtDate(row.completed_at)}</div>
          </div>
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em", flexShrink: 0 }}>Design châssis</div>
            {fmtDT(row.design_chassis_at)}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onReopen(); }}
            style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid rgba(251,146,60,0.6)", background: "rgba(251,146,60,0.1)", color: "#fb923c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(251,146,60,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(251,146,60,0.1)"; }}>
            ↩ Réinsérer
          </button>
          <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", color: open ? "#ccc" : "#555", fontSize: 10 }}>
            {open ? "▲" : "▼"}
          </div>
        </div>
      </div>

      {/* ── Panneau détail (style carte UR) ── */}
      {open && (
        <div style={{ background: "#141414", borderTop: "1px solid rgba(74,222,128,0.12)", padding: "14px 12px" }}>

          {/* Ligne 1 : N° Dent All / Envoyé / Réception métal */}
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
                {isArgoat ? null : <span style={{ fontSize: 11, color: "#ffffff" }}>{fmtDate(row.reception_metal_date)}</span>}
              </FieldOrBlocked>
            </div>
          </div>

          {/* Ligne 2 : Type de dents / Modèle / Teinte */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="Type de dents">
                <Txt val={row.type_de_dents} color="#818cf8" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Modèle à faire">
                <Bool val={row.modele_a_faire_ok} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Teinte">
                <Txt val={row.teintes_associees} />
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  design_metal:   "Design Métal",
  design_resine:  "Design Résine",
  usinage_titane: "Usinage Titane",
  usinage_resine: "Usinage Résine",
  finition:       "Finition",
};

export function DesignMetalHistory() {
  const currentSector = "design_metal";
  const [rows, setRows]           = useState<DmHistoryRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [natFilter, setNatFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reopenRow, setReopenRow] = useState<DmHistoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await loadDmHistoryAction());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const years = [...new Set(rows.map(r => r.completed_at?.slice(0, 4)).filter(Boolean))].sort().reverse();

  const filtered = rows.filter(r => {
    if (search && !r.case_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (natFilter && r.nature_du_travail !== natFilter) return false;
    if (yearFilter && r.completed_at?.slice(0, 4) !== yearFilter) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 12px", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "#ccc", padding: "4px 12px", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          {filtered.length} dossier{filtered.length > 1 ? "s" : ""} terminé{filtered.length > 1 ? "s" : ""}
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
            {years.map(y => <option key={y} value={y!}>{y}</option>)}
          </select>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° du cas..."
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "white", fontSize: 11, padding: "5px 10px", borderRadius: 6, outline: "none", width: 150 }} />
        <button onClick={load} title="Rafraîchir"
          style={{ marginLeft: "auto", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e0e0e0", fontSize: 13, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>↻</button>
      </div>

      {/* Grille de cartes */}
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun dossier terminé.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(row => (
              <HistoryCard key={row.id} row={row} onReopen={() => setReopenRow(row)} />
            ))}
          </div>
        )}
      </div>

      {reopenRow && (
        <ReopenModal row={reopenRow} sectorCode="design_metal" sectorLabel="Design Métal" onClose={() => setReopenRow(null)} onDone={load} />
      )}
    </div>
  );
}
