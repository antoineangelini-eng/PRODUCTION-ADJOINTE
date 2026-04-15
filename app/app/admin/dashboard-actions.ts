"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Period = "today" | "7d" | "30d";

const STUCK_DAYS = 3; // seuil "cas bloqué"
const URGENT_DAYS = 2; // exp dans <= 2 jours

export type SectorCode = "design_metal" | "design_resine" | "usinage_titane" | "usinage_resine" | "finition";

export type OpsDashboard = {
  kpis: { urgent: number; late: number; stuck: number; active: number };
  pipeline: Array<{
    sector: SectorCode;
    active: number;
    urgent: number;
    late: number;
    stuck: number;
    users: string[]; // noms des users du secteur
  }>;
  priorityCases: Array<{
    id: string;
    caseNumber: string | null;
    nature: string | null;
    sector: string | null;
    dateExpedition: string | null;
    daysUntilExp: number | null; // <0 = retard
    daysSinceActivity: number | null;
    isLate: boolean;
    isUrgent: boolean;
    isStuck: boolean;
  }>;
  stuckCases: Array<{
    id: string;
    caseNumber: string | null;
    nature: string | null;
    sector: string | null;
    daysSinceActivity: number;
    lastActionBy: string | null;
  }>;
  userLoad: Array<{
    id: string;
    name: string;
    sectors: SectorCode[];
    activeCases: number;
    urgentCases: number;
    stuckCases: number;
    actionsLast7d: number;
    flag: "overloaded" | "struggling" | "ok";
  }>;
};

// ─── Utils ──────────────────────────────────────────────────────────────────
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function startISO7d(): string { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d.toISOString(); }
function daysBetweenDates(a: string, b: string): number {
  const d1 = new Date(a.slice(0,10) + "T00:00:00").getTime();
  const d2 = new Date(b.slice(0,10) + "T00:00:00").getTime();
  return Math.round((d2 - d1) / 86400000);
}
function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("sectors, sector").eq("user_id", user.id).single();
  const us: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!us.includes("admin")) throw new Error("Forbidden");
}

// ─── Dashboard opérationnel ─────────────────────────────────────────────────
export async function loadOpsDashboardAction(): Promise<OpsDashboard> {
  await assertAdmin();
  const admin = createAdminClient();
  const today = todayStr();
  const week = startISO7d();

  // 1. Tous les cas + leur secteur actuel
  const [{ data: casesData }, { data: assignments }] = await Promise.all([
    admin.from("cases").select("id, case_number, date_expedition, nature_du_travail").limit(2000),
    admin.from("case_assignments").select("case_id, sector_code, status"),
  ]);
  const cases = (casesData ?? []) as Array<{ id: string; case_number: string | null; date_expedition: string | null; nature_du_travail: string | null }>;

  // secteur actuel par case + done
  const sectorByCase = new Map<string, string | null>();
  const isDoneByCase = new Map<string, boolean>();
  const assignGroup = new Map<string, Array<{ sector_code: string; status: string }>>();
  for (const a of (assignments ?? []) as Array<{ case_id: string; sector_code: string; status: string }>) {
    if (!assignGroup.has(a.case_id)) assignGroup.set(a.case_id, []);
    assignGroup.get(a.case_id)!.push({ sector_code: a.sector_code, status: a.status });
  }
  for (const c of cases) {
    const rows = assignGroup.get(c.id) ?? [];
    const current = rows.find(r => r.status === "active" || r.status === "in_progress")?.sector_code ?? null;
    const done = rows.length > 0 && rows.every(r => r.status === "done");
    sectorByCase.set(c.id, current);
    isDoneByCase.set(c.id, done);
  }

  // 2. Dernière activité par cas (via case_events)
  const caseIds = cases.map(c => c.id);
  const { data: allEvents } = caseIds.length
    ? await admin.from("case_events")
        .select("case_id, created_at, created_by, actor_sector, event_type")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false })
        .limit(30000)
    : { data: [] as any[] };
  const evs = (allEvents ?? []) as Array<{ case_id: string; created_at: string; created_by: string | null; actor_sector: string | null; event_type: string }>;

  const lastActBy = new Map<string, { at: string; by: string | null }>();
  for (const e of evs) {
    if (!lastActBy.has(e.case_id)) lastActBy.set(e.case_id, { at: e.created_at, by: e.created_by });
  }

  // 3. Users display names
  const userIdsInEvents = Array.from(new Set(evs.map(e => e.created_by).filter(Boolean))) as string[];
  const { data: allNames } = await admin.from("user_display_names").select("user_id, display_name");
  const nameMap = new Map<string, string>();
  for (const n of (allNames ?? [])) {
    const raw = n.display_name ?? "";
    nameMap.set(n.user_id, raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—");
  }

  // 4. Profils (users + leurs secteurs) pour le panneau "charge utilisateur"
  const { data: profiles } = await admin.from("profiles").select("user_id, sectors, sector");
  const prof = (profiles ?? []) as Array<{ user_id: string; sectors: string[] | null; sector: string | null }>;

  // 5. Enrichir les cas actifs
  type EnrichedCase = {
    id: string; case_number: string | null; nature: string | null; sector: string | null;
    date_expedition: string | null; daysUntilExp: number | null;
    daysSinceActivity: number | null; lastActionBy: string | null;
    isLate: boolean; isUrgent: boolean; isStuck: boolean;
  };
  const activeEnriched: EnrichedCase[] = [];
  for (const c of cases) {
    if (isDoneByCase.get(c.id)) continue;
    const sector = sectorByCase.get(c.id) ?? null;
    const la = lastActBy.get(c.id);
    const daysUntilExp = c.date_expedition ? daysBetweenDates(today, c.date_expedition) : null;
    const daysSinceActivity = la ? Math.floor(hoursSince(la.at) / 24) : null;
    const isLate = daysUntilExp !== null && daysUntilExp < 0;
    const isUrgent = daysUntilExp !== null && daysUntilExp >= 0 && daysUntilExp <= URGENT_DAYS;
    const isStuck = daysSinceActivity !== null && daysSinceActivity >= STUCK_DAYS;
    activeEnriched.push({
      id: c.id,
      case_number: c.case_number,
      nature: c.nature_du_travail,
      sector,
      date_expedition: c.date_expedition,
      daysUntilExp,
      daysSinceActivity,
      lastActionBy: la?.by ? (nameMap.get(la.by) ?? null) : null,
      isLate, isUrgent, isStuck,
    });
  }

  // 6. KPIs
  const kpis = {
    urgent: activeEnriched.filter(c => c.isUrgent).length,
    late: activeEnriched.filter(c => c.isLate).length,
    stuck: activeEnriched.filter(c => c.isStuck).length,
    active: activeEnriched.length,
  };

  // 7. Pipeline par secteur
  const SECTORS: SectorCode[] = ["design_metal", "design_resine", "usinage_titane", "usinage_resine", "finition"];
  const pipeline = SECTORS.map(s => {
    const inSector = activeEnriched.filter(c => c.sector === s);
    const usersInSector = prof
      .filter(p => {
        const us = p.sectors ?? (p.sector ? [p.sector] : []);
        return us.includes(s);
      })
      .map(p => nameMap.get(p.user_id) ?? "—")
      .filter(n => n !== "—");
    return {
      sector: s,
      active: inSector.length,
      urgent: inSector.filter(c => c.isUrgent).length,
      late: inSector.filter(c => c.isLate).length,
      stuck: inSector.filter(c => c.isStuck).length,
      users: Array.from(new Set(usersInSector)),
    };
  });

  // 8. Cas prioritaires : en retard > urgent > bloqué > autres, par date exp croissante
  const scored = activeEnriched
    .map(c => ({
      c,
      score:
        (c.isLate ? 10000 : 0) +
        (c.isUrgent ? 1000 : 0) +
        (c.isStuck ? 100 : 0) +
        (c.daysUntilExp !== null ? Math.max(0, 30 - c.daysUntilExp) : 0),
    }))
    .filter(x => x.c.isLate || x.c.isUrgent || x.c.isStuck)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(x => ({
      id: x.c.id,
      caseNumber: x.c.case_number,
      nature: x.c.nature,
      sector: x.c.sector,
      dateExpedition: x.c.date_expedition,
      daysUntilExp: x.c.daysUntilExp,
      daysSinceActivity: x.c.daysSinceActivity,
      isLate: x.c.isLate, isUrgent: x.c.isUrgent, isStuck: x.c.isStuck,
    }));

  // 9. Cas bloqués
  const stuckCases = activeEnriched
    .filter(c => c.isStuck)
    .sort((a, b) => (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0))
    .slice(0, 20)
    .map(c => ({
      id: c.id,
      caseNumber: c.case_number,
      nature: c.nature,
      sector: c.sector,
      daysSinceActivity: c.daysSinceActivity ?? 0,
      lastActionBy: c.lastActionBy,
    }));

  // 10. Charge par utilisateur
  const actions7dByUser = new Map<string, number>();
  for (const e of evs) {
    if (e.created_at < week) continue;
    if (!e.created_by) continue;
    actions7dByUser.set(e.created_by, (actions7dByUser.get(e.created_by) ?? 0) + 1);
  }
  const userLoadRaw = prof.map(p => {
    const us = (p.sectors ?? (p.sector ? [p.sector] : [])).filter(s => SECTORS.includes(s as SectorCode)) as SectorCode[];
    const mine = activeEnriched.filter(c => c.sector && us.includes(c.sector as SectorCode));
    return {
      id: p.user_id,
      name: nameMap.get(p.user_id) ?? "—",
      sectors: us,
      activeCases: mine.length,
      urgentCases: mine.filter(c => c.isUrgent).length,
      stuckCases: mine.filter(c => c.isStuck).length,
      actionsLast7d: actions7dByUser.get(p.user_id) ?? 0,
    };
  }).filter(u => u.sectors.length > 0 && u.name !== "—");

  // Flag logic : overloaded si cas > 1.5 * moyenne ou urgent >= 3
  //             struggling si cas bloqués >= 2 OU (cas >= moyenne ET actions 7j faibles)
  const avgCases = userLoadRaw.length ? userLoadRaw.reduce((s, u) => s + u.activeCases, 0) / userLoadRaw.length : 0;
  const avgActions = userLoadRaw.length ? userLoadRaw.reduce((s, u) => s + u.actionsLast7d, 0) / userLoadRaw.length : 0;
  const userLoad = userLoadRaw.map(u => {
    let flag: "overloaded" | "struggling" | "ok" = "ok";
    if (u.activeCases > avgCases * 1.5 + 3 || u.urgentCases >= 3) flag = "overloaded";
    else if (u.stuckCases >= 2 || (u.activeCases >= avgCases && u.actionsLast7d < avgActions * 0.5 && avgActions >= 5)) flag = "struggling";
    return { ...u, flag };
  }).sort((a, b) => b.activeCases - a.activeCases);

  return { kpis, pipeline, priorityCases: scored, stuckCases, userLoad };
}

// ─── Détail d'un utilisateur (conservé pour modale) ─────────────────────────
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
  cases: UserCaseDetail[];
};

export async function loadUserDetailAction(userId: string, period: Period): Promise<UserDetailData> {
  await assertAdmin();
  const admin = createAdminClient();
  const startISO = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === "today") return d.toISOString();
    if (period === "7d") { d.setDate(d.getDate() - 6); return d.toISOString(); }
    d.setDate(d.getDate() - 29);
    return d.toISOString();
  })();

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
    grouped.get(e.case_id)!.actions.push({ type: e.event_type, at: e.created_at, fields, sector: e.actor_sector });
  }
  const cases = Array.from(grouped.values()).sort((a, b) => {
    const la = a.actions[0]?.at ?? ""; const lb = b.actions[0]?.at ?? "";
    return lb.localeCompare(la);
  });
  return { userId, name, totalActions: evs.length, cases };
}
