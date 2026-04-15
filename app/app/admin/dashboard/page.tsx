import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

type Period = "today" | "7d" | "30d";

function periodStart(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "today") return d;
  if (p === "7d") { d.setDate(d.getDate() - 6); return d; }
  d.setDate(d.getDate() - 29);
  return d;
}

function periodLabel(p: Period): string {
  return p === "today" ? "Aujourd'hui" : p === "7d" ? "7 derniers jours" : "30 derniers jours";
}

function fmtSector(s: string | null): string {
  switch (s) {
    case "design_metal": return "Design Métal";
    case "design_resine": return "Design Résine";
    case "usinage_titane": return "Usinage Titane";
    case "usinage_resine": return "Usinage Résine";
    case "finition": return "Finition";
    case "admin": return "Admin";
    default: return s ?? "—";
  }
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a.slice(0, 10) + "T00:00:00").getTime();
  const d2 = new Date(b.slice(0, 10) + "T00:00:00").getTime();
  return Math.round((d2 - d1) / 86400000);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: Period }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("sectors, sector").eq("user_id", user.id).single();
  const userSectors: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!userSectors.includes("admin")) redirect("/app");

  const params = await searchParams;
  const period: Period = (params?.period as Period) ?? "7d";
  const startISO = periodStart(period).toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();

  // ── Events dans la période ─────────────────────────────────────────────
  const { data: events } = await admin
    .from("case_events")
    .select("id, event_type, created_at, created_by, actor_sector")
    .gte("created_at", startISO)
    .order("created_at", { ascending: false })
    .limit(5000);

  const evs = (events ?? []) as Array<{ id: string; event_type: string; created_at: string; created_by: string | null; actor_sector: string | null }>;

  // ── Cas : total, terminés, en retard ──────────────────────────────────
  const { data: allCases } = await admin
    .from("cases")
    .select("id, case_number, date_expedition, nature_du_travail, created_at");
  const cases = (allCases ?? []) as Array<{ id: string; case_number: string | null; date_expedition: string | null; nature_du_travail: string | null; created_at: string | null }>;

  // Terminés = cas ayant un événement CASE_COMPLETED
  const { data: completedEvs } = await admin
    .from("case_events")
    .select("case_id, created_at")
    .eq("event_type", "CASE_COMPLETED");
  const completedSet = new Set<string>((completedEvs ?? []).map((e: any) => e.case_id));
  const completedInPeriod = (completedEvs ?? []).filter((e: any) => e.created_at >= startISO).length;

  const createdInPeriod = evs.filter(e => e.event_type === "CASE_CREATED" || e.event_type === "case_created").length;
  const activeCases = cases.filter(c => !completedSet.has(c.id));
  const lateCases = activeCases.filter(c => c.date_expedition && c.date_expedition < todayStr)
    .sort((a, b) => (a.date_expedition ?? "").localeCompare(b.date_expedition ?? ""));

  // ── Noms des utilisateurs ─────────────────────────────────────────────
  const userIds = Array.from(new Set(evs.map(e => e.created_by).filter(Boolean))) as string[];
  const { data: names } = userIds.length
    ? await admin.from("user_display_names").select("user_id, display_name").in("user_id", userIds)
    : { data: [] as Array<{ user_id: string; display_name: string }> };
  const nameMap = new Map<string, string>();
  for (const n of (names ?? [])) {
    const raw = n.display_name ?? "";
    nameMap.set(n.user_id, raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—");
  }

  // ── Agrégation par secteur ─────────────────────────────────────────────
  const bySector = new Map<string, { updates: number; completions: number; total: number }>();
  for (const e of evs) {
    const s = e.actor_sector;
    if (!s) continue;
    const b = bySector.get(s) ?? { updates: 0, completions: 0, total: 0 };
    if (e.event_type.endsWith("_COMPLETED") || e.event_type === "CASE_COMPLETED") b.completions++;
    else if (e.event_type.endsWith("_CELL_UPDATE")) b.updates++;
    b.total++;
    bySector.set(s, b);
  }
  const sectorRows = Array.from(bySector.entries())
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.total - a.total);

  // ── Agrégation par utilisateur ─────────────────────────────────────────
  const byUser = new Map<string, { created: number; updates: number; completions: number; total: number; sector: string | null }>();
  for (const e of evs) {
    const u = e.created_by;
    if (!u) continue;
    const b = byUser.get(u) ?? { created: 0, updates: 0, completions: 0, total: 0, sector: e.actor_sector };
    if (e.event_type === "CASE_CREATED" || e.event_type === "case_created") b.created++;
    else if (e.event_type.endsWith("_COMPLETED") || e.event_type === "CASE_COMPLETED") b.completions++;
    else if (e.event_type.endsWith("_CELL_UPDATE")) b.updates++;
    b.total++;
    if (!b.sector && e.actor_sector) b.sector = e.actor_sector;
    byUser.set(u, b);
  }
  const userRows = Array.from(byUser.entries())
    .map(([id, v]) => ({ id, name: nameMap.get(id) ?? id.slice(0, 8), ...v }))
    .sort((a, b) => b.total - a.total);

  // ── Styles ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#888", fontWeight: 600, borderBottom: "1px solid #1e1e1e" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#ddd", borderBottom: "1px solid #141414" };

  const kpi = (label: string, value: number | string, color: string) => (
    <div style={{ ...card, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Tableau de bord</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {(["today", "7d", "30d"] as Period[]).map(p => (
            <Link key={p} href={`/app/admin/dashboard?period=${p}`} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
              border: period === p ? "1px solid #4ade80" : "1px solid #2a2a2a",
              background: period === p ? "rgba(74,222,128,0.12)" : "transparent",
              color: period === p ? "#4ade80" : "#888", textDecoration: "none",
            }}>{periodLabel(p)}</Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {kpi("Cas créés", createdInPeriod, "#60a5fa")}
        {kpi("Cas validés", completedInPeriod, "#4ade80")}
        {kpi("Cas actifs", activeCases.length, "#e0e0e0")}
        {kpi("Cas en retard", lateCases.length, lateCases.length > 0 ? "#f87171" : "#4ade80")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Activité par secteur */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Activité par secteur — {periodLabel(period)}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Secteur</th><th style={{ ...th, textAlign: "right" }}>Maj</th>
              <th style={{ ...th, textAlign: "right" }}>Validations</th><th style={{ ...th, textAlign: "right" }}>Total</th>
            </tr></thead>
            <tbody>
              {sectorRows.length === 0 && <tr><td colSpan={4} style={{ ...td, color: "#666", textAlign: "center" }}>Aucune activité</td></tr>}
              {sectorRows.map(s => (
                <tr key={s.code}>
                  <td style={td}>{fmtSector(s.code)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{s.updates}</td>
                  <td style={{ ...td, textAlign: "right", color: "#4ade80" }}>{s.completions}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activité par utilisateur */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Activité par utilisateur — {periodLabel(period)}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Utilisateur</th><th style={th}>Secteur</th>
              <th style={{ ...th, textAlign: "right" }}>Créés</th>
              <th style={{ ...th, textAlign: "right" }}>Maj</th>
              <th style={{ ...th, textAlign: "right" }}>Val.</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
            </tr></thead>
            <tbody>
              {userRows.length === 0 && <tr><td colSpan={6} style={{ ...td, color: "#666", textAlign: "center" }}>Aucune activité</td></tr>}
              {userRows.slice(0, 20).map(u => (
                <tr key={u.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...td, color: "#888" }}>{fmtSector(u.sector)}</td>
                  <td style={{ ...td, textAlign: "right", color: "#60a5fa" }}>{u.created || ""}</td>
                  <td style={{ ...td, textAlign: "right" }}>{u.updates || ""}</td>
                  <td style={{ ...td, textAlign: "right", color: "#4ade80" }}>{u.completions || ""}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{u.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cas en retard */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>
          Cas en retard ({lateCases.length})
        </div>
        {lateCases.length === 0 ? (
          <div style={{ color: "#666", fontSize: 12, padding: "8px 0" }}>Aucun cas en retard 🎉</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>N° cas</th><th style={th}>Nature</th>
              <th style={th}>Date expédition</th>
              <th style={{ ...th, textAlign: "right" }}>Retard</th>
            </tr></thead>
            <tbody>
              {lateCases.slice(0, 20).map(c => {
                const delay = c.date_expedition ? daysBetween(c.date_expedition, todayStr) : 0;
                return (
                  <tr key={c.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{c.case_number ?? "—"}</td>
                    <td style={{ ...td, color: "#aaa" }}>{c.nature_du_travail ?? "—"}</td>
                    <td style={td}>{fmtDate(c.date_expedition)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#f87171", fontWeight: 700 }}>
                      {delay} j
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
