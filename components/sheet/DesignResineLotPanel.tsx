"use client";
import { useState, useRef } from "react";
import {
  checkCaseForLotDR,
  createCasesBatchDR,
  type LotCheckResult,
  type LotCreateResult,
} from "@/app/app/design-resine/lot-actions";

type ScannedCase = {
  caseNumber: string;
  status: "ok" | "in_table" | "in_history";
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  ok:         { color: "#4ade80", bg: "rgba(74,222,128,0.08)",  label: "Prêt" },
  in_table:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "Déjà dans le tableau" },
  in_history: { color: "#f87171", bg: "rgba(248,113,113,0.08)", label: "Déjà dans l'historique" },
};

export function DesignResineLotPanel({
  open: openProp,
  onOpenChange,
  onSaved,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenState(v);
    onOpenChange?.(v);
  };

  const [scanVal, setScanVal]       = useState("");
  const [scanError, setScanError]   = useState<string | null>(null);
  const [scanning, setScanning]     = useState(false);
  const [cases, setCases]           = useState<ScannedCase[]>([]);
  const [saving, setSaving]         = useState(false);
  const [results, setResults]       = useState<LotCreateResult[] | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const mouseDownOnPanel = useRef(false);

  const okCases = cases.filter(c => c.status === "ok");

  async function handleAddCase() {
    const num = scanVal.trim();
    if (!num) return;

    // Detect double scan
    let cleanedNum = num.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim();
    let displayNum = cleanedNum;
    if (cleanedNum.length >= 4 && cleanedNum.length % 2 === 0) {
      const half = cleanedNum.length / 2;
      if (cleanedNum.slice(0, half) === cleanedNum.slice(half)) {
        displayNum = cleanedNum.slice(0, half);
      }
    }

    if (cases.find(c => c.caseNumber === displayNum)) {
      setScanError("Déjà dans le lot");
      return;
    }

    setScanning(true);
    setScanError(null);
    try {
      const check = await checkCaseForLotDR(num);
      setCases(prev => [...prev, { caseNumber: check.caseNumber, status: check.status }]);
      setScanVal("");
      setResults(null);
      scanRef.current?.focus();
    } catch (e: any) {
      setScanError(e.message);
    } finally {
      setScanning(false);
    }
  }

  function removeCase(caseNumber: string) {
    setCases(prev => prev.filter(c => c.caseNumber !== caseNumber));
    setResults(null);
  }

  async function handleSave() {
    if (okCases.length === 0 || saving) return;
    setSaving(true);
    const res = await createCasesBatchDR(okCases.map(c => c.caseNumber));
    setResults(res);
    setSaving(false);

    const okCount = res.filter(r => r.ok).length;
    if (okCount > 0) {
      // Remove successfully created cases from list
      const okNumbers = new Set(res.filter(r => r.ok).map(r => r.caseNumber));
      setCases(prev => prev.filter(c => !okNumbers.has(c.caseNumber)));
      onSaved?.();
      setTimeout(() => {
        if (cases.length - okCount <= 0) setOpen(false);
      }, 700);
    }
  }

  const createdCount = results?.filter(r => r.ok).length ?? 0;
  const errCount = results?.filter(r => !r.ok).length ?? 0;

  return (
    <>
      {open && (
        <div
          onMouseDown={e => { mouseDownOnPanel.current = e.target !== e.currentTarget; }}
          onClick={e => { if (e.target === e.currentTarget && !mouseDownOnPanel.current) setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
        >
          <div style={{
            width: "min(600px, 95vw)", height: "100%", background: "#0f0f0f",
            borderLeft: "1px solid #2a2a2a", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid #1a1a1a",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Saisie en lot — Design Résine</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  {cases.length} cas scanné{cases.length > 1 ? "s" : ""}
                  {okCases.length < cases.length && (
                    <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                      ({cases.length - okCases.length} doublon{cases.length - okCases.length > 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: "#555", fontSize: 20,
                cursor: "pointer", padding: "4px 8px", lineHeight: 1,
              }}>×</button>
            </div>

            {/* Scan input */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "white", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
                Scanner un cas
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={scanRef}
                  value={scanVal}
                  autoFocus
                  placeholder="N° du cas..."
                  onChange={e => { setScanVal(e.target.value); setScanError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleAddCase()}
                  style={{
                    padding: "7px 10px", border: "1px solid #333", background: "transparent",
                    color: "white", fontSize: 13, borderRadius: 6, outline: "none", width: 160,
                  }}
                />
                <button
                  onClick={handleAddCase}
                  disabled={scanning}
                  style={{
                    padding: "7px 14px", border: "1px solid #555", background: "transparent",
                    color: "white", cursor: "pointer", fontSize: 12, borderRadius: 6,
                  }}
                >
                  {scanning ? "…" : "Ajouter"}
                </button>
                {scanError && (
                  <span style={{ fontSize: 12, color: "#f87171", alignSelf: "center" }}>✕ {scanError}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                Nature par défaut : <span style={{ color: "#9487a8" }}>Provisoire Résine</span>
              </div>
            </div>

            {/* List of scanned cases */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              {cases.length === 0 && (
                <div style={{ color: "#555", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
                  Aucun cas scanné
                </div>
              )}

              {cases.map(c => {
                const st = STATUS_STYLE[c.status];
                const res = results?.find(r => r.caseNumber === c.caseNumber);
                return (
                  <div key={c.caseNumber} style={{
                    border: res?.ok
                      ? "1px solid rgba(74,222,128,0.3)"
                      : c.status !== "ok"
                        ? `1px solid ${st.color}30`
                        : "1px solid #222",
                    borderRadius: 8, padding: "10px 14px",
                    background: res?.ok ? "rgba(74,222,128,0.04)" : st.bg,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{c.caseNumber}</span>
                      {c.status !== "ok" && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                          background: st.color + "18", border: `1px solid ${st.color}50`, color: st.color,
                        }}>
                          {st.label}
                        </span>
                      )}
                      {c.status === "ok" && !res && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                          background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80",
                        }}>
                          Prêt
                        </span>
                      )}
                      {res?.ok && <span style={{ fontSize: 11, color: "#4ade80" }}>✓ Créé</span>}
                      {res && !res.ok && <span style={{ fontSize: 11, color: "#f87171" }}>✕ {res.error}</span>}
                    </div>
                    <button
                      onClick={() => removeCase(c.caseNumber)}
                      title="Retirer du lot"
                      style={{
                        background: "none", border: "none", color: "#555",
                        cursor: "pointer", fontSize: 16, padding: 4,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 20px", borderTop: "1px solid #1a1a1a",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {createdCount > 0 && (
                  <span style={{ fontSize: 12, color: "white", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>
                    ✓ {createdCount} créé{createdCount > 1 ? "s" : ""}
                  </span>
                )}
                {errCount > 0 && (
                  <span style={{ fontSize: 12, color: "#f87171", padding: "3px 10px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6 }}>
                    ✕ {errCount} erreur{errCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "8px 16px", border: "1px solid #333", background: "transparent",
                    color: "#aaa", cursor: "pointer", fontSize: 13, borderRadius: 6,
                  }}
                >
                  Fermer
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || okCases.length === 0}
                  style={{
                    padding: "8px 20px",
                    border: okCases.length === 0 ? "1px solid #333" : "1px solid #4ade80",
                    background: okCases.length === 0 ? "transparent" : "rgba(74,222,128,0.1)",
                    color: okCases.length === 0 ? "#555" : "#4ade80",
                    cursor: saving || okCases.length === 0 ? "not-allowed" : "pointer",
                    fontSize: 13, fontWeight: 700, borderRadius: 6, transition: "all 150ms",
                  }}
                >
                  {saving ? "Création..." : `Créer ${okCases.length > 0 ? okCases.length + " cas" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
