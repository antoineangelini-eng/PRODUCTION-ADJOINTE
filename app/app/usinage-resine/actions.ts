"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type BatchResult = {
  okIds: string[];
  errors: { case_id: string | null; error_message: string }[];
};

export type UsinageResineRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  created_by: string | null;
  sent_by_name: string | null;
  sector_design_resine: {
    type_de_dents: string | null;
    design_dents_resine: boolean | null;
    design_dents_resine_at: string | null;
    nb_blocs_de_dents: string | null;
    modele_a_realiser_ok: boolean | null;
    teintes_associees: string | null;
    base_type: string | null;
    base_qty: number | null;
    commentaire_complet: string | null;
  } | null;
  sector_design_metal: {
    type_de_dents: string | null;
    modele_a_faire_ok: boolean | null;
    teintes_associees: string | null;
  } | null;
  sector_usinage_resine: {
    usinage_dents_resine: boolean | null;
    identite_machine: string | null;
    identite_machine_2: string | null;
    numero_disque: string | null;
    numero_disque_2: string | null;
    numero_lot_pmma: string | null;
    reception_resine_at: string | null;
    nb_blocs_override: string | null;
    teintes_override: string | null;
    type_de_dents_override: string | null;
    numero_base_1: string | null;
    numero_base_2: string | null;
    machine_base: string | null;
  } | null;
  // Lot métal récupéré depuis UT pour l'étiquette — non affiché dans le tableau
  sector_usinage_titane: {
    numero_lot_metal_h: string | null;
    numero_lot_metal_b: string | null;
  } | null;
};

export async function loadUsinageResineRowsAction(): Promise<UsinageResineRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`
      created_by, status, on_hold_at, on_hold_reason,
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_resine ( type_de_dents, design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, modele_a_realiser_ok, teintes_associees, base_type, base_qty, commentaire_complet ),
        sector_design_metal ( type_de_dents, modele_a_faire_ok, teintes_associees ),
        sector_usinage_resine ( usinage_dents_resine, identite_machine, identite_machine_2, numero_disque, numero_disque_2, numero_lot_pmma, reception_resine_at, nb_blocs_override, teintes_override, type_de_dents_override, numero_base_1, numero_base_2, machine_base ),
        sector_usinage_titane ( numero_lot_metal_h, numero_lot_metal_b )
      )
    `)
    .eq("sector_code", "usinage_resine")
    .in("status", ["active", "in_progress", "on_hold"])
    .limit(200);

  const rows = ((data ?? []) as any[])
    .map((r: any) => r.cases ? { ...r.cases, created_by: r.created_by ?? null, _on_hold: r.status === "on_hold", _on_hold_at: r.on_hold_at ?? null, _on_hold_reason: r.on_hold_reason ?? null } : null)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const da = a.date_expedition ?? "9999-12-31";
      const db = b.date_expedition ?? "9999-12-31";
      return da.localeCompare(db);
    });

  // Résoudre "Envoyé par" = qui a validé le cas en DR (secteur précédent)
  const caseIds = rows.map((r: any) => r.id).filter(Boolean);
  let senderMap: Record<string, string> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by")
      .in("case_id", caseIds)
      .eq("sector_code", "design_resine")
      .eq("status", "done");
    const senderIds = (senderData ?? []).map((s: any) => s.updated_by).filter(Boolean);
    const nameMap = await resolveDisplayNames(senderIds);
    (senderData ?? []).forEach((s: any) => {
      if (s.updated_by && nameMap[s.updated_by]) {
        senderMap[s.case_id] = nameMap[s.updated_by];
      }
    });
  }

  return rows.map((r: any) => ({ ...r, sent_by_name: senderMap[r.id] ?? null }));
}

export async function saveUsinageResineCellAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const column = String(formData.get("column")  ?? "").trim();
  const kind   = String(formData.get("kind")    ?? "").trim();
  if (!caseId || !column) return;

  const allowed = ["usinage_dents_resine", "identite_machine", "identite_machine_2", "numero_disque", "numero_disque_2", "numero_lot_pmma", "reception_resine_at", "nb_blocs_override", "teintes_override", "type_de_dents_override", "numero_base_1", "numero_base_2", "machine_base"];

  let patch: Record<string, any>;

  if (kind === "json") {
    try { patch = JSON.parse(String(formData.get("value") ?? "")); } catch { return; }
    const validKeys = Object.keys(patch).every(k => [...allowed, "usinage_dents_resine"].includes(k));
    if (!validKeys) return;
  } else {
    if (!allowed.includes(column)) return;
    if (kind === "boolean") {
      patch = { [column]: formData.get("value") === "true" };
    } else {
      const raw = String(formData.get("value") ?? "").trim();
      patch = { [column]: raw === "" ? null : raw };
    }
  }

  // Admin direct update pour garantir la sauvegarde (bypass RLS + RPC whitelist)
  const admin = createAdminClient();
  await admin
    .from("sector_usinage_resine")
    .update(patch)
    .eq("case_id", caseId);
  revalidatePath("/app/usinage-resine");
  revalidatePath("/app/finition");
}

export async function completeUsinageResineBatchAction(
  _prev: BatchResult | null,
  formData: FormData
): Promise<BatchResult> {
  const supabase = await createClient();
  const caseIds = formData.getAll("case_ids").map(String).filter(Boolean);

  if (caseIds.length === 0) {
    return { okIds: [], errors: [{ case_id: null, error_message: "Aucun dossier sélectionné." }] };
  }

  const okIds: string[] = [];
  const errors: BatchResult["errors"] = [];

  for (const caseId of caseIds) {
    const { error } = await supabase.rpc("rpc_complete_usinage_resine", { p_case_id: caseId });
    if (error) errors.push({ case_id: caseId, error_message: error.message });
    else okIds.push(caseId);
  }

  revalidatePath("/app/usinage-resine");
  revalidatePath("/app/finition");
  return { okIds, errors };
}

export async function deleteCaseAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "usinage_resine");
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

/** Retire le cas uniquement du secteur Usinage Résine (les autres secteurs restent intacts). */
export async function removeCaseFromSectorAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "usinage_resine");
  if (!perm.allowed) return { error: perm.error };

  const admin = createAdminClient();
  await admin.from("case_assignments").delete().eq("case_id", caseId).eq("sector_code", "usinage_resine");
  revalidatePath("/app/usinage-resine");
  return { ok: true };
}

/** @deprecated — utiliser removeCaseFromSectorAction */
export async function removeCaseFromUsinageResineAction(formData: FormData) {
  return removeCaseFromSectorAction(formData);
}
