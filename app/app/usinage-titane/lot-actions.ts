"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LotRowTitane = {
  case_id: string;
  case_number: string;
  envoye_usinage: boolean;
  delai_j1_date: string;
};

export type LotResultTitane = {
  case_id: string;
  case_number: string;
  ok: boolean;
  error?: string;
};

export async function saveUsinageTitaneLotAction(
  rows: LotRowTitane[]
): Promise<LotResultTitane[]> {
  const supabase = await createClient();

  const results: LotResultTitane[] = [];

  for (const row of rows) {
    const { error } = await supabase.rpc("rpc_update_usinage_titane", {
      p_case_id: row.case_id,
      p_patch: {
        envoye_usinage: row.envoye_usinage,
        delai_j1_date: row.delai_j1_date || null,
      },
    });

    results.push({
      case_id: row.case_id,
      case_number: row.case_number,
      ok: !error,
      error: error?.message,
    });
  }

  revalidatePath("/app/usinage-titane");
  return results;
}

export async function resolveCaseForLotTitane(caseNumber: string): Promise<{
  id: string;
  case_number: string;
  sector_usinage_titane: {
    envoye_usinage: boolean | null;
    delai_j1_date: string | null;
  } | null;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_assignments")
    .select(
      `
      cases:case_id (
        id,
        case_number,
        sector_usinage_titane (
          envoye_usinage,
          delai_j1_date
        )
      )
    `
    )
    .eq("sector_code", "usinage_titane")
    .in("status", ["active", "in_progress", "on_hold"])
    .eq("cases.case_number", caseNumber)
    .single();

  if (error || !data) return null;
  return (data as any).cases;
}
