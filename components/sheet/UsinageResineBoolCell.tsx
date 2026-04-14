"use client";

import * as React from "react";
import { saveUsinageResineCellAction } from "@/app/app/usinage-resine/actions";

export function UsinageResineBoolCell(props: {
  caseId: string;
  column: string;
  value: boolean;
}) {
  const { caseId, column, value } = props;

  const [current, setCurrent] = React.useState(value);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const next = !current;
    try {
      const fd = new FormData();
      fd.set("case_id", caseId);
      fd.set("column", column);
      fd.set("kind", "boolean");
      fd.set("value", String(next));
      await saveUsinageResineCellAction(fd);
      setCurrent(next);
    } catch (e) {
      // revert si erreur
      setCurrent(current);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void toggle()}
      disabled={loading}
      style={{
        background: current ? "rgba(74,222,128,0.15)" : "none",
        border: current ? "1px solid rgba(74,222,128,0.4)" : "1px solid #555",
        padding: "4px 10px",
        cursor: "pointer",
        color: current ? "#4ade80" : "#666",
        minWidth: 36,
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {current ? "✓" : ""}
    </button>
  );
}
