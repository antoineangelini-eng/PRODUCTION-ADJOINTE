"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { loadFinitionRowsAction, validateFinitionBatchAction, type FinitionRow } from "@/app/app/finition/actions";
import { OnHoldReasonTooltip } from "@/components/sheet/OnHoldModal";
import { CaseDetailModal } from "@/components/sheet/CaseDetailModal";
import { PhysicalBadge } from "@/components/sheet/PhysicalBadge";

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

function getDelaiStatus(dateExpedition: string | null, validated: boolean) {
  if (validated) return "done";
  if (!dateExpedition) return "normal";
  const today = toDateStr(new Date());
  const exp = dateExpedition.slice(0, 10);
  if (exp < today) return "late";
  if (exp === today) return "today";
  return "normal";
}

const DELAI_STYLES: Record<string, React.CSSProperties> = {
  done:   { background: "rgba(74,222,128,0.05)",  boxShadow: "inset 3px 0 0 #4ade80" },
  late:   { background: "rgba(239,68,68,0.06)",   boxShadow: "inset 3px 0 0 #f87171" },
  today:  { background: "rgba(245,158,11,0.06)",  boxShadow: "inset 3px 0 0 #f59e0b" },
  normal: { background: "transparent",            boxShadow: "inset 3px 0 0 transparent" },
};

const thBase: React.CSSProperties   = { borderBottom:"1px solid #222", padding:"5px 8px", textAlign:"center", fontWeight:600, whiteSpace:"nowrap", fontSize:12, background:"#111" };
const thRead: React.CSSProperties   = { ...thBase, color:"#aaa" };
const thEdit: React.CSSProperties   = { ...thBase, color:"#4ade80" };
const thSticky: React.CSSProperties = { ...thBase, color:"white", textAlign:"left", position:"sticky", left:0, zIndex:2, background:"#111" };
const tdBase: React.CSSProperties   = { padding:"5px 8px", whiteSpace:"nowrap", fontSize:13, textAlign:"center" };
const tdRead: React.CSSProperties   = { ...tdBase, color:"white" };
const tdSticky: React.CSSProperties = { ...tdBase, position:"sticky", left:0, zIndex:2, background:"#0b0b0b", textAlign:"left", fontWeight:700, color:"white" };

const TYPE_DENTS_OPTIONS = [
  { value:"Dents usinées",      color:"#7c8196" },
  { value:"Dents du commerce", color:"#f59e0b" },
  { value:"Pas de dents",      color:"#ef4444" },
];

const NATURE_META: Record<string, { color:string }> = {
  "Chassis Argoat":    { color:"#e07070" },
  "Chassis Dent All":  { color:"#4ade80" },
  "Définitif Résine":  { color:"#c4a882" },
  "Provisoire Résine": { color:"#9487a8" },
};

function NatureBadge({ nature }: { nature: string | null }) {
  if (!nature) return <span style={{ color:"white" }}>—</span>;
  const meta = NATURE_META[nature] ?? { color:"#aaa" };
  return <span style={{ display:"inline-flex", padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, background:meta.color+"18", border:`1px solid ${meta.color}50`, color:meta.color }}>{nature}</span>;
}

function SelectReadOnly({ value, color }: { value:string; options?:{value:string;color?:string}[]; color:string }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", padding:"4px 10px", border:`1px solid ${color}40`, background:color+"12", color:color||"white", fontSize:12, fontWeight:600, borderRadius:6, minWidth:130, justifyContent:"center", cursor:"default" }}>
      {value||"—"}
    </div>
  );
}

function DateCell({ value, color = "white" }: { value: string | null; color?: string }) {
  if (!value) return <span style={{ color:"white" }}>—</span>;
  return <span style={{ color }}>{new Date(value.slice(0,10)+"T00:00:00").toLocaleDateString("fr-FR")}</span>;
}

export function FinitionTable({ filter, onReload, highlightId, lotPanel, onSelectionChange }: {
  filter?: "today"|"tomorrow"|"all"|"late";
  onReload?: (fn:()=>void)=>void;
  highlightId?: string|null;
  lotPanel?: React.ReactNode;
  onSelectionChange?: (isBusy: boolean) => void;
}) {
  const [rows, setRows]             = useState<FinitionRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string|null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchPending, setBatchPending] = useState(false);
  const [batchResult, setBatchResult]   = useState<{ok:string[];errors:{id:string;msg:string}[]}|null>(null);
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null);
  const [reasonTooltip, setReasonTooltip] = useState<{ id: string; rect: { top: number; left: number; width: number; bottom: number } } | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await loadFinitionRowsAction();
      // Enrichir chaque row avec _dateRef (date de réception pour le statut de délai)
      // = la plus récente date de réception disponible (métal ou résine)
      for (const r of data as any[]) {
        const dm = r.sector_design_metal ?? {};
        const ur = r.sector_usinage_resine ?? {};
        const ut = r.sector_usinage_titane ?? {};
        const metalDate  = ut.reception_metal_at ?? dm.reception_metal_date ?? null;
        const resineDate = ur.reception_resine_at ?? null;
        if (metalDate && resineDate) {
          const a = new Date(metalDate.slice(0,10)), b = new Date(resineDate.slice(0,10));
          r._dateRef = a >= b ? metalDate : resineDate;
        } else {
          r._dateRef = metalDate ?? resineDate;
        }
      }
      setRows(data);
      setError(null);
    }
    catch (e:any) { if (!silent) setError(e.message ?? "Erreur"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onReload?.(() => load(true)); }, [load, onReload]);

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
      if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
        lastActivityRef.current = Date.now();
        load(true);
      }
    }, 30_000);
    return () => clearInterval(itv);
  }, [load]);

  // Bloque le refresh si sélection active OU modal ouvert
  useEffect(() => {
    onSelectionChange?.(checkedIds.size > 0 || detailCaseId !== null);
  }, [checkedIds, detailCaseId, onSelectionChange]);

  function validateFinRow(_row: any): string[] {
    // Finition : pas de champs obligatoires, la validation est l'action finale
    return [];
  }

  async function handleBatch() {
    if (checkedIds.size === 0 || batchPending) return;
    const blockers: { id: string; msg: string }[] = [];
    for (const id of checkedIds) {
      const row = rows.find(r => String(r.id) === id);
      if (!row) continue;
      const miss = validateFinRow(row);
      if (miss.length > 0) {
        blockers.push({ id, msg: `Cas ${row.case_number} — champs manquants : ${miss.join(", ")}` });
      }
    }
    if (blockers.length > 0) {
      setBatchResult({ ok: [], errors: blockers });
      return;
    }
    setBatchPending(true);
    const toValidate = rows
      .filter(r => checkedIds.has(String(r.id)))
      .map(r => ({ case_id: String(r.id), case_number: r.case_number ?? "" }));
    const results = await validateFinitionBatchAction(toValidate);
    const okIds = results.filter(r => r.ok).map(r => r.case_id);
    const errors = results.filter(r => !r.ok).map(r => ({ id: r.case_id, msg: r.error ?? "Erreur" }));
    setBatchResult({ ok: okIds, errors });
    setBatchPending(false);
    if (okIds.length > 0) {
      setRows(prev => prev.filter(r => !okIds.includes(String(r.id))));
      setCheckedIds(prev => { const n = new Set(prev); okIds.forEach(id => n.delete(id)); return n; });
    }
    if (errors.length === 0) setTimeout(() => setBatchResult(null), 4000);
  }

  const today    = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));

  const filtered = useMemo(() => {
    const base = rows.filter(row => {
      const isOnHold = (row as any)._other_on_hold;
      if (!filter || filter === "all") return true;
      // Les cas en attente n'apparaissent pas dans today/tomorrow/late
      if (isOnHold) return false;
      const ref = ((row as any)._dateRef ?? row.date_expedition)?.slice(0,10);
      if (filter === "today")    return ref === today;
      if (filter === "tomorrow") return ref === tomorrow;
      if (filter === "late")     return ref !== undefined && ref !== null && ref < today;
      return true;
    });
    // Tri : on_hold en bas, puis par date de réception (urgents d'abord)
    return [...base].sort((a, b) => {
      const aHold = (a as any)._on_hold ? 1 : 0;
      const bHold = (b as any)._on_hold ? 1 : 0;
      if (aHold !== bHold) return aHold - bHold;
      return (((a as any)._dateRef ?? a.date_expedition) ?? "9999").localeCompare(((b as any)._dateRef ?? b.date_expedition) ?? "9999");
    });
  }, [rows, filter, today, tomorrow]);


  const emptyMessage = () => {
    if (filter === "today")    return "Aucun cas prévu aujourd'hui.";
    if (filter === "tomorrow") return "Aucun cas prévu demain.";
    if (filter === "late")     return "Aucun cas en retard.";
    return "Aucun cas en cours.";
  };

  if (loading) return <div style={{ padding:40, color:"#555", fontSize:13, textAlign:"center" }}>Chargement...</div>;
  if (error)   return <div style={{ padding:20, color:"#f87171", fontSize:13 }}>{error}</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0 }}>

      {detailCaseId && (
        <CaseDetailModal caseId={detailCaseId} onClose={() => setDetailCaseId(null)} />
      )}
      {reasonTooltip && (() => {
        const r = rows.find(r => String(r.id) === reasonTooltip.id);
        return <OnHoldReasonTooltip reason={(r as any)?._other_on_hold_reason} onHoldAt={(r as any)?._other_on_hold_at} anchorRect={reasonTooltip.rect} onClose={() => setReasonTooltip(null)} />;
      })()}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 20px 8px", position:"sticky", top:0, zIndex:3, background:"#0b0b0b", paddingTop:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:12, color:"white", padding:"4px 10px", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6 }}>
            {filtered.length} dossier{filtered.length > 1 ? "s" : ""}
          </div>
          {batchResult && batchResult.ok.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:6 }}>
              <span style={{ color:"#4ade80", fontSize:13 }}>✓</span>
              <span style={{ color:"#4ade80", fontSize:12, fontWeight:600 }}>{batchResult.ok.length} validé{batchResult.ok.length > 1 ? "s" : ""}</span>
            </div>
          )}
          {batchResult && batchResult.errors.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column" as const, gap:4, maxWidth:560, padding:"8px 12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:"#f87171", fontWeight:700 }}>✕ {batchResult.errors.length} validation{batchResult.errors.length>1?"s":""} bloquée{batchResult.errors.length>1?"s":""}</span>
                <button onClick={()=>setBatchResult(null)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:14, padding:0 }}>×</button>
              </div>
              {batchResult.errors.slice(0,4).map((e,i)=>(
                <div key={i} style={{ fontSize:11, color:"#fca5a5", lineHeight:1.4 }}>{e.msg}</div>
              ))}
              {batchResult.errors.length>4 && <div style={{ fontSize:10, color:"#f87171", fontStyle:"italic" }}>… et {batchResult.errors.length-4} autre{batchResult.errors.length-4>1?"s":""}</div>}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {lotPanel}
          <button onClick={handleBatch} disabled={batchPending || checkedIds.size === 0} style={{
            padding:"9px 18px",
            border: checkedIds.size === 0 ? "1px solid #555" : "1px solid #4ade80",
            background: checkedIds.size === 0 ? "transparent" : "rgba(74,222,128,0.08)",
            color: checkedIds.size === 0 ? "white" : "#4ade80",
            cursor: batchPending || checkedIds.size === 0 ? "not-allowed" : "pointer",
            borderRadius:8, fontWeight:700, fontSize:13, transition:"all 160ms ease",
          }}>
            {batchPending ? "Validation..." : checkedIds.size === 0 ? "Sélectionner des dossiers" : `Valider ${checkedIds.size} dossier${checkedIds.size > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      <div style={{ overflowX:"auto", overflowY:"auto", flex:1, minHeight:0, paddingBottom:80 }}>
        <table style={{ borderCollapse:"collapse", width:"100%", tableLayout:"auto" }}>
          <thead style={{ position:"sticky", top:0, zIndex:2, background:"#111" }}>
            <tr>
              <th style={thSticky}>N° cas</th>
              <th style={thRead}>Création</th>
              <th style={thRead}>Expédition</th>
              <th style={thRead}>Nature</th>
              <th style={thRead}>Type de dents</th>
              <th style={thRead}>Teintes</th>
              <th style={thRead}>Nb blocs</th>
              <th style={thRead}>Réception métal</th>
              <th style={thRead}>Réception résine</th>
              <th style={thRead}>Réception complète</th>
              <th style={thEdit}>Validation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding:40, color:"white", fontSize:13, textAlign:"center" }}>
                {emptyMessage()}
              </td></tr>
            )}
            {filtered.map(row => {
              const fin = (row as any).sector_finition       ?? {};
              const dm  = (row as any).sector_design_metal   ?? {};
              const dr  = (row as any).sector_design_resine  ?? {};
              const ur  = (row as any).sector_usinage_resine ?? {};
              const ut  = (row as any).sector_usinage_titane ?? {};

              const validated     = Boolean(fin.validation);
              const isHighlighted = highlightId === String(row.id);
              const isChecked     = checkedIds.has(String(row.id));
              const isProvisoire  = row.nature_du_travail === "Provisoire Résine";
              const isOnHold      = Boolean((row as any)._other_on_hold);

              const teintes   = ur.teintes_override ?? dr.teintes_associees ?? dm.teintes_associees ?? null;
              // DM est la source de vérité pour type_de_dents (DR force toujours "Dents usinées")
              const typeDents = ur.type_de_dents_override ?? dm.type_de_dents ?? dr.type_de_dents ?? null;
              const isDentsCommerce = typeDents === "Dents du commerce" || typeDents === "Pas de dents";
              const nbBlocs   = ur.nb_blocs_override ?? dr.nb_blocs_de_dents ?? dr.nb_blocs ?? null;
              const receptionMetalDate  = ut.reception_metal_at ?? dm.reception_metal_date ?? null;
              const receptionResineDate = ur.reception_resine_at ?? null;

              // Déterminer si le cas a besoin de métal et/ou résine selon la nature et le type de dents
              const needsMetal  = row.nature_du_travail === "Chassis Argoat";
              const needsResine = typeDents !== "Dents du commerce";

              const d1 = receptionMetalDate  ? new Date(receptionMetalDate.slice(0,10))  : null;
              const d2 = receptionResineDate ? new Date(receptionResineDate.slice(0,10)) : null;

              let receptionCompleteDate: string | null = null;
              if (needsMetal && needsResine) {
                if (d1 && d2) {
                  receptionCompleteDate = d1 >= d2 ? receptionMetalDate : receptionResineDate;
                }
              } else if (needsMetal) {
                receptionCompleteDate = receptionMetalDate;
              } else if (needsResine) {
                receptionCompleteDate = receptionResineDate;
              }

              // Délai basé sur la plus récente date de réception disponible
              const status = getDelaiStatus((row as any)._dateRef ?? null, validated);

              const typeMeta   = TYPE_DENTS_OPTIONS.find(o => o.value === typeDents) ?? { color:"white" };
              const natureMeta = NATURE_META[row.nature_du_travail ?? ""];

              return (
                <tr key={row.id} id={`row-fin-${row.id}`}
                  style={{
                    ...DELAI_STYLES[status],
                    borderBottom:"1px solid #1a1a1a",
                    transition:"background 300ms, opacity 300ms",
                    outline: isHighlighted ? "1px solid #4ade80" : "none",
                    opacity: isOnHold ? 0.45 : 1,
                  }}
                >
                  <td style={{
                    ...tdSticky,
                    background: isChecked ? "rgba(74,222,128,0.05)" : isHighlighted ? "rgba(74,222,128,0.08)" : "#0b0b0b",
                  }}>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:2 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {status==="late"  && <span style={{ fontSize:10, color:"#f87171" }}>●</span>}
                        {status==="today" && <span style={{ fontSize:10, color:"#f59e0b" }}>●</span>}
                        <button
                          onClick={() => setDetailCaseId(String(row.id))}
                          title="Voir le détail des tâches"
                          style={{
                            background:"none", border:"none", padding:0,
                            cursor:"pointer", color:"white", fontWeight:700,
                            fontSize:13, textDecoration:"underline",
                            textDecorationColor: natureMeta ? natureMeta.color+"60" : "rgba(255,255,255,0.3)",
                            textUnderlineOffset:3, transition:"color 150ms",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = natureMeta?.color ?? "#4ade80")}
                          onMouseLeave={e => (e.currentTarget.style.color = "white")}
                        >
                          {row.case_number}
                        </button>
                        {row.is_physical && <PhysicalBadge />}
                        {isOnHold && (
                          <button
                            onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setReasonTooltip(prev => prev?.id === String(row.id) ? null : { id: String(row.id), rect: { top: r.top, left: r.left, width: r.width, bottom: r.bottom } }); }}
                            style={{ fontSize:9, fontWeight:700, color:"#f59e0b", background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:4, padding:"1px 6px", cursor:"pointer" }}
                          >
                            En attente · {(row as any)._other_on_hold_sector ?? ""} {(row as any)._other_on_hold_reason ? "💬" : ""}
                          </button>
                        )}
                      </div>
                      {(row as any).sent_by_name && <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600, whiteSpace: "nowrap" as const }}>via {(row as any).sent_by_name}</span>}
                    </div>
                  </td>

                  <td style={tdRead}>
                    {row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : "—"}
                  </td>

                  {(() => { const rawExp = row.date_expedition?.slice(0,10) ?? ""; const today = new Date().toISOString().split("T")[0]; const expColor = rawExp && rawExp < today ? "#f87171" : rawExp && rawExp === today ? "#f59e0b" : "white"; return (
                  <td style={tdRead}>
                    <span style={{ color: expColor, fontWeight: rawExp && rawExp <= today ? 700 : undefined }}>{row.date_expedition ? new Date(row.date_expedition.slice(0,10)+"T00:00:00").toLocaleDateString("fr-FR") : "—"}</span>
                  </td>
                  ); })()}

                  <td style={tdBase}><NatureBadge nature={row.nature_du_travail} /></td>

                  <td style={tdBase}>
                    <SelectReadOnly value={typeDents??""} color={typeMeta.color} options={TYPE_DENTS_OPTIONS} />
                  </td>

                  <td style={typeDents === "Pas de dents" ? {
                    ...tdBase,
                    background:"repeating-linear-gradient(135deg, rgba(239,68,68,0.07) 0px, rgba(239,68,68,0.07) 4px, transparent 4px, transparent 8px)",
                    cursor:"not-allowed", color:"rgba(239,68,68,0.5)",
                  } : tdRead} title={typeDents === "Pas de dents" ? "Non applicable pour Pas de dents" : undefined}>
                    {typeDents === "Pas de dents" ? "⊘" : (teintes ?? "—")}
                  </td>
                  <td style={isDentsCommerce ? {
                    ...tdBase,
                    background:"repeating-linear-gradient(135deg, rgba(239,68,68,0.07) 0px, rgba(239,68,68,0.07) 4px, transparent 4px, transparent 8px)",
                    cursor:"not-allowed", color:"rgba(239,68,68,0.5)",
                  } : tdRead} title={isDentsCommerce ? "Non applicable pour Dents du commerce" : undefined}>
                    {isDentsCommerce ? "⊘" : (nbBlocs ?? "—")}
                  </td>
                  {(() => {
                    const urgentColor = status==="late"?"#f87171":status==="today"?"#f59e0b":undefined;
                    const urgentWeight = (status==="late"||status==="today") ? 700 : 400;
                    const rcStyle = urgentColor ? { ...tdRead, fontWeight: urgentWeight } : tdRead;
                    const dateColor = urgentColor ?? "white";
                    return (<>
                      <td style={isProvisoire ? {
                        ...tdBase,
                        background:"repeating-linear-gradient(135deg, rgba(239,68,68,0.07) 0px, rgba(239,68,68,0.07) 4px, transparent 4px, transparent 8px)",
                        cursor:"not-allowed", color:"rgba(239,68,68,0.5)",
                      } : rcStyle} title={isProvisoire ? "Non applicable pour Provisoire Résine" : undefined}>
                        {isProvisoire ? "⊘" : <DateCell value={receptionMetalDate} color={receptionMetalDate ? dateColor : "white"} />}
                      </td>
                      <td style={isDentsCommerce ? {
                        ...tdBase,
                        background:"repeating-linear-gradient(135deg, rgba(239,68,68,0.07) 0px, rgba(239,68,68,0.07) 4px, transparent 4px, transparent 8px)",
                        cursor:"not-allowed", color:"rgba(239,68,68,0.5)",
                      } : rcStyle} title={isDentsCommerce ? "Non applicable pour Dents du commerce" : undefined}>
                        {isDentsCommerce ? "⊘" : <DateCell value={receptionResineDate} color={receptionResineDate ? dateColor : "white"} />}
                      </td>
                      <td style={rcStyle}><DateCell value={receptionCompleteDate} color={receptionCompleteDate ? dateColor : "white"} /></td>
                    </>);
                  })()}

                  <td style={{ ...tdBase, width:48 }}>
                    {validated ? (
                      <div style={{ display:"inline-flex", padding:"3px 10px", borderRadius:6, background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", color:"#4ade80", fontWeight:700, fontSize:11 }}>✓ Validé</div>
                    ) : (
                      <input type="checkbox" checked={isChecked}
                        onChange={e => {
                          const id = String(row.id);
                          setCheckedIds(prev => { const n = new Set(prev); e.target.checked ? n.add(id) : n.delete(id); return n; });
                        }}
                        style={{ width:16, height:16, cursor:"pointer", accentColor:"#4ade80" }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
