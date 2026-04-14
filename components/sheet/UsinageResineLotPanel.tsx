"use client";
import { useState, useRef } from "react";
import {
  resolveCaseForLotUR,
  saveUsinageResineLotAction,
  type LotCaseUR,
  type LotSaveRow,
  type LotSaveResult,
} from "@/app/app/usinage-resine/lot-actions";

const MACHINE_OPTIONS = [
  { value: "PM1", color: "#818cf8" },
  { value: "PM2", color: "#22d3ee" },
  { value: "PM3", color: "#f472b6" },
  { value: "PM4", color: "#fb923c" },
];

const TYPE_DENTS_OPTIONS = [
  { value: "Dents usiner",      color: "#818cf8" },
  { value: "Dents du commerce", color: "#fb923c" },
];

const NATURE_COLORS: Record<string, string> = {
  "Chassis Argoat":    "#4ade80",
  "Chassis Dent All":  "#22d3ee",
  "Définitif Résine":  "#f472b6",
  "Provisoire Résine": "#c084fc",
};

const inputStyle = (focused: boolean): React.CSSProperties => ({
  padding: "5px 10px", border: focused ? "1px solid #4ade80" : "1px solid transparent",
  background: focused ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.05)",
  color: "white", fontSize: 12, borderRadius: 6, outline: "none",
  transition: "all 150ms", width: "100%", boxSizing: "border-box" as const,
});

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, color: "white", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <input value={value} placeholder={placeholder ?? "—"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => onChange(e.target.value)} style={inputStyle(focused)} />
    </div>
  );
}

function FieldSelectMachine({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const meta = MACHINE_OPTIONS.find(o => o.value === value) ?? { color: "#555" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, color: "white", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "5px 28px 5px 10px", border: `1px solid ${meta.color}50`, background: meta.color + "15", color: meta.color || "#888", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none", width: "100%" }}>
          <option value="" style={{ background: "#111", color: "#555" }}>—</option>
          {MACHINE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#111", color: o.color, fontWeight: 600 }}>{o.value}</option>)}
        </select>
        <svg viewBox="0 0 10 6" width="10" height="10" style={{ position: "absolute", right: 9, pointerEvents: "none", opacity: 0.7 }} fill="none" stroke={meta.color || "#555"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4"/></svg>
      </div>
    </div>
  );
}

type LotFields = {
  type_de_dents: string;
  nb_blocs: string;
  teintes: string;
  usinage: boolean;
  machine: string;
  disque: string;
};

function caseToFields(c: LotCaseUR): LotFields {
  return {
    type_de_dents: c.ur_type_de_dents_override ?? c.dr_type_de_dents ?? "",
    nb_blocs:      c.ur_nb_blocs_override      ?? c.dr_nb_blocs      ?? "",
    teintes:       c.ur_teintes_override        ?? c.dr_teintes       ?? "",
    usinage:       c.ur_usinage_dents_resine    ?? false,
    machine:       c.ur_identite_machine        ?? "",
    disque:        c.ur_numero_disque           ?? "",
  };
}

export function UsinageResineLotPanel({ onSaved }: { onSaved?: (savedIds: string[]) => void }) {
  const [open, setOpen]           = useState(false);
  const [scanVal, setScanVal]     = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning]   = useState(false);
  const [cases, setCases]         = useState<LotCaseUR[]>([]);
  const [fields, setFields]       = useState<Record<string, LotFields>>({});
  const [saving, setSaving]       = useState(false);
  const [results, setResults]     = useState<LotSaveResult[] | null>(null);
  const [globalFields, setGlobalFields] = useState<Partial<LotFields>>({});
  const scanRef = useRef<HTMLInputElement>(null);

  async function handleAddCase() {
    const num = scanVal.trim();
    if (!num) return;
    if (cases.find(c => c.case_number === num)) { setScanError("Déjà dans le lot"); return; }
    setScanning(true); setScanError(null);
    try {
      const c = await resolveCaseForLotUR(num);
      if (!c) { setScanError("Introuvable"); return; }
      setCases(prev => [...prev, c]);
      setFields(prev => ({ ...prev, [c.id]: caseToFields(c) }));
      setScanVal("");
      scanRef.current?.focus();
    } catch (e: any) { setScanError(e.message); }
    finally { setScanning(false); }
  }

  function updateCaseField(caseId: string, key: keyof LotFields, value: any) {
    setFields(prev => ({ ...prev, [caseId]: { ...prev[caseId], [key]: value } }));
  }

  function applyGlobalField(key: keyof LotFields, value: any) {
    setGlobalFields(prev => ({ ...prev, [key]: value }));
    setFields(prev => { const next = { ...prev }; Object.keys(next).forEach(id => { next[id] = { ...next[id], [key]: value }; }); return next; });
  }

  function removeCase(caseId: string) {
    setCases(prev => prev.filter(c => c.id !== caseId));
    setFields(prev => { const n = { ...prev }; delete n[caseId]; return n; });
  }

  async function handleSave() {
    if (cases.length === 0 || saving) return;
    setSaving(true);
    const rows: LotSaveRow[] = cases.map(c => {
      const f = fields[c.id] ?? caseToFields(c);
      return {
        case_id: c.id, case_number: c.case_number,
        type_de_dents_override: f.type_de_dents || null,
        nb_blocs_override: f.nb_blocs || null,
        teintes_override: f.teintes || null,
        usinage_dents_resine: f.usinage,
        identite_machine: f.machine || null,
        numero_disque: f.disque || null,
      };
    });
    const res = await saveUsinageResineLotAction(rows);
    setResults(res);
    setSaving(false);
    const okIds = res.filter(r => r.ok).map(r => r.case_id);
    if (okIds.length > 0) {
      onSaved?.(okIds);
      setCases(prev => prev.filter(c => !okIds.includes(c.id)));
      setFields(prev => { const n = { ...prev }; okIds.forEach(id => delete n[id]); return n; });
      setTimeout(() => setOpen(false), 700);
    }
  }

  const okCount  = results?.filter(r => r.ok).length  ?? 0;
  const errCount = results?.filter(r => !r.ok).length ?? 0;
  const mouseDownOnPanel = useRef(false);

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: "9px 18px", border: "1px solid #818cf8", background: "transparent", color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, transition: "all 150ms" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(129,140,248,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
        Saisie en lot
      </button>

      {open && (
        <div onMouseDown={e => { mouseDownOnPanel.current = e.target !== e.currentTarget; }} onClick={e => { if (e.target === e.currentTarget && !mouseDownOnPanel.current) setOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "min(820px, 95vw)", height: "100%", background: "#0f0f0f", borderLeft: "1px solid #2a2a2a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Saisie en lot — Usinage Résine</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{cases.length} cas dans le lot</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "white", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Ajouter un cas</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={scanRef} value={scanVal} autoFocus placeholder="N° du cas..." onChange={e => { setScanVal(e.target.value); setScanError(null); }} onKeyDown={e => e.key === "Enter" && handleAddCase()} style={{ padding: "7px 10px", border: "1px solid #333", background: "transparent", color: "white", fontSize: 13, borderRadius: 6, outline: "none", width: 160 }} />
                <button onClick={handleAddCase} disabled={scanning} style={{ padding: "7px 14px", border: "1px solid #555", background: "transparent", color: "white", cursor: "pointer", fontSize: 12, borderRadius: 6 }}>{scanning ? "…" : "Ajouter"}</button>
                {scanError && <span style={{ fontSize: 12, color: "#f87171", alignSelf: "center" }}>✕ {scanError}</span>}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
              {cases.length === 0 && <div style={{ color: "#555", fontSize: 13, textAlign: "center", paddingTop: 40 }}>Aucun cas dans le lot</div>}

              {cases.length > 1 ? (
                <>
                  <div style={{ background: "#161620", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#818cf8", letterSpacing: 0.5, textTransform: "uppercase" }}>Appliquer à tous les cas</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 5, padding: "2px 10px", background: "rgba(129,140,248,0.1)" }}>{cases.length} cas</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                      <FieldSelectMachine label="Machine"     value={globalFields.machine  ?? ""} onChange={v => applyGlobalField("machine", v)} />
                      <FieldInput         label="N° disque"   value={globalFields.disque   ?? ""} onChange={v => applyGlobalField("disque", v)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 0 }}>
                    <div style={{ width: 20, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, paddingBottom: 4 }}>
                      <div style={{ width: 2, flex: 1, background: "rgba(129,140,248,0.2)", borderRadius: 1 }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, paddingBottom: 4 }}>
                      {cases.map(c => {
                        const f = fields[c.id] ?? caseToFields(c);
                        const natColor = NATURE_COLORS[c.nature_du_travail ?? ""] ?? "#aaa";
                        const res = results?.find(r => r.case_id === c.id);
                        return (
                          <div key={c.id} style={{ border: res?.ok ? "1px solid rgba(74,222,128,0.3)" : "1px solid #222", borderRadius: 8, padding: "12px 14px", background: res?.ok ? "rgba(74,222,128,0.04)" : "#111" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{c.case_number}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: natColor+"18", border: `1px solid ${natColor}50`, color: natColor }}>{c.nature_du_travail ?? "—"}</span>
                                {res?.ok && <span style={{ fontSize: 11, color: "#4ade80" }}>✓ Sauvegardé</span>}
                                {res && !res.ok && <span style={{ fontSize: 11, color: "#f87171" }}>✕ {res.error}</span>}
                              </div>
                              <button onClick={() => removeCase(c.id)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                              <FieldSelectMachine label="Machine"     value={f.machine}   onChange={v => updateCaseField(c.id, "machine", v)} />
                              <FieldInput         label="N° disque"   value={f.disque}    onChange={v => updateCaseField(c.id, "disque", v)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                cases.map(c => {
                  const f = fields[c.id] ?? caseToFields(c);
                  const natColor = NATURE_COLORS[c.nature_du_travail ?? ""] ?? "#aaa";
                  const res = results?.find(r => r.case_id === c.id);
                  return (
                    <div key={c.id} style={{ border: res?.ok ? "1px solid rgba(74,222,128,0.3)" : "1px solid #222", borderRadius: 8, padding: "12px 14px", background: res?.ok ? "rgba(74,222,128,0.04)" : "#111" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{c.case_number}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: natColor+"18", border: `1px solid ${natColor}50`, color: natColor }}>{c.nature_du_travail ?? "—"}</span>
                          {res?.ok && <span style={{ fontSize: 11, color: "#4ade80" }}>✓ Sauvegardé</span>}
                          {res && !res.ok && <span style={{ fontSize: 11, color: "#f87171" }}>✕ {res.error}</span>}
                        </div>
                        <button onClick={() => removeCase(c.id)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                        <FieldSelectMachine label="Machine"     value={f.machine}   onChange={v => updateCaseField(c.id, "machine", v)} />
                        <FieldInput         label="N° disque"   value={f.disque}    onChange={v => updateCaseField(c.id, "disque", v)} />
                        <FieldInput         label="N° lot PMMA" value={f.lot_pmma}  onChange={v => updateCaseField(c.id, "lot_pmma", v)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {okCount  > 0 && <span style={{ fontSize: 12, color: "white",   padding: "3px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>✓ {okCount} sauvegardé{okCount > 1 ? "s" : ""}</span>}
                {errCount > 0 && <span style={{ fontSize: 12, color: "#f87171", padding: "3px 10px", border: "1px solid rgba(239,68,68,0.3)",   borderRadius: 6 }}>✕ {errCount} erreur{errCount > 1 ? "s" : ""}</span>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setOpen(false)} style={{ padding: "8px 16px", border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13, borderRadius: 6 }}>Fermer</button>
                <button onClick={handleSave} disabled={saving || cases.length === 0} style={{ padding: "8px 20px", border: cases.length === 0 ? "1px solid #333" : "1px solid #4ade80", background: cases.length === 0 ? "transparent" : "rgba(74,222,128,0.1)", color: cases.length === 0 ? "#555" : "#4ade80", cursor: saving || cases.length === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, borderRadius: 6, transition: "all 150ms" }}>
                  {saving ? "Sauvegarde..." : `Sauvegarder ${cases.length > 0 ? cases.length + " cas" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
