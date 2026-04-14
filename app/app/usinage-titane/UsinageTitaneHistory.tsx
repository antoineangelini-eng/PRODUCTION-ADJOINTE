"use client";
import React, { useEffect, useState, useCallback } from "react";
import { loadUtHistoryAction, reopenUtCaseAction, type UtHistoryRow } from "./ut-history-actions";
import { fmtDate, Txt, Field, ReopenModal, CardShell, NATURE_META, Check, Bool } from "@/components/history/history-shared";

function HBRow({ label, simple, h, b }: { label: string; simple: string | null; h: string | null; b: string | null }) {
  const hasSimple = simple && String(simple).trim() !== "";
  const hasH = h && String(h).trim() !== "";
  const hasB = b && String(b).trim() !== "";
  if (!hasSimple && !hasH && !hasB) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.06em", minWidth: 68 }}>{label}</div>
      <span style={{ color: "#444", fontSize: 11 }}>—</span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.06em", minWidth: 68 }}>{label}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {hasSimple && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, background: "#f59e0b12", border: "1px solid #f59e0b33", fontSize: 11 }}>
            <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{simple}</span>
          </span>
        )}
        {hasH && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, background: "#5a9ba812", border: "1px solid #5a9ba844", fontSize: 11 }}>
            <span style={{ color: "#5a9ba8", fontWeight: 800, fontSize: 9 }}>HAUT</span>
            <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{h}</span>
          </span>
        )}
        {hasB && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, background: "#f59e0b12", border: "1px solid #f59e0b44", fontSize: 11 }}>
            <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: 9 }}>BAS</span>
            <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{b}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function UtCard({ row, onReopen }: { row: UtHistoryRow; onReopen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell
      row={row} accentColor="#f59e0b" open={open}
      onToggle={() => setOpen(o => !o)}
      onReopen={e => { e.stopPropagation(); onReopen(); }}
      summaryExtra={
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
          {row.envoye_usinage_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Envoyé usinage</div>
              <span style={{ fontSize: 11, color: "#e0e0e0", fontWeight: 600 }}>{fmtDate(row.envoye_usinage_at)}</span>
              <span style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 700 }}>{new Date(row.envoye_usinage_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, color: "#999", letterSpacing: "0.05em" }}>Réception métal</div>
            <span style={{ fontSize: 11, color: "#e0e0e0" }}>{fmtDate(row.reception_metal_at)}</span>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 110 }}><Field label="Modèle à faire"><Bool val={row.modele_a_faire_ok} /></Field></div>
        <div style={{ flex: 1, minWidth: 110 }}><Field label="Design châssis"><Bool val={row.design_chassis} /></Field></div>
        <div style={{ flex: 1, minWidth: 140 }}><Field label="Date design châssis"><Txt val={fmtDate(row.design_chassis_at)} /></Field></div>
      </div>
      {/* Machine / N° calcul / Brut — toujours affichés, H & B distincts */}
      <HBRow label="Machine"   simple={row.machine_ut}    h={row.machine_ut_h}    b={row.machine_ut_b} />
      <HBRow label="N° calcul" simple={row.numero_calcul} h={row.numero_calcul_h} b={row.numero_calcul_b} />
      <HBRow label="Brut"      simple={row.nombre_brut}   h={row.nombre_brut_h}   b={row.nombre_brut_b} />
    </CardShell>
  );
}

export function UsinageTitaneHistory() {
  const [rows, setRows]             = useState<UtHistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [natFilter, setNatFilter]   = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [reopenRow, setReopenRow]   = useState<UtHistoryRow | null>(null);
  const [note, setNote]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); setRows(await loadUtHistoryAction()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const years = [...new Set(rows.map(r => r.completed_at?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[];
  const filtered = rows.filter(r => {
    if (search && !r.case_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (yearFilter && r.completed_at?.slice(0, 4) !== yearFilter) return false;
    return true;
  });

  async function handleReopen() {
    if (!reopenRow) return;
    setSaving(true); setError(null);
    const res = await reopenUtCaseAction(reopenRow.id, note.trim() || null);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Erreur"); return; }
    setReopenRow(null); setNote(""); load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 12px", flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#ccc", padding: "4px 12px", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
          {filtered.length} dossier{filtered.length > 1 ? "s" : ""} terminé{filtered.length > 1 ? "s" : ""}
        </span>
        {years.length > 1 && (
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: yearFilter ? "white" : "#666", fontSize: 11, padding: "5px 8px", borderRadius: 6, outline: "none" }}>
            <option value="">Toutes les années</option>
            {years.map((y: string) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° du cas..."
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "white", fontSize: 11, padding: "5px 10px", borderRadius: 6, outline: "none", width: 150 }} />
        <button onClick={load} style={{ marginLeft: "auto", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 13, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>↻</button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>
          : filtered.length === 0 ? <div style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun dossier terminé.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {filtered.map(row => <UtCard key={row.id} row={row} onReopen={() => setReopenRow(row)} />)}
            </div>}
      </div>
      {reopenRow && (
        <ReopenModal caseNumber={reopenRow.case_number} natureDuTravail={reopenRow.nature_du_travail}
          dateExpedition={reopenRow.date_expedition} sectorLabel="Usinage Titane"
          saving={saving} error={error} note={note} setNote={setNote}
          onClose={() => { setReopenRow(null); setNote(""); setError(null); }} onConfirm={handleReopen} />
      )}
    </div>
  );
}
