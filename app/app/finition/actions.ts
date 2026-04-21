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
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_metal ( reception_metal, reception_metal_date, type_de_dents, teintes_associees, modele_a_faire ),
        sector_design_resine ( design_dents_resine, nb_blocs_de_dents, teintes_associees, type_de_dents, modele_a_realiser_ok ),
        sector_usinage_resine ( usinage_dents_resine, reception_resine_at ),
        sector_usinage_titane ( reception_metal, reception_metal_at, envoye_usinage, envoye_usinage_at ),
        sector_finition ( validation, validation_at )
      )
    `)
    .eq("sector_code", "finition")
    .in("status", ["active", "in_progress"]);

  const rows = ((data ?? []) as any[])
    .map((r: any) => r.cases)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const da = a.date_expedition ?? "9999-12-31";
      const db = b.date_expedition ?? "9999-12-31";
      return da.localeCompare(db);
    });

  const caseIds = rows.map((r: any) => r.id).filter(Boolean);

  // Déterminer quels secteurs (UT / UR) sont assignés à chaque cas
  let assignedSectors: Record<string, Set<string>> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: assignData } = await admin
      .from("case_assignments")
      .select("case_id, sector_code")
      .in("case_id", caseIds)
      .in("sector_code", ["usinage_titane", "usinage_resine"]);
    for (const a of assignData ?? []) {
      if (!assignedSectors[a.case_id]) assignedSectors[a.case_id] = new Set();
      assignedSectors[a.case_id].add(a.sector_code);
    }
  }

  // Ajouter has_ut / has_ur à chaque row
  for (const r of rows) {
    const sectors = assignedSectors[r.id] ?? new Set();
    (r as any).has_ut_assignment = sectors.has("usinage_titane");
    (r as any).has_ur_assignment = sectors.has("usinage_resine");
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
    .in("status", ["active", "in_progress"])
    .maybeSingle();

  if (!assignment) return null;
  return caseData;
}

export async function getFinitionStatsAction(): Promise<{
  validatedToday: number;
  totalToday: number;
  late: number;
  countToday: number;
  countTomorrow: number;
}> {
  const supabase = await createClient();
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const { data: allRows } = await supabase
    .from("case_assignments")
    .select("status, cases:case_id ( date_expedition )")
    .eq("sector_code", "finition");

  const rows = (allRows ?? []) as any[];
  const todayRows      = rows.filter((r) => r.cases?.date_expedition?.slice(0, 10) === today);
  const totalToday     = todayRows.length;
  const validatedToday = todayRows.filter((r) => r.status === "done").length;
  const countToday     = todayRows.filter((r) => r.status !== "done").length;
  const countTomorrow  = rows.filter(
    (r) => r.cases?.date_expedition?.slice(0, 10) === tomorrow && r.status !== "done"
  ).length;
  const late = rows.filter((r) => {
    const exp = r.cases?.date_expedition?.slice(0, 10);
    return exp && exp < today && r.status !== "done";
  }).length;

  return { validatedToday, totalToday, late, countToday, countTomorrow };
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
