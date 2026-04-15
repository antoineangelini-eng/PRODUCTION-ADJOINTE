"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BatchResult = {
  okIds: string[];
  errors: { case_id: string | null; error_message: string }[];
};

export type UsinageTitaneRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  sector_design_metal: {
    design_chassis: boolean | null;
    design_chassis_at: string | null;
    reception_metal_date: string | null;
    modele_a_faire_ok: boolean | null;
  } | null;
  sector_usinage_titane: {
    envoye_usinage: boolean | null;
    envoye_usinage_at: string | null;
    numero_lot_metal: string | null;
    numero_lot_metal_h: string | null;
    numero_lot_metal_b: string | null;
    machine_ut: string | null;
    machine_ut_h: string | null;
    machine_ut_b: string | null;
    nombre_brut: string | null;
    nombre_brut_h: string | null;
    nombre_brut_b: string | null;
    numero_calcul: string | null;
    numero_calcul_h: string | null;
    numero_calcul_b: string | null;
    mode_hb_machine: boolean | null;
    mode_hb_calcul: boolean | null;
    mode_hb_brut: boolean | null;
    delai_j1_date: string | null;
    reception_metal_at: string | null;
  } | null;
};

export async function loadUsinageTitaneRowsAction(): Promise<UsinageTitaneRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_metal ( design_chassis, design_chassis_at, reception_metal_date, modele_a_faire_ok ),
        sector_usinage_titane (
          envoye_usinage, envoye_usinage_at,
          numero_lot_metal, numero_lot_metal_h, numero_lot_metal_b,
          machine_ut, machine_ut_h, machine_ut_b,
          nombre_brut, nombre_brut_h, nombre_brut_b,
          numero_calcul, numero_calcul_h, numero_calcul_b,
          mode_hb_machine, mode_hb_calcul, mode_hb_brut,
          delai_j1_date, reception_metal_at
        )
      )
    `)
    .eq("sector_code", "usinage_titane")
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

export async function saveUsinageTitaneCellAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const column = String(formData.get("column")  ?? "").trim();
  const kind   = String(formData.get("kind")    ?? "").trim();
  if (!caseId || !column) return;

  const allowed = [
    "envoye_usinage", "envoye_usinage_at",
    "numero_lot_metal", "numero_lot_metal_h", "numero_lot_metal_b",
    "machine_ut", "machine_ut_h", "machine_ut_b",
    "numero_calcul", "numero_calcul_h", "numero_calcul_b",
    "nombre_brut", "nombre_brut_h", "nombre_brut_b",
    "mode_hb_machine", "mode_hb_calcul", "mode_hb_brut",
    "delai_j1_date", "reception_metal_at",
  ];

  let patch: Record<string, any>;

  if (kind === "json") {
    const raw = String(formData.get("value") ?? "");
    try { patch = JSON.parse(raw); } catch { return; }
    const validKeys = Object.keys(patch).every(k => allowed.includes(k));
    if (!validKeys) return;
  } else if (kind === "boolean") {
    if (!allowed.includes(column)) return;
    patch = { [column]: formData.get("value") === "true" };
  } else {
    if (!allowed.includes(column)) return;
    const raw = String(formData.get("value") ?? "").trim();
    patch = { [column]: raw === "" ? null : raw };
  }

  await supabase.rpc("rpc_update_usinage_titane", { p_case_id: caseId, p_patch: patch });
}

export async function completeUsinageTitaneBatchAction(
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
    const { error } = await supabase.rpc("rpc_complete_usinage_titane", { p_case_id: caseId });
    if (error) errors.push({ case_id: caseId, error_message: error.message });
    else okIds.push(caseId);
  }
  revalidatePath("/app/usinage-titane");
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
