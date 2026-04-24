"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type UrHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean;
  completed_at: string | null;
  validated_by_name: string | null;
  sent_by_name: string | null;
  usinage_dents_resine: boolean | null;
  identite_machine: string | null;
  identite_machine_2: string | null;
  numero_disque: string | null;
  numero_disque_2: string | null;
  numero_lot_pmma: string | null;
  reception_resine_at: string | null;
  type_de_dents: string | null;
  teintes_associees: string | null;
  nb_blocs: string | null;
  modele_effectif: boolean | null;
  base_type: string | null;
};

export async function loadUrHistoryAction(): Promise<UrHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`updated_at, updated_by, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail, is_physical,
      sector_usinage_resine ( usinage_dents_resine, identite_machine, identite_machine_2, numero_disque, numero_disque_2, numero_lot_pmma, reception_resine_at, type_de_dents_override, teintes_override, nb_blocs_override ),
      sector_design_resine ( type_de_dents, teintes_associees, nb_blocs_de_dents, modele_a_realiser_ok, base_type ),
      sector_design_metal ( modele_a_faire_ok, teintes_associees )
    )`)
    .eq("sector_code", "usinage_resine")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as any[];
  const caseIds = rows.map((r: any) => r.cases?.id).filter(Boolean);

  // Collecter tous les user IDs (validé par + envoyé par DR)
  const allUserIds: string[] = rows.map((r: any) => r.updated_by).filter(Boolean);
  const senderByCase: Record<string, string> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by")
      .in("case_id", caseIds)
      .eq("sector_code", "design_resine")
      .eq("status", "done");
    (senderData ?? []).forEach((s: any) => {
      if (s.updated_by) { allUserIds.push(s.updated_by); senderByCase[s.case_id] = s.updated_by; }
    });
  }
  const nameMap = await resolveDisplayNames(allUserIds);

  return rows.map((r: any) => {
    const c = r.cases ?? {};
    const ur = c.sector_usinage_resine ?? {};
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
      usinage_dents_resine: ur.usinage_dents_resine ?? null,
      identite_machine: ur.identite_machine ?? null,
      identite_machine_2: ur.identite_machine_2 ?? null,
      numero_disque: ur.numero_disque ?? null,
      numero_disque_2: ur.numero_disque_2 ?? null,
      numero_lot_pmma: ur.numero_lot_pmma ?? null,
      reception_resine_at: ur.reception_resine_at ?? null,
      type_de_dents: ur.type_de_dents_override ?? dr.type_de_dents ?? null,
      teintes_associees: ur.teintes_override ?? dr.teintes_associees ?? dm.teintes_associees ?? null,
      nb_blocs: ur.nb_blocs_override ?? dr.nb_blocs_de_dents ?? null,
      modele_effectif: modeleEffectif,
      base_type: dr.base_type ?? null,
    };
  });
}

export async function reopenUrCaseAction(caseId: string, note: string | null = null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_reopen_case", { p_case_id: caseId, p_sector_code: "usinage_resine" });
  if (error) return { ok: false, error: error.message };
  if (note) await supabase.from("cases").update({ reinsertion_note: note, reinsertion_at: new Date().toISOString() }).eq("id", caseId);
  revalidatePath("/app/usinage-resine");
  return { ok: true };
}
