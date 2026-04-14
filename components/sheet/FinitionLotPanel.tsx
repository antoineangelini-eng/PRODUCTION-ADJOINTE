"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { rpcScanCase } from "@/app/actions/rpc-scan-case";
import {
  validateFinitionBatchAction,
  type LotResultFinition,
} from "@/app/app/finition/actions";

type CaseEntry = { case_id: string; case_number: string };

export function FinitionLotPanel() {
  const [open, setOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [results, setResults] = useState<LotResultFinition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function addCase(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    setScanError(null);

    if (cases.some((c) => c.case_number === trimmed)) {
      setScanError("Ce cas est déjà dans la liste.");
      return;
    }

    try {
      const caseId = await rpcScanCase("finition", trimmed);
      setCases((prev) => [...prev, { case_id: caseId, case_number: trimmed }]);
      setScanValue("");
      scanRef.current?.focus();
    } catch (e: any) {
      setScanError(e.message);
    }
  }

  function removeCase(caseId: string) {
    setCases((prev) => prev.filter((c) => c.case_id !== caseId));
  }

  async function handleSubmit() {
    if (cases.length === 0) return;
    setLoading(true);
    try {
      const res = await validateFinitionBatchAction(cases);
      setResults(res);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setCases([]);
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
        + Validation en lot
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
              width: "min(520px, 95vw)",
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
                <div style={{ fontWeight: 800, fontSize: 16 }}>Validation en lot — Finition</div>
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

              {/* Résultats */}
              {results && (
                <div>
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
                      {r.ok ? "✓" : "✗"} Cas {r.case_number} — {r.ok ? "Validé" : r.error}
                    </div>
                  ))}
                  <button
                    onClick={handleClose}
                    style={{
                      marginTop: 12,
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
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #333",
                          background: "transparent",
                          color: "white",
                          borderRadius: 6,
                          width: 260,
                        }}
                      />
                      <button
                        onClick={() => void addCase(scanValue)}
                        style={{
                          padding: "8px 14px",
                          border: "1px solid #444",
                          background: "transparent",
                          color: "white",
                          cursor: "pointer",
                          borderRadius: 6,
                        }}
                      >
                        Ajouter
                      </button>
                    </div>
                    {scanError && (
                      <div style={{ marginTop: 6, color: "salmon", fontSize: 13 }}>
                        ❌ {scanError}
                      </div>
                    )}
                  </div>

                  {/* Liste des cas */}
                  {cases.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 600 }}>
                        CAS À VALIDER
                      </div>
                      {cases.map((c) => (
                        <div
                          key={c.case_id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            border: "1px solid #222",
                            borderRadius: 8,
                            marginBottom: 6,
                            background: "#111",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Cas {c.case_number}</span>
                          <button
                            onClick={() => removeCase(c.case_id)}
                            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                <button
                  onClick={handleClose}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid #333",
                    background: "transparent",
                    color: "#888",
                    cursor: "pointer",
                    borderRadius: 6,
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid rgba(74,222,128,0.4)",
                    background: loading ? "#222" : "rgba(74,222,128,0.15)",
                    color: loading ? "#666" : "#4ade80",
                    cursor: loading ? "default" : "pointer",
                    borderRadius: 6,
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
