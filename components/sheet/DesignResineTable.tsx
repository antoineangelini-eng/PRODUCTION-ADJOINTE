"use client";
import React from "react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PhysicalBadge } from "@/components/sheet/PhysicalBadge";
import {
  loadDesignResineRowsAction,
  saveDesignResineCellAction,
  saveDesignResineMultiAction,
  completeDesignResineBatchAction,
  deleteCaseAction,
  removeCaseFromSectorAction,
  toggleCasePhysicalAction,
  updateCaseNatureAction,
  type DesignResineRow,
  type BatchResult,
} from "@/app/app/design-resine/actions";
import { DeleteConfirmModal } from "@/components/sheet/DeleteConfirmModal";
import { toggleOnHoldAction } from "@/lib/on-hold";
import { OnHoldReasonModal, OnHoldReasonTooltip } from "@/components/sheet/OnHoldModal";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#e07070" },
  "Chassis Dent All":  { color: "#4ade80" },
  "Définitif Résine":  { color: "#c4a882" },
  "Provisoire Résine": { color: "#9487a8" },
  "Définitif":         { color: "#f59e0b" },
  "Définitif Bimax":   { color: "#f97316" },
  "Définitif FD":      { color: "#f59e0b" },
  "Deflex":            { color: "#a78bfa" },
  "Complet":           { color: "#38bdf8" },
};

const DR_NATURE_OPTIONS = [
  { value: "Provisoire Résine", color: "#9487a8" },
  { value: "Deflex",            color: "#a78bfa" },
  { value: "Complet",           color: "#38bdf8" },
];

const TYPE_DENTS_OPTIONS = [
  { value: "Dents usinées", color: "#7c8196" },
  { value: "Dents imprimées", color: "#a78bfa" },
];

const BASE_OPTIONS = [
  { value: "Imprimée", color: "#a78bfa" },
  { value: "Usinée",   color: "#f59e0b" },
];

function autoBaseDents(complet: boolean, nature: string): { base_type: string; dents_type: string } {
  if (!complet) return { base_type: "Usinée", dents_type: "Usinée" };
  if (nature === "Provisoire Résine") return { base_type: "Imprimée", dents_type: "Imprimée" };
  if (nature === "Définitif Bimax")   return { base_type: "Imprimée", dents_type: "Usinée" };
  if (nature === "Définitif FD")      return { base_type: "Usinée",   dents_type: "Usinée" };
  return { base_type: "Usinée", dents_type: "Usinée" };
}

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Lu","Ma","Me","Je","Ve","Sa","Di"];

const SEARCH_KEYFRAMES = `
@keyframes row-found {
  0%   { background: transparent;           box-shadow: inset 0 0 0 2px transparent; }
  8%   { background: rgba(74,222,128,0.35); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.9); }
  20%  { background: rgba(74,222,128,0.18); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  35%  { background: rgba(74,222,128,0.30); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.8); }
  50%  { background: rgba(74,222,128,0.14); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.5); }
  65%  { background: rgba(74,222,128,0.22); box-shadow: inset 0 0 0 2px rgba(74,222,128,0.6); }
  80%  { background: rgba(74,222,128,0.10); box-shadow: inset 0 0 0 1px rgba(74,222,128,0.3); }
  100% { background: rgba(255,255,255,0.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15); }
}`;

function fmtDate(v: any) { if (!v) return "—"; return new Date(v).toLocaleDateString("fr-FR"); }
function fmtDateTime(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return { date: d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}), time: d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) };
}
function getRowBg(c: boolean, h: boolean, a: boolean) { if(c) return "rgba(74,222,128,0.10)"; if(a) return "#1f2321"; if(h) return "#222222"; return "#1a1a1a"; }
function getRowBorder(c: boolean, h: boolean, a: boolean) { if(c) return "rgba(74,222,128,0.32)"; if(a) return "rgba(255,255,255,0.10)"; if(h) return "#383838"; return "#2b2b2b"; }
function getRowShadow(c: boolean, h: boolean, a: boolean) { if(c) return "0 0 0 1px rgba(74,222,128,0.10),0 8px 24px rgba(0,0,0,0.30)"; if(a) return "0 0 0 1px rgba(255,255,255,0.06),0 16px 34px rgba(0,0,0,0.34)"; if(h) return "0 8px 20px rgba(0,0,0,0.22)"; return "0 4px 12px rgba(0,0,0,0.18)"; }

function MiniCalendar({ value, onSelect, onClose, rect }: { value:string; onSelect:(d:string)=>void; onClose:()=>void; rect:DOMRect }) {
  const today=new Date(), init=value?new Date(value+"T00:00:00"):today;
  const [view,setView]=useState({year:init.getFullYear(),month:init.getMonth()});
  const ref=useRef<HTMLDivElement>(null);
  const top=rect.bottom+250>window.innerHeight?rect.top-254:rect.bottom+4;
  useEffect(()=>{ function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))onClose();} setTimeout(()=>document.addEventListener("mousedown",h),0); return()=>document.removeEventListener("mousedown",h); },[onClose]);
  const sel=value?new Date(value+"T00:00:00"):null;
  const {year,month}=view, total=new Date(year,month+1,0).getDate(), first=(()=>{const d=new Date(year,month,1).getDay();return d===0?6:d-1;})();
  const cells:(number|null)[]=[...Array(first).fill(null),...Array.from({length:total},(_,i)=>i+1)];
  while(cells.length%7)cells.push(null);
  const pick=(day:number)=>{const mm=String(month+1).padStart(2,"0"),dd=String(day).padStart(2,"0");onSelect(`${year}-${mm}-${dd}`);onClose();};
  return (
    <div ref={ref} style={{position:"fixed",zIndex:9999,top,left:rect.left,background:"#1a1a1a",border:"1px solid #3d3d3d",borderRadius:10,padding:12,boxShadow:"0 8px 32px rgba(0,0,0,0.8)",minWidth:224,userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>setView(v=>v.month===0?{year:v.year-1,month:11}:{...v,month:v.month-1})} style={{background:"none",border:"none",color:"white",cursor:"pointer",fontSize:18,padding:"0 6px"}}>‹</button>
        <span style={{fontSize:12,fontWeight:700,color:"white"}}>{MONTHS_FR[month]} {year}</span>
        <button onClick={()=>setView(v=>v.month===11?{year:v.year+1,month:0}:{...v,month:v.month+1})} style={{background:"none",border:"none",color:"white",cursor:"pointer",fontSize:18,padding:"0 6px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DAYS_FR.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#555",fontWeight:600,padding:"2px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((day,i)=>{
          if(!day)return <div key={i}/>;
          const iT=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
          const iS=sel&&day===sel.getDate()&&month===sel.getMonth()&&year===sel.getFullYear();
          return <button key={i} onClick={()=>pick(day)} style={{background:iS?"#4ade80":iT?"rgba(74,222,128,0.12)":"none",border:iT&&!iS?"1px solid rgba(74,222,128,0.3)":"1px solid transparent",color:iS?"#000":"white",borderRadius:5,fontSize:11,padding:"4px 2px",cursor:"pointer",fontWeight:iS?700:400}}
            onMouseEnter={e=>{if(!iS)(e.target as HTMLButtonElement).style.background="rgba(255,255,255,0.08)";}}
            onMouseLeave={e=>{if(!iS)(e.target as HTMLButtonElement).style.background=iT?"rgba(74,222,128,0.12)":"none";}}>{day}</button>;
        })}
      </div>
      <button onClick={()=>{onSelect("");onClose();}} style={{marginTop:8,width:"100%",background:"none",border:"1px solid #3d3d3d",borderRadius:6,color:"#555",fontSize:11,padding:"5px 0",cursor:"pointer"}}>Effacer la date</button>
    </div>
  );
}

const TH_BG="#111";
const thBase:React.CSSProperties={padding:"6px 10px",fontWeight:700,fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",color:"#e0e0e0",background:TH_BG,border:"none",whiteSpace:"normal",wordBreak:"break-word",lineHeight:1.2,textAlign:"center",verticalAlign:"bottom"};
const thRead:React.CSSProperties={...thBase,color:"#e0e0e0"};
const thEdit:React.CSSProperties={...thBase,color:"#4ade80"};
const thSticky:React.CSSProperties={...thBase,color:"#ffffff",textAlign:"left",position:"sticky",left:0,zIndex:10,background:TH_BG};
const tdBase:React.CSSProperties={padding:"5px 8px",whiteSpace:"nowrap",fontSize:13,textAlign:"center",verticalAlign:"middle",background:"transparent"};
const tdSticky:React.CSSProperties={...tdBase,textAlign:"left",position:"sticky",left:0,zIndex:2,fontWeight:600,background:"transparent"};

function DateTimeCell({value}:{value:string|null}){
  const dt=fmtDateTime(value);
  if(!dt)return <span style={{color:"#333"}}>—</span>;
  return <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:12,color:"white"}}>{dt.date}</span><span style={{fontSize:11,fontWeight:600,color:"white",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.3)",borderRadius:4,padding:"1px 7px"}}>{dt.time}</span></div>;
}
function BoolReadOnly({value}:{value:boolean|null}){
  return <button disabled style={{background:value?"rgba(74,222,128,0.15)":"transparent",border:value?"1px solid rgba(74,222,128,0.4)":"1px solid #ffffff",padding:"3px 8px",cursor:"not-allowed",color:value?"#4ade80":"transparent",width:36,height:26,borderRadius:6,fontWeight:700,fontSize:13,opacity:value?1:0.35}}>{value?"✓":""}</button>;
}
function ModeleIndicator({ok,onToggle,locked=false}:{ok:boolean|null;onToggle?:()=>void;locked?:boolean}){
  if(ok===null||ok===undefined)return <span style={{color:"#555"}}>—</span>;
  return <button
    disabled={locked}
    onClick={e=>{if(locked)return;e.stopPropagation();onToggle?.();}}
    title={locked?"Validé par DM — verrouillé":undefined}
    style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,background:ok?"rgba(74,222,128,0.12)":"rgba(239,68,68,0.1)",border:ok?"1px solid rgba(74,222,128,0.35)":"1px solid rgba(239,68,68,0.3)",color:ok?"#4ade80":"#f87171",fontWeight:700,fontSize:11,cursor:locked?"not-allowed":"pointer",opacity:locked?0.85:1,transition:"all 150ms"}}>
    {locked && <span style={{fontSize:9,opacity:0.9}}>🔒</span>}
    {ok?"Oui":"Non"}
  </button>;
}
function SelectCustom({value,onChange,options,color,locked=false,showChevron=true}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string;color?:string}[];color:string;locked?:boolean;showChevron?:boolean}){
  if(locked){
    return (
      <div title="Déjà défini en amont — non modifiable" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",border:`1px solid ${color}40`,background:color+"10",color:color||"#888",fontSize:12,fontWeight:600,borderRadius:6,minWidth:100,justifyContent:"center",cursor:"not-allowed",opacity:0.85}}>
        <span style={{fontSize:9,opacity:0.7}}>🔒</span>
        <span>{value||"—"}</span>
      </div>
    );
  }
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{padding:showChevron?"4px 28px 4px 10px":"4px 10px",border:`1px solid ${color}50`,background:color+"15",color:color||"#888",fontSize:12,fontWeight:600,borderRadius:6,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",minWidth:100}}>
        <option value="" style={{background:"#111",color:"#555"}}>—</option>
        {options.map(o=><option key={o.value} value={o.value} style={{background:"#111",color:o.color??color,fontWeight:600}}>{o.label}</option>)}
      </select>
      {showChevron&&<svg viewBox="0 0 10 6" width="10" height="10" style={{position:"absolute",right:9,pointerEvents:"none",opacity:0.7}} fill="none" stroke={color||"#555"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4"/></svg>}
    </div>
  );
}
function TextInput({value,onSave,width=100}:{value:string|null;onSave:(v:string)=>void;width?:number}){
  const [focused,setFocused]=React.useState(false);
  const [local,setLocal]=React.useState(value??"");
  React.useEffect(()=>{setLocal(value??"");},[value]);
  return <input value={local} placeholder={focused?"":"—"} onFocus={()=>setFocused(true)} onChange={e=>setLocal(e.target.value)}
    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onSave(local);e.currentTarget.blur();}}}
    onBlur={()=>{setFocused(false);onSave(local);}}
    style={{padding:"3px 8px",border:focused?"1px solid #4ade80":"1px solid transparent",background:focused?"rgba(74,222,128,0.06)":"rgba(255,255,255,0.05)",color:"white",width,fontSize:13,textAlign:"center",outline:"none",borderRadius:6,transition:"all 150ms"}}/>;
}

export function DesignResineTable({focusId, onReload, onReloadFull, onSelectionChange, onNewCases, onBannerClear}:{
  focusId:string|null;
  onReload?: (fn: () => void) => void;
  onReloadFull?: (fn: () => void) => void;
  onSelectionChange?: (busy: boolean) => void;
  onNewCases?: (cases: { id: string; case_number: string | null; date_expedition: string | null; nature_du_travail: string | null }[]) => void;
  onBannerClear?: () => void;
}){
  const onNewCasesRef = useRef(onNewCases); onNewCasesRef.current = onNewCases;
  const onBannerClearRef = useRef(onBannerClear); onBannerClearRef.current = onBannerClear;
  const [currentUserId,setCurrentUserId]=useState("");
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(()=>{import("@/app/app/user-info-action").then(m=>m.getUserInfoAction()).then(info=>{setCurrentUserId(info.userId);setIsAdmin(info.isAdmin);});},[]);
  const [rows,setRows]=useState<DesignResineRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [checkedIds,setCheckedIds]=useState<Set<string>>(new Set());
  const [batchPending,setBatchPending]=useState(false);
  const [batchResult,setBatchResult]=useState<BatchResult|null>(null);
  const [activeRowId,setActiveRowId]=useState<string|null>(null);
  const [hoveredId,setHoveredId]=useState<string|null>(null);
  const [searchNotFound,setSearchNotFound]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const [editingExpId,setEditingExpId]=useState<string|null>(null);
  const [editingExpRect,setEditingExpRect]=useState<DOMRect|null>(null);
  const [foundRowId,setFoundRowId]=useState<string|null>(null);
  const [holdBusy,setHoldBusy]=useState<string|null>(null);
  const [holdModalCaseId,setHoldModalCaseId]=useState<string|null>(null);
  const [reasonTooltip,setReasonTooltip]=useState<{id:string;rect:{top:number;left:number;width:number;bottom:number}}|null>(null);

  const load=useCallback(async(silent=false)=>{
    if(!silent){setLoading(true);setError(null);}
    try{
      const fresh = await loadDesignResineRowsAction();
      if(silent){
        // Détection seulement — table inchangée jusqu'au prochain refresh réel.
        setRows(prev=>{
          const prevIds = new Set(prev.map(r=>String(r.id)));
          const incoming = fresh.filter(r=>!prevIds.has(String(r.id)));
          if(incoming.length>0){
            onNewCasesRef.current?.(incoming.map(r=>({
              id: String(r.id),
              case_number: r.case_number,
              date_expedition: r.date_expedition,
              nature_du_travail: r.nature_du_travail,
            })));
          }
          return prev;
        });
      } else {
        setRows(fresh);
        onBannerClearRef.current?.();
      }
    }
    catch(e:any){if(!silent)setError(e?.message??"Erreur inconnue");}
    finally{if(!silent)setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{ onReload?.(() => load(true)); },[load, onReload]);
  useEffect(()=>{ onReloadFull?.(() => load(false)); },[load, onReloadFull]);
  useEffect(()=>{ onSelectionChange?.(checkedIds.size > 0 || confirmDeleteId !== null || editingExpId !== null); },[checkedIds, confirmDeleteId, editingExpId, onSelectionChange]);

  // Auto-refresh après 3 min d'inactivité
  const lastActivityRef = useRef(Date.now());
  useEffect(()=>{
    const onActivity = ()=>{ lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    return ()=>{
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  },[]);
  useEffect(()=>{
    const itv = setInterval(()=>{
      if(Date.now() - lastActivityRef.current > 3 * 60 * 1000){
        lastActivityRef.current = Date.now();
        load();
      }
    }, 30_000);
    return ()=>clearInterval(itv);
  },[load]);

  // Tri DR :
  //   1) Cases créés en DR (pas de DM associé) → en tête, plus récents d'abord.
  //   2) Cases venus de DM → ensuite, triés par date d'expédition ascendante.
  const sortedRows = useMemo(()=>{
    const isDrOrigin = (r: DesignResineRow) => !(r as any).sector_design_metal;
    const drCreated = rows.filter(isDrOrigin).sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? "")
    );
    const fromDm = rows.filter(r => !isDrOrigin(r)).sort((a, b) =>
      (a.date_expedition ?? "9999").localeCompare(b.date_expedition ?? "9999")
    );
    const all = [...drCreated, ...fromDm];
    // on_hold en bas
    return all.sort((a, b) => {
      const aH = (a as any)._on_hold ? 1 : 0;
      const bH = (b as any)._on_hold ? 1 : 0;
      return aH - bH;
    });
  }, [rows]);
  useEffect(()=>{
    if(!focusId||loading)return;
    const found=rows.find(r=>r.case_number===focusId);
    if(!found){setSearchNotFound(true);setFoundRowId(null);return;}
    setSearchNotFound(false);
    document.getElementById(`row-dr-${found.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});
    setActiveRowId(String(found.id));setFoundRowId(String(found.id));
    const t=setTimeout(()=>setFoundRowId(null),2200);return()=>clearTimeout(t);
  },[focusId,loading,rows]);

  function patchRow(caseId:string,sectorKey:string|null,column:string,value:any){
    setRows(prev=>prev.map(row=>{
      if(String(row.id)!==String(caseId))return row;
      if(!sectorKey)return{...row,[column]:value};
      return{...row,[sectorKey]:{...(row as any)[sectorKey],[column]:value}};
    }));
  }
  async function handleTogglePhysical(caseId:string,currentPhysical:boolean){
    const newP=!currentPhysical;
    patchRow(caseId,null,"is_physical",newP);
    if(newP) patchRow(caseId,"sector_design_resine","modele_a_realiser_ok",false);
    try{
      await toggleCasePhysicalAction(caseId);
      await load(true);
    }catch{
      patchRow(caseId,null,"is_physical",currentPhysical);
      await load(true);
    }
  }
  function handlePauseClick(caseId:string){
    const row=rows.find(r=>String(r.id)===caseId);
    if((row as any)?._on_hold){ doToggleHold(caseId,null); }
    else{ setHoldModalCaseId(caseId); }
  }
  async function doToggleHold(caseId:string,reason:string|null){
    if(holdBusy)return;
    setHoldBusy(caseId);
    setHoldModalCaseId(null);
    try{
      const res=await toggleOnHoldAction(caseId,"design_resine",reason);
      if(res.ok){
        setRows(prev=>prev.map(r=>String(r.id)===caseId?{...r,_on_hold:res.nowOnHold,_on_hold_at:res.nowOnHold?new Date().toISOString():null,_on_hold_reason:res.nowOnHold?reason:null} as any:r));
        if(res.nowOnHold) setCheckedIds(prev=>{const n=new Set(prev);n.delete(caseId);return n;});
      }
    }finally{setHoldBusy(null);}
  }
  async function saveBool(caseId:string,column:string,current:boolean){
    const newVal=!current;
    patchRow(caseId,"sector_design_resine",column,newVal);
    if(column==="design_dents_resine")patchRow(caseId,"sector_design_resine","design_dents_resine_at",newVal?new Date().toISOString():null);
    const fd=new FormData();fd.set("case_id",caseId);fd.set("column",column);fd.set("kind","boolean");fd.set("current",String(current));
    await saveDesignResineCellAction(fd);
  }
  function autoFillOnSelect(row:DesignResineRow){
    const caseId=String(row.id);
    const dr=(row as any).sector_design_resine??{};
    if(!dr.design_dents_resine){
      const now=new Date().toISOString();
      patchRow(caseId,"sector_design_resine","design_dents_resine",true);
      patchRow(caseId,"sector_design_resine","design_dents_resine_at",now);
      const fd=new FormData();fd.set("case_id",caseId);fd.set("column","design_dents_resine");fd.set("kind","boolean");fd.set("current","false");
      saveDesignResineCellAction(fd);
    }
  }

  async function saveText(caseId:string,column:string,value:string){
    patchRow(caseId,"sector_design_resine",column,value||null);
    const fd=new FormData();fd.set("case_id",caseId);fd.set("column",column);fd.set("kind","text");fd.set("value",value);
    await saveDesignResineCellAction(fd);
  }
  async function saveCaseDateExpedition(caseId:string,date:string){
    patchRow(caseId,null,"date_expedition",date||null);
    const fd=new FormData();fd.set("case_id",caseId);fd.set("column","date_expedition");fd.set("kind","date");fd.set("value",date);
    await saveDesignResineCellAction(fd);
  }
  async function handleDeleteFromSector(caseId:string){
    const fd=new FormData();fd.set("case_id",caseId);
    const r=await removeCaseFromSectorAction(fd);
    if((r as any)?.error){alert((r as any).error);return;}
    setConfirmDeleteId(null);setRows(prev=>prev.filter(x=>String(x.id)!==caseId));
  }
  async function handleDeleteFromAll(caseId:string){
    const fd=new FormData();fd.set("case_id",caseId);
    const r=await deleteCaseAction(fd);
    if((r as any)?.error){alert((r as any).error);return;}
    setConfirmDeleteId(null);await load();
  }
  function validateDrRow(row:any):string[]{
    const dr=row.sector_design_resine??{};
    const dm=row.sector_design_metal??{};
    const isProv=row.nature_du_travail==="Provisoire Résine";
    const typeDents=dr.type_de_dents??dm.type_de_dents;
    const missing:string[]=[];
    if(!dr.design_dents_resine)    missing.push("Design dents résine");
    if(!dr.design_dents_resine_at) missing.push("Date design dents résine");
    if(!dr.nb_blocs_de_dents)      missing.push("Nb blocs de dents");
    if(!typeDents)                 missing.push("Type de dents");
    const modeleOk=dr.modele_a_realiser_ok!==null&&dr.modele_a_realiser_ok!==undefined?dr.modele_a_realiser_ok:(isProv?true:dm.modele_a_faire_ok);
    if(modeleOk===null||modeleOk===undefined) missing.push("Modèle à réaliser");
    const teintes=dr.teintes_associees??dm.teintes_associees;
    if(!teintes)                   missing.push("Teintes");
    return missing;
  }
  async function handleBatch(){
    if(checkedIds.size===0||batchPending)return;
    const blockers:{case_id:string;error_message:string}[]=[];
    for(const id of checkedIds){
      const row=rows.find(r=>String(r.id)===id);
      if(!row)continue;
      const miss=validateDrRow(row);
      if(miss.length>0) blockers.push({case_id:id,error_message:`Cas ${row.case_number} — champs manquants : ${miss.join(", ")}`});
    }
    if(blockers.length>0){setBatchResult({okIds:[],errors:blockers});return;}
    setBatchPending(true);
    const fd=new FormData();for(const id of checkedIds)fd.append("case_ids",id);
    setBatchResult(await completeDesignResineBatchAction(null,fd));
    setBatchPending(false);setCheckedIds(new Set());await load();
  }

  if(loading)return <div style={{color:"#555",fontSize:13,padding:"20px 0"}}>Chargement...</div>;
  if(error)return <div style={{color:"#f87171",fontSize:13,padding:"20px 0"}}><div style={{fontWeight:700,marginBottom:4}}>Erreur :</div><code style={{fontSize:12,background:"rgba(239,68,68,0.08)",padding:"4px 8px",borderRadius:4,display:"block"}}>{error}</code><button onClick={()=>load()} style={{marginTop:8,border:"1px solid #f87171",background:"none",color:"#f87171",padding:"4px 10px",cursor:"pointer",borderRadius:4,fontSize:12}}>Réessayer</button></div>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      <style dangerouslySetInnerHTML={{__html:SEARCH_KEYFRAMES}}/>

      {/* Barre validation */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,position:"sticky",top:0,zIndex:3,background:"#0b0b0b",padding:"0 20px 8px 20px"}}>
        <div style={{minHeight:36,display:"flex",alignItems:"center",gap:10}}>
          {!searchNotFound&&<div style={{fontSize:12,color:"white",padding:"4px 10px",background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6}}>{sortedRows.length} dossier{sortedRows.length>1?"s":""}</div>}
          {searchNotFound&&focusId&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#1a0f0f",border:"1px solid rgba(239,68,68,0.4)",borderRadius:6}}><span style={{fontSize:12,color:"#f87171"}}>Cas <strong style={{color:"white"}}>"{focusId}"</strong> introuvable</span><button onClick={()=>setSearchNotFound(false)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>×</button></div>}
          {batchResult?.okIds.length?<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6}}><span style={{color:"white",fontSize:13}}>✓</span><span style={{color:"white",fontSize:12,fontWeight:600}}>{batchResult.okIds.length} envoyé{batchResult.okIds.length>1?"s":""}</span></div>:null}
          {batchResult?.errors.length?(
            <div style={{display:"flex",flexDirection:"column" as const,gap:4,maxWidth:560,padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:"#f87171",fontWeight:700}}>✕ {batchResult.errors.length} validation{batchResult.errors.length>1?"s":""} bloquée{batchResult.errors.length>1?"s":""}</span>
                <button onClick={()=>setBatchResult(null)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14,padding:0}}>×</button>
              </div>
              {batchResult.errors.slice(0,4).map((e,i)=>(
                <div key={i} style={{fontSize:11,color:"#fca5a5",lineHeight:1.4}}>{e.error_message}</div>
              ))}
              {batchResult.errors.length>4&&<div style={{fontSize:10,color:"#f87171",fontStyle:"italic"}}>… et {batchResult.errors.length-4} autre{batchResult.errors.length-4>1?"s":""}</div>}
            </div>
          ):null}
        </div>
        <button onClick={handleBatch} disabled={batchPending||checkedIds.size===0} style={{padding:"9px 18px",border:checkedIds.size===0?"1px solid #555":"1px solid #4ade80",background:checkedIds.size===0?"transparent":"rgba(74,222,128,0.08)",color:checkedIds.size===0?"white":"#4ade80",cursor:batchPending||checkedIds.size===0?"not-allowed":"pointer",borderRadius:8,fontWeight:700,fontSize:13,transition:"all 160ms ease"}}>
          {batchPending?"Validation...":checkedIds.size===0?"Sélectionner des dossiers":`Valider ${checkedIds.size} dossier${checkedIds.size>1?"s":""}`}
        </button>
      </div>

      {/* Table */}
      <div style={{overflowX:"auto",overflowY:"auto",minHeight:0,paddingBottom:80}}>
        <table style={{borderCollapse:"separate",borderSpacing:"0 8px",width:"100%",tableLayout:"auto"}}>
          <thead style={{position:"sticky",top:0,zIndex:2,background:"#111"}}>
            <tr>
              <th style={thSticky}>N° cas</th>
              <th style={thRead}>Création</th>
              <th style={thEdit}>Expédition</th>
              <th style={thRead}>Nature</th>
              <th style={thRead}>Design Châssis</th>
              <th style={thRead}><div>Date &amp; Heure</div><div style={{marginTop:3,fontSize:9,color:"#666",fontWeight:500,textTransform:"none",letterSpacing:0}}>Design châssis terminé</div></th>
              <th style={thEdit}>Type de dents</th>
              <th style={thEdit}>Design Dents Résine</th>
              <th style={thEdit}><div>Date &amp; Heure</div><div style={{marginTop:3,fontSize:9,color:"#4ade80",fontWeight:500,textTransform:"none",letterSpacing:0}}>Design dents résine</div></th>
              <th style={thEdit}>Nb Blocs</th>
              <th style={thEdit}>Modèle à faire</th>
              <th style={thEdit}>Teintes</th>
              <th style={thEdit}>Base</th>
              <th style={thEdit}>Sél.</th>
              <th style={{...thBase,color:"#3a3a3a",minWidth:48}}></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row=>{
              const dm=(row as any).sector_design_metal??{};
              const dr=(row as any).sector_design_resine??{};
              const nat=row.nature_du_travail??"";
              const isProvisoire=nat==="Provisoire Résine";
              const isDeflex=nat==="Deflex";
              const isComplet=nat==="Complet";
              const needsBase=isDeflex||isComplet;
              const isDrOnly=isProvisoire||isDeflex||isComplet;
              const natureMeta=NATURE_META[nat];
              const isC=checkedIds.has(String(row.id)),isA=activeRowId===String(row.id),isH=hoveredId===String(row.id),isF=foundRowId===String(row.id);
              const isOnHold=Boolean((row as any)._on_hold);
              const comesFromDm=Boolean((row as any).sector_design_metal);
              const typeDents=dr.type_de_dents??dm.type_de_dents??"";
              const effectiveTypeDents=typeDents||(isProvisoire||isDeflex?"Dents usinées":"");
              const typeMeta=TYPE_DENTS_OPTIONS.find(o=>o.value===effectiveTypeDents)??{color:"#555"};
              const modeleOk=dr.modele_a_realiser_ok!==null&&dr.modele_a_realiser_ok!==undefined?dr.modele_a_realiser_ok:(isDrOnly?true:dm.modele_a_faire_ok??null);
              const teintes=dr.teintes_associees??dm.teintes_associees??null;
              const rowBg=getRowBg(isC,isH,isA),rowBorder=getRowBorder(isC,isH,isA),rowShadow=getRowShadow(isC,isH,isA);
              const accentColor=isC?"#4ade80":natureMeta?.color??"#666";
              const tdCard:React.CSSProperties={...tdBase,background:isF?"transparent":rowBg,borderTop:`1px solid ${isF?"transparent":rowBorder}`,borderBottom:`1px solid ${isF?"transparent":rowBorder}`,borderLeft:"none",borderRight:"none",transition:"background 160ms,border-color 160ms"};
              const tdCardFirst:React.CSSProperties={...tdSticky,background:isF?"transparent":rowBg,borderTop:`1px solid ${isF?"transparent":rowBorder}`,borderBottom:`1px solid ${isF?"transparent":rowBorder}`,borderLeft:`1px solid ${isF?"transparent":rowBorder}`,borderTopLeftRadius:14,borderBottomLeftRadius:14,boxShadow:isF?"none":`inset 4px 0 0 ${accentColor}cc,${rowShadow}`,transition:"background 160ms,border-color 160ms,box-shadow 160ms"};
              const tdCardLast:React.CSSProperties={...tdBase,background:isF?"transparent":rowBg,borderTop:`1px solid ${isF?"transparent":rowBorder}`,borderBottom:`1px solid ${isF?"transparent":rowBorder}`,borderRight:`1px solid ${isF?"transparent":rowBorder}`,borderTopRightRadius:14,borderBottomRightRadius:14,boxShadow:isF?"none":rowShadow,transition:"background 160ms,border-color 160ms"};
              const disabledCellStyle:React.CSSProperties={...tdCard,background:`repeating-linear-gradient(135deg,rgba(239,68,68,0.06) 0px,rgba(239,68,68,0.06) 4px,${rowBg} 4px,${rowBg} 8px)`,color:"rgba(239,68,68,0.4)"};

              return (
                <tr key={row.id} id={`row-dr-${row.id}`} onClick={()=>setActiveRowId(String(row.id))} onMouseEnter={()=>setHoveredId(String(row.id))} onMouseLeave={()=>setHoveredId(null)}
                  style={{cursor:"pointer",animation:isF?"row-found 2.2s ease-in-out forwards":"none",background:isF?undefined:"transparent",opacity:isOnHold?0.45:1,transition:"opacity 300ms"}}>

                  <td style={tdCardFirst} onDoubleClick={e=>{e.stopPropagation();handleTogglePhysical(String(row.id),Boolean(row.is_physical));}} title="Double-clic pour basculer physique / numérique"><div style={{display:"flex",flexDirection:"column",gap:2,cursor:"default"}}><div style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    <button onClick={e=>{e.stopPropagation();handlePauseClick(String(row.id));}} disabled={holdBusy===String(row.id)} title={isOnHold?"Réactiver le cas":"Mettre en attente"} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:13,lineHeight:1,color:isOnHold?"#f59e0b":"#555",transition:"color 150ms",opacity:holdBusy===String(row.id)?0.4:1}} onMouseEnter={e=>{if(!isOnHold)e.currentTarget.style.color="#f59e0b";}} onMouseLeave={e=>{if(!isOnHold)e.currentTarget.style.color="#555";}}>{isOnHold?"▶":"⏸"}</button>
                    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:24,padding:"2px 8px",borderRadius:8,color:"#ffffff",background:isA?"rgba(255,255,255,0.04)":"transparent",border:isA?"1px solid rgba(255,255,255,0.06)":"1px solid transparent",transition:"all 160ms"}}>{row.case_number}</div>{row.is_physical&&<PhysicalBadge/>}{isOnHold&&<button onClick={e=>{e.stopPropagation();const r=(e.currentTarget as HTMLElement).getBoundingClientRect();setReasonTooltip(prev=>prev?.id===String(row.id)?null:{id:String(row.id),rect:{top:r.top,left:r.left,width:r.width,bottom:r.bottom}});}} style={{fontSize:9,fontWeight:700,color:"#f59e0b",background:"rgba(245,158,11,0.10)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:4,padding:"1px 6px",cursor:"pointer"}}>En attente {(row as any)._on_hold_reason?"💬":""}</button>}</div>{(row as any).sent_by_name&&<span style={{fontSize:9,color:"#818cf8",fontWeight:600,whiteSpace:"nowrap",paddingLeft:8}}>via {(row as any).sent_by_name}</span>}</div></td>
                  <td style={tdCard}>{fmtDate(row.created_at)}</td>

                  {(() => { const rawExp = row.date_expedition?.slice(0,10) ?? ""; const today = new Date().toISOString().split("T")[0]; const expColor = rawExp && rawExp < today ? "#f87171" : rawExp && rawExp === today ? "#f59e0b" : undefined; return (
                  <td style={{...tdCard,cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();setEditingExpId(String(row.id));setEditingExpRect(rect);}}>
                    {row.date_expedition?<span style={{color:expColor,fontWeight:expColor?700:undefined}}>{new Date(row.date_expedition).toLocaleDateString("fr-FR")}</span>:<span style={{color:"#555",fontSize:11}}>— cliquer —</span>}
                    {editingExpId===String(row.id)&&editingExpRect&&(
                      <MiniCalendar value={row.date_expedition?String(row.date_expedition).slice(0,10):""} onSelect={date=>{patchRow(String(row.id),null,"date_expedition",date||null);saveCaseDateExpedition(String(row.id),date);setEditingExpId(null);}} onClose={()=>setEditingExpId(null)} rect={editingExpRect}/>
                    )}
                  </td>
                  ); })()}

                  <td style={{...tdCard,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                    {comesFromDm ? (
                      <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:6,background:(natureMeta?.color??"#fff")+"18",border:`1px solid ${(natureMeta?.color??"#fff")}44`,color:natureMeta?.color??"#fff",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{nat||"—"}</span>
                    ) : (
                      <select value={nat} onChange={e=>{const v=e.target.value;patchRow(String(row.id),null,"nature_du_travail",v);updateCaseNatureAction(String(row.id),v);}} style={{
                        padding:"2px 6px",border:`1px solid ${(natureMeta?.color??"#fff")}44`,background:(natureMeta?.color??"#fff")+"18",color:natureMeta?.color??"#fff",
                        fontSize:11,cursor:"pointer",borderRadius:6,fontWeight:700,outline:"none",
                        WebkitAppearance:"none",MozAppearance:"none",appearance:"none",
                        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E")`,
                        backgroundRepeat:"no-repeat",backgroundPosition:"right 4px center",paddingRight:"14px",
                        textAlign:"center",textAlignLast:"center",
                      }}>
                        {DR_NATURE_OPTIONS.map(o=>(
                          <option key={o.value} value={o.value} style={{background:"#111",color:o.color,fontWeight:600}}>{o.value}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td style={isDrOnly?disabledCellStyle:tdCard}>{isDrOnly?"⊘":<BoolReadOnly value={dm.design_chassis??null}/>}</td>
                  <td style={isDrOnly?disabledCellStyle:tdCard}>{isDrOnly?"⊘":<DateTimeCell value={dm.design_chassis_at??null}/>}</td>

                  <td style={tdCard} onClick={e=>e.stopPropagation()}>
                    {(() => {
                      const val = effectiveTypeDents || "";
                      const meta = TYPE_DENTS_OPTIONS.find(o=>o.value===val) ?? {color:"#555"};
                      if (comesFromDm || isProvisoire || isDeflex) {
                        // Lecture seule si le cas vient de DM, Provisoire Résine ou Deflex
                        const displayVal = val || "Dents usinées";
                        const displayMeta = TYPE_DENTS_OPTIONS.find(o=>o.value===displayVal) ?? TYPE_DENTS_OPTIONS[0];
                        return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:6,background:displayMeta.color+"12",border:`1px solid ${displayMeta.color}30`,color:displayMeta.color,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{displayVal}</span>;
                      }
                      return (
                        <select value={val} onChange={e=>{const v=e.target.value;patchRow(String(row.id),"sector_design_resine","type_de_dents",v);saveText(String(row.id),"type_de_dents",v);}} style={{
                          padding:"4px 8px",border:`1px solid ${val?meta.color+"44":"#f5971844"}`,background:val?meta.color+"15":"transparent",color:val?meta.color:"#888",
                          fontSize:12,cursor:"pointer",borderRadius:4,minWidth:110,fontWeight:600,outline:"none",
                        }}>
                          {!val && <option value="" style={{background:"#111",color:"#888"}}>— Choisir —</option>}
                          {TYPE_DENTS_OPTIONS.map(o=>(
                            <option key={o.value} value={o.value} style={{background:"#111",color:o.color,fontWeight:600}}>{o.value}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </td>

                  <td style={tdCard}>
                    <button onClick={e=>{e.stopPropagation();saveBool(String(row.id),"design_dents_resine",Boolean(dr.design_dents_resine));}}
                      style={{background:dr.design_dents_resine?"rgba(74,222,128,0.15)":"transparent",border:dr.design_dents_resine?"1px solid rgba(74,222,128,0.4)":"1px solid #ffffff",padding:"3px 8px",cursor:"pointer",color:dr.design_dents_resine?"#4ade80":"transparent",width:36,height:26,borderRadius:6,fontWeight:700,fontSize:13}}>
                      {dr.design_dents_resine?"✓":""}
                    </button>
                  </td>

                  <td style={tdCard}><DateTimeCell value={dr.design_dents_resine_at??null}/></td>
                  <td style={tdCard} onClick={e=>e.stopPropagation()}><TextInput value={dr.nb_blocs_de_dents??null} onSave={v=>{patchRow(String(row.id),"sector_design_resine","nb_blocs_de_dents",v||null);saveText(String(row.id),"nb_blocs_de_dents",v);}} width={60}/></td>
                  <td style={tdCard}><ModeleIndicator
                    ok={modeleOk}
                    locked={!isDrOnly}
                    onToggle={()=>{const newVal=!modeleOk;patchRow(String(row.id),"sector_design_resine","modele_a_realiser_ok",newVal);const fd=new FormData();fd.set("case_id",String(row.id));fd.set("column","modele_a_realiser_ok");fd.set("kind","boolean");fd.set("current",String(modeleOk));saveDesignResineCellAction(fd);}}
                  /></td>
                  <td style={tdCard} onClick={e=>e.stopPropagation()}><TextInput value={teintes} onSave={v=>{const val=v||dm.teintes_associees||null;patchRow(String(row.id),"sector_design_resine","teintes_associees",val);saveText(String(row.id),"teintes_associees",val??"");}} width={120}/></td>

                  {/* Base — uniquement pour Deflex / Complet */}
                  <td style={needsBase ? tdCard : disabledCellStyle} onClick={e=>{if(needsBase)e.stopPropagation();}}>
                    {needsBase ? (() => {
                      const val = dr.base_type ?? (isDeflex ? "Usinée" : "");
                      const meta = BASE_OPTIONS.find(o=>o.value===val) ?? {color:"#555"};
                      if (isDeflex) {
                        const displayMeta = BASE_OPTIONS.find(o=>o.value===val) ?? BASE_OPTIONS[1];
                        return <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:6,background:displayMeta.color+"12",border:`1px solid ${displayMeta.color}30`,color:displayMeta.color,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{val}</span>;
                      }
                      return (
                        <select value={val} onChange={e=>{const v=e.target.value;patchRow(String(row.id),"sector_design_resine","base_type",v);saveText(String(row.id),"base_type",v);}} style={{
                          padding:"4px 8px",border:`1px solid ${val?meta.color+"44":"#f5971844"}`,background:val?meta.color+"15":"transparent",color:val?meta.color:"#888",
                          fontSize:12,cursor:"pointer",borderRadius:4,minWidth:90,fontWeight:600,outline:"none",
                        }}>
                          {!val && <option value="" style={{background:"#111",color:"#888"}}>— Choisir —</option>}
                          {BASE_OPTIONS.map(o=>(
                            <option key={o.value} value={o.value} style={{background:"#111",color:o.color,fontWeight:600}}>{o.value}</option>
                          ))}
                        </select>
                      );
                    })() : "⊘"}
                  </td>

                  <td style={tdCard} onClick={e=>e.stopPropagation()}>
                    {isOnHold ? (
                      <span style={{fontSize:10,color:"#f59e0b"}} title="En attente">⏸</span>
                    ) : (
                    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:8,background:isC?"rgba(74,222,128,0.18)":"#181818",border:"1.5px solid rgba(255,255,255,0.85)",boxShadow:isC?"0 0 0 3px rgba(74,222,128,0.12)":"inset 0 0 0 1px rgba(255,255,255,0.03)",transition:"all 160ms ease"}}>
                      <input type="checkbox" checked={isC} onChange={e=>{const checked=e.target.checked;setCheckedIds(prev=>{const next=new Set(prev);checked?next.add(String(row.id)):next.delete(String(row.id));return next;});if(checked)autoFillOnSelect(row);}} style={{width:14,height:14,cursor:"pointer",accentColor:"#4ade80",margin:0}}/>
                    </div>
                    )}
                  </td>

                  <td style={tdCardLast}>
                    {!(isAdmin || !(row as any).created_by || (row as any).created_by === currentUserId) ? (
                      <span style={{fontSize:9,color:"#333"}} title="Seul le créateur peut supprimer">—</span>
                    ):(
                      <button onClick={e=>{e.stopPropagation();setConfirmDeleteId(String(row.id));}}
                        style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:6,border:"1px solid #3d3d3d",background:"transparent",color:"white",cursor:"pointer",transition:"all 150ms"}}
                        onMouseEnter={e=>{e.currentTarget.style.border="1px solid rgba(239,68,68,0.5)";e.currentTarget.style.background="rgba(239,68,68,0.1)";e.currentTarget.style.color="#f87171";}}
                        onMouseLeave={e=>{e.currentTarget.style.border="1px solid #3d3d3d";e.currentTarget.style.background="transparent";e.currentTarget.style.color="white";}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sortedRows.length===0&&<tr><td colSpan={17} style={{padding:16,color:"#555",fontSize:13,textAlign:"center"}}>Aucun dossier en cours.</td></tr>}
          </tbody>
        </table>
      </div>

      {confirmDeleteId && (() => {
        const row = rows.find(r => String(r.id) === confirmDeleteId);
        return (
          <DeleteConfirmModal
            caseNumber={row?.case_number ?? null}
            sectorLabel="Design Résine"
            onDeleteFromSector={() => handleDeleteFromSector(confirmDeleteId)}
            onDeleteFromAll={() => handleDeleteFromAll(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}
      {holdModalCaseId && (() => {
        const r = rows.find(r => String(r.id) === holdModalCaseId);
        return <OnHoldReasonModal caseNumber={r?.case_number ?? ""} onConfirm={(reason) => doToggleHold(holdModalCaseId, reason || null)} onCancel={() => setHoldModalCaseId(null)} />;
      })()}
      {reasonTooltip && (() => {
        const r = rows.find(r => String(r.id) === reasonTooltip.id);
        return <OnHoldReasonTooltip reason={(r as any)?._on_hold_reason} onHoldAt={(r as any)?._on_hold_at} anchorRect={reasonTooltip.rect} onClose={() => setReasonTooltip(null)} />;
      })()}
    </div>
  );
}
