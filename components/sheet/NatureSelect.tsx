"use client";
import { useState } from "react";

const OPTIONS = [
  { value: "Chassis Argoat",   color: "#e07070" },
  { value: "Chassis Dent All", color: "#4ade80" },
  { value: "Définitif Résine", color: "#c4a882" },
];

export function NatureSelect() {
  const [value, setValue] = useState("");
  const selected = OPTIONS.find(o => o.value === value);
  const color = selected ? selected.color : "#888";

  return (
    <select
      name="nature_du_travail"
      value={value}
      onChange={e => setValue(e.target.value)}
      style={{
        padding: "7px 8px",
        border: "1px solid rgba(74,222,128,0.35)",
        background: "#0f0f0f",
        color,
        fontSize: 12,
        outline: "none",
        borderRadius: 4,
        transition: "color 150ms",
      }}
    >
      <option value="" disabled style={{ color: "#555" }}>Nature</option>
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value} style={{ background: "#111", color: o.color }}>
          {o.value}
        </option>
      ))}
    </select>
  );
}
