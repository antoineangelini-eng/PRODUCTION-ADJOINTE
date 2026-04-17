"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DmHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean;
  completed_at: string | null;
  // sector_design_metal
  design_chassis: boolean | null;
  design_chassis_at: string | null;
  dentall_case_number: string | null;
  envoye_dentall: boolean | null;
  reception_metal_date: string | null;
  type_de_dents: string | null;
  modele_a_faire_ok: boolean | null;
  teintes_associees: string | null;
};

export async function loadDmHistoryAction(): Promise<DmHistoryRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("case_assignments")
    .select(`
      updated_at,
      cases:case_id (
        id, case_number, created_at, date_expedition, nature_du_travail, is_physical,
        sector_design_metal (
          design_chassis, design_chassis_at, dentall_case_number,
          envoye_dentall, reception_metal_date, type_de_dents,
          modele_a_faire_ok, teintes_associees
        )
      )
    `)
    .eq("sector_code", "design_metal")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as any[]).map((r: any) => {
    const c   = r.cases ?? {};
    const dm  = c.sector_design_metal ?? {};
    return {
      id:                  c.id ?? "",
      case_number:         c.case_number ?? null,
      created_at:          c.created_at ?? null,
      date_expedition:     c.date_expedition ?? null,
      nature_du_travail:   c.nature_du_travail ?? null,
      is_physical:         Boolean(c.is_physical),
      completed_at:        r.updated_at ?? null,
      design_chassis:      dm.design_chassis ?? null,
      design_chassis_at:   dm.design_chassis_at ?? null,
      dentall_case_number: dm.dentall_case_number ?? null,
      envoye_dentall:      dm.envoye_dentall ?? null,
      reception_metal_date:dm.reception_metal_date ?? null,
      type_de_dents:       dm.type_de_dents ?? null,
      modele_a_faire_ok:   dm.modele_a_faire_ok ?? null,
      teintes_associees:   dm.teintes_associees ?? null,
    };
  });
}

export async function reopenCaseAction(
  caseId: string,
  sectorCode: string,
  note: string | null = null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Réactive le secteur DM
  const { error } = await supabase.rpc("rpc_reopen_case", {
    p_case_id: caseId,
    p_sector_code: sectorCode,
  });
  if (error) return { ok: false, error: error.message };

  // Stocke la note de réinsertion sur le cas (visible dans les autres secteurs)
  if (note) {
    await supabase
      .from("cases")
      .update({ reinsertion_note: note, reinsertion_at: new Date().toISOString() })
      .eq("id", caseId);
  }

  revalidatePath("/app/design-metal");
  return { ok: true };
}
