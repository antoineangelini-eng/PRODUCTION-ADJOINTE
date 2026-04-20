"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

export type LotCheckResult = {
  caseNumber: string;
  status: "ok" | "in_table" | "in_history";
};

export type LotCreateResult = {
  caseNumber: string;
  ok: boolean;
  error?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(
    date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
      .split("/").reverse().join("-")
  );
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cleanCaseNumber(raw: string): { caseNumber: string; forcePhysical: boolean } {
  const cleaned = raw.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim();
  if (cleaned.length >= 4 && cleaned.length % 2 === 0) {
    const half = cleaned.length / 2;
    if (cleaned.slice(0, half) === cleaned.slice(half)) {
      return { caseNumber: cleaned.slice(0, half), forcePhysical: true };
    }
  }
  return { caseNumber: cleaned, forcePhysical: false };
}

// ─── Check duplicates for a single case number ─────────────────────────────

export async function checkCaseForLotDR(rawNumber: string): Promise<LotCheckResult> {
  const { caseNumber } = cleanCaseNumber(rawNumber);
  if (!caseNumber) return { caseNumber: rawNumber, status: "ok" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cases")
    .select("id")
    .eq("case_number", caseNumber)
    .limit(1)
    .maybeSingle();

  if (!existing?.id) return { caseNumber, status: "ok" };

  // Check active in DR
  const { data: activeAssign } = await supabase
    .from("case_assignments")
    .select("status")
    .eq("case_id", existing.id)
    .eq("sector_code", "design_resine")
    .in("status", ["active", "in_progress"])
    .maybeSingle();

  if (activeAssign) return { caseNumber, status: "in_table" };

  // Check done in DR
  const { data: doneAssign } = await supabase
    .from("case_assignments")
    .select("status")
    .eq("case_id", existing.id)
    .eq("sector_code", "design_resine")
    .eq("status", "done")
    .maybeSingle();

  if (doneAssign) return { caseNumber, status: "in_history" };

  // Exists in DB but not in DR sector → ok to create in DR
  return { caseNumber, status: "ok" };
}

// ─── Create multiple cases in batch ─────────────────────────────────────────

export async function createCasesBatchDR(
  caseNumbers: string[]
): Promise<LotCreateResult[]> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const results: LotCreateResult[] = [];

  // Get working days config for Provisoire Résine
  const { data: wdConfig } = await supabase
    .from("working_days_config")
    .select("days")
    .eq("nature", "Provisoire Résine")
    .single();
  const nbDays = wdConfig?.days ?? 3;
  const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));

  for (const raw of caseNumbers) {
    const { caseNumber, forcePhysical } = cleanCaseNumber(raw);
    if (!caseNumber) {
      results.push({ caseNumber: raw, ok: false, error: "Numéro vide" });
      continue;
    }

    try {
      // Create case via RPC
      const { data, error } = await supabase.rpc("rpc_create_case_from_design_resine", {
        p_case_number: caseNumber,
        p_nature_du_travail: "Provisoire Résine",
      });
      if (error) {
        results.push({ caseNumber, ok: false, error: error.message });
        continue;
      }

      const caseId = typeof data === "string" ? data : String(data);
      if (!caseId || caseId === "null") {
        results.push({ caseNumber, ok: false, error: "Création échouée" });
        continue;
      }

      // Set defaults (admin bypass)
      await admin
        .from("sector_design_resine")
        .update({ type_de_dents: "Dents usinées", modele_a_realiser_ok: true })
        .eq("case_id", caseId);

      // Set date expedition
      await supabase.rpc("rpc_update_case_expedition", {
        p_case_id: caseId,
        p_date: dateExp,
        p_manual: false,
      });

      // Mark physical if double scan
      if (forcePhysical) {
        await supabase.rpc("rpc_mark_case_physical", { p_case_id: caseId });
      }

      results.push({ caseNumber, ok: true });
    } catch (e: any) {
      results.push({ caseNumber, ok: false, error: e.message ?? "Erreur inconnue" });
    }
  }

  return results;
}
