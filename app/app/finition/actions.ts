"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type FinitionRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  sent_by_name: string | null;
  sector_design_metal: {
    reception_metal: boolean | null;
    reception_metal_date: string | null;
    type_de_dents: string | null;
    teintes_associees: string | null;
    modele_a_faire: string | null;
  } | null;
  sector_design_resine: {
    design_dents_resine: boolean | null;
    nb_blocs_de_dents: string | null;
    teintes_associees: string | null;
    type_de_dents: string | null;
    modele_a_realiser_ok: boolean | null;
  } | null;
  sector_usinage_resine: {
    usinage_dents_resine: boolean | null;
    reception_resine_at: string | null;
  } | null;
  sector_usinage_titane: {
    reception_metal: boolean | null;
    reception_metal_at: string | null;
    envoye_usinage: boolean | null;
    envoye_usinage_at: string | null;
  } | null;
  sector_finition: {
    validation: boolean | null;
    validation_at: string | null;
    reception_metal_ok: boolean | null;
    reception_metal_ok_at: string | null;
    reception_resine_ok: boolean | null;
    reception_resine_ok_at: string | null;
  } | null;
};

export type CaseDetail = {
  id: string;
  case_number: string | null;
  nature_du_travail: string | null;
  date_expedition: string | null;
  created_at: string | null;
  design_metal: {
    design_chassis: boolean | null;
    design_chassis_at: string | null;
    updated_by: string | null;
  } | null;
  design_resine: {
    design_dents_resine: boolean | null;
    design_dents_resine_at: string | null;
    updated_by: string | null;
  } | null;
  usinage_titane: {
    envoye_usinage: boolean | null;
    envoye_usinage_at: string | null;
    reception_metal_at: string | null;
    updated_by: string | null;
  } | null;
  usinage_resine: {
    usinage_dents_resine: boolean | null;
    usinage_dents_resine_at: string | null;
    reception_resine_at: string | null;
    updated_by: string | null;
  } | null;
  userNames: Record<string, string>;
};

export async function loadFinitionRowsAction(): Promise<FinitionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`
      status, on_hold_at, on_hold_reason,
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_metal ( reception_metal, reception_metal_date, type_de_dents, teintes_associees, modele_a_faire ),
        sector_design_resine ( design_dents_resine, nb_blocs_de_dents, teintes_associees, type_de_dents, modele_a_realiser_ok ),
        sector_usinage_resine ( usinage_dents_resine, reception_resine_at ),
        sector_usinage_titane ( reception_metal, reception_metal_at, envoye_usinage, envoye_usinage_at ),
        sector_finition ( validation, validation_at, reception_metal_ok, reception_metal_ok_at, reception_resine_ok, reception_resine_ok_at )
      )
    `)
    .eq("sector_code", "finition")
    .in("status", ["active", "in_progress", "on_hold"]);

  const rows = ((data ?? []) as any[])
    .map((r: any) => r.cases ? { ...r.cases, _on_hold: r.status === "on_hold", _on_hold_at: r.on_hold_at ?? null, _on_hold_reason: r.on_hold_reason ?? null } : null)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const da = a.date_expedition ?? "9999-12-31";
      const db = b.date_expedition ?? "9999-12-31";
      return da.localeCompare(db);
    });

  const caseIds = rows.map((r: any) => r.id).filter(Boolean);

  // Déterminer quels secteurs (UT / UR) sont assignés à chaque cas + on_hold des autres secteurs
  let assignedSectors: Record<string, Set<string>> = {};
  const SECTOR_LABELS: Record<string, string> = {
    design_metal: "Design Métal",
    design_resine: "Design Résine",
    usinage_titane: "Usinage Titane",
    usinage_resine: "Usinage Résine",
  };
  let otherOnHold: Record<string, { sector: string; sectorLabel: string; reason: string | null; at: string | null }> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: assignData } = await admin
      .from("case_assignments")
      .select("case_id, sector_code, status, on_hold_at, on_hold_reason")
      .in("case_id", caseIds)
      .in("sector_code", ["usinage_titane", "usinage_resine", "design_metal", "design_resine"]);
    for (const a of assignData ?? []) {
      if (!assignedSectors[a.case_id]) assignedSectors[a.case_id] = new Set();
      assignedSectors[a.case_id].add(a.sector_code);
      // Capturer le premier on_hold trouvé pour ce cas
      if (a.status === "on_hold" && !otherOnHold[a.case_id]) {
        otherOnHold[a.case_id] = {
          sector: a.sector_code,
          sectorLabel: SECTOR_LABELS[a.sector_code] ?? a.sector_code,
          reason: a.on_hold_reason ?? null,
          at: a.on_hold_at ?? null,
        };
      }
    }
  }

  // Ajouter has_ut / has_ur + info on_hold d'un autre secteur
  for (const r of rows) {
    const sectors = assignedSectors[r.id] ?? new Set();
    (r as any).has_ut_assignment = sectors.has("usinage_titane");
    (r as any).has_ur_assignment = sectors.has("usinage_resine");
    const oh = otherOnHold[r.id];
    if (oh) {
      (r as any)._other_on_hold = true;
      (r as any)._other_on_hold_sector = oh.sectorLabel;
      (r as any)._other_on_hold_reason = oh.reason;
      (r as any)._other_on_hold_at = oh.at;
    }
  }

  // Résoudre "Envoyé par" = qui a validé le cas en UT ou UR (secteur précédent)
  let senderMap: Record<string, string> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    // Chercher qui a complété UT ou UR pour chaque cas
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by, updated_at")
      .in("case_id", caseIds)
      .in("sector_code", ["usinage_titane", "usinage_resine"])
      .eq("status", "done");
    // Pour chaque cas, prendre le plus récent (UT ou UR)
    const latestSender: Record<string, { updated_by: string; updated_at: string }> = {};
    (senderData ?? []).forEach((s: any) => {
      if (!s.updated_by) return;
      const existing = latestSender[s.case_id];
      if (!existing || (s.updated_at && (!existing.updated_at || s.updated_at > existing.updated_at))) {
        latestSender[s.case_id] = { updated_by: s.updated_by, updated_at: s.updated_at };
      }
    });
    const senderIds = Object.values(latestSender).map(s => s.updated_by);
    const nameMap = await resolveDisplayNames(senderIds);
    for (const [caseId, sender] of Object.entries(latestSender)) {
      if (nameMap[sender.updated_by]) {
        senderMap[caseId] = nameMap[sender.updated_by];
      }
    }
  }

  return rows.map((r: any) => ({ ...r, sent_by_name: senderMap[r.id] ?? null }));
}

export async function getCaseDetailAction(caseId: string): Promise<CaseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select(`
      id, case_number, nature_du_travail, date_expedition, created_at,
      sector_design_metal ( design_chassis, design_chassis_at, updated_by ),
      sector_design_resine ( design_dents_resine, design_dents_resine_at, updated_by ),
      sector_usinage_titane ( envoye_usinage, envoye_usinage_at, reception_metal_at, updated_by ),
      sector_usinage_resine ( usinage_dents_resine, usinage_dents_resine_at, reception_resine_at, updated_by )
    `)
    .eq("id", caseId)
    .maybeSingle();

  if (error || !data) return null;
  const d = data as any;

  const userIds = new Set<string>();
  [d.sector_design_metal, d.sector_design_resine, d.sector_usinage_titane, d.sector_usinage_resine]
    .forEach((s: any) => { if (s?.updated_by) userIds.add(s.updated_by); });

  let userNames: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: names } = await supabase
      .from("user_display_names")
      .select("user_id, display_name")
      .in("user_id", Array.from(userIds));
    (names ?? []).forEach((n: any) => {
      userNames[n.user_id] = n.display_name.charAt(0).toUpperCase() + n.display_name.slice(1);
    });
  }

  return {
    id: d.id,
    case_number: d.case_number,
    nature_du_travail: d.nature_du_travail,
    date_expedition: d.date_expedition,
    created_at: d.created_at,
    design_metal:   d.sector_design_metal   ?? null,
    design_resine:  d.sector_design_resine  ?? null,
    usinage_titane: d.sector_usinage_titane ?? null,
    usinage_resine: d.sector_usinage_resine ?? null,
    userNames,
  };
}

export async function validateFinitionCellAction(caseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_update_finition", {
    p_case_id: caseId,
    p_patch: { validation: true },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/finition");
}

export type LotResultFinition = {
  case_id: string;
  case_number: string;
  ok: boolean;
  error?: string;
};

export async function validateFinitionBatchAction(
  rows: { case_id: string; case_number: string }[]
): Promise<LotResultFinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_validate_finition_batch", {
    p_case_ids: rows.map((r) => r.case_id),
  });
  if (error) {
    return rows.map((r) => ({
      case_id: r.case_id,
      case_number: r.case_number,
      ok: false,
      error: error.message,
    }));
  }
  const rpcRows = (data ?? []) as { case_id: string; ok: boolean; error_message: string | null }[];
  revalidatePath("/app/finition");
  return rows.map((r) => {
    const rpcRow = rpcRows.find((d) => d.case_id === r.case_id);
    return {
      case_id: r.case_id,
      case_number: r.case_number,
      ok: rpcRow?.ok ?? false,
      error: rpcRow?.ok === false ? (rpcRow.error_message ?? "Erreur") : undefined,
    };
  });
}

export async function resolveCaseForFinition(caseNumber: string): Promise<{
  id: string;
  case_number: string;
} | null> {
  const supabase = await createClient();
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("id, case_number")
    .eq("case_number", caseNumber)
    .maybeSingle();

  if (caseError || !caseData) return null;

  const { data: assignment } = await supabase
    .from("case_assignments")
    .select("case_id")
    .eq("case_id", caseData.id)
    .eq("sector_code", "finition")
    .in("status", ["active", "in_progress", "on_hold"])
    .maybeSingle();

  if (!assignment) return null;
  return caseData;
}

/** Cocher réception métal ou résine pour un cas en Finition */
export async function toggleFinitionReceptionAction(
  caseId: string,
  field: "reception_metal_ok" | "reception_resine_ok",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  // Lire l'état actuel
  const { data: current } = await supabase
    .from("sector_finition")
    .select(`${field}, reception_metal_ok, reception_resine_ok`)
    .eq("case_id", caseId)
    .single();
  if (!current) return { ok: false, error: "Cas non trouvé en finition" };

  const newVal = !current[field];
  const atField = field + "_at";
  const { error } = await supabase
    .from("sector_finition")
    .update({ [field]: newVal, [atField]: newVal ? new Date().toISOString() : null })
    .eq("case_id", caseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getFinitionStatsAction(): Promise<{
  validatedToday: number;
  totalToday: number;
  late: number;
  countToday: number;
  countTomorrow: number;
  onHold: number;
  prioToday: number;
  prioJ1: number;
  prioJ2: number;
}> {
  const supabase = await createClient();
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const { data: allRows } = await supabase
    .from("case_assignments")
    .select(`status, cases:case_id (
      date_expedition, nature_du_travail,
      sector_design_metal ( reception_metal_date, type_de_dents ),
      sector_design_resine ( type_de_dents ),
      sector_usinage_titane ( reception_metal_at ),
      sector_usinage_resine ( reception_resine_at, type_de_dents_override ),
      sector_finition ( reception_metal_ok, reception_metal_ok_at, reception_resine_ok, reception_resine_ok_at )
    )`)
    .eq("sector_code", "finition");

  const rows = (allRows ?? []) as any[];

  // Date de référence = la plus récente date de réception disponible
  function getDateRef(r: any): string | null {
    const c = r.cases;
    if (!c) return null;
    const dm = c.sector_design_metal ?? {};
    const ur = c.sector_usinage_resine ?? {};
    const ut = c.sector_usinage_titane ?? {};
    const metalDate  = ut.reception_metal_at ?? dm.reception_metal_date ?? null;
    const resineDate = ur.reception_resine_at ?? null;
    // Prendre la plus récente des dates de réception disponibles
    if (metalDate && resineDate) {
      const a = new Date(metalDate.slice(0,10)), b = new Date(resineDate.slice(0,10));
      return a >= b ? metalDate : resineDate;
    }
    return metalDate ?? resineDate;
  }

  // Exclure les cas on_hold des compteurs
  const activeRows     = rows.filter((r) => r.status !== "on_hold");
  const todayRows      = activeRows.filter((r) => (getDateRef(r) ?? r.cases?.date_expedition)?.slice(0, 10) === today);
  const totalToday     = todayRows.length;
  const validatedToday = todayRows.filter((r) => r.status === "done").length;
  const countToday     = todayRows.filter((r) => r.status !== "done").length;
  const countTomorrow  = activeRows.filter(
    (r) => (getDateRef(r) ?? r.cases?.date_expedition)?.slice(0, 10) === tomorrow && r.status !== "done"
  ).length;
  const late = activeRows.filter((r) => {
    const ref = (getDateRef(r) ?? r.cases?.date_expedition)?.slice(0, 10);
    return ref && ref < today && r.status !== "done";
  }).length;
  const onHold = rows.filter((r) => r.status === "on_hold").length;

  // Priorité : cas dont réception complète prévue = date d'expédition
  const day1 = tomorrow;
  const day2 = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];

  function getPrioCases(targetDay: string): number {
    return activeRows.filter((r) => {
      if (r.status === "done") return false;
      const c = r.cases;
      if (!c || !c.date_expedition) return false;
      const exp = c.date_expedition.slice(0, 10);
      if (exp !== targetDay) return false;
      const dm = c.sector_design_metal ?? {};
      const ur = c.sector_usinage_resine ?? {};
      const typeDents = ur.type_de_dents_override ?? dm.type_de_dents ?? null;
      const isDentsCommerce = typeDents === "Dents du commerce" || typeDents === "Pas de dents";
      const needsMetal  = c.nature_du_travail === "Chassis Argoat";
      const needsResine = !isDentsCommerce;
      const ut = c.sector_usinage_titane ?? {};
      const metalDate  = ut.reception_metal_at ?? dm.reception_metal_date ?? null;
      const resineDate = ur.reception_resine_at ?? null;
      let rcPrevue: string | null = null;
      if (needsMetal && needsResine) {
        if (metalDate && resineDate) rcPrevue = metalDate.slice(0,10) > resineDate.slice(0,10) ? metalDate : resineDate;
        else rcPrevue = metalDate ?? resineDate;
      } else if (needsMetal) {
        rcPrevue = metalDate;
      } else if (needsResine) {
        rcPrevue = resineDate;
      }
      if (!rcPrevue) return false;
      return rcPrevue.slice(0, 10) === exp;
    }).length;
  }

  return {
    validatedToday, totalToday, late, countToday, countTomorrow, onHold,
    prioToday: getPrioCases(today),
    prioJ1: getPrioCases(day1),
    prioJ2: getPrioCases(day2),
  };
}

export async function removeCaseFromSectorAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "finition");
  if (!perm.allowed) return { error: perm.error };

  const admin = createAdminClient();
  await admin.from("case_assignments").delete().eq("case_id", caseId).eq("sector_code", "finition");
  revalidatePath("/app/finition");
  return { ok: true };
}

export async function deleteCaseAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "finition");
  if (!perm.allowed) return { error: perm.error };

  const admin = createAdminClient();
  await admin.from("case_events").delete().eq("case_id", caseId);
  await admin.from("case_assignments").delete().eq("case_id", caseId);
  await admin.from("sector_design_metal").delete().eq("case_id", caseId);
  await admin.from("sector_design_resine").delete().eq("case_id", caseId);
  await admin.from("sector_usinage_titane").delete().eq("case_id", caseId);
  await admin.from("sector_usinage_resine").delete().eq("case_id", caseId);
  await admin.from("sector_finition").delete().eq("case_id", caseId);
  const { error } = await admin.from("cases").delete().eq("id", caseId);
  if (error) return { error: error.message };
  return { ok: true };
}
