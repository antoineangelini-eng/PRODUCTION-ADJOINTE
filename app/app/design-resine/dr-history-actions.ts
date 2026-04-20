"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type DrHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean;
  completed_at: string | null;
  validated_by_name: string | null;
  sent_by_name: string | null;
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
    .select(`updated_at, updated_by, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail, is_physical,
      sector_design_resine ( design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, modele_a_realiser_ok, teintes_associees, type_de_dents ),
      sector_design_metal ( modele_a_faire_ok, teintes_associees )
    )`)
    .eq("sector_code", "design_resine")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as any[];
  const caseIds = rows.map((r: any) => r.cases?.id).filter(Boolean);

  // Collecter tous les user IDs (validé par + envoyé par DM)
  const allUserIds: string[] = rows.map((r: any) => r.updated_by).filter(Boolean);
  const senderByCase: Record<string, string> = {}; // case_id → updated_by du secteur précédent
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by")
      .in("case_id", caseIds)
      .eq("sector_code", "design_metal")
      .eq("status", "done");
    (senderData ?? []).forEach((s: any) => {
      if (s.updated_by) { allUserIds.push(s.updated_by); senderByCase[s.case_id] = s.updated_by; }
    });
  }
  const nameMap = await resolveDisplayNames(allUserIds);

  return rows.map((r: any) => {
    const c = r.cases ?? {};
    const dr = c.sector_design_resine ?? {};
    const dm = c.sector_design_metal ?? {};
    const modeleEffectif = dr.modele_a_realiser_ok ?? dm.modele_a_faire_ok ?? null;
    const senderId = senderByCase[c.id];
    return {
      id: c.id ?? "", case_number: c.case_number ?? null,
      created_at: c.created_at ?? null, date_expedition: c.date_expedition ?? null,
      nature_du_travail: c.nature_du_travail ?? null, is_physical: Boolean(c.is_physical),
      completed_at: r.updated_at ?? null,
      validated_by_name: r.updated_by ? (nameMap[r.updated_by] ?? null) : null,
      sent_by_name: senderId ? (nameMap[senderId] ?? null) : null,
      design_dents_resine: dr.design_dents_resine ?? null,
      design_dents_resine_at: dr.design_dents_resine_at ?? null,
      nb_blocs_de_dents: dr.nb_blocs_de_dents ?? null,
      modele_a_realiser_ok: dr.modele_a_realiser_ok ?? null,
      modele_effectif: modeleEffectif,
      teintes_associees: dr.teintes_associees ?? dm.teintes_associees ?? null,
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
