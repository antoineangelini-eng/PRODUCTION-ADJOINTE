"use client";

import * as React from "react";
import { updateDesignMetalDate } from "../../app/app/design-metal/actions";

function toYmd(value: string | null): string {
  if (!value) return "";
  // Si c'est un timestamptz (contient "T"), on garde juste YYYY-MM-DD
  if (value.includes("T")) return value.split("T")[0];
  // Si c'est déjà YYYY-MM-DD, on le garde
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Sinon on ne prend pas de risque
  return "";
}

export function DesignMetalDateCell(props: {
  caseId: string;
  column: string;
  defaultValue: string | null;
}) {
  const { caseId, column, defaultValue } = props;

  const initial = toYmd(defaultValue);

  const [value, setValue] = React.useState(initial);
  const lastSentRef = React.useRef(initial);

  async function commit() {
    if (value === lastSentRef.current) return;

    await updateDesignMetalDate(caseId, column, value);
    lastSentRef.current = value;
  }

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onFocus={(e) => {
        // Ouvre le picker si supporté (Chrome/Edge récents)
        const anyEl = e.currentTarget as any;
        if (typeof anyEl.showPicker === "function") {
          try {
            anyEl.showPicker();
          } catch {
            // ignore
          }
        }
      }}
      style={{
        width: 140,
        background: "transparent",
        color: "white",
        border: "1px solid #333",
        padding: "6px 8px",
      }}
    />
  );
}