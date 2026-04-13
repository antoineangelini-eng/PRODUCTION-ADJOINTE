import { createClient } from "@/lib/supabase/server";

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CASE_CREATED:               { label: "Dossier créé",               color: "#60a5fa", icon: "✦" },
  DESIGN_METAL_CELL_UPDATE:   { label: "Mise à jour",                color: "#94a3b8", icon: "✎" },
  DESIGN_METAL_COMPLETED:     { label: "Design Métal terminé",       color: "#4ade80", icon: "→" },
  DESIGN_RESINE_CELL_UPDATE:  { label: "Mise à jour",                color: "#94a3b8", icon: "✎" },
  DESIGN_RESINE_COMPLETED:    { label: "Design Résine terminé",      color: "#4ade80", icon: "→" },
  USINAGE_RESINE_CELL_UPDATE: { label: "Mise à jour",                color: "#94a3b8", icon: "✎" },
  USINAGE_TITANE_CELL_UPDATE: { label: "Mise à jour",                color: "#94a3b8", icon: "✎" },
  FINITION_CELL_UPDATE:       { label: "Mise à jour",                color: "#94a3b8", icon: "✎" },
  CASE_COMPLETED:             { label: "Dossier validé ✓",           color: "#facc15", icon: "★" },
};

function fmtDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtSector(sector: string | null) {
  switch (sector) {
    case "design_metal":   return "Design Métal";
    case "design_resine":  return "Design Résine";
    case "usinage_titane": return "Usinage Titane";
    case "usinage_resine": return "Usinage Résine";
    case "finition":       return "Finition";
    case "admin":          return "Admin";
    default:               return sector ?? "—";
  }
}

function PatchSummary({ payload }: { payload: any }) {
  if (!payload?.patch) return null;
  const entries = Object.entries(payload.patch as Record<string, any>);
  if (entries.length === 0) return null;
  return (
    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 4,
          background: "rgba(255,255,255,0.06)", color: "#aaa",
          border: "1px solid #2a2a2a",
        }}>
          {k} : {v === null ? "—" : String(v)}
        </span>
      ))}
    </div>
  );
}

export async function SectorHistoryTab({ sectorCode }: { sectorCode: string }) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("case_assignments")
    .select("case_id")
    .eq("sector_code", sectorCode)
    .limit(200);

  const caseIds = (assignments ?? []).map((a: any) => a.case_id);

  if (caseIds.length === 0) {
    return (
      <div style={{ padding: "24px 0", color: "#666", fontSize: 13 }}>
        Aucun dossier dans ce secteur.
      </div>
    );
  }

  const { data: events, error } = await supabase
    .from("case_events")
    .select(`
      id, created_at, event_type, actor_sector, payload,
      cases:case_id (
        id, case_number, nature_du_travail
      )
    `)
    .in("case_id", caseIds)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return <div style={{ color: "salmon", padding: 16 }}>{error.message}</div>;

  const grouped = new Map<string, { caseNumber: string; nature: string; events: any[] }>();
  for (const e of (events ?? []) as any[]) {
    const caseId = e.cases?.id ?? "unknown";
    if (!grouped.has(caseId)) {
      grouped.set(caseId, {
        caseNumber: e.cases?.case_number ?? "?",
        nature: e.cases?.nature_du_travail ?? "—",
        events: [],
      });
    }
    grouped.get(caseId)!.events.push(e);
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
        {grouped.size} dossier{grouped.size > 1 ? "s" : ""} — {events?.length ?? 0} événements
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from(grouped.entries()).map(([caseId, group]) => (
          <div key={caseId} style={{
            border: "1px solid #1e1e1e", borderRadius: 12,
            background: "#0d0d0d", overflow: "hidden",
          }}>
            <div style={{
              padding: "9px 14px", borderBottom: "1px solid #1e1e1e",
              display: "flex", gap: 12, alignItems: "center", background: "#111",
            }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{group.caseNumber}</span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999,
                border: "1px solid #2a2a2a", background: "#0b0b0b", color: "#888",
              }}>{group.nature}</span>
              <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>
                {group.events.length} événement{group.events.length > 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ padding: "2px 0" }}>
              {group.events.map((e: any, i: number) => {
                const meta = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: "#666", icon: "·" };
                return (
                  <div key={e.id} style={{
                    display: "flex", gap: 12, padding: "7px 14px",
                    borderBottom: i < group.events.length - 1 ? "1px solid #141414" : "none",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      border: `1px solid ${meta.color}33`,
                      background: `${meta.color}11`,
                      display: "grid", placeItems: "center",
                      color: meta.color, fontSize: 12, flexShrink: 0,
                    }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
                          {meta.label}
                        </span>
                        {e.actor_sector && (
                          <span style={{
                            fontSize: 11, padding: "1px 7px", borderRadius: 4,
                            background: "rgba(255,255,255,0.05)", color: "#888",
                            border: "1px solid #2a2a2a",
                          }}>{fmtSector(e.actor_sector)}</span>
                        )}
                        <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>
                          {fmtDate(e.created_at)}
                        </span>
                      </div>
                      <PatchSummary payload={e.payload} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
