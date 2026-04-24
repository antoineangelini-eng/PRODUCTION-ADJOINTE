"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadUrHistoryAction, reopenUrCaseAction, type UrHistoryRow } from "./ur-history-actions";
import { fmtDate, Txt, Bool, Field, FieldBlocked, ReopenModal, HistoryFilters, CardShell } from "@/components/history/history-shared";

function UrCard({ row, onReopen }: { row: UrHistoryRow; onReopen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell
      row={row} accentColor="#9487a8" open={open}
      onToggle={() => setOpen(o => !o)}
      onReopen={e => { e.stopPropagation(); onReopen(); }}
      summaryExtra={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Réception résine</div>
          <span style={{ fontSize: 11, color: "#e0e0e0" }}>{fmtDate(row.reception_resine_at)}</span>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          {row.type_de_dents === "Dents imprimées" ? <FieldBlocked label="Machine" /> : (
            <Field label={row.identite_machine_2 ? "Machines" : "Machine"}>
              <Txt val={row.identite_machine} color="#9487a8" />
              {row.identite_machine_2 && (<><span style={{ color: "#333", margin: "0 4px" }}>/</span><Txt val={row.identite_machine_2} color="#9487a8" /></>)}
            </Field>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {row.type_de_dents === "Dents imprimées" ? <FieldBlocked label="N° disque" /> : (
            <Field label={row.numero_disque_2 ? "N° disques" : "N° disque"}>
              <Txt val={row.numero_disque} />
              {row.numero_disque_2 && (<><span style={{ color: "#333", margin: "0 4px" }}>/</span><Txt val={row.numero_disque_2} /></>)}
            </Field>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}><Field label="Type de dents"><Txt val={row.type_de_dents} color="#7c8196" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Nb blocs"><Txt val={row.nb_blocs} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Teintes"><Txt val={row.teintes_associees} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="Modèle"><Bool val={row.modele_effectif} /></Field></div>
        <div style={{ flex: 1 }}>{row.nature_du_travail === "Deflex" || row.nature_du_travail === "Complet" ? <Field label="Base"><Txt val={row.base_type} /></Field> : <FieldBlocked label="Base" />}</div>
        <div style={{ flex: 1 }} />
      </div>
    </CardShell>
  );
}

export function UsinageResineHistory() {
  const [rows, setRows]             = useState<UrHistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [natFilter, setNatFilter]   = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reopenRow, setReopenRow]   = useState<UrHistoryRow | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setRows(await loadUrHistoryAction()); setLoading(false); }, []);
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
    const res = await reopenUrCaseAction(reopenRow.id, null);
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
              {filtered.map(row => <UrCard key={row.id} row={row} onReopen={() => setReopenRow(row)} />)}
            </div>}
      </div>
      {reopenRow && (
        <ReopenModal caseNumber={reopenRow.case_number} natureDuTravail={reopenRow.nature_du_travail}
          dateExpedition={reopenRow.date_expedition} sectorLabel="Usinage Résine"
          saving={saving} error={error}
          onClose={() => { setReopenRow(null); setError(null); }} onConfirm={handleReopen} />
      )}
    </div>
  );
}
