"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FinHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  completed_at: string | null;
  validation: boolean | null;
  validation_at: string | null;
  reception_metal_at: string | null;
  reception_resine_at: string | null;
  type_de_dents: string | null;
  teintes_associees: string | null;
};

export async function loadFinHistoryAction(): Promise<FinHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`updated_at, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail,
      sector_finition ( validation, validation_at ),
      sector_usinage_titane ( reception_metal_at ),
      sector_usinage_resine ( reception_resine_at ),
      sector_design_resine ( type_de_dents, teintes_associees )
    )`)
    .eq("sector_code", "finition")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  return ((data ?? []) as any[]).map((r: any) => {
    const c = r.cases ?? {};
    const fin = c.sector_finition ?? {};
    const ut  = c.sector_usinage_titane ?? {};
    const ur  = c.sector_usinage_resine ?? {};
    const dr  = c.sector_design_resine ?? {};
    return {
      id: c.id ?? "", case_number: c.case_number ?? null,
      created_at: c.created_at ?? null, date_expedition: c.date_expedition ?? null,
      nature_du_travail: c.nature_du_travail ?? null, completed_at: r.updated_at ?? null,
      validation: fin.validation ?? null,
      validation_at: fin.validation_at ?? null,
      reception_metal_at: ut.reception_metal_at ?? null,
      reception_resine_at: ur.reception_resine_at ?? null,
      type_de_dents: dr.type_de_dents ?? null,
      teintes_associees: dr.teintes_associees ?? null,
    };
  });
}

export async function reopenFinCaseAction(caseId: string, note: string | null = null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_reopen_case", { p_case_id: caseId, p_sector_code: "finition" });
  if (error) return { ok: false, error: error.message };
  if (note) await supabase.from("cases").update({ reinsertion_note: note, reinsertion_at: new Date().toISOString() }).eq("id", caseId);
  revalidatePath("/app/finition");
  return { ok: true };
}
