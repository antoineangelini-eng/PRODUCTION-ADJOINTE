"use client";

import * as React from "react";
import { saveDesignResineCellAction } from "../../app/app/design-resine/actions";

async function updateDesignResineDate(caseId: string, column: string, value: string) {
  const fd = new FormData();
  fd.set("case_id", caseId);
  fd.set("column", column);
  fd.set("kind", "date");
  fd.set("value", value);
  await saveDesignResineCellAction(fd);
}

function toYmd(value: string | null): string {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

export function DesignResineDateCell(props: {
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

    await updateDesignResineDate(caseId, column, value);
    lastSentRef.current = value;
  }

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onFocus={(e) => {
        const anyEl = e.currentTarget as any;
        if (typeof anyEl.showPicker === "function") {
          try {
            anyEl.showPicker();
          } catch {}
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