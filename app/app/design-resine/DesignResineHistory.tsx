"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadDrHistoryAction, reopenDrCaseAction, type DrHistoryRow } from "./dr-history-actions";
import { NATURE_META, fmtDate, fmtDT, Check, Bool, Txt, Field, FieldBlocked, ReopenModal, HistoryFilters, CardShell } from "@/components/history/history-shared";

function DrCard({ row, onReopen }: { row: DrHistoryRow; onReopen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell
      row={row} accentColor="#7c8196" open={open}
      onToggle={() => setOpen(o => !o)}
      onReopen={e => { e.stopPropagation(); onReopen(); }}
      summaryExtra={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Design résine</div>
          {fmtDT(row.design_dents_resine_at)}
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}><Field label="Type de dents"><Txt val={row.type_de_dents} color="#7c8196" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Nb blocs"><Txt val={row.nb_blocs_de_dents} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Teintes"><Txt val={row.teintes_associees} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="Design"><Check val={row.design_dents_resine} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Modèle à réaliser"><Bool val={row.modele_effectif} /></Field></div>
        <div style={{ flex: 1 }}>{row.nature_du_travail === "Deflex" || row.nature_du_travail === "Complet" ? <Field label="Base"><Txt val={row.base_type} /></Field> : <FieldBlocked label="Base" />}</div>
      </div>
    </CardShell>
  );
}

export function DesignResineHistory() {
  const [rows, setRows]             = useState<DrHistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [natFilter, setNatFilter]   = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reopenRow, setReopenRow]   = useState<DrHistoryRow | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setRows(await loadDrHistoryAction()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const years = [...new Set(rows.map(r => r.completed_at?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[];
  const filtered = rows.filter(r => {
    if (search && !r.case_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (natFilter && r.nature_du_travail !== natFilter) return false;
    if (yearFilter && r.completed_at?.slice(0, 4) !== yearFilter) return false;
    return true;
  });

  async function handleReopen() {
    if (!reopenRow) return;
    setSaving(true); setError(null);
    const res = await reopenDrCaseAction(reopenRow.id, null);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    setReopenRow(null); load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <HistoryFilters count={filtered.length} natFilter={natFilter} setNatFilter={setNatFilter}
        yearFilter={yearFilter} setYearFilter={setYearFilter} search={search} setSearch={setSearch}
        years={years} onReload={load} />
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>
          : filtered.length === 0 ? <div style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun dossier terminé.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {filtered.map(row => <DrCard key={row.id} row={row} onReopen={() => setReopenRow(row)} />)}
            </div>}
      </div>
      {reopenRow && (
        <ReopenModal caseNumber={reopenRow.case_number} natureDuTravail={reopenRow.nature_du_travail}
          dateExpedition={reopenRow.date_expedition} sectorLabel="Design Résine"
          saving={saving} error={error}
          onClose={() => { setReopenRow(null); setError(null); }} onConfirm={handleReopen} />
      )}
    </div>
  );
}
