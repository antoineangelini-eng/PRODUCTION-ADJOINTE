"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type FinHistoryRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean;
  completed_at: string | null;
  validated_by_name: string | null;
  sent_by_name: string | null;
  validation: boolean | null;
  validation_at: string | null;
  reception_metal_at: string | null;
  reception_resine_at: string | null;
  type_de_dents: string | null;
  teintes_associees: string | null;
  nb_blocs: string | null;
};

export async function loadFinHistoryAction(): Promise<FinHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`updated_at, updated_by, cases:case_id (
      id, case_number, created_at, date_expedition, nature_du_travail, is_physical,
      sector_finition ( validation, validation_at ),
      sector_usinage_titane ( reception_metal_at ),
      sector_usinage_resine ( reception_resine_at, nb_blocs_override, teintes_override ),
      sector_design_resine ( type_de_dents, teintes_associees, nb_blocs_de_dents ),
      sector_design_metal ( type_de_dents, teintes_associees )
    )`)
    .eq("sector_code", "finition")
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as any[];
  const caseIds = rows.map((r: any) => r.cases?.id).filter(Boolean);

  // Collecter tous les user IDs (validé par + envoyé par UT/UR)
  const allUserIds: string[] = rows.map((r: any) => r.updated_by).filter(Boolean);
  const senderByCase: Record<string, string> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by, updated_at")
      .in("case_id", caseIds)
      .in("sector_code", ["usinage_titane", "usinage_resine"])
      .eq("status", "done");
    // Pour chaque cas, prendre le plus récent (UT ou UR)
    const latestSender: Record<string, { updated_by: string; updated_at: string }> = {};
    (senderData ?? []).forEach((s: any) => {
      if (!s.updated_by) return;
      const existing = latestSender[s.case_id];
      if (!existing || (s.updated_at && (!existing.updated_at || s.updated_at > existing.updated_at))) {
        latestSender[s.case_id] = { updated_by: s.updated_by, updated_at: s.updated_at };
      }
    });
    for (const [caseId, sender] of Object.entries(latestSender)) {
      allUserIds.push(sender.updated_by);
      senderByCase[caseId] = sender.updated_by;
    }
  }
  const nameMap = await resolveDisplayNames(allUserIds);

  return rows.map((r: any) => {
    const c = r.cases ?? {};
    const fin = c.sector_finition ?? {};
    const ut  = c.sector_usinage_titane ?? {};
    const ur  = c.sector_usinage_resine ?? {};
    const dr  = c.sector_design_resine ?? {};
    const dm  = c.sector_design_metal ?? {};
    const typeDents = ur.type_de_dents_override ?? dm.type_de_dents ?? dr.type_de_dents ?? null;
    const senderId = senderByCase[c.id];
    return {
      id: c.id ?? "", case_number: c.case_number ?? null,
      created_at: c.created_at ?? null, date_expedition: c.date_expedition ?? null,
      nature_du_travail: c.nature_du_travail ?? null, is_physical: Boolean(c.is_physical),
      completed_at: r.updated_at ?? null,
      validated_by_name: r.updated_by ? (nameMap[r.updated_by] ?? null) : null,
      sent_by_name: senderId ? (nameMap[senderId] ?? null) : null,
      validation: fin.validation ?? null,
      validation_at: fin.validation_at ?? null,
      reception_metal_at: ut.reception_metal_at ?? null,
      reception_resine_at: ur.reception_resine_at ?? null,
      type_de_dents: typeDents,
      teintes_associees: ur.teintes_override ?? dr.teintes_associees ?? dm.teintes_associees ?? null,
      nb_blocs: ur.nb_blocs_override ?? dr.nb_blocs_de_dents ?? null,
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
