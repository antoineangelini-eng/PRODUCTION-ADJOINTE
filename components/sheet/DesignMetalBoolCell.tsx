"use client";

import { useState, useRef } from "react";
import { saveDesignMetalCellAction } from "@/app/app/design-metal/actions";

export function DesignMetalBoolCell({
  caseId,
  column,
  dbValue,
}: {
  caseId: string;
  column: string;
  dbValue: boolean;
}) {
  const [current, setCurrent] = useState(dbValue);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={saveDesignMetalCellAction} style={{ display: "contents" }}>
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="column" value={column} />
      <input type="hidden" name="kind" value="boolean" />
      <input type="hidden" name="current" value={String(current)} />
      <button
        type="submit"
        onClick={() => setCurrent(v => !v)}
        style={{
          background: current ? "rgba(74,222,128,0.15)" : "none",
          border: current ? "1px solid rgba(74,222,128,0.4)" : "1px solid #444",
          padding: "3px 8px", cursor: "pointer",
          color: current ? "#4ade80" : "#555",
          minWidth: 32, borderRadius: 6, fontWeight: 700, fontSize: 13,
        }}
      >
        {current ? "✓" : ""}
      </button>
    </form>
  );
}
