"use client";
import { useState } from "react";

// Mapping AZERTY non-shifté → chiffre
// (utile quand un scanner envoie des caractères sans maintenir Shift)
const AZERTY_MAP: Record<string, string> = {
  "&": "1",
  "é": "2",
  "\"": "3",
  "'": "4",
  "(": "5",
  "-": "6",
  "è": "7",
  "_": "8",
  "ç": "9",
  "à": "0",
};

function normalize(value: string): string {
  return value
    .split("")
    .map(ch => AZERTY_MAP[ch] ?? ch)
    .join("")
    .toUpperCase();
}

export function CaseNumberInput({ style, placeholder = "N° du cas", name = "case_number" }: {
  style?: React.CSSProperties;
  placeholder?: string;
  name?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <input
      name={name}
      value={value}
      onChange={e => setValue(normalize(e.target.value))}
      placeholder={placeholder}
      autoComplete="off"
      style={style}
    />
  );
}
