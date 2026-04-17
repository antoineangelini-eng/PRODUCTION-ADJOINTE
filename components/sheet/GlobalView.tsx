"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadAllCasesAction, type AdminCaseRow } from "@/app/app/admin/actions";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#4ade80" },
  "Chassis Dent All":  { color: "#5a9ba8" },
  "Définitif Résine":  { color: "#a87a90" },
  "Provisoire Résine": { color: "#9487a8" },
};
const TYPE_DENTS_COLOR: Record<string, string> = {
  "Dents usinées":      "#7c8196",
  "Dents du commerce": "#f59e0b",
};
const NATURES_RESINE = ["Provisoire Résine", "Définitif Résine"];

const SECTOR_DEFS = [
  { key: "dm",  label: "Design Métal",   color: "#4ade80" },
  { key: "dr",  label: "Design Résine",  color: "#7c8196" },
  { key: "ut",  label: "Usinage Titane", color: "#f59e0b" },
  { key: "ur",  label: "Usinage Résine", color: "#9487a8" },
  { key: "fin", label: "Finition",       color: "#f59e0b" },
];

// ─── Colonnes résumé (vue compacte) ──────────────────────────────────────────

const SUMMARY_COLS: Record<string, { label: string; w: number }[]> = {
  dm:  [{ label: "Châssis", w: 56 }, { label: "Date châssis", w: 90 }, { label: "Envoyé", w: 56 }],
  dr:  [{ label: "Design",  w: 56 }, { label: "Date résine",  w: 90 }, { label: "Envoyé", w: 56 }],
  ut:  [{ label: "Envoyé",  w: 56 }, { label: "Réception",    w: 88 }, { label: "Envoyé", w: 56 }],
  ur:  [{ label: "Production", w: 68 }, { label: "Réception", w: 88 }, { label: "Envoyé", w: 56 }],
  fin: [
    { label: "Validation",        w: 68 },
    { label: "Réception complète", w: 106 },
  ],
};

// ─── Toutes les colonnes détail (vue déroulée) ───────────────────────────────

const DETAIL_COLS: Record<string, { label: string; w: number }[]> = {
  dm: [
    { label: "Châssis",         w: 58 }, { label: "Date châssis",    w: 96 },
    { label: "N° Dent All",     w: 80 }, { label: "Envoyé",          w: 58 },
    { label: "Réception métal", w: 94 },
  ],
  dr: [
    { label: "Design",    w: 58 }, { label: "Date résine", w: 96 },
    { label: "Nb blocs",  w: 62 },
  ],
  ut: [
    { label: "Envoyé",          w: 58 }, { label: "Date & Heure envoi", w: 110 },
    { label: "Machine",         w: 68 }, { label: "N° calcul",          w: 72 },
    { label: "Brut",            w: 60 }, { label: "Réception métal",    w: 94 },
  ],
  ur: [
    { label: "Production",      w: 70 }, { label: "Machine",         w: 74 },
    { label: "N° disque",       w: 68 }, { label: "Réception résine", w: 98 },
  ],
  fin: [], // Finition n'a pas de panneau déroulé
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const TH_BG = "#0f0f0f";
const ROW_BG = "#1c1c1c";

const thBase: React.CSSProperties = {
  padding: "6px 9px 8px", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.05em", textTransform: "uppercase" as const,
  color: "#666", background: TH_BG, border: "none",
  whiteSpace: "nowrap" as const, textAlign: "center" as const, verticalAlign: "bottom" as const,
};
const thSticky = (left: number, color = "#e0e0e0"): React.CSSProperties => ({
  ...thBase, fontSize: 10, color, textAlign: "left" as const,
  position: "sticky" as const, left, zIndex: 12, background: TH_BG, cursor: "default",
});
const tdBase: React.CSSProperties = {
  padding: "0 9px", fontSize: 12, textAlign: "center" as const,
  border: "none", verticalAlign: "middle" as const, height: 44, whiteSpace: "nowrap" as const,
};
const tdSticky = (left: number, bg: string): React.CSSProperties => ({
  ...tdBase, textAlign: "left" as const,
  position: "sticky" as const, left, zIndex: 2, background: bg, cursor: "default",
});
const tdBlocked: React.CSSProperties = {
  ...tdBase,
  background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.04) 0px, rgba(239,68,68,0.04) 4px, transparent 4px, transparent 8px)",
  color: "rgba(239,68,68,0.22)", cursor: "not-allowed",
};

const W = { cas: 78, creation: 82, expedition: 82, nature: 122, type: 104, modele: 60, teinte: 64 };
const L = {
  cas: 0, creation: W.cas,
  expedition: W.cas + W.creation,
  nature: W.cas + W.creation + W.expedition,
  type: W.cas + W.creation + W.expedition + W.nature,
  modele: W.cas + W.creation + W.expedition + W.nature + W.type,
  teinte: W.cas + W.creation + W.expedition + W.nature + W.type + W.modele,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}
function DT({ val }: { val: string | null }) {
  if (!val) return <span style={{ color: "#303030" }}>—</span>;
  const d = new Date(val);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span style={{ fontSize: 11, color: "#bbb" }}>{d.toLocaleDateString("fr-FR")}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 3, padding: "0 5px" }}>
        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}
function Check({ val }: { val: boolean | null }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 22, borderRadius: 5,
      background: val ? "rgba(74,222,128,0.15)" : "transparent",
      border: val ? "1px solid rgba(74,222,128,0.45)" : "1px solid rgba(255,255,255,0.3)",
      color: val ? "#4ade80" : "transparent",
      fontSize: 13, fontWeight: 700, transition: "all 150ms",
    }}>
      {val ? "✓" : ""}
    </div>
  );
}
function Dat({ val }: { val: string | null }) {
  if (!val) return <span style={{ color: "#303030" }}>—</span>;
  return <span style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 500 }}>{fmtDate(val)}</span>;
}
function Txt({ val, color }: { val: string | null; color?: string }) {
  if (!val) return <span style={{ color: "#303030" }}>—</span>;
  return <span style={{ fontSize: 12, color: color ?? "#e0e0e0", fontWeight: 500 }}>{val}</span>;
}
function Bool({ val }: { val: boolean | null }) {
  if (val === null) return <span style={{ color: "#303030" }}>—</span>;
  return val
    ? <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 12 }}>Oui</span>
    : <span style={{ color: "#f87171", fontWeight: 700, fontSize: 12 }}>Non</span>;
}
function LatestDate({ a, b }: { a: string | null; b: string | null }) {
  if (!a && !b) return <span style={{ color: "#303030" }}>—</span>;
  const da = a ? new Date(a) : null;
  const db = b ? new Date(b) : null;
  const latest = da && db ? (da > db ? a : b) : (a ?? b);
  return <span style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 500 }}>{fmtDate(latest)}</span>;
}

// ─── Rendu cellules résumé ────────────────────────────────────────────────────

function renderSummary(key: string, row: AdminCaseRow): React.ReactNode[] {
  const isArgoat = row.nature_du_travail === "Chassis Argoat";

  if (key === "dm") return [
    <Check val={row.dm_design_chassis} />,
    <DT val={row.dm_design_chassis_at} />,
    isArgoat ? <Check val={row.dm_design_chassis} /> : <Check val={row.dm_envoye_dentall} />,
  ];
  if (key === "dr") return [
    <Check val={row.dr_design_dents_resine} />,
    <DT val={row.dr_design_dents_resine_at} />,
    <Check val={row.dr_design_dents_resine} />,
  ];
  if (key === "ut") return [
    <Check val={row.ut_envoye_usinage} />,
    <Dat val={row.ut_reception_metal_date} />,
    <Check val={row.ut_envoye_usinage} />,
  ];
  if (key === "ur") return [
    <Check val={row.ur_usinage_dents_resine} />,
    <Dat val={row.ur_reception_resine_at} />,
    <Check val={row.ur_usinage_dents_resine} />,
  ];
  if (key === "fin") return [
    <Check val={row.fin_validation} />,
    // Réception complète = date la plus tardive entre réception métal (UT) et réception résine (UR)
    <LatestDate a={row.fin_reception_metal_date} b={row.fin_reception_resine_at} />,
  ];
  return [];
}

function Blocked() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 22, borderRadius: 5, background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.3)", fontSize: 11 }}>⊘</div>
  );
}

// ─── Rendu cellules détail ────────────────────────────────────────────────────

function renderDetail(key: string, row: AdminCaseRow): React.ReactNode[] {
  const isArgoat  = row.nature_du_travail === "Chassis Argoat";
  const isDentAll = row.nature_du_travail === "Chassis Dent All";

  if (key === "dm") return [
    <Check val={row.dm_design_chassis} />,
    <DT val={row.dm_design_chassis_at} />,
    // N° Dent All / Envoyé / Réception métal : uniquement pour Chassis Dent All
    isArgoat ? <Blocked /> : <Txt val={row.dm_dentall_case_number} />,
    isArgoat ? <Blocked /> : <Check val={row.dm_envoye_dentall} />,
    isArgoat ? <Blocked /> : <Dat val={row.dm_reception_metal_date} />,
  ];
  if (key === "dr") return [
    <Check val={row.dr_design_dents_resine} />,
    <DT val={row.dr_design_dents_resine_at} />,
    <Txt val={row.dr_nb_blocs_de_dents} />,
  ];
  if (key === "ut") return [
    <Check val={row.ut_envoye_usinage} />,
    <DT val={row.ut_envoye_usinage_at} />,
    <Txt val={row.ut_machine_ut} color="#f59e0b" />,
    <Txt val={row.ut_numero_calcul ?? row.ut_numero_calcul_h} />,
    <Txt val={row.ut_nombre_brut ?? row.ut_nombre_brut_h} />,
    <Dat val={row.ut_reception_metal_date} />,
  ];
  if (key === "ur") return [
    <Check val={row.ur_usinage_dents_resine} />,
    <Txt val={row.ur_identite_machine} color="#9487a8" />,
    <Txt val={row.ur_numero_disque} />,
    <Dat val={row.ur_reception_resine_at} />,
  ];
  if (key === "fin") return [
    <Check val={row.fin_validation} />,
    <Txt val={row.fin_teintes_associees} />,
    <Txt val={row.fin_nb_blocs} />,
    <Dat val={row.fin_reception_metal_date} />,
    <Dat val={row.fin_reception_resine_at} />,
    <Dat val={row.fin_reception_complete_at} />,
  ];
  return [];
}

// ─── Composant principal ──────────────────────────────────────────────────────

type ExpandMap = Record<string, Set<string>>;

export function GlobalView() {
  const [rows, setRows]           = useState<AdminCaseRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [natFilter, setNatFilter] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Par ligne : quels secteurs sont déroulés
  const [expanded, setExpanded]   = useState<ExpandMap>({});

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await loadAllCasesAction());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggleSector(rowId: string, key: string) {
    setExpanded(prev => {
      const cur = new Set(prev[rowId] ?? []);
      cur.has(key) ? cur.delete(key) : cur.add(key);
      return { ...prev, [rowId]: cur };
    });
  }

  // Ouvre/ferme un secteur sur TOUTES les lignes d'un coup (clic header)
  function toggleSectorGlobal(sectorKey: string) {
    setExpanded(prev => {
      const isOpen = filtered.some(r => (prev[r.id] ?? new Set()).has(sectorKey));
      const next: ExpandMap = { ...prev };
      for (const r of filtered) {
        const cur = new Set(prev[r.id] ?? []);
        // Pour les cas résine, on n'ouvre pas DM et UT
        const isResine = r.nature_du_travail === "Définitif Résine" || r.nature_du_travail === "Provisoire Résine";
        if (isResine && (sectorKey === "dm" || sectorKey === "ut")) continue;
        if (isOpen) cur.delete(sectorKey); else cur.add(sectorKey);
        next[r.id] = cur;
      }
      return next;
    });
  }

  function toggleAllSectors(rowId: string, isResine: boolean) {
    setExpanded(prev => {
      const cur = prev[rowId] ?? new Set<string>();
      // Secteurs expandables pour ce cas
      const expandable = SECTOR_DEFS
        .filter(s => s.key !== "fin")
        .filter(s => !(isResine && (s.key === "dm" || s.key === "ut")))
        .map(s => s.key);
      // Si tous déjà ouverts → tout fermer, sinon tout ouvrir
      const allOpen = expandable.every(k => cur.has(k));
      const next = new Set(allOpen ? [] : expandable);
      return { ...prev, [rowId]: next };
    });
  }

  const filtered = rows.filter(r => {
    if (search && !r.case_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (natFilter && r.nature_du_travail !== natFilter) return false;
    return true;
  });

  // Calcul largeur totale (colonnes résumé)
  const summaryCols  = SECTOR_DEFS.flatMap(s => SUMMARY_COLS[s.key]);
  const stickyW = W.cas + W.creation + W.expedition + W.nature + W.type;
  const summaryTotalW = summaryCols.reduce((a, c) => a + c.w, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "#ccc", padding: "4px 12px", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          {filtered.length} dossier{filtered.length > 1 ? "s" : ""}
        </span>
        <select value={natFilter} onChange={e => setNatFilter(e.target.value)}
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: natFilter ? "white" : "#666", fontSize: 11, padding: "4px 8px", borderRadius: 6, outline: "none" }}>
          <option value="">Toutes les natures</option>
          {Object.keys(NATURE_META).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° du cas..."
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "white", fontSize: 11, padding: "4px 10px", borderRadius: 6, outline: "none", width: 150 }} />
        <button onClick={load} title="Rafraîchir"
          style={{ marginLeft: "auto", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 13, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>↻</button>
      </div>

      {/* Scrollbar stylisée + fix z-index scroll */}
      <style>{`
        .gv-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .gv-scroll::-webkit-scrollbar-track { background: #111; }
        .gv-scroll::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
        .gv-scroll::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
        .gv-scroll::-webkit-scrollbar-corner { background: #111; }
      `}</style>

      {/* Tableau */}
      <div className="gv-scroll" style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>
        ) : (
          <table style={{ borderCollapse: "separate", borderSpacing: "0 0", tableLayout: "fixed", minWidth: stickyW + summaryTotalW }}>

            <colgroup>
              <col style={{ width: W.cas }} /><col style={{ width: W.creation }} />
              <col style={{ width: W.expedition }} /><col style={{ width: W.nature }} />
              <col style={{ width: W.type }} />
              <col style={{ width: W.modele }} />
              <col style={{ width: W.teinte }} />
              <col style={{ width: 36 }} />
              {summaryCols.map((c, i) => <col key={i} style={{ width: c.w }} />)}
            </colgroup>

            <thead style={{ position: "sticky", top: 0, zIndex: 11, background: TH_BG }}>

              {/* Ligne groupes — avec indicateur ouvert/fermé global */}
              <tr>
                <th style={{ ...thSticky(L.cas), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.creation), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.expedition), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.nature), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.type), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.modele), borderBottom: "1px solid #1a1a1a" }} />
                <th style={{ ...thSticky(L.teinte), borderBottom: "1px solid #1a1a1a" }} />
                {/* Colonne expand-all — vide dans la ligne groupes */}
                <th style={{ background: TH_BG, border: "none", borderBottom: "1px solid #1a1a1a", width: 36, zIndex: 12, position: "sticky" as const, left: L.teinte + W.teinte }} />
                {SECTOR_DEFS.map(s => {
                  const isExpandable = s.key !== "fin";
                  const isAnyOpen = isExpandable && Object.values(expanded).some(set => set.has(s.key));
                  return (
                    <th key={s.key} colSpan={SUMMARY_COLS[s.key].length}
                      onClick={isExpandable ? () => toggleSectorGlobal(s.key) : undefined}
                      style={{
                        ...thBase, color: s.color, fontSize: 9, fontWeight: 800,
                        letterSpacing: "0.1em", borderBottom: "1px solid #1a1a1a",
                        borderLeft: `2px solid ${s.color}40`, padding: "5px 0 6px",
                        textAlign: "center" as const,
                        background: isAnyOpen ? `${s.color}10` : TH_BG,
                        transition: "background 200ms",
                        cursor: isExpandable ? "pointer" : "default",
                        userSelect: "none" as const,
                      }}
                      title={isExpandable ? (isAnyOpen ? "Replier tout" : "Déplier tout") : undefined}
                    >
                      {s.label}
                      {isExpandable && (
                        <span style={{ fontSize: 8, opacity: 0.45, marginLeft: 4 }}>
                          {isAnyOpen ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  );
                })}
                {/* Remplissage droite — empêche le contenu de passer sous le header au scroll */}
                <th style={{ background: TH_BG, border: "none", borderBottom: "1px solid #1a1a1a", width: "100vw" }} />
              </tr>

              {/* Ligne colonnes */}
              <tr>
                <th style={thSticky(L.cas)}>N° cas</th>
                <th style={thSticky(L.creation)}>Création</th>
                <th style={thSticky(L.expedition)}>Expédition</th>
                <th style={thSticky(L.nature)}>Nature</th>
                <th style={thSticky(L.type, "#7c8196bb")}>Type de dents</th>
                <th style={{ ...thSticky(L.modele, "#aaa"), fontSize: 8 }}>Modèle</th>
                <th style={{ ...thSticky(L.teinte, "#aaa"), fontSize: 8 }}>Teinte</th>
                <th style={{ ...thBase, color: "#333", width: 36, minWidth: 36 }}></th>
                {SECTOR_DEFS.map(s =>
                  SUMMARY_COLS[s.key].map((col, ci) => (
                    <th key={`${s.key}-${ci}`} style={{
                      ...thBase, color: `${s.color}bb`,
                      ...(ci === 0 ? { borderLeft: `2px solid ${s.color}35` } : {}),
                    }}>{col.label}</th>
                  ))
                )}
                {/* Remplissage droite */}
                <th style={{ background: TH_BG, border: "none", width: "100vw" }} />
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={99} style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun dossier.</td></tr>
              )}

              {filtered.map(row => {
                const natColor  = NATURE_META[row.nature_du_travail ?? ""]?.color ?? "#555";
                const typeColor = TYPE_DENTS_COLOR[row.type_de_dents ?? ""] ?? "#555";
                const isResine  = NATURES_RESINE.includes(row.nature_du_travail ?? "");
                const isHov     = hoveredId === row.id;
                const rowExp    = expanded[row.id] ?? new Set<string>();
                const hasAny    = rowExp.size > 0;
                const bg        = row.is_done ? "#161616" : isHov ? "#222" : ROW_BG;
                const bd        = isHov ? "#2e2e2e" : "#252525";

                const tdS = (left: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
                  ...tdSticky(left, bg),
                  borderTop: `1px solid ${bd}`,
                  borderBottom: `1px solid ${bd}`,
                  transition: "background 120ms",
                  ...extra,
                });

                // Cellule secteur — indicateur "ce secteur est ouvert sur CETTE ligne"
                const tdSec = (sKey: string, ci: number, isLastGlobal = false, blocked = false, noExpand = false): React.CSSProperties => {
                  const s = SECTOR_DEFS.find(x => x.key === sKey)!;
                  const isOpen = !noExpand && rowExp.has(sKey);
                  const isFirst = ci === 0;
                  if (blocked) return {
                    ...tdBlocked,
                    borderTop: `1px solid ${bd}`,
                    borderBottom: `1px solid ${bd}`,
                    ...(isFirst ? { borderLeft: "2px solid rgba(239,68,68,0.12)" } : {}),
                    ...(isLastGlobal ? { borderRight: `1px solid ${bd}`, borderTopRightRadius: 8, borderBottomRightRadius: hasAny ? 0 : 8 } : {}),
                  };
                  return {
                    ...tdBase,
                    background: isOpen ? `${s.color}0c` : bg,
                    borderTop: `1px solid ${bd}`,
                    borderBottom: isOpen ? `2px solid ${s.color}55` : `1px solid ${bd}`,
                    ...(isFirst ? { borderLeft: `2px solid ${s.color}${isOpen ? "55" : "30"}` } : {}),
                    ...(isLastGlobal ? {
                      borderRight: `1px solid ${bd}`,
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: hasAny ? 0 : 8,
                    } : {}),
                    cursor: noExpand ? "default" : "pointer",
                    transition: "background 150ms, border-color 150ms",
                    color: "#aaa",
                  };
                };

                const isLastSector = (key: string) => key === "fin";
                const lastSummaryCol = (s: typeof SECTOR_DEFS[0], ci: number) =>
                  isLastSector(s.key) && ci === SUMMARY_COLS[s.key].length - 1;

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onMouseEnter={() => setHoveredId(row.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ opacity: row.is_done ? 0.55 : 1 }}
                    >
                      {/* Sticky */}
                      <td style={tdS(L.cas, {
                        borderLeft: `1px solid ${bd}`,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: hasAny ? 0 : 8,
                        boxShadow: `inset 4px 0 0 ${natColor}99`,
                      })}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{row.case_number}</span>
                      </td>
                      <td style={tdS(L.creation)}>
                        <span style={{ fontSize: 12, color: "#aaa" }}>{fmtDate(row.created_at)}</span>
                      </td>
                      <td style={tdS(L.expedition)}>
                        <span style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 500 }}>{fmtDate(row.date_expedition)}</span>
                      </td>
                      <td style={tdS(L.nature)}>
                        {row.nature_du_travail && (
                          <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${natColor}18`, border: `1px solid ${natColor}40`, color: natColor, whiteSpace: "nowrap" }}>
                            {row.nature_du_travail}
                          </span>
                        )}
                      </td>
                      <td style={tdS(L.type)}>
                        {row.type_de_dents
                          ? <span style={{ fontSize: 12, fontWeight: 600, color: typeColor }}>{row.type_de_dents}</span>
                          : <span style={{ color: "#252525" }}>—</span>}
                      </td>
                      {/* Modèle — Provisoire Résine = N/A (✓), sinon DM puis fallback DR */}
                      <td style={{ ...tdS(L.modele), textAlign: "center" as const }}>
                        <Bool val={row.nature_du_travail === "Provisoire Résine" ? true : (row.dm_modele_a_faire_ok ?? row.dr_modele_a_realiser_ok ?? null)} />
                      </td>
                      {/* Teinte — DR en priorité, fallback DM */}
                      <td style={{ ...tdS(L.teinte), textAlign: "center" as const }}>
                        <Txt val={row.dr_teintes_associees} />
                      </td>

                      {/* Bouton tout déplier / replier */}
                      <td
                        onClick={() => toggleAllSectors(row.id, isResine)}
                        style={{
                          ...tdBase,
                          background: hasAny ? "rgba(74,222,128,0.06)" : bg,
                          borderTop: `1px solid ${bd}`,
                          borderBottom: `1px solid ${bd}`,
                          cursor: "pointer",
                          transition: "all 150ms",
                          width: 36, minWidth: 36,
                          textAlign: "center" as const,
                        }}
                        title={hasAny ? "Replier tous les détails" : "Déplier tous les détails"}
                        onMouseEnter={e => { e.currentTarget.style.background = hasAny ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = hasAny ? "rgba(74,222,128,0.06)" : bg; }}
                      >
                        <div style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: 4,
                          border: hasAny ? "1px solid rgba(74,222,128,0.5)" : "1px solid #3a3a3a",
                          color: hasAny ? "#4ade80" : "#666",
                          fontSize: 9, fontWeight: 700,
                          transition: "all 150ms",
                        }}>
                          {hasAny ? "▲" : "▼"}
                        </div>
                      </td>

                      {/* Secteurs */}
                      {SECTOR_DEFS.map(s => {
                        const blocked = isResine && (s.key === "dm" || s.key === "ut");
                        const isFin   = s.key === "fin"; // Finition : pas de déroulé
                        const cells = renderSummary(s.key, row);
                        return SUMMARY_COLS[s.key].map((_, ci) => (
                          <td key={`${s.key}-${ci}`}
                            style={tdSec(s.key, ci, lastSummaryCol(s, ci), blocked, isFin)}
                            onClick={blocked || isFin ? undefined : () => toggleSector(row.id, s.key)}
                          >
                            {blocked
                              ? <span title="Non applicable" style={{ fontSize: 11 }}>⊘</span>
                              : cells[ci]}
                          </td>
                        ));
                      })}
                    </tr>

                    {/* ── Panneaux détail par secteur déroulé ── */}
                    {SECTOR_DEFS.map((s, si) => {
                      if (s.key === "fin") return null; // Finition n'a pas de panneau déroulé
                      if (!rowExp.has(s.key)) return null;
                      if (isResine && (s.key === "dm" || s.key === "ut")) return null;

                      const detailCols  = DETAIL_COLS[s.key];
                      const detailCells = renderDetail(s.key, row);
                      const openAfter   = SECTOR_DEFS.slice(si + 1).some(sx => rowExp.has(sx.key));
                      const isLastPanel = !openAfter;
                      const totalDetailW = detailCols.reduce((a, c) => a + c.w, 0);

                      return (
                        <tr key={`${row.id}-${s.key}`}>
                          <td colSpan={99} style={{ padding: 0, border: "none", background: "transparent" }}>
                            {/* Wrapper avec border colorée gauche pour identifier le secteur */}
                            <div style={{
                              background: "#141414",
                              borderLeft: `3px solid ${s.color}60`,
                              borderRight: "1px solid #2a2a2a",
                              borderBottom: isLastPanel ? "1px solid #2a2a2a" : "none",
                              borderRadius: isLastPanel ? "0 0 8px 8px" : 0,
                            }}>
                              {/* En-tête de section avec label + fermer */}
                              <div
                                onClick={() => toggleSector(row.id, s.key)}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: `1px solid ${s.color}20`, cursor: "pointer" }}
                              >
                                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: s.color }}>{s.label}</span>
                                <div style={{
                                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                                  padding: "3px 10px", borderRadius: 5,
                                  border: `1px solid ${s.color}40`,
                                  background: `${s.color}10`,
                                  color: s.color, fontSize: 10, fontWeight: 700,
                                }}>
                                  ▲ Fermer
                                </div>
                              </div>
                              {/* Sous-tableau avec toutes les colonnes du secteur */}
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: totalDetailW }}>
                                  <colgroup>
                                    {detailCols.map((c, i) => <col key={i} style={{ width: c.w }} />)}
                                  </colgroup>
                                  <thead>
                                    <tr>
                                      {detailCols.map(c => (
                                        <th key={c.label} style={{
                                          ...thBase, color: `${s.color}cc`,
                                          background: "#141414", borderBottom: `1px solid ${s.color}25`,
                                          padding: "5px 10px 7px", fontSize: 10,
                                        }}>{c.label}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      {detailCols.map((c, i) => (
                                        <td key={c.label} style={{
                                          ...tdBase, background: "#141414",
                                          height: 44, color: "#e0e0e0",
                                          textAlign: "center" as const,
                                          verticalAlign: "middle" as const,
                                        }}>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                            {detailCells[i]}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Séparateur */}
                    <tr aria-hidden style={{ pointerEvents: "none" }}>
                      <td colSpan={99} style={{ height: 5, border: "none", background: "transparent", padding: 0 }} />
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
