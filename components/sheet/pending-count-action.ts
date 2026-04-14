"use server";
import { createClient } from "@/lib/supabase/server";

/**
 * Renvoie le nombre de cas actifs (status active/in_progress) pour un secteur.
 * Utilisé par les tableaux pour afficher "X cas en attente" — c'est-à-dire des
 * cas présents en BDD mais pas encore dans les rows affichés (tableau pas encore
 * rafraîchi). Le bandeau = pendingCount - rows.length (si > 0).
 */
export async function countSectorActiveAction(sectorCode: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("case_assignments")
    .select("case_id", { count: "exact", head: true })
    .eq("sector_code", sectorCode)
    .in("status", ["active", "in_progress"]);
  return count ?? 0;
}
