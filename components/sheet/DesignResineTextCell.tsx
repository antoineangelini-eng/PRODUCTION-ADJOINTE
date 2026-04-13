"use client";

import * as React from "react";
import { saveDesignResineCellAction } from "@/app/app/design-resine/actions";

export function DesignResineTextCell(props: {
  caseId: string;
  column: string;
  defaultValue: string;
}) {
  const { caseId, column, defaultValue } = props;

  const [value, setValue] = React.useState(defaultValue);
  const lastSentRef = React.useRef(defaultValue);

  async function commit() {
    if (value === lastSentRef.current) return;
    await saveDesignResineCellAction(caseId, column, value === "" ? null : value);
    lastSentRef.current = value;
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      style={{
        width: "100%",
        background: "transparent",
        color: "white",
        border: "1px solid #333",
        padding: "6px 8px",
      }}
    />
  );
}
