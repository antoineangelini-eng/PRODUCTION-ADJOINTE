"use client";
import React, { useEffect, useRef, useState } from "react";
import { getCaseDetailAction, type CaseDetail } from "@/app/app/finition/actions";

const NATURE_META: Record<string, { color: string }> = {
  "Chassis Argoat":    { color: "#e07070" },
  "Chassis Dent All":  { color: "#4ade80" },
  "Définitif Résine":  { color: "#c4a882" },
  "Provisoire Résine": { color: "#9487a8" },
};

const ANIM_STYLES = `
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0px rgba(245,158,11,0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(245,158,11,0);   }
  100% { box-shadow: 0 0 0 0px rgba(245,158,11,0);   }
}
.modal-box { animation: modal-in 220ms cubic-bezier(0.16,1,0.3,1) forwards; }
.pulse-dot { animation: pulse-ring 1.8s ease-out infinite; }
`;

function fmtDate(val: string | null | undefined, withTime = true): string {
  if (!val) return "";
  const d = new Date(val);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function toDateOnly(d: Date): string { return d.toISOString().split("T")[0]; }

function businessDaysDiff(from: Date, to: Date): number {
  const sign = to >= from ? 1 : -1;
  let current = new Date(from);
  let count = 0;
  while (toDateOnly(current) !== toDateOnly(to)) {
    current.setDate(current.getDate() + sign);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count += sign;
  }
  return count;
}

function getExpeditionLabel(dateExpedition: string | null) {
  if (!dateExpedition) return { label: "—", sublabel: "", color: "#555" };
  const todayStr  = toDateOnly(new Date());
  const expStr    = dateExpedition.slice(0, 10);
  const expDate   = new Date(expStr + "T00:00:00");
  const todayDate = new Date(todayStr + "T00:00:00");
  const dateLabel = expDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (expStr === todayStr) return { label: dateLabel, sublabel: "Aujourd'hui", color: "#f59e0b" };
  const diff = businessDaysDiff(todayDate, expDate);
  if (diff < 0) {
    const abs = Math.abs(diff);
    return { label: dateLabel, sublabel: `En retard de ${abs} jour${abs > 1 ? "s" : ""} ouvré${abs > 1 ? "s" : ""}`, color: "#f87171" };
  }
  return { label: dateLabel, sublabel: `Dans ${diff} jour${diff > 1 ? "s" : ""} ouvré${diff > 1 ? "s" : ""}`, color: diff <= 1 ? "#f59e0b" : "#4ade80" };
}

type Step = {
  id: string;
  sector: string;
  sectorColor: string;
  label: string;
  done: boolean;
  at: string | null;
  updatedBy: string | null;
};

function buildSteps(detail: CaseDetail): Step[] {
  const nature = detail.nature_du_travail ?? "";
  const isChassisArgoat = nature === "Chassis Argoat";
  const isResine = nature === "Provisoire Résine" || nature === "Définitif Résine";
  const steps: Step[] = [];

  if (!isResine) {
    steps.push({
      id: "dm_chassis", sector: "Design Métal", sectorColor: "#4ade80",
      label: "Design châssis",
      done: Boolean(detail.design_metal?.design_chassis),
      at: detail.design_metal?.design_chassis_at ?? null,
      updatedBy: detail.design_metal?.updated_by ?? null,
    });
  }
  if (detail.design_resine) {
    steps.push({
      id: "dr_dents", sector: "Design Résine", sectorColor: "#7c8196",
      label: "Design dents résine",
      done: Boolean(detail.design_resine?.design_dents_resine),
      at: detail.design_resine?.design_dents_resine_at ?? null,
      updatedBy: detail.design_resine?.updated_by ?? null,
    });
  }
  if (isChassisArgoat && detail.usinage_titane) {
    steps.push({
      id: "ut_envoye", sector: "Usinage Titane", sectorColor: "#f59e0b",
      label: "Envoyé en usinage",
      done: Boolean(detail.usinage_titane?.envoye_usinage),
      at: detail.usinage_titane?.envoye_usinage_at ?? null,
      updatedBy: detail.usinage_titane?.updated_by ?? null,
    });
  }
  if (detail.usinage_resine) {
    steps.push({
      id: "ur_production", sector: "Usinage Résine", sectorColor: "#7c8196",
      label: "Production",
      done: Boolean(detail.usinage_resine?.usinage_dents_resine),
      at: detail.usinage_resine?.usinage_dents_resine_at ?? null,
      updatedBy: detail.usinage_resine?.updated_by ?? null,
    });
  }
  return steps;
}

function findLastStep(steps: Step[]): string | null {
  const withTs = steps.filter((s) => s.done && s.at)
    .sort((a, b) => new Date(b.at!).getTime() - new Date(a.at!).getTime());
  if (withTs.length > 0) return withTs[0].id;
  const lastDone = [...steps].reverse().find((s) => s.done);
  return lastDone?.id ?? null;
}

const DOT_SIZE = 28;

export function CaseDetailModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [detail, setDetail]   = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const mouseDownTarget       = useRef<EventTarget | null>(null);

  useEffect(() => {
    getCaseDetailAction(caseId).then((d) => { setDetail(d); setLoading(false); });
  }, [caseId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps      = detail ? buildSteps(detail) : [];
  const lastStep   = findLastStep(steps);
  const nature     = detail?.nature_du_travail ?? "";
  const natureMeta = NATURE_META[nature] ?? { color: "#aaa" };
  const exp        = getExpeditionLabel(detail?.date_expedition ?? null);

  return (
    <div
      onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLES }} />
      <div className="modal-box" style={{
        background: "#111", border: "1px solid #2a2a2a",
        borderRadius: 14, width: "100%", maxWidth: 480,
        maxHeight: "80vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid #1a1a1a",
          position: "sticky", top: 0, background: "#161616", zIndex: 1,
          borderRadius: "14px 14px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "white" }}>
              Cas {detail?.case_number ?? "…"}
            </span>
            {detail && (
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: natureMeta.color + "18", border: `1px solid ${natureMeta.color}50`,
                color: natureMeta.color,
              }}>{nature}</span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #2a2a2a", borderRadius: 6,
            color: "#aaa", cursor: "pointer", width: 30, height: 30,
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 150ms",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#aaa"; }}
          >×</button>
        </div>

        {/* Infos cas */}
        {detail && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Expédition — mis en avant */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#aaa" }}>Expédition prévue :</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{exp.label}</span>
              </div>
              {exp.sublabel && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
                  background: exp.color + "15", border: `1px solid ${exp.color}40`, color: exp.color,
                }}>{exp.sublabel}</span>
              )}
            </div>
            {/* Création — discret en dessous */}
            {detail.created_at && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>Créé le</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>{fmtDate(detail.created_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div style={{ padding: "20px 20px 8px" }}>
          {loading && (
            <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Chargement…</div>
          )}
          {!loading && steps.length === 0 && (
            <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Aucune tâche trouvée.</div>
          )}
          {!loading && steps.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {steps.map((step, i) => {
                const isLast    = step.id === lastStep;
                const isLastIdx = i === steps.length - 1;
                const displayName = step.updatedBy ? (detail?.userNames?.[step.updatedBy] ?? null) : null;

                return (
                  <div key={step.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    paddingTop: 10, paddingBottom: 10,
                    position: "relative",
                  }}>
                    {!isLastIdx && (
                      <div style={{
                        position: "absolute",
                        left: DOT_SIZE / 2,
                        top: DOT_SIZE + 12 + 2,
                        bottom: -(10),
                        width: 1,
                        borderLeft: `1px ${step.done ? "solid" : "dashed"} ${step.done ? "#444" : "#2a2a2a"}`,
                      }} />
                    )}
                    {/* Dot */}
                    <div
                      className={isLast && step.done ? "pulse-dot" : ""}
                      style={{
                        width: DOT_SIZE, height: DOT_SIZE, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, boxSizing: "border-box", marginTop: 2,
                        background: step.done
                          ? (isLast ? step.sectorColor + "25" : "rgba(74,222,128,0.12)")
                          : "rgba(255,255,255,0.05)",
                        border: `2px solid ${step.done
                          ? (isLast ? step.sectorColor : "rgba(74,222,128,0.5)")
                          : "#3a3a3a"}`,
                      }}>
                      {step.done
                        ? <span style={{ fontSize: 12, fontWeight: 800, color: isLast ? step.sectorColor : "#4ade80", lineHeight: 1 }}>✓</span>
                        : <span style={{ fontSize: 14, color: "#3a3a3a", lineHeight: 1, marginTop: -1 }}>–</span>
                      }
                    </div>

                    {/* Gauche : label en grand + secteur en badge dessous */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: step.done ? 700 : 400, color: step.done ? "white" : "#555", marginBottom: 4 }}>
                        {step.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: step.sectorColor + "22",
                          border: `1px solid ${step.sectorColor}50`,
                          color: step.sectorColor,
                        }}>{step.sector}</span>

                      </div>
                    </div>

                    {/* Séparateur */}
                    <div style={{ width: 1, height: 32, background: "#1a1a1a", flexShrink: 0 }} />

                    {/* Droite : date + nom */}
                    <div style={{ textAlign: "right", flexShrink: 0, marginTop: 2 }}>
                      {step.at
                        ? <div style={{ fontSize: 11, color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDate(step.at)}</div>
                        : !step.done && <div style={{ fontSize: 11, color: "#3a3a3a" }}>En attente</div>
                      }
                      {step.done && displayName && (
                        <div style={{ fontSize: 11, color: "white", fontWeight: 600, marginTop: 2 }}>{displayName}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
