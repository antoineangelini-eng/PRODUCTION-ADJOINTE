"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UtHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  completed_at: string | null;
  envoye_usinage: boolean | null;
  numero_lot_metal: string | null;
  envoye_usinage_at: string | null;
  machine_ut: string | null;
  machine_ut_h: string | null;
  machine_ut_b: string | null;
  numero_calcul: string | null;
  numero_calcul_h: string | null;
  numero_calcul_b: string | null;
  nombre_brut: string | null;
  nombre_brut_h: string | null;
  nombre_brut_b: string | null;
  reception_metal_at: string | null;
  modele_a_faire_ok: boolean | null;
};

export async function loadUtHistoryAction(): Promise<UtHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`updated_at, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail,
      sector_usinage_titane ( envoye_usinage, envoye_usinage_at, machine_ut, machine_ut_h, machine_ut_b, numero_calcul, numero_calcul_h, numero_calcul_b, nombre_brut, nombre_brut_h, nombre_brut_b, reception_metal_at ),
      sector_design_metal ( modele_a_faire_ok )
    )`)
    .eq("sector_code", "usinage_titane")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as any[]).map((r: any) => {
    const c = r.cases ?? {};
    const ut = c.sector_usinage_titane ?? {};
    const dm = c.sector_design_metal ?? {};
    return {
      id: c.id ?? "", case_number: c.case_number ?? null,
      created_at: c.created_at ?? null, date_expedition: c.date_expedition ?? null,
      nature_du_travail: c.nature_du_travail ?? null, completed_at: r.updated_at ?? null,
      envoye_usinage: ut.envoye_usinage ?? null,
      numero_lot_metal: ut.numero_lot_metal ?? null,
      envoye_usinage_at: ut.envoye_usinage_at ?? null,
      machine_ut:       ut.machine_ut       ?? null,
      machine_ut_h:     ut.machine_ut_h     ?? null,
      machine_ut_b:     ut.machine_ut_b     ?? null,
      numero_calcul:    ut.numero_calcul    ?? null,
      numero_calcul_h:  ut.numero_calcul_h  ?? null,
      numero_calcul_b:  ut.numero_calcul_b  ?? null,
      nombre_brut:      ut.nombre_brut      ?? null,
      nombre_brut_h:    ut.nombre_brut_h    ?? null,
      nombre_brut_b:    ut.nombre_brut_b    ?? null,
      reception_metal_at: ut.reception_metal_at ?? null,
      modele_a_faire_ok: dm.modele_a_faire_ok ?? null,
    };
  });
}

export async function reopenUtCaseAction(caseId: string, note: string | null = null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_reopen_case", { p_case_id: caseId, p_sector_code: "usinage_titane" });
  if (error) return { ok: false, error: error.message };
  if (note) await supabase.from("cases").update({ reinsertion_note: note, reinsertion_at: new Date().toISOString() }).eq("id", caseId);
  revalidatePath("/app/usinage-titane");
  return { ok: true };
}
