"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Bascule le statut "en attente" d'un cas dans un secteur donné.
 * Si le cas est actuellement on_hold → revient à "active".
 * Sinon → passe en "on_hold" avec raison optionnelle.
 */
export async function toggleOnHoldAction(
  caseId: string,
  sectorCode: string,
  reason?: string | null
): Promise<{ ok: boolean; nowOnHold: boolean; error?: string }> {
  const admin = createAdminClient();

  // Lire le statut actuel
  const { data: current, error: readErr } = await admin
    .from("case_assignments")
    .select("status, on_hold_at, on_hold_reason")
    .eq("case_id", caseId)
    .eq("sector_code", sectorCode)
    .maybeSingle();

  if (readErr || !current) {
    return { ok: false, nowOnHold: false, error: readErr?.message ?? "Cas non trouvé" };
  }

  const isCurrentlyOnHold = current.status === "on_hold";

  if (isCurrentlyOnHold) {
    // Retirer l'attente → retour en actif
    const { error } = await admin
      .from("case_assignments")
      .update({ status: "active", on_hold_at: null, on_hold_reason: null })
      .eq("case_id", caseId)
      .eq("sector_code", sectorCode);
    if (error) return { ok: false, nowOnHold: true, error: error.message };
  } else {
    // Mettre en attente
    const { error } = await admin
      .from("case_assignments")
      .update({
        status: "on_hold",
        on_hold_at: new Date().toISOString(),
        on_hold_reason: reason?.trim() || null,
      })
      .eq("case_id", caseId)
      .eq("sector_code", sectorCode);
    if (error) return { ok: false, nowOnHold: false, error: error.message };
  }

  // Revalidate le secteur
  const sectorPath = sectorCode.replace("_", "-");
  revalidatePath(`/app/${sectorPath}`);
  return { ok: true, nowOnHold: !isCurrentlyOnHold };
}
