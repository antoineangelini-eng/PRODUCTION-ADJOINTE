"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Period = "today" | "7d" | "30d";

export type DashboardData = {
  period: Period;
  kpi: { created: number; completed: number; active: number; late: number };
  bySector: Array<{ code: string; updates: number; completions: number; total: number }>;
  byUser:   Array<{ id: string; name: string; sector: string | null; created: number; updates: number; completions: number; total: number }>;
  lateCases: Array<{ id: string; case_number: string | null; nature_du_travail: string | null; date_expedition: string | null; delay: number }>;
};

export type UserCaseDetail = {
  caseId: string;
  caseNumber: string | null;
  nature: string | null;
  actions: Array<{ type: string; at: string; fields: string[]; sector: string | null }>;
};

export type UserDetailData = {
  userId: string;
  name: string;
  totalActions: number;
  cases: UserCaseDetail[]; // sorted by most recent action
};

export type SectorDelays = {
  global: Array<{ sector: string; avgHours: number; count: number }>;
  period: Array<{ sector: string; avgHours: number; count: number }>;
};

function periodStart(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "today") return d;
  if (p === "7d") { d.setDate(d.getDate() - 6); return d; }
  d.setDate(d.getDate() - 29);
  return d;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a.slice(0, 10) + "T00:00:00").getTime();
  const d2 = new Date(b.slice(0, 10) + "T00:00:00").getTime();
  return Math.round((d2 - d1) / 86400000);
}

export async function loadDashboardDataAction(period: Period): Promise<DashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("sectors, sector").eq("user_id", user.id).single();
  const userSectors: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!userSectors.includes("admin")) throw new Error("Forbidden");

  const admin = createAdminClient();
  const startISO = periodStart(period).toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: events } = await admin
    .from("case_events")
    .select("id, event_type, created_at, created_by, actor_sector")
    .gte("created_at", startISO)
    .order("created_at", { ascending: false })
    .limit(5000);
  const evs = (events ?? []) as Array<{ id: string; event_type: string; created_at: string; created_by: string | null; actor_sector: string | null }>;

  const { data: allCases } = await admin
    .from("cases")
    .select("id, case_number, date_expedition, nature_du_travail");
  const cases = (allCases ?? []) as Array<{ id: string; case_number: string | null; date_expedition: string | null; nature_du_travail: string | null }>;

  const { data: completedEvs } = await admin
    .from("case_events")
    .select("case_id, created_at")
    .eq("event_type", "CASE_COMPLETED");
  const completedSet = new Set<string>((completedEvs ?? []).map((e: any) => e.case_id));
  const completedInPeriod = (completedEvs ?? []).filter((e: any) => e.created_at >= startISO).length;

  const createdInPeriod = evs.filter(e => e.event_type === "CASE_CREATED" || e.event_type === "case_created").length;
  const activeCases = cases.filter(c => !completedSet.has(c.id));
  const lateSrc = activeCases
    .filter(c => c.date_expedition && c.date_expedition < todayStr)
    .sort((a, b) => (a.date_expedition ?? "").localeCompare(b.date_expedition ?? ""));

  const userIds = Array.from(new Set(evs.map(e => e.created_by).filter(Boolean))) as string[];
  const { data: names } = userIds.length
    ? await admin.from("user_display_names").select("user_id, display_name").in("user_id", userIds)
    : { data: [] as Array<{ user_id: string; display_name: string }> };
  const nameMap = new Map<string, string>();
  for (const n of (names ?? [])) {
    const raw = n.display_name ?? "";
    nameMap.set(n.user_id, raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—");
  }

  const bySectorMap = new Map<string, { updates: number; completions: number; total: number }>();
  for (const e of evs) {
    const s = e.actor_sector;
    if (!s) continue;
    const b = bySectorMap.get(s) ?? { updates: 0, completions: 0, total: 0 };
    if (e.event_type.endsWith("_COMPLETED") || e.event_type === "CASE_COMPLETED") b.completions++;
    else if (e.event_type.endsWith("_CELL_UPDATE")) b.updates++;
    b.total++;
    bySectorMap.set(s, b);
  }

  const byUserMap = new Map<string, { created: number; updates: number; completions: number; total: number; sector: string | null }>();
  for (const e of evs) {
    const u = e.created_by;
    if (!u) continue;
    const b = byUserMap.get(u) ?? { created: 0, updates: 0, completions: 0, total: 0, sector: e.actor_sector };
    if (e.event_type === "CASE_CREATED" || e.event_type === "case_created") b.created++;
    else if (e.event_type.endsWith("_COMPLETED") || e.event_type === "CASE_COMPLETED") b.completions++;
    else if (e.event_type.endsWith("_CELL_UPDATE")) b.updates++;
    b.total++;
    if (!b.sector && e.actor_sector) b.sector = e.actor_sector;
    byUserMap.set(u, b);
  }

  return {
    period,
    kpi: { created: createdInPeriod, completed: completedInPeriod, active: activeCases.length, late: lateSrc.length },
    bySector: Array.from(bySectorMap.entries()).map(([code, v]) => ({ code, ...v })).sort((a, b) => b.total - a.total),
    byUser: Array.from(byUserMap.entries())
      .map(([id, v]) => ({ id, name: nameMap.get(id) ?? id.slice(0, 8), ...v }))
      .sort((a, b) => b.total - a.total),
    lateCases: lateSrc.slice(0, 20).map(c => ({
      ...c,
      delay: c.date_expedition ? daysBetween(c.date_expedition, todayStr) : 0,
    })),
  };
}

// ─── Détail d'un utilisateur ────────────────────────────────────────────────
export async function loadUserDetailAction(userId: string, period: Period): Promise<UserDetailData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("sectors, sector").eq("user_id", user.id).single();
  const userSectors: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!userSectors.includes("admin")) throw new Error("Forbidden");

  const admin = createAdminClient();
  const startISO = periodStart(period).toISOString();

  const { data: events } = await admin
    .from("case_events")
    .select("id, event_type, created_at, actor_sector, case_id, payload")
    .eq("created_by", userId)
    .gte("created_at", startISO)
    .order("created_at", { ascending: false })
    .limit(2000);

  const evs = (events ?? []) as Array<{ id: string; event_type: string; created_at: string; actor_sector: string | null; case_id: string; payload: any }>;

  const caseIds = Array.from(new Set(evs.map(e => e.case_id)));
  const { data: casesData } = caseIds.length
    ? await admin.from("cases").select("id, case_number, nature_du_travail").in("id", caseIds)
    : { data: [] };
  const caseMap = new Map<string, { case_number: string | null; nature_du_travail: string | null }>();
  for (const c of (casesData ?? [])) caseMap.set(c.id, { case_number: c.case_number, nature_du_travail: c.nature_du_travail });

  const { data: nameRow } = await admin
    .from("user_display_names").select("display_name").eq("user_id", userId).maybeSingle();
  const rawName = (nameRow as any)?.display_name ?? "";
  const name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : userId.slice(0, 8);

  // Grouper par cas
  const grouped = new Map<string, UserCaseDetail>();
  for (const e of evs) {
    const info = caseMap.get(e.case_id);
    if (!grouped.has(e.case_id)) {
      grouped.set(e.case_id, {
        caseId: e.case_id,
        caseNumber: info?.case_number ?? null,
        nature: info?.nature_du_travail ?? null,
        actions: [],
      });
    }
    const fields = e.payload?.patch ? Object.keys(e.payload.patch) : [];
    grouped.get(e.case_id)!.actions.push({
      type: e.event_type,
      at: e.created_at,
      fields,
      sector: e.actor_sector,
    });
  }

  const cases = Array.from(grouped.values()).sort((a, b) => {
    const la = a.actions[0]?.at ?? "";
    const lb = b.actions[0]?.at ?? "";
    return lb.localeCompare(la);
  });

  return { userId, name, totalActions: evs.length, cases };
}

// ─── Délais moyens par secteur (global + période) ──────────────────────────
export async function loadSectorDelaysAction(period: Period): Promise<SectorDelays> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("sectors, sector").eq("user_id", user.id).single();
  const userSectors: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!userSectors.includes("admin")) throw new Error("Forbidden");

  const admin = createAdminClient();
  const startISO = periodStart(period).toISOString();

  const { data: events } = await admin
    .from("case_events")
    .select("event_type, created_at, actor_sector, case_id")
    .not("actor_sector", "is", null)
    .order("created_at", { ascending: true })
    .limit(30000);

  const evs = (events ?? []) as Array<{ event_type: string; created_at: string; actor_sector: string | null; case_id: string }>;

  // Pour chaque (case_id, sector): entrée = 1er event dans ce secteur, sortie = 1er event _COMPLETED ou CASE_COMPLETED dans ce secteur
  type Key = string;
  const entry = new Map<Key, string>(); // première date d'activité
  const exit = new Map<Key, string>();  // date de complétion
  for (const e of evs) {
    const key: Key = `${e.case_id}::${e.actor_sector}`;
    if (!entry.has(key)) entry.set(key, e.created_at);
    if ((e.event_type.endsWith("_COMPLETED") || e.event_type === "CASE_COMPLETED") && !exit.has(key)) {
      exit.set(key, e.created_at);
    }
  }

  const bucketsGlobal = new Map<string, number[]>();
  const bucketsPeriod = new Map<string, number[]>();
  for (const [key, entAt] of entry.entries()) {
    const exAt = exit.get(key);
    if (!exAt) continue;
    const [, sector] = key.split("::");
    const hours = (new Date(exAt).getTime() - new Date(entAt).getTime()) / 3600000;
    if (hours < 0) continue;
    if (!bucketsGlobal.has(sector)) bucketsGlobal.set(sector, []);
    bucketsGlobal.get(sector)!.push(hours);
    if (exAt >= startISO) {
      if (!bucketsPeriod.has(sector)) bucketsPeriod.set(sector, []);
      bucketsPeriod.get(sector)!.push(hours);
    }
  }

  const toRows = (m: Map<string, number[]>) =>
    Array.from(m.entries())
      .map(([sector, arr]) => ({
        sector,
        count: arr.length,
        avgHours: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      }))
      .sort((a, b) => b.avgHours - a.avgHours);

  return { global: toRows(bucketsGlobal), period: toRows(bucketsPeriod) };
}
