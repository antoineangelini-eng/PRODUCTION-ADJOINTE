"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LotCaseUR = {
  id: string;
  case_number: string;
  nature_du_travail: string | null;
  // Données DR (pré-remplissage)
  dr_type_de_dents: string | null;
  dr_nb_blocs: string | null;
  dr_teintes: string | null;
  dr_modele: boolean | null;
  // Données UR actuelles
  ur_type_de_dents_override: string | null;
  ur_nb_blocs_override: string | null;
  ur_teintes_override: string | null;
  ur_usinage_dents_resine: boolean | null;
  ur_identite_machine: string | null;
  ur_numero_disque: string | null;
  ur_numero_lot_pmma: string | null;
};

export async function resolveCaseForLotUR(caseNumber: string): Promise<LotCaseUR | null> {
  const supabase = await createClient();

  // Cherche directement l'assignment actif pour ce numéro de cas
  const { data, error } = await supabase
    .from("case_assignments")
    .select(`
      case_id,
      cases:case_id (
        id, case_number, nature_du_travail,
        sector_design_resine ( type_de_dents, nb_blocs_de_dents, teintes_associees, modele_a_realiser_ok ),
        sector_design_metal  ( type_de_dents, modele_a_faire_ok ),
        sector_usinage_resine ( type_de_dents_override, nb_blocs_override, teintes_override, usinage_dents_resine, identite_machine, numero_disque, numero_lot_pmma )
      )
    `)
    .eq("sector_code", "usinage_resine")
    .in("status", ["active", "in_progress"])
    .limit(50);

  if (error || !data) throw new Error(error?.message ?? "Erreur serveur");

  // Trouver le cas correspondant au numéro parmi les assignments actifs
  const match = (data as any[]).find(r => String(r.cases?.case_number) === String(caseNumber).trim());
  if (!match) throw new Error(`Cas "${caseNumber}" non actif dans Usinage Résine`);

  const c  = match.cases;
  const dr = c.sector_design_resine ?? {};
  const dm = c.sector_design_metal   ?? {};
  const ur = c.sector_usinage_resine ?? {};

  return {
    id: c.id,
    case_number: c.case_number,
    nature_du_travail: c.nature_du_travail,
    dr_type_de_dents: dr.type_de_dents ?? dm.type_de_dents ?? null,
    dr_nb_blocs:      dr.nb_blocs_de_dents ?? null,
    dr_teintes:       dr.teintes_associees ?? null,
    dr_modele:        c.nature_du_travail === "Provisoire Résine" ? true : (dm.modele_a_faire_ok ?? null),
    ur_type_de_dents_override: ur.type_de_dents_override ?? null,
    ur_nb_blocs_override:      ur.nb_blocs_override ?? null,
    ur_teintes_override:       ur.teintes_override ?? null,
    ur_usinage_dents_resine:   ur.usinage_dents_resine ?? null,
    ur_identite_machine:       ur.identite_machine ?? null,
    ur_numero_disque:          ur.numero_disque ?? null,
    ur_numero_lot_pmma:        ur.numero_lot_pmma ?? null,
  };
}

export type LotSaveRow = {
  case_id: string;
  case_number: string;
  type_de_dents_override: string | null;
  nb_blocs_override: string | null;
  teintes_override: string | null;
  usinage_dents_resine: boolean;
  identite_machine: string | null;
  numero_disque: string | null;
};

export type LotSaveResult = {
  case_id: string;
  case_number: string;
  ok: boolean;
  error?: string;
};

export async function saveUsinageResineLotAction(rows: LotSaveRow[]): Promise<LotSaveResult[]> {
  const supabase = await createClient();
  const results: LotSaveResult[] = [];

  for (const row of rows) {
    const patch: Record<string, any> = {
      usinage_dents_resine:   row.usinage_dents_resine,
      identite_machine:       row.identite_machine || null,
      numero_disque:          row.numero_disque || null,
      type_de_dents_override: row.type_de_dents_override || null,
      nb_blocs_override:      row.nb_blocs_override || null,
      teintes_override:       row.teintes_override || null,
    };
    // J+1 ouvré si usiné
    if (row.usinage_dents_resine) {
      const d = new Date();
      let added = 0;
      while (added < 1) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
      patch.reception_resine_at = d.toISOString().split("T")[0];
    }

    const { error } = await supabase.rpc("rpc_update_usinage_resine", {
      p_case_id: row.case_id,
      p_patch: patch,
    });
    results.push({ case_id: row.case_id, case_number: row.case_number, ok: !error, error: error?.message });
  }

  revalidatePath("/app/usinage-resine");
  revalidatePath("/app/finition");
  return results;
}
