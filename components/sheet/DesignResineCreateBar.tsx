"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createCaseAction } from "@/app/app/design-resine/actions";
import { InlineCalendarPicker } from "@/components/sheet/ScrollCalendar";

const AZERTY_MAP: Record<string, string> = {
  "&": "1", "é": "2", "\"": "3", "'": "4", "(": "5",
  "-": "6", "è": "7", "_": "8", "ç": "9", "à": "0",
  "É": "2", "È": "7", "Ç": "9", "À": "0",
};
function normalize(v: string): string {
  return v.split("").map(ch => AZERTY_MAP[ch] ?? ch).join("").toUpperCase();
}

const DR_NATURES = [
  { value: "Provisoire Résine", color: "#9487a8" },
  { value: "Deflex",            color: "#a78bfa" },
  { value: "Complet",           color: "#38bdf8" },
];

export function DesignResineCreateBar({ prefill = "", onCreated, onSearch }: { prefill?: string; onCreated?: (caseNumber: string) => void; onSearch?: (caseNumber: string) => void }) {
  const router = useRouter();
  const [caseNumber, setCaseNumber] = useState(prefill);
  const [nature, setNature] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [dateExp, setDateExp] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!caseNumber.trim() || !nature || creating) return;
    const cn = caseNumber.trim();
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("case_number", cn);
      fd.set("nature", nature);
      if (dateExp) fd.set("date_expedition", dateExp);
      await createCaseAction(fd);
    } catch {
      // createCaseAction fait un redirect, on le gère ici
    }
    setCaseNumber("");
    setNature("");
    setDateExp("");
    setCreating(false);
    onCreated?.(cn);
  }

  const natureMeta = DR_NATURES.find(n => n.value === nature);

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* Créer un cas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#7c8196", letterSpacing: 0.5 }}>Créer un cas</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={caseNumber}
            onChange={e => setCaseNumber(normalize(e.target.value))}
            placeholder="N° du cas"
            autoComplete="off"
            style={{ padding: "7px 10px", border: "1px solid rgba(129,140,248,0.35)", background: "rgba(129,140,248,0.03)", color: "white", fontSize: 12, width: 110, outline: "none", borderRadius: 4 }}
          />
          <div style={{ position: "relative" }}>
            <select value={nature} onChange={e => setNature(e.target.value)} style={{
              padding: "7px 30px 7px 10px", border: natureMeta ? `1px solid ${natureMeta.color}55` : "1px solid #2a2a2a",
              background: natureMeta ? `${natureMeta.color}12` : "#121212",
              color: natureMeta ? natureMeta.color : "#7a7a7a",
              fontSize: 12, borderRadius: 4, outline: "none", cursor: "pointer",
              appearance: "none", WebkitAppearance: "none" as any, minWidth: 140, fontWeight: natureMeta ? 600 : 500,
            }}>
              <option value="" disabled style={{ background: "#111", color: "#7a7a7a" }}>Nature</option>
              {DR_NATURES.map(o => (
                <option key={o.value} value={o.value} style={{ background: "#111", color: o.color, fontWeight: 600 }}>{o.value}</option>
              ))}
            </select>
            <svg viewBox="0 0 10 6" width="10" height="10" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.7 }} fill="none" stroke="#8a8a8a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg>
          </div>
          <InlineCalendarPicker value={dateExp} onChange={setDateExp} placeholder="Expédition" />
          <button onClick={handleCreate} disabled={creating || !caseNumber.trim() || !nature || !dateExp} style={{
            padding: "7px 14px", border: "1px solid #7c8196", background: "rgba(129,140,248,0.08)",
            color: !caseNumber.trim() || !nature || !dateExp ? "#555" : "#7c8196",
            cursor: creating || !caseNumber.trim() || !nature || !dateExp ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 700, borderRadius: 4,
          }}>
            {creating ? "..." : "Créer"}
          </button>
        </div>
      </div>

      <div style={{ width: 1, background: "#222", alignSelf: "stretch", marginTop: 20 }} />

      {/* Scanner */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, color: "white", letterSpacing: 0.5 }}>Rechercher / Scanner</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={scanValue}
            onChange={e => setScanValue(normalize(e.target.value))}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = scanValue.trim();
                if (!v) return;
                setScanValue("");
                onSearch?.(v);
              }
            }}
            placeholder="N° du cas..."
            autoComplete="off"
            style={{ padding: "7px 10px", border: "1px solid #ffffff", background: "transparent", color: "white", fontSize: 12, width: 160, outline: "none", borderRadius: 4 }}
          />
        </div>
      </div>
    </div>
  );
}
