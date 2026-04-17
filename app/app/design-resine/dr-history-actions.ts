"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DrHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean;
  completed_at: string | null;
  // DR
  design_dents_resine: boolean | null;
  design_dents_resine_at: string | null;
  nb_blocs_de_dents: string | null;
  modele_a_realiser_ok: boolean | null;
  modele_effectif: boolean | null;
  teintes_associees: string | null;
  type_de_dents: string | null;
};

export async function loadDrHistoryAction(): Promise<DrHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`updated_at, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail, is_physical,
      sector_design_resine ( design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, modele_a_realiser_ok, teintes_associees, type_de_dents ),
      sector_design_metal ( modele_a_faire_ok )
    )`)
    .eq("sector_code", "design_resine")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as any[]).map((r: any) => {
    const c = r.cases ?? {};
    const dr = c.sector_design_resine ?? {};
    const dm = c.sector_design_metal ?? {};
    const isProv = c.nature_du_travail === "Provisoire Résine";
    const modeleEffectif = isProv ? true : (dm.modele_a_faire_ok ?? dr.modele_a_realiser_ok ?? null);
    return {
      id: c.id ?? "", case_number: c.case_number ?? null,
      created_at: c.created_at ?? null, date_expedition: c.date_expedition ?? null,
      nature_du_travail: c.nature_du_travail ?? null, is_physical: Boolean(c.is_physical),
      completed_at: r.updated_at ?? null,
      design_dents_resine: dr.design_dents_resine ?? null,
      design_dents_resine_at: dr.design_dents_resine_at ?? null,
      nb_blocs_de_dents: dr.nb_blocs_de_dents ?? null,
      modele_a_realiser_ok: dr.modele_a_realiser_ok ?? null,
      modele_effectif: modeleEffectif,
      teintes_associees: dr.teintes_associees ?? null,
      type_de_dents: dr.type_de_dents ?? null,
    };
  });
}

export async function reopenDrCaseAction(caseId: string, note: string | null = null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_reopen_case", { p_case_id: caseId, p_sector_code: "design_resine" });
  if (error) return { ok: false, error: error.message };
  if (note) await supabase.from("cases").update({ reinsertion_note: note, reinsertion_at: new Date().toISOString() }).eq("id", caseId);
  revalidatePath("/app/design-resine");
  return { ok: true };
}
