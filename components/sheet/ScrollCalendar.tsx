"use client";
import React, { useState, useRef, useEffect } from "react";

const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Lundi = 0
}

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScrollCalendar({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (date: string) => void;
  style?: React.CSSProperties;
}) {
  const today = toStr(new Date());
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0, 4)) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  function goMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  // Scroll pour naviguer entre les mois
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.deltaY > 0) goMonth(1);
      else if (e.deltaY < 0) goMonth(-1);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const days = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div ref={containerRef} style={{ width: 220, background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "10px 12px", userSelect: "none", ...style }}>
      {/* Navigation mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => goMonth(-1)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16, padding: "2px 6px", lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = "white"}
          onMouseLeave={e => e.currentTarget.style.color = "#888"}
        >◀</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
          {MOIS[viewMonth]} {viewYear}
        </span>
        <button onClick={() => goMonth(1)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16, padding: "2px 6px", lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = "white"}
          onMouseLeave={e => e.currentTarget.style.color = "#888"}
        >▶</button>
      </div>

      {/* Jours de la semaine */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {JOURS.map(j => (
          <div key={j} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#666", padding: "2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{j}</div>
        ))}
      </div>

      {/* Grille des jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          const isPast = dateStr < today;
          const isWeekend = (startDay + day - 1) % 7 >= 5;

          return (
            <button
              key={day}
              onClick={() => onChange(dateStr)}
              style={{
                width: "100%",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                color: isSelected ? "#111" : isToday ? "#4ade80" : isPast ? "#444" : isWeekend ? "#666" : "#ccc",
                background: isSelected ? "#4ade80" : isToday ? "rgba(74,222,128,0.1)" : "transparent",
                border: isToday && !isSelected ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 100ms",
                padding: 0,
              }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "#252525"; e.currentTarget.style.color = "white"; } }}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = isToday ? "rgba(74,222,128,0.1)" : "transparent"; e.currentTarget.style.color = isToday ? "#4ade80" : isPast ? "#444" : isWeekend ? "#666" : "#ccc"; } }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Bouton aujourd'hui */}
      <button onClick={() => { const t = new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); onChange(today); }}
        style={{ width: "100%", marginTop: 8, padding: "5px 0", background: "transparent", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 150ms" }}
        onMouseEnter={e => { e.currentTarget.style.color = "#4ade80"; e.currentTarget.style.borderColor = "#4ade80"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#333"; }}
      >
        Aujourd'hui
      </button>
    </div>
  );
}

/** Version inline compacte pour les formulaires de création */
export function InlineCalendarPicker({
  value,
  onChange,
  placeholder = "Date d'expédition",
}: {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayDate = value
    ? new Date(value + "T00:00:00").toLocaleDateString("fr-FR")
    : "";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "7px 10px",
          border: value ? "1px solid #4ade80" : "1px solid #2a2a2a",
          background: value ? "rgba(74,222,128,0.06)" : "#121212",
          color: value ? "#4ade80" : "#7a7a7a",
          fontSize: 12,
          fontWeight: value ? 600 : 500,
          borderRadius: 4,
          cursor: "pointer",
          outline: "none",
          minWidth: 130,
          textAlign: "left",
          transition: "all 150ms",
        }}
      >
        {displayDate || placeholder}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100 }}>
          <ScrollCalendar
            value={value}
            onChange={d => { onChange(d); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}
