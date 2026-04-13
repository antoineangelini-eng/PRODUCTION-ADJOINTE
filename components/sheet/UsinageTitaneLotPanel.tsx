"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { rpcScanCase } from "@/app/actions/rpc-scan-case";
import {
  saveUsinageTitaneLotAction,
  resolveCaseForLotTitane,
  type LotRowTitane,
  type LotResultTitane,
} from "@/app/app/usinage-titane/lot-actions";

type CaseEntry = LotRowTitane & { resolved: boolean };

const emptyCommon = {
  envoye_usinage: false,
  delai_j1_date: "",
};

export function UsinageTitaneLotPanel() {
  const [open, setOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [common, setCommon] = useState(emptyCommon);
  const [results, setResults] = useState<LotResultTitane[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  function applyCommonToAll() {
    setCases((prev) =>
      prev.map((c) => ({
        ...c,
        envoye_usinage: common.envoye_usinage,
        delai_j1_date: common.delai_j1_date,
      }))
    );
  }

  async function addCase(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    setScanError(null);

    if (cases.some((c) => c.case_number === trimmed)) {
      setScanError("Ce cas est déjà dans la liste.");
      return;
    }

    try {
      const caseId = await rpcScanCase("usinage_titane", trimmed);
      const resolved = await resolveCaseForLotTitane(trimmed);

      const entry: CaseEntry = {
        case_id: caseId,
        case_number: trimmed,
        envoye_usinage:
          resolved?.sector_usinage_titane?.envoye_usinage ?? common.envoye_usinage,
        delai_j1_date:
          resolved?.sector_usinage_titane?.delai_j1_date ?? common.delai_j1_date,
        resolved: true,
      };

      setCases((prev) => [...prev, entry]);
      setScanValue("");
      scanRef.current?.focus();
    } catch (e: any) {
      setScanError(e.message);
    }
  }

  function removeCase(caseId: string) {
    setCases((prev) => prev.filter((c) => c.case_id !== caseId));
  }

  function updateCase(caseId: string, field: keyof LotRowTitane, value: any) {
    setCases((prev) =>
      prev.map((c) => (c.case_id === caseId ? { ...c, [field]: value } : c))
    );
  }

  async function handleSubmit() {
    if (cases.length === 0) return;
    setLoading(true);
    try {
      const res = await saveUsinageTitaneLotAction(cases);
      setResults(res);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setCases([]);
    setCommon(emptyCommon);
    setResults(null);
    setScanError(null);
    setScanValue("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 16px",
          border: "1px solid #4ade80",
          background: "rgba(74,222,128,0.08)",
          color: "#4ade80",
          cursor: "pointer",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        + Saisie en lot
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            style={{
              width: "min(600px, 95vw)",
              height: "100vh",
              background: "#0f0f0f",
              borderLeft: "1px solid #222",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #222",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Saisie en lot — Usinage Titane</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {cases.length} cas ajouté{cases.length > 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

              {results && (
                <div style={{ marginBottom: 16 }}>
                  {results.map((r) => (
                    <div
                      key={r.case_id}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        marginBottom: 6,
                        background: r.ok ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${r.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: r.ok ? "#4ade80" : "#f87171",
                        fontSize: 13,
                      }}
                    >
                      {r.ok ? "✓" : "✗"} Cas {r.case_number} — {r.ok ? "Sauvegardé" : r.error}
                    </div>
                  ))}
                  <button
                    onClick={handleClose}
                    style={{
                      marginTop: 8,
                      padding: "10px 16px",
                      border: "1px solid #444",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                  >
                    Fermer
                  </button>
                </div>
              )}

              {!results && (
                <>
                  {/* Ajouter un cas */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: 600 }}>
                      AJOUTER UN CAS
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        ref={scanRef}
                        value={scanValue}
                        onChange={(e) => setScanValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void addCase(scanValue); }}
                        placeholder="Scanner ou saisir le numéro du cas"
                        autoFocus
                        style={inputStyle}
                      />
                      <button onClick={() => void addCase(scanValue)} style={btnStyle}>
                        Ajouter
                      </button>
                    </div>
                    {scanError && (
                      <div style={{ marginTop: 6, color: "salmon", fontSize: 13 }}>
                        ❌ {scanError}
                      </div>
                    )}
                  </div>

                  {/* Valeurs communes */}
                  {cases.length > 0 && (
                    <div
                      style={{
                        marginBottom: 20,
                        padding: "14px 16px",
                        border: "1px solid #2a2a2a",
                        borderRadius: 10,
                        background: "#111",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 600 }}>
                        VALEURS COMMUNES
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                        <label style={labelStyle}>
                          <span style={labelText}>Délai J+1</span>
                          <input
                            type="date"
                            value={common.delai_j1_date}
                            onChange={(e) => setCommon((p) => ({ ...p, delai_j1_date: e.target.value }))}
                            style={inputStyle}
                          />
                        </label>

                        <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <span style={labelText}>Envoyé usinage</span>
                          <BoolToggle
                            value={common.envoye_usinage}
                            onChange={(v) => setCommon((p) => ({ ...p, envoye_usinage: v }))}
                          />
                        </label>
                      </div>

                      <button onClick={applyCommonToAll} style={applyBtnStyle}>
                        ↓ Appliquer à tous les cas
                      </button>
                    </div>
                  )}

                  {/* Liste des cas */}
                  {cases.map((c) => (
                    <div
                      key={c.case_id}
                      style={{
                        marginBottom: 10,
                        padding: "12px 14px",
                        border: "1px solid #222",
                        borderRadius: 10,
                        background: "#111",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontWeight: 700 }}>Cas {c.case_number}</span>
                        <button
                          onClick={() => removeCase(c.case_id)}
                          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <label style={labelStyle}>
                          <span style={labelText}>Délai J+1</span>
                          <input
                            type="date"
                            value={c.delai_j1_date}
                            onChange={(e) => updateCase(c.case_id, "delai_j1_date", e.target.value)}
                            style={inputStyleSm}
                          />
                        </label>

                        <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <span style={labelText}>Envoyé</span>
                          <BoolToggle
                            value={c.envoye_usinage}
                            onChange={(v) => updateCase(c.case_id, "envoye_usinage", v)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            {!results && cases.length > 0 && (
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid #222",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button onClick={handleClose} style={{ ...btnStyle, color: "#888", border: "1px solid #333" }}>
                  Annuler
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  style={{
                    ...btnStyle,
                    background: loading ? "#222" : "rgba(74,222,128,0.15)",
                    color: loading ? "#666" : "#4ade80",
                    border: "1px solid rgba(74,222,128,0.4)",
                    fontWeight: 700,
                  }}
                >
                  {loading ? "Envoi..." : `Valider ${cases.length} cas`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function BoolToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        background: value ? "rgba(74,222,128,0.15)" : "none",
        border: value ? "1px solid rgba(74,222,128,0.4)" : "1px solid #555",
        padding: "4px 12px",
        cursor: "pointer",
        color: value ? "#4ade80" : "#666",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {value ? "✓" : "—"}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #333",
  background: "transparent",
  color: "white",
  borderRadius: 6,
  width: 200,
};

const inputStyleSm: React.CSSProperties = { ...inputStyle, width: 140 };
const btnStyle: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #444",
  background: "transparent",
  color: "white",
  cursor: "pointer",
  borderRadius: 6,
};
const applyBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #333",
  background: "rgba(255,255,255,0.04)",
  color: "#aaa",
  cursor: "pointer",
  borderRadius: 6,
  fontSize: 12,
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelText: React.CSSProperties = {
  fontSize: 11,
  color: "#666",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.3,
};
