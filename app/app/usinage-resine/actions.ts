"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  sector_design_resine: {
    type_de_dents: string | null;
    design_dents_resine: boolean | null;
    design_dents_resine_at: string | null;
    nb_blocs_de_dents: string | null;
    modele_a_realiser_ok: boolean | null;
    teintes_associees: string | null;
  } | null;
  sector_design_metal: {
    type_de_dents: string | null;
    modele_a_faire_ok: boolean | null;
    teintes_associees: string | null;
  } | null;
  sector_usinage_resine: {
    usinage_dents_resine: boolean | null;
    identite_machine: string | null;
    numero_disque: string | null;
    numero_lot_pmma: string | null;
    reception_resine_at: string | null;
    nb_blocs_override: string | null;
    teintes_override: string | null;
    type_de_dents_override: string | null;
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
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_resine ( type_de_dents, design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, modele_a_realiser_ok, teintes_associees ),
        sector_design_metal ( type_de_dents, modele_a_faire_ok, teintes_associees ),
        sector_usinage_resine ( usinage_dents_resine, identite_machine, numero_disque, numero_lot_pmma, reception_resine_at, nb_blocs_override, teintes_override, type_de_dents_override ),
        sector_usinage_titane ( numero_lot_metal_h, numero_lot_metal_b )
      )
    `)
    .eq("sector_code", "usinage_resine")
    .in("status", ["active", "in_progress"])
    .limit(200);

  return ((data ?? []) as any[])
    .map((r: any) => r.cases)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const da = a.date_expedition ?? "9999-12-31";
      const db = b.date_expedition ?? "9999-12-31";
      return da.localeCompare(db);
    });
}

export async function saveUsinageResineCellAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const column = String(formData.get("column")  ?? "").trim();
  const kind   = String(formData.get("kind")    ?? "").trim();
  if (!caseId || !column) return;

  const allowed = ["usinage_dents_resine", "identite_machine", "numero_disque", "numero_lot_pmma", "reception_resine_at", "nb_blocs_override", "teintes_override", "type_de_dents_override"];

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

  await supabase.rpc("rpc_update_usinage_resine", { p_case_id: caseId, p_patch: patch });
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
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };
  const { error } = await supabase.rpc("rpc_delete_case", { p_case_id: caseId });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Retire le cas uniquement du secteur Usinage Résine (les autres secteurs restent intacts). */
export async function removeCaseFromUsinageResineAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { error } = await supabase.rpc("rpc_remove_case_from_usinage_resine", { p_case_id: caseId });
  if (error) return { error: error.message };

  revalidatePath("/app/usinage-resine");
  return { ok: true };
}
