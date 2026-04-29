"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { joursFeries } from "@/lib/jours-feries";

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
  const scrollAccum = useRef(0);
  const scrollCooldown = useRef(false);

  function goMonth(delta: number) {
    setViewMonth(prev => {
      let m = prev + delta;
      let y = viewYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      setViewYear(y);
      return m;
    });
  }

  // Scroll : un geste = un mois, avec cooldown pour éviter le double-scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const THRESHOLD = 80;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (scrollCooldown.current) return;
      scrollAccum.current += e.deltaY;
      if (scrollAccum.current > THRESHOLD) {
        goMonth(1);
        scrollAccum.current = 0;
        scrollCooldown.current = true;
        setTimeout(() => { scrollCooldown.current = false; }, 300);
      } else if (scrollAccum.current < -THRESHOLD) {
        goMonth(-1);
        scrollAccum.current = 0;
        scrollCooldown.current = true;
        setTimeout(() => { scrollCooldown.current = false; }, 300);
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const days = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = daysInMonth(viewYear, viewMonth - 1);

  // Jours fériés pour l'année courante (et adjacentes si prev/next mois déborde)
  const feries = useMemo(() => {
    const s = joursFeries(viewYear);
    joursFeries(viewYear - 1).forEach(d => s.add(d));
    joursFeries(viewYear + 1).forEach(d => s.add(d));
    return s;
  }, [viewYear]);

  // Cellules : { day, type: "prev" | "current" | "next" }
  type Cell = { day: number; type: "prev" | "current" | "next" };
  const cells: Cell[] = [];
  // Jours du mois précédent
  for (let i = startDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, type: "prev" });
  // Jours du mois courant
  for (let d = 1; d <= days; d++) cells.push({ day: d, type: "current" });
  // Jours du mois suivant pour compléter 6 lignes
  const totalRows = Math.ceil(cells.length / 7);
  const targetCells = Math.max(totalRows, 6) * 7;
  let nextDay = 1;
  while (cells.length < targetCells) cells.push({ day: nextDay++, type: "next" });

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
        {cells.map((cell, i) => {
          const colIdx = i % 7;
          const isWeekend = colIdx >= 5;

          // Calculer la date réelle de la cellule
          let cellYear = viewYear, cellMonth = viewMonth;
          if (cell.type === "prev") {
            cellMonth--; if (cellMonth < 0) { cellMonth = 11; cellYear--; }
          } else if (cell.type === "next") {
            cellMonth++; if (cellMonth > 11) { cellMonth = 0; cellYear++; }
          }
          const cellDateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const isFerie = feries.has(cellDateStr);

          if (cell.type !== "current") {
            // Jours du mois précédent/suivant — gris pâle, fériés en rouge pâle
            const dimColor = isFerie ? "#5a2020" : isWeekend ? "#2a2a2a" : "#444";
            return (
              <button
                key={`${cell.type}-${cell.day}`}
                onClick={() => {
                  const delta = cell.type === "prev" ? -1 : 1;
                  goMonth(delta);
                  onChange(cellDateStr);
                }}
                style={{
                  width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 400, color: dimColor, background: "transparent",
                  border: "1px solid transparent", borderRadius: 6, cursor: "pointer", padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1f1f1f"; e.currentTarget.style.color = isFerie ? "#a44" : "#666"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = dimColor; }}
              >
                {cell.day}
              </button>
            );
          }

          const dateStr = cellDateStr;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          const isPast = dateStr < today;

          // Couleurs style Windows : blanc normal, gris weekend, rouge férié
          const baseColor = isSelected ? "#111"
            : isToday ? "#4ade80"
            : isFerie ? (isPast ? "#7a3030" : "#e85555")
            : isPast ? "#555"
            : isWeekend ? "#777"
            : "#e8e8e8"; // blanc cassé pour jours normaux

          const hoverResetColor = isToday ? "#4ade80"
            : isFerie ? (isPast ? "#7a3030" : "#e85555")
            : isPast ? "#555"
            : isWeekend ? "#777"
            : "#e8e8e8";

          return (
            <button
              key={cell.day}
              onClick={() => onChange(dateStr)}
              style={{
                width: "100%",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: isSelected ? 800 : isToday ? 700 : isFerie ? 600 : 500,
                color: baseColor,
                background: isSelected ? "#4ade80" : isToday ? "rgba(74,222,128,0.1)" : "transparent",
                border: isToday && !isSelected ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 100ms",
                padding: 0,
              }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "#252525"; e.currentTarget.style.color = "white"; } }}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = isToday ? "rgba(74,222,128,0.1)" : "transparent"; e.currentTarget.style.color = hoverResetColor; } }}
            >
              {cell.day}
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
