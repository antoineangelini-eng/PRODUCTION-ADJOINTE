import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CASE_CREATED:               { label: "Dossier créé",               color: "#60a5fa", icon: "✦" },
  DESIGN_METAL_CELL_UPDATE:   { label: "Mise à jour Design Métal",   color: "#94a3b8", icon: "✎" },
  DESIGN_METAL_COMPLETED:     { label: "Design Métal terminé",       color: "#4ade80", icon: "→" },
  DESIGN_RESINE_CELL_UPDATE:  { label: "Mise à jour Design Résine",  color: "#94a3b8", icon: "✎" },
  DESIGN_RESINE_COMPLETED:    { label: "Design Résine terminé",      color: "#4ade80", icon: "→" },
  USINAGE_RESINE_CELL_UPDATE: { label: "Mise à jour Usinage Résine", color: "#94a3b8", icon: "✎" },
  USINAGE_TITANE_CELL_UPDATE: { label: "Mise à jour Usinage Titane", color: "#94a3b8", icon: "✎" },
  FINITION_CELL_UPDATE:       { label: "Mise à jour Finition",       color: "#94a3b8", icon: "✎" },
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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { case?: string; sector?: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("sector").eq("user_id", user.id).single();
  if (!profile) redirect("/login");

  const filterCase   = searchParams?.case   ?? "";
  const filterSector = searchParams?.sector ?? "";

  const { data: events, error } = await supabase
    .from("case_events")
    .select(`
      id, created_at, event_type, actor_sector, payload,
      cases:case_id (
        id, case_number, nature_du_travail
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return <div style={{ padding: 24 }}><pre style={{ color: "salmon" }}>{error.message}</pre></div>;

  let filtered = (events ?? []) as any[];

  if (filterCase) {
    filtered = filtered.filter((e) =>
      e.cases?.case_number?.toLowerCase().includes(filterCase.toLowerCase())
    );
  }
  if (filterSector) {
    filtered = filtered.filter((e) => e.actor_sector === filterSector);
  }

  // Grouper par dossier
  const grouped = new Map<string, { caseNumber: string; nature: string; events: any[] }>();
  for (const e of filtered) {
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

  const sectors = [
    { code: "", label: "Tous les secteurs" },
    { code: "design_metal",   label: "Design Métal" },
    { code: "design_resine",  label: "Design Résine" },
    { code: "usinage_titane", label: "Usinage Titane" },
    { code: "usinage_resine", label: "Usinage Résine" },
    { code: "finition",       label: "Finition" },
  ];

  return (
    <div style={{ padding: "16px 20px" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 18 }}>Historique</h1>

      {/* Filtres */}
      <form method="GET" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          name="case"
          defaultValue={filterCase}
          placeholder="Numéro du cas…"
          style={{
            padding: "7px 12px", border: "1px solid #333",
            background: "transparent", color: "white", fontSize: 13, width: 200, borderRadius: 8,
          }}
        />
        <select name="sector" defaultValue={filterSector} style={{
          padding: "7px 12px", border: "1px solid #333",
          background: "#111", color: "white", fontSize: 13, borderRadius: 8,
        }}>
          {sectors.map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
        <button type="submit" style={{
          padding: "7px 14px", border: "1px solid #444",
          background: "transparent", color: "white", cursor: "pointer",
          fontSize: 13, borderRadius: 8,
        }}>
          Filtrer
        </button>
        {(filterCase || filterSector) && (
          <Link href="/app/history" style={{
            padding: "7px 14px", border: "1px solid #333",
            background: "transparent", color: "#888",
            fontSize: 13, borderRadius: 8, textDecoration: "none",
          }}>
            Réinitialiser
          </Link>
        )}
      </form>

      <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
        {grouped.size} dossier{grouped.size > 1 ? "s" : ""} — {filtered.length} événement{filtered.length > 1 ? "s" : ""}
      </div>

      {grouped.size === 0 && (
        <div style={{ color: "#666", fontSize: 13 }}>Aucun événement trouvé.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from(grouped.entries()).map(([caseId, group]) => (
          <div key={caseId} style={{
            border: "1px solid #1e1e1e", borderRadius: 12,
            background: "#0d0d0d", overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 16px", borderBottom: "1px solid #1e1e1e",
              display: "flex", gap: 12, alignItems: "center", background: "#111",
            }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{group.caseNumber}</span>
              <span style={{
                fontSize: 11, padding: "2px 10px", borderRadius: 999,
                border: "1px solid #2a2a2a", background: "#0b0b0b", color: "#888",
              }}>
                {group.nature}
              </span>
              <span style={{ fontSize: 12, color: "#555", marginLeft: "auto" }}>
                {group.events.length} événement{group.events.length > 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ padding: "4px 0" }}>
              {group.events.map((e: any, i: number) => {
                const meta = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: "#666", icon: "·" };
                return (
                  <div key={e.id} style={{
                    display: "flex", gap: 14, padding: "8px 16px",
                    borderBottom: i < group.events.length - 1 ? "1px solid #141414" : "none",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: `1px solid ${meta.color}33`,
                      background: `${meta.color}11`,
                      display: "grid", placeItems: "center",
                      color: meta.color, fontSize: 13, flexShrink: 0,
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>
                          {meta.label}
                        </span>
                        {e.actor_sector && (
                          <span style={{
                            fontSize: 11, padding: "1px 8px", borderRadius: 4,
                            background: "rgba(255,255,255,0.05)", color: "#888",
                            border: "1px solid #2a2a2a",
                          }}>
                            {fmtSector(e.actor_sector)}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>
                          {fmtDate(e.created_at)}
                        </span>
                      </div>
                      <PatchSummary payload={e.payload} />
                      {e.event_type === "CASE_CREATED" && e.payload?.nature_du_travail && (
                        <div style={{ marginTop: 4, fontSize: 11, color: "#666" }}>
                          Nature : {e.payload.nature_du_travail}
                        </div>
                      )}
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
