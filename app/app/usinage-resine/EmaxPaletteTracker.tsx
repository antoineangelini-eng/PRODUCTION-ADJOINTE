"use client";
import ReactDOM from "react-dom";
import { useState, useRef, useEffect } from "react";

type ComboKey = string;
type Materiau = "CAMEO" | "EMPRESS";

const TEINTES: Record<Materiau, Record<string, string[]>> = {
  CAMEO: {
    HT: ["A1","A2","A3","A3,5","A4","B1","B2","B3","B4","BL1","BL2","BL3","BL4","C1","C2","C3","C4","D2","D3","D4"],
    LT: ["A1","A2","A3","A3,5","A4","B1","B2","B3","B4","BL1","BL2","BL3","BL4","C1","C2","C3","C4","D2","D3","D4"],
    MO: ["MO 0","MO 1","MO 2","MO 3","MO 4"],
    MT: ["A1","A2","A3","B1","BL2","BL3","BL4"],
  },
  EMPRESS: {
    HT:    ["A1","A2","A3","A3,5","B1","B2","B3","C2","D3"],
    LT:    ["A1","A2","A3","A3,5","B1","B2","B3","BL1","BL2","BL3","BL4","C2","D3"],
    Multi: ["A1","A2","A3","A3,5","B1","BL1","BL3"],
  },
};
const COLOR_GROUPS: Record<Materiau, string[]> = {
  CAMEO:   ["HT","LT","MO","MT"],
  EMPRESS: ["HT","LT","Multi"],
};
const ACC: Record<Materiau, string> = { CAMEO: "#9487a8", EMPRESS: "#f59e0b" };

function generateZPL(combos: Set<ComboKey>, code: string, mat: Materiau, cg: string, teinte: string) {
  const W = 456;
  const byPal = new Map<number, Set<number>>();
  for (const k of combos) { const [p,s]=k.split("-").map(Number); if(!byPal.has(p)) byPal.set(p,new Set()); byPal.get(p)!.add(s); }
  const pal=[...byPal.entries()].sort((a,b)=>a[0]-b[0]);
  const n=pal.length,big=n===1;
  const sw=big?44:32,sh=big?32:24,gx=big?7:5,gy=big?9:7,prW=big?64:46,pGap=big?12:8;
  const gW=3*sw+2*gx,gH=2*sh+gy,bW=gW+pGap+prW,tW=n===1?bW:2*bW+20,sX=Math.floor((W-tW)/2);
  const H=8+44+6+2+8+gH+10+44+8;
  let z=`^XA\n^PW${W}\n^LL${H}\n^CI28\n`,y=8;
  const fs=big?42:38;
  z+=`^FO10,${y}^A0N,${fs},${fs}^FD${code}^FS\n^FO${W-180},${y}^A0N,${fs},${fs}^FD${mat}^FS\n`;
  y+=44; z+=`^FO10,${y}^GB${W-20},2,2^FS\n`; y+=8;
  for(let i=0;i<pal.length;i++){
    const [p,sel]=pal[i],bx=sX+i*(bW+20),pfs=big?20:16;
    for(let s=0;s<6;s++){
      const r=Math.floor(s/3),c=s%3,sx=bx+c*(sw+gx),sy=y+r*(sh+gy),isSel=sel.has(s),num=String(s+1);
      if(isSel){z+=`^FO${sx},${sy}^GB${sw},${sh},${sh}^FS\n^FO${sx+Math.floor(sw/2)-5},${sy+Math.floor(sh/2)-8}^FR^A0N,${pfs},${pfs}^FD${num}^FS\n`;}
      else{if(r===0){z+=`^FO${sx},${sy}^GB2,${sh},2^FS\n^FO${sx},${sy}^GB${sw},2,2^FS\n^FO${sx+sw-2},${sy}^GB2,${sh},2^FS\n`;}
      else{z+=`^FO${sx},${sy}^GB2,${sh},2^FS\n^FO${sx},${sy+sh-2}^GB${sw},2,2^FS\n^FO${sx+sw-2},${sy}^GB2,${sh},2^FS\n`;}
      z+=`^FO${sx+Math.floor(sw/2)-5},${sy+Math.floor(sh/2)-8}^A0N,${pfs},${pfs}^FD${num}^FS\n`;}
    }
    const rx=bx+gW+pGap,pnS=big?34:26,pnY=y+Math.floor((gH-pnS)/2)+2,pnX=rx+Math.floor((prW-pnS*0.6)/2);
    z+=`^FO${rx},${y}^GB${prW},${gH},2^FS\n^FO${rx+4},${y+3}^A0N,${big?16:13},${big?16:13}^FDP^FS\n^FO${pnX},${pnY}^A0N,${pnS},${pnS}^FD${p+1}^FS\n`;
  }
  y+=gH+10;
  z+=`^FO10,${y}^GB${W-20},2,2^FS\n`; y+=8;
  let cx=15;
  if(cg){z+=`^FO${cx},${y}^GB64,28,28^FS\n^FR^FO${cx+6},${y+2}^A0N,22,22^FD${cg}^FS\n`; cx+=80;}
  if(teinte){z+=`^FO${cx},${y+2}^A0N,14,14^FDTeinte :^FS\n^FO${cx+64},${y}^A0N,28,28^FD${teinte}^FS\n`;}
  z+=`^XZ`; return z;
}

async function sendPrint(zpl: string) {
  const relayUrl = process.env.NEXT_PUBLIC_PRINT_RELAY_URL || "http://192.168.1.30:3001";
  const r=await fetch(`${relayUrl}/print`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({zpl, printerIp:"192.168.1.12"})});
  const j=await r.json(); if(!j.ok) throw new Error(j.error??"Erreur");
}

function Step({ n, done, accent }: { n: number; done: boolean; accent: string }) {
  return (
    <span style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,transition:"all 200ms",
      background: done ? accent : "#252525",
      border: done ? `1px solid ${accent}` : "1px solid #444",
      color: done ? "#000" : "#fff" }}>
      {n}
    </span>
  );
}

function SectionLabel({ children, done, accent }: { children: string; done: boolean; accent: string }) {
  return <span style={{ fontSize:11,fontWeight:800,letterSpacing:"0.07em",textTransform:"uppercase" as const,color: done ? accent : "#ccc",transition:"color 200ms" }}>{children}</span>;
}

function SmartTeinte({ value, options, onChange, accent }: {
  value: string; options: string[]; onChange: (v: string) => void; accent: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const done = !!value;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      e.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Estimate grid height: 2 cols, ~36px per row
      const rows = Math.ceil(options.length / 2);
      const dropH = rows * 36 + 20;
      const top = r.bottom + dropH > window.innerHeight ? r.top - dropH - 4 : r.bottom + 4;
      setPos({ top, left: r.left, width: r.width });
    }
    setOpen(o => !o);
  }

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
        <Step n={4} done={done} accent={accent} />
        <SectionLabel done={done} accent={accent}>Teinte</SectionLabel>
        {done && <span style={{ marginLeft:"auto",fontSize:12,fontWeight:800,color:accent }}>{value}</span>}
      </div>

      {/* Bouton fermé */}
      <button ref={btnRef} onClick={handleOpen}
        style={{ width:"100%",padding:"9px 30px 9px 12px",fontSize:13,fontWeight:done?700:400,
          borderRadius:8,textAlign:"left" as const,position:"relative",cursor:"pointer",transition:"all 150ms",
          border: open ? `1px solid ${accent}88` : done ? `1px solid ${accent}55` : "1px solid #3a3a3a",
          background: done ? `${accent}10` : "#1a1a1a",
          color: done ? "#fff" : "#888", boxSizing:"border-box" as const }}>
        {done ? value : "— Choisir une teinte —"}
        <svg viewBox="0 0 10 6" width="9" height="9" fill="none" stroke={done?accent:"#666"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{position:"absolute",right:11,top:"50%",transform:`translateY(-50%) rotate(${open?"180deg":"0deg"})`,transition:"transform 150ms",pointerEvents:"none"}}>
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </button>

      {/* Dropdown portal — grille 2 colonnes, tout visible sans scroll */}
      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div ref={portalRef} onMouseDown={e=>e.stopPropagation()}
          style={{ position:"fixed",top:pos.top,left:pos.left,width:Math.max(pos.width,200),
            background:"#161616",border:`1px solid ${accent}50`,borderRadius:10,
            overflow:"hidden",zIndex:99999,boxShadow:"0 12px 40px rgba(0,0,0,0.75)" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
            {options.map((o, i) => {
              const isLast = i === options.length - 1;
              const isSel  = value === o;
              const isRight = i % 2 === 1;
              const isBottomRow = i >= options.length - (options.length % 2 === 0 ? 2 : 1);
              return (
                <button key={o} onMouseDown={e=>{e.stopPropagation();onChange(o);setOpen(false);}}
                  onMouseEnter={e => { if(!isSel) { (e.currentTarget as HTMLButtonElement).style.background=`${accent}10`; (e.currentTarget as HTMLButtonElement).style.color="#fff"; } }}
                  onMouseLeave={e => { if(!isSel) { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.color="#ddd"; } }}
                  style={{ padding:"9px 12px",cursor:"pointer",fontWeight:isSel?800:400,fontSize:13,
                    textAlign:"left" as const,transition:"background 100ms, color 100ms",
                    borderRight: isRight ? "none" : `0.5px solid ${accent}20`,
                    borderBottom: isBottomRow && !(isLast && options.length%2!==0) ? "none" : `0.5px solid ${accent}20`,
                    background: isSel ? `${accent}18` : "transparent",
                    color: isSel ? accent : "#ddd",
                    border: isSel ? `none` : undefined,
                    outline: "none",
                    boxSizing:"border-box" as const }}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function EmaxPaletteTracker() {
  const [code,    setCode]   = useState("");
  const [mat,     setMat]    = useState<Materiau|"">("");
  const [cg,      setCg]     = useState("");
  const [teinte,  setTeinte] = useState("");
  const [pals,    setPals]   = useState<Set<number>>(new Set());
  const [combos,  setCombos] = useState<Set<ComboKey>>(new Set());
  const [printing,setPrinting] = useState(false);
  const [attempted,setAttempted] = useState(false);

  const accent = mat ? ACC[mat] : "#888";
  const canPrint = !!(combos.size && code.trim() && mat && cg && teinte);

  function pickMat(m: Materiau) { setMat(p=>p===m?"":m); setCg(""); setTeinte(""); }
  function pickCg(g: string)    { setCg(p=>p===g?"":g); setTeinte(""); }
  function clickPal(p: number)  { setPals(prev=>{const n=new Set(prev);if(n.has(p)){n.delete(p);setCombos(sc=>{const ns=new Set(sc);for(const k of ns)if(k.startsWith(`${p}-`))ns.delete(k);return ns;});}else if(n.size<2)n.add(p);return n;}); }
  function clickSlot(p: number, s: number) { const k=`${p}-${s}`; setCombos(prev=>{const n=new Set(prev);if(n.has(k))n.delete(k);else n.add(k);return n;}); }

  async function handlePrint() {
    setAttempted(true);
    if(!canPrint||printing) return;
    setPrinting(true);
    try { await sendPrint(generateZPL(combos,code.trim(),mat as Materiau,cg,teinte)); }
    catch(e:any){ alert("Erreur : "+e.message); }
    finally { setPrinting(false); }
    setCombos(new Set()); setPals(new Set());
    setCode(""); setMat(""); setCg(""); setTeinte(""); setAttempted(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if(e.key==="Enter") handlePrint(); }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[canPrint,printing,combos,code,mat,cg,teinte]);

  const sorted = [...pals].sort((a,b)=>a-b);
  const cgOpts = mat ? COLOR_GROUPS[mat] : ["HT","LT","MO","MT"];
  const tOpts  = mat&&cg ? (TEINTES[mat as Materiau]?.[cg]??[]) : [];

  // Shared styles
  const row: React.CSSProperties = { display:"flex",alignItems:"center",gap:8,marginBottom:8 };
  const pill = (active: boolean, color: string): React.CSSProperties => ({
    padding:"7px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,transition:"all 150ms",
    border: active ? `2px solid ${color}` : "1px solid #3a3a3a",
    background: active ? `${color}18` : "#1a1a1a",
    color: active ? color : "#ccc",
  });
  const gridBtn = (active: boolean, color: string): React.CSSProperties => ({
    padding:"9px 0",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:13,transition:"all 150ms",
    border: active ? `2px solid ${color}` : "1px solid #3a3a3a",
    background: active ? `${color}18` : "#1a1a1a",
    color: active ? color : "#ddd",
  });

  const connector = (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:10,margin:"2px 0" }}>
      <div style={{ width:1,height:"100%",background:"#2a2a2a" }}/>
    </div>
  );

  return (
    <div style={{ padding:"12px 0",fontFamily:"inherit" }}
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handlePrint();}}}>

      <div style={{ display:"flex",gap:16,alignItems:"flex-start" }}>

        {/* ── Colonne gauche ─────────────────────────────────────── */}
        <div style={{ display:"flex",flexDirection:"column",gap:0,flex:"0 0 260px" }}>

          {/* 1. N° Cas */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${code?"#3a3a3a":"#2a2a2a"}` }}>
            <div style={row}>
              <Step n={1} done={!!code} accent="#e0e0e0" />
              <SectionLabel done={!!code} accent="#e0e0e0">N° Cas</SectionLabel>
              {code && <span style={{ marginLeft:"auto",fontSize:12,fontWeight:800,color:"#fff" }}>{code}</span>}
            </div>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Numéro du dossier..." maxLength={10} autoFocus
              style={{ width:"100%",padding:"8px 12px",fontSize:13,fontWeight:code?700:400,borderRadius:7,border:code?"1px solid #444":"1px solid #333",background:"#1a1a1a",color:"#fff",outline:"none",boxSizing:"border-box" as const }} />
          </div>

          {connector}

          {/* 2. Matériau */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${mat?accent+"55":"#2a2a2a"}`,transition:"border-color 200ms" }}>
            <div style={{ ...row, marginBottom:10 }}>
              <Step n={2} done={!!mat} accent={accent} />
              <SectionLabel done={!!mat} accent={accent}>Matériau</SectionLabel>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              {(["CAMEO","EMPRESS"] as Materiau[]).map(m=>(
                <button key={m} onClick={()=>pickMat(m)} style={{ flex:1,...pill(mat===m,ACC[m]) }}>{m}</button>
              ))}
            </div>
          </div>

          {connector}

          {/* 3. Color Group */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${cg?accent+"55":"#2a2a2a"}`,transition:"all 200ms",opacity:!mat?0.45:1,pointerEvents:!mat?"none":"auto" as any }}>
            <div style={{ ...row, marginBottom:10 }}>
              <Step n={3} done={!!cg} accent={accent} />
              <SectionLabel done={!!cg} accent={accent}>Color Group</SectionLabel>
              {cg && <span style={{ marginLeft:"auto",fontSize:11,fontWeight:800,color:accent,background:`${accent}15`,border:`1px solid ${accent}35`,borderRadius:5,padding:"2px 9px" }}>{cg}</span>}
            </div>
            <div style={{ display:"flex",gap:7,flexWrap:"wrap" as const }}>
              {cgOpts.map(g=>(
                <button key={g} onClick={()=>mat&&pickCg(g)} style={{ ...pill(cg===g,accent),opacity:!mat?0.4:1,cursor:mat?"pointer":"not-allowed" }}>{g}</button>
              ))}
            </div>
          </div>

          {connector}

          {/* 4. Teinte */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${teinte?accent+"55":"#2a2a2a"}`,transition:"border-color 200ms",opacity:!cg?0.5:1 }}>
            <SmartTeinte value={teinte} options={tOpts} onChange={setTeinte} accent={cg?accent:"#888"} />
          </div>

        </div>

        {/* ── Flèche centrale ─────────────────────────────────────── */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 24px",paddingTop:60 }}>
          <svg viewBox="0 0 14 24" width="14" height="24" fill="none" stroke={canPrint?accent:"#333"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition:"stroke 300ms" }}>
            <path d="M2 2l10 10L2 22"/>
          </svg>
        </div>

        {/* ── Colonne droite ─────────────────────────────────────── */}
        <div style={{ display:"flex",flexDirection:"column",gap:0,flex:"0 0 190px" }}>

          {/* 5. Palette */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${pals.size?"#3a3a3a":"#2a2a2a"}` }}>
            <div style={{ ...row, marginBottom:10 }}>
              <Step n={5} done={pals.size>0} accent={accent} />
              <SectionLabel done={pals.size>0} accent={accent}>Palette</SectionLabel>
              <span style={{ marginLeft:"auto",fontSize:8,color:"#555",letterSpacing:"0.04em" }}>multi-sél.</span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
              {Array.from({length:6},(_,p)=>{
                const isA=pals.has(p),dis=!isA&&pals.size>=2;
                return <button key={p} onClick={()=>!dis&&clickPal(p)} style={{ ...gridBtn(isA,accent),opacity:dis?0.2:1,cursor:dis?"not-allowed":"pointer" }}>P{p+1}</button>;
              })}
            </div>
          </div>

          {connector}

          {/* 6. Emplacement */}
          <div style={{ padding:"12px 14px",borderRadius:10,background:"#141414",border:`1px solid ${combos.size?"#3a3a3a":"#2a2a2a"}` }}>
            <div style={{ ...row, marginBottom:10 }}>
              <Step n={6} done={combos.size>0} accent={accent} />
              <SectionLabel done={combos.size>0} accent={accent}>Emplacement</SectionLabel>
            </div>
            {sorted.length===0 && (
              <div style={{ fontSize:10,color:"#555",textAlign:"center" as const,padding:"12px 0" }}>← Choisir une palette</div>
            )}
            {sorted.map(p=>(
              <div key={p} style={{ marginBottom:8 }}>
                <div style={{ fontSize:8,fontWeight:700,color:accent,letterSpacing:"0.08em",marginBottom:5 }}>PALETTE {p+1}</div>
                {[0,3].map(rs=>(
                  <div key={rs} style={{ display:"flex",gap:5,marginBottom:5 }}>
                    {[0,1,2].map(off=>{
                      const s=rs+off,k=`${p}-${s}`,isSel=combos.has(k);
                      return <button key={s} onClick={()=>clickSlot(p,s)} style={{ flex:1,...gridBtn(isSel,accent) }}>{s+1}</button>;
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {connector}

          {/* Champs manquants */}
          {attempted && !canPrint && (
            <div style={{ fontSize:10,color:"#888",padding:"6px 10px",borderRadius:7,background:"#0e0e0e",border:"1px solid #222",lineHeight:1.6 }}>
              {!code && <div style={{ color:"#f87171" }}>↑ N° cas manquant</div>}
              {!mat  && <div style={{ color:"#f87171" }}>↑ Matériau non choisi</div>}
              {mat && !cg && <div style={{ color:"#f87171" }}>↑ Color group manquant</div>}
              {cg && !teinte && <div style={{ color:"#f87171" }}>↑ Teinte manquante</div>}
              {!combos.size && <div style={{ color:"#f87171" }}>↑ Emplacement non sélectionné</div>}
            </div>
          )}

          {/* Bouton imprimer */}
          <button disabled={!canPrint||printing} onClick={handlePrint}
            style={{ width:"100%",padding:"14px 0",borderRadius:10,fontSize:14,fontWeight:900,letterSpacing:"0.04em",cursor:!canPrint||printing?"not-allowed":"pointer",transition:"all 200ms",
              border: canPrint ? `2px solid ${accent}` : "1px solid #2e2e2e",
              background: canPrint ? `${accent}20` : "#141414",
              color: canPrint ? accent : "#555",
              boxShadow: canPrint ? `0 0 20px ${accent}20` : "none" }}>
            {printing ? "Impression..." : "🖨 Imprimer"}
          </button>

        </div>
      </div>

      {/* ── Récap ────────────────────────────────────────────────── */}
      {(mat||cg||teinte) && (
        <div style={{ marginTop:14,padding:"16px 20px",borderRadius:12,background:"#0e0e0e",border:`1px solid ${canPrint?accent+"50":"#2e2e2e"}`,display:"inline-flex",flexDirection:"column" as const,gap:12,minWidth:260,transition:"border-color 300ms" }}>

          {/* Titre avec séparateur + N° cas */}
          <div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span style={{ fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase" as const,color:canPrint?accent:"#888" }}>Récapitulatif</span>
              {code && <span style={{ fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"0.02em" }}>#{code}</span>}
            </div>
            <div style={{ height:1,background:canPrint?`${accent}30`:"#222",marginTop:6 }}/>
          </div>

          {/* Matériau + Color Group + Teinte — même hauteur, centré */}
          {(mat||cg||teinte) && (
            <div style={{ display:"flex",alignItems:"stretch",gap:1 }}>
              {[
                { key:"mat",   label:"Matériau", show:!!mat,   val:mat,
                  valStyle:{ fontSize:15,fontWeight:900,color:accent } },
                { key:"cg",    label:"Group",    show:!!cg,    val:cg,
                  valStyle:{ fontSize:13,fontWeight:800,color:`${accent}dd`,background:`${accent}12`,border:`1px solid ${accent}30`,borderRadius:6,padding:"3px 10px" } },
                { key:"teinte",label:"Teinte",   show:!!teinte,val:teinte,
                  valStyle:{ fontSize:19,fontWeight:900,color:"#fff" } },
              ].map((item,i) => !item.show ? null : (
                <div key={item.key} style={{ display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"space-between",gap:0,
                  padding:"0 14px", borderRight: i<2 && (cg||teinte) ? "1px solid #1e1e1e" : "none",
                  flex:1 }}>
                  <span style={{ fontSize:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" as const,color:"#e0e0e0",whiteSpace:"nowrap" as const }}>{item.label}</span>
                  <span style={{ marginTop:6,...item.valStyle,lineHeight:1 }}>{item.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* N° cas + emplacements */}
          {(code||combos.size>0) && (
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const,alignItems:"center",justifyContent:"center",paddingTop:4,borderTop:"1px solid #1e1e1e" }}>
              {[...combos].sort().map(k=>{
                const[pp,ss]=k.split("-").map(Number);
                return <span key={k} style={{ fontSize:11,fontWeight:700,color:accent,background:`${accent}10`,border:`1px solid ${accent}30`,borderRadius:6,padding:"4px 12px",textAlign:"center" as const }}>P{pp+1} · E{ss+1}</span>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
