"use client";

import * as React from "react";
import { saveDesignMetalCellAction } from "@/app/app/design-metal/actions";

async function updateDesignMetalText(caseId: string, column: string, value: string) {
  const fd = new FormData();
  fd.set("case_id", caseId);
  fd.set("column", column);
  fd.set("kind", "text");
  fd.set("value", value);
  await saveDesignMetalCellAction(fd);
}

export function DesignMetalTextCell(props: {
  caseId: string;
  column: string;
  defaultValue: string;
}) {
  const { caseId, column, defaultValue } = props;
  const [value, setValue] = React.useState(defaultValue);

  // Pour éviter de spammer si l'utilisateur clique sans changer
  const lastSentRef = React.useRef(defaultValue);

  async function commit() {
    const next = value;
    if (next === lastSentRef.current) return;

    await updateDesignMetalText(caseId, column, next);
    lastSentRef.current = next;
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        void commit();
      }}
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