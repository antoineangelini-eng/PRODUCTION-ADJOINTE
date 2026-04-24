"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadFinHistoryAction, reopenFinCaseAction, type FinHistoryRow } from "./fin-history-actions";
import { fmtDate, Check, Txt, Field, FieldBlocked, ReopenModal, HistoryFilters, CardShell, latestDate } from "@/components/history/history-shared";
import { groupByCaseNumber } from "@/lib/group-cases";

function FinCard({ row, onReopen }: { row: FinHistoryRow; onReopen: () => void }) {
  const [open, setOpen] = useState(false);
  const recepComplete = latestDate(row.reception_metal_at, row.reception_resine_at);
  const isDentsCommerce = row.type_de_dents === "Dents du commerce" || row.type_de_dents === "Pas de dents";

  return (
    <CardShell
      row={row} accentColor="#f59e0b" open={open}
      onToggle={() => setOpen(o => !o)}
      onReopen={e => { e.stopPropagation(); onReopen(); }}
      summaryExtra={
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Réception métal</div>
            {row.nature_du_travail === "Provisoire Résine" || row.nature_du_travail === "Définitif Résine"
              ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "1px 10px", borderRadius: 4, background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.3)", fontSize: 13 }}>⊘</span>
              : <span style={{ fontSize: 11, color: "#e0e0e0" }}>{fmtDate(row.reception_metal_at)}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Réception résine</div>
            {isDentsCommerce
              ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "1px 10px", borderRadius: 4, background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 4px, transparent 4px, transparent 8px)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.3)", fontSize: 13 }}>⊘</span>
              : <span style={{ fontSize: 11, color: "#e0e0e0" }}>{fmtDate(row.reception_resine_at)}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, color: "#e0e0e0", letterSpacing: "0.05em" }}>Réception complète</div>
            <span style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 700 }}>{fmtDate(recepComplete)}</span>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}><Field label="Validation"><Check val={row.validation} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Type de dents"><Txt val={row.type_de_dents} color="#7c8196" /></Field></div>
        <div style={{ flex: 1 }}>{row.type_de_dents === "Pas de dents" ? <FieldBlocked label="Teintes" /> : <Field label="Teintes"><Txt val={row.teintes_associees} /></Field>}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          {isDentsCommerce
            ? <FieldBlocked label="Nb blocs" />
            : <Field label="Nb blocs"><Txt val={row.nb_blocs} /></Field>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ flex: 1 }} />
      </div>
    </CardShell>
  );
}

export function FinitionHistory() {
  const [rows, setRows]             = useState<FinHistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [natFilter, setNatFilter]   = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reopenRow, setReopenRow]   = useState<FinHistoryRow | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setRows(await loadFinHistoryAction()); setLoading(false); }, []);
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
    const res = await reopenFinCaseAction(reopenRow.id, null);
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
              {groupByCaseNumber(filtered).map(group => {
                if (group.length === 1) return <FinCard key={group[0].id} row={group[0]} onReopen={() => setReopenRow(group[0])} />;
                return (
                  <div key={`grp-${group[0].id}`} style={{ border:"2px solid #3a3a3a", borderRadius:14, overflow:"hidden", background:"#0f0f0f", alignSelf:"start" }}>
                    {group.map((row, i) => (
                      <React.Fragment key={row.id}>
                        {i > 0 && <div style={{ margin:"0 12px", borderTop:"1px dashed #444" }} />}
                        <FinCard row={row} onReopen={() => setReopenRow(row)} />
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>}
      </div>
      {reopenRow && (
        <ReopenModal caseNumber={reopenRow.case_number} natureDuTravail={reopenRow.nature_du_travail}
          dateExpedition={reopenRow.date_expedition} sectorLabel="Finition"
          saving={saving} error={error}
          onClose={() => { setReopenRow(null); setError(null); }} onConfirm={handleReopen} />
      )}
    </div>
  );
}
