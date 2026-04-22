"use client";
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

/**
 * Modal pour saisir la raison de mise en attente.
 * Utilisée par tous les tableaux secteur.
 */
const DEFAULT_REASONS = [
  "Empreintes",
  "Teintes",
  "Occlusion",
  "Nomenclature",
  "Validation",
];

export function OnHoldReasonModal({
  caseNumber,
  onConfirm,
  onCancel,
  presetReasons,
}: {
  caseNumber: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  presetReasons?: string[];
}) {
  const reasons = presetReasons ?? DEFAULT_REASONS;
  const otherFirst = reasons[0] === "__other_first__";
  const displayReasons = otherFirst ? reasons.slice(1) : reasons;
  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const customRef = useRef<HTMLTextAreaElement>(null);
  const isOther = selected === "__other__";

  useEffect(() => {
    if (isOther) customRef.current?.focus();
  }, [isOther]);

  function handleSelect(value: string) {
    if (value === "__other__") {
      setSelected("__other__");
    } else {
      // Sélection directe → confirmer immédiatement
      onConfirm(value);
    }
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 16px",
    borderRadius: 8,
    border: active ? "1px solid #f59e0b" : "1px solid #333",
    background: active ? "rgba(245,158,11,0.12)" : "#111",
    color: active ? "#f59e0b" : "white",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 150ms",
    textAlign: "left" as const,
    width: "100%",
  });

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Escape") onCancel(); }}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: 12,
          padding: "24px 28px", width: 360,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>
          Mettre en attente
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", marginBottom: 16 }}>
          {caseNumber}
        </div>

        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>
          Raison
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {otherFirst && (
            <button onClick={() => handleSelect("__other__")} style={btnStyle(isOther)}>
              Autre…
            </button>
          )}
          {displayReasons.map(r => (
            <button key={r} onClick={() => handleSelect(r)} style={btnStyle(selected === r)}>
              {r}
            </button>
          ))}
          {!otherFirst && (
            <button onClick={() => handleSelect("__other__")} style={btnStyle(isOther)}>
              Autre…
            </button>
          )}
        </div>

        {isOther && (
          <textarea
            ref={customRef}
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            placeholder="Préciser la raison…"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (customReason.trim()) onConfirm(customReason.trim());
              }
            }}
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 8,
              background: "#111", border: "1px solid #f59e0b40", borderRadius: 8,
              color: "white", fontSize: 13, padding: "8px 10px",
              outline: "none", resize: "vertical", fontFamily: "inherit",
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1px solid #444", background: "transparent",
              color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Annuler
          </button>
          {isOther && (
            <button
              onClick={() => { if (customReason.trim()) onConfirm(customReason.trim()); }}
              disabled={!customReason.trim()}
              style={{
                padding: "8px 18px", borderRadius: 8,
                border: "1px solid #f59e0b", background: customReason.trim() ? "rgba(245,158,11,0.12)" : "transparent",
                color: customReason.trim() ? "#f59e0b" : "#555", fontSize: 13, fontWeight: 700,
                cursor: customReason.trim() ? "pointer" : "not-allowed",
              }}
            >
              Confirmer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Tooltip pour afficher la raison d'attente au clic sur le badge.
 */
export function OnHoldReasonTooltip({
  reason,
  onHoldAt,
  anchorRect,
  onClose,
}: {
  reason: string | null;
  onHoldAt: string | null;
  anchorRect: { top: number; left: number; width: number; bottom: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    // Petit délai pour ne pas capturer le clic qui ouvre le tooltip
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 10);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleClick); };
  }, [onClose]);

  const dateStr = onHoldAt
    ? new Date(onHoldAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const isPreset = reason && ["Empreintes", "Teintes", "Occlusion", "Nomenclature", "Validation"].includes(reason);

  // Position : en dessous du badge, centré
  const tooltipW = 240;
  const left = Math.max(8, anchorRect.left + anchorRect.width / 2 - tooltipW / 2);
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUp = spaceBelow < 120;

  const posStyle: React.CSSProperties = openUp
    ? { position: "fixed", bottom: window.innerHeight - anchorRect.top + 6, left, width: tooltipW }
    : { position: "fixed", top: anchorRect.bottom + 6, left, width: tooltipW };

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{
        ...posStyle,
        zIndex: 10000,
        background: "#1e1e1e",
        border: "1px solid rgba(245,158,11,0.35)",
        borderRadius: 10,
        boxShadow: "0 12px 36px rgba(0,0,0,0.65), 0 0 0 1px rgba(245,158,11,0.1)",
        overflow: "hidden",
      }}
    >
      {/* Barre orange */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #f59e0b, #f97316)", opacity: 0.8 }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Raison */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: dateStr ? 10 : 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{isPreset ? "📋" : "💬"}</span>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: "#f59e0b",
            lineHeight: 1.3,
          }}>
            {reason || "Aucune raison indiquée"}
          </span>
        </div>

        {/* Date */}
        {dateStr && (
          <div style={{
            fontSize: 11, color: "#777",
            borderTop: "1px solid #2a2a2a",
            paddingTop: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>🕐</span>
            {dateStr}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
