"use client";

import { useState, useRef } from "react";
import { saveTypeDeDentsAction } from "@/app/app/design-metal/actions";

const OPTIONS = [
  { value: "Dents usiner",      color: "#818cf8" },
  { value: "Dents du commerce", color: "#fb923c" },
];

export function TypeDeDentsSelect({ caseId, dbValue }: { caseId: string; dbValue: string | null }) {
  const initial = OPTIONS.find(o => o.value === dbValue) ? dbValue! : "Dents usiner";
  const [current, setCurrent] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const meta = OPTIONS.find(o => o.value === current) ?? OPTIONS[0];

  return (
    <form ref={formRef} action={saveTypeDeDentsAction} style={{ display: "contents" }}>
      <input type="hidden" name="case_id" value={caseId} />
      <select
        name="value"
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          // submit sans setTimeout pour éviter tout re-render entre les deux
          formRef.current?.requestSubmit();
        }}
        style={{
          padding: "4px 8px",
          border: `1px solid ${meta.color}44`,
          background: meta.color + "15",
          color: meta.color,
          fontSize: 12, cursor: "pointer",
          borderRadius: 4, minWidth: 140,
          fontWeight: 600, outline: "none",
        }}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}
            style={{ background: "#111", color: "white", fontWeight: 400 }}>
            {o.value}
          </option>
        ))}
      </select>
    </form>
  );
}
