"use client";

import { useMemo, useState } from "react";

type EventRow = {
  id: string;
  case_id: string;
  event_type: string;
  created_at: string;
  payload: any;
};

function formatDateFR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR");
}

function labelEvent(eventType: string) {
  if (eventType === "CASE_CREATED") return "Dossier créé";
  if (eventType === "DESIGN_METAL_COMPLETED") return "Design métal terminé";
  if (eventType === "DESIGN_CHASSIS_VALIDATED") return "Design châssis validé";
  return eventType;
}

export default function HistoryCaseList({
  grouped,
}: {
  grouped: Record<string, EventRow[]>;
}) {
  const [q, setQ] = useState("");

  const entries = useMemo(() => {
    const all = Object.entries(grouped);

    const filtered =
      q.trim() === ""
        ? all
        : all.filter(([caseKey]) =>
            caseKey.toLowerCase().includes(q.trim().toLowerCase())
          );

    // tri par dernier event (le plus récent), en supposant caseEvents déjà triés desc
    return filtered.sort(([, a], [, b]) => {
      const dateA = new Date(a[0].created_at).getTime();
      const dateB = new Date(b[0].created_at).getTime();
      return dateB - dateA;
    });
  }, [grouped, q]);

  return (
    <div>
      {/* Barre recherche */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un numéro de cas…"
          style={{
            width: 360,
            padding: "10px 12px",
            border: "1px solid #2b2b2b",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            color: "white",
            outline: "none",
          }}
        />
        <div style={{ opacity: 0.75, fontSize: 13 }}>{entries.length} cas</div>
      </div>

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map(([caseKey, caseEvents]) => {
          const last = caseEvents[0]; // plus récent
          const lastLabel = last ? labelEvent(last.event_type) : "—";
          const lastDate = last ? formatDateFR(last.created_at) : "";

          return (
            <div
              key={caseKey}
              style={{
                border: "1px solid #222",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                overflow: "hidden",
              }}
            >
              {/* Header cas */}
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #1b1b1b",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
                    Cas #{caseKey}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Dernière action : <span style={{ opacity: 0.95 }}>{lastLabel}</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap" }}>
                  {lastDate}
                </div>
              </div>

              {/* Timeline */}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {caseEvents.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 13,
                        opacity: 0.9,
                      }}
                    >
                      <span>{labelEvent(e.event_type)}</span>
                      <span style={{ opacity: 0.6, whiteSpace: "nowrap" }}>
                        {formatDateFR(e.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div style={{ opacity: 0.7 }}>Aucun résultat.</div>
        )}
      </div>
    </div>
  );
}