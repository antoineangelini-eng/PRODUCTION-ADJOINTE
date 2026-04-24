"use client";
import React, { useRef, useState, useEffect } from "react";
import { resolveCaseForFinition, scanFinitionReceptionAction } from "@/app/app/finition/actions";

// Mapping AZERTY non-shifté → chiffre (même table que CaseNumberInput)
const AZERTY_MAP: Record<string, string> = {
  "&": "1", "é": "2", "\"": "3", "'": "4", "(": "5",
  "-": "6", "è": "7", "_": "8", "ç": "9", "à": "0",
  "É": "2", "È": "7", "Ç": "9", "À": "0",
};
function normalizeAzerty(v: string): string {
  return v.split("").map(ch => AZERTY_MAP[ch] ?? ch).join("").toUpperCase();
}

type ScannedCase = {
  caseNumber: string;
  caseId: string;
};

type ScanError = {
  caseNumber: string;
  reason: "notfound" | "duplicate";
  message?: string;
};

export function FinitionScanner({
  onValidated,
  validatedToday = 0,
  totalToday = 0,
  late = 0,
  receptionMode = "metal",
  onReceptionModeChange,
}: {
  onValidated?: () => void;
  validatedToday?: number;
  totalToday?: number;
  late?: number;
  receptionMode?: "metal" | "resine";
  onReceptionModeChange?: (mode: "metal" | "resine") => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [lastScan, setLastScan] = useState<{ caseNumber: string; status: "ok" | "notfound" | "duplicate" } | null>(null);
  const [scanned, setScanned] = useState<ScannedCase[]>([]);
  const [errors, setErrors] = useState<ScanError[]>([]);

  // Refocus uniquement si le focus reste dans le panneau scanner
  useEffect(() => {
    const el = inputRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    function handleBlur() {
      setTimeout(() => {
        const active = document.activeElement;
        if (container && container.contains(active)) return;
        if (active && active.tagName === "BUTTON") return;
        if (container && container.contains(document.activeElement)) return;
      }, 0);
    }
    el.addEventListener("blur", handleBlur);
    el.focus();
    return () => el.removeEventListener("blur", handleBlur);
  }, []);

  async function handleScan(raw: string) {
    const caseNumber = raw.trim();
    if (!caseNumber || pending) return;
    setPending(true);
    setValue("");

    try {
      const cas = await resolveCaseForFinition(caseNumber);
      if (!cas) {
        setLastScan({ caseNumber, status: "notfound" });
        setErrors(prev => [{ caseNumber, reason: "notfound" }, ...prev.slice(0, 4)]);
        setPending(false);
        return;
      }

      const field = receptionMode === "metal" ? "reception_metal_ok" : "reception_resine_ok";
      const result = await scanFinitionReceptionAction(cas.id, field);
      if (!result.ok) {
        setLastScan({ caseNumber, status: "notfound" });
        setErrors(prev => [{ caseNumber, reason: "notfound" as const, message: result.error }, ...prev.slice(0, 4)]);
        setPending(false);
        return;
      }

      if (result.autoValidated) {
        setLastScan({ caseNumber, status: "ok" });
        setScanned(prev => [...prev, { caseNumber, caseId: cas.id }]);
      } else {
        setLastScan({ caseNumber, status: "ok" });
        setScanned(prev => [...prev, { caseNumber, caseId: cas.id }]);
      }
      onValidated?.();
    } catch {
      setLastScan({ caseNumber, status: "notfound" });
      setErrors(prev => [{ caseNumber, reason: "notfound" }, ...prev.slice(0, 4)]);
    }
    setPending(false);
  }

  const pct = totalToday > 0 ? Math.round((validatedToday / totalToday) * 100) : 0;
  const feedbackColor = lastScan?.status === "ok" ? "#4ade80" : lastScan?.status === "duplicate" ? "#f59e0b" : "#f87171";
  const feedbackText = lastScan
    ? `${lastScan.caseNumber} — ${lastScan.status === "ok" ? "ajouté" : lastScan.status === "duplicate" ? "déjà scanné" : "introuvable"}`
    : "";

  return (
    <div ref={containerRef} style={{ display:"flex", flexDirection:"column", height:"100%" }}>

      {/* Stats */}
      <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid #1a1a1a" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:38, fontWeight:800, color:"white", lineHeight:1 }}>{validatedToday}</span>
            <span style={{ fontSize:13, color:"white" }}>/ {totalToday} aujourd'hui</span>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color: pct === 100 ? "#4ade80" : "white" }}>
            {totalToday > 0 ? `${pct}%` : ""}
          </span>
        </div>
        {totalToday > 0 && (
          <div style={{ height:4, background:"#1a1a1a", borderRadius:99, overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:"#4ade80", transition:"width 600ms ease" }} />
          </div>
        )}
        {late === 0 && totalToday > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.15)" }}>
            <span style={{ fontSize:12, color:"#4ade80" }}>✓ Aucun retard</span>
          </div>
        )}
      </div>

      {/* Mode réception + Scanner */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1a1a1a" }}>
        {/* Sélecteur mode réception */}
        <div style={{ display:"flex", gap:2, background:"#111", borderRadius:8, border:"1px solid #333", padding:2, marginBottom:12 }}>
          {(["metal","resine"] as const).map(mode => {
            const active = receptionMode === mode;
            return (
              <button key={mode} onClick={() => onReceptionModeChange?.(mode)} style={{
                flex:1, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer",
                borderRadius:6, border:"none",
                background: active ? (mode === "metal" ? "rgba(96,165,250,0.15)" : "rgba(168,85,247,0.15)") : "transparent",
                color: active ? (mode === "metal" ? "#60a5fa" : "#a855f7") : "#666",
                transition:"all 150ms",
              }}>
                {mode === "metal" ? "Réception métal" : "Réception résine"}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize:10, fontWeight:700, color: receptionMode === "metal" ? "#60a5fa" : "#a855f7", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
          Scanner réception {receptionMode === "metal" ? "métal" : "résine"}
        </div>

        {/* Feedback hauteur fixe — ne bouge pas */}
        <div style={{ height:28, display:"flex", alignItems:"center", marginBottom:8 }}>
          {lastScan && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600 }}>
              <span style={{ fontSize:10, color: feedbackColor }}>{lastScan.status === "ok" ? "●" : "✕"}</span>
              <span style={{ color: feedbackColor }}>{feedbackText}</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ position:"relative" }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(normalizeAzerty(e.target.value))}
            onKeyDown={e => { if (e.key === "Enter") handleScan(value); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={pending}
            placeholder={focused ? "Scanner..." : "Cliquer pour activer"}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{
              width:"100%", boxSizing:"border-box",
              padding:"13px 44px 13px 16px",
              background: focused ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
              border:`1px solid ${focused ? "rgba(74,222,128,0.5)" : "#2a2a2a"}`,
              borderRadius:10, color:"white", fontSize:14,
              outline:"none", transition:"border-color 200ms", cursor:"text",
            }}
          />
          <div style={{
            position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
            fontSize:10, fontWeight:700, letterSpacing:"0.05em",
            color: pending ? "#f59e0b" : focused ? "#4ade80" : "#aaa",
          }}>
            {pending ? "⟳" : focused ? "ACTIF" : "INACTIF"}
          </div>
        </div>
      </div>

      {/* File d'attente + erreurs */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 20px", display:"flex", flexDirection:"column", gap:12 }}>

        {scanned.length === 0 && errors.length === 0 && (
          <div style={{ fontSize:12, color:"white", textAlign:"center", paddingTop:8 }}>
            Scannez des cas pour enregistrer la réception
          </div>
        )}

        {scanned.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Scannés — {scanned.length}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {scanned.slice().reverse().map(s => (
                <div key={s.caseId} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"6px 10px", borderRadius:6, fontSize:12,
                  background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)",
                }}>
                  <span style={{ fontSize:8, color:"#4ade80" }}>●</span>
                  <span style={{ color:"white", fontWeight:600 }}>{s.caseNumber}</span>
                  <span style={{ fontSize:10, color:"#4ade80", marginLeft:"auto" }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              Erreurs
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {errors.slice(0, 5).map((e, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"5px 10px", borderRadius:5, fontSize:12,
                  borderLeft:`2px solid ${e.reason === "duplicate" ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                  opacity: Math.max(0.3, 1 - i * 0.2),
                }}>
                  <span style={{ fontSize:10, color: e.reason === "duplicate" ? "#f59e0b" : "#f87171" }}>✕</span>
                  <span style={{ color:"white" }}>{e.caseNumber}</span>
                  <span style={{ fontSize:10, color:"#aaa" }}>{e.message ?? (e.reason === "duplicate" ? "déjà scanné" : "introuvable")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{ padding:"10px 20px", borderTop:"1px solid #1a1a1a", display:"flex", gap:12, flexWrap:"wrap" }}>
        {[{ color:"#f87171", label:"Retard" }, { color:"#f59e0b", label:"Aujourd'hui" }, { color:"#4ade80", label:"Validé" }].map(({ color, label }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"white" }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:color, flexShrink:0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
