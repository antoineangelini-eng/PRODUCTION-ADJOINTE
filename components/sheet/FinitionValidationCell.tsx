"use client";

import * as React from "react";
import { validateFinitionCellAction } from "@/app/app/finition/actions";

export function FinitionValidationCell(props: {
  caseId: string;
  value: boolean;
  validationAt: string | null;
}) {
  const { caseId, value, validationAt } = props;

  const [current, setCurrent] = React.useState(value);
  const [loading, setLoading] = React.useState(false);

  // Une fois validé, c'est définitif
  if (current) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ color: "#4ade80", fontWeight: 700 }}>✓ Validé</span>
        {validationAt && (
          <span style={{ fontSize: 11, color: "#666" }}>
            {new Date(validationAt).toLocaleString("fr-FR")}
          </span>
        )}
      </div>
    );
  }

  async function handleValidate() {
    if (loading) return;
    setLoading(true);
    try {
      await validateFinitionCellAction(caseId);
      setCurrent(true);
    } catch (e: any) {
      alert("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleValidate()}
      disabled={loading}
      style={{
        padding: "6px 14px",
        border: "1px solid #555",
        background: "transparent",
        color: loading ? "#666" : "white",
        cursor: loading ? "default" : "pointer",
        borderRadius: 6,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {loading ? "..." : "Valider"}
    </button>
  );
}
