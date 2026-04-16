"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type DesignResineRow = {
  id: string;
  case_number: string;
  created_at: string;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  sector_design_metal: {
    design_chassis: boolean | null;
    design_chassis_at: string | null;
    type_de_dents: string | null;
    teintes_associees: string | null;
    modele_a_faire_ok: boolean | null;
  } | null;
  sector_design_resine: {
    type_de_dents: string | null;
    design_dents_resine: boolean | null;
    design_dents_resine_at: string | null;
    nb_blocs_de_dents: string | null;
    modele_a_realiser_ok: boolean | null;
    teintes_associees: string | null;
    complet: boolean | null;
    base_type: string | null;
    dents_type: string | null;
  } | null;
};

export type BatchResult = {
  okIds: string[];
  errors: { case_id: string; error_message: string }[];
};

export async function loadDesignResineRowsAction(): Promise<DesignResineRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_assignments")
    .select(`
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_metal ( design_chassis, design_chassis_at, type_de_dents, teintes_associees, modele_a_faire_ok ),
        sector_design_resine (
          type_de_dents, design_dents_resine, design_dents_resine_at,
          nb_blocs_de_dents, modele_a_realiser_ok, teintes_associees,
          complet, base_type, dents_type
        )
      )
    `)
    .eq("sector_code", "design_resine")
    .in("status", ["active", "in_progress"])
    .order("activated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r: any) => r.cases).filter(Boolean);
}

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

export async function createCaseAction(formData: FormData) {
  const supabase = await createClient();
  // Nettoyage agressif : whitespace, tabs, newlines, espaces insécables, tout ce qui traîne
  const rawCaseNumber = String(formData.get("case_number") ?? "")
    .replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "")
    .trim();
  if (!rawCaseNumber) return;

  // ─ Détection "cas physique" ─
  // 1) chaîne doublée (scanner qui a collé 2 scans : "128540128540" → "128540" + flag physique)
  // 2) même n° soumis 2 fois < 60 s → on marque le cas existant physique
  let caseNumber = rawCaseNumber;
  let forcePhysical = false;
  if (rawCaseNumber.length >= 4 && rawCaseNumber.length % 2 === 0) {
    const half = rawCaseNumber.length / 2;
    if (rawCaseNumber.slice(0, half) === rawCaseNumber.slice(half)) {
      caseNumber = rawCaseNumber.slice(0, half);
      forcePhysical = true;
      console.log(`[createCaseAction DR] Double scan détecté : "${rawCaseNumber}" → "${caseNumber}" (physique)`);
    }
  }

  const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await supabase
    .from("cases")
    .select("id, created_at, is_physical")
    .eq("case_number", caseNumber)
    .gte("created_at", sixtySecAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.id) {
    if (!recent.is_physical) {
      await supabase.rpc("rpc_mark_case_physical", { p_case_id: recent.id });
    }
    redirect(`/app/design-resine?focus=${caseNumber}`);
  }

  const { data, error } = await supabase.rpc("rpc_create_case_from_design_resine", {
    p_case_number: caseNumber,
    p_nature_du_travail: "Provisoire Résine",
  });
  if (error) throw new Error(error.message);

  const caseId = typeof data === "string" ? data : String(data);
  if (!caseId || caseId === "null") return;

  // Forcer type_de_dents = "Dents usinées" pour tout cas créé depuis DR
  await supabase
    .from("sector_design_resine")
    .update({ type_de_dents: "Dents usinées" })
    .eq("case_id", caseId);

  // Calculer la date d'expédition en jours ouvrés (hors weekends)
  const { data: wdConfig } = await supabase
    .from("working_days_config")
    .select("days")
    .eq("nature", "Provisoire Résine")
    .single();
  const nbDays = wdConfig?.days ?? 3;
  const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));

  // Utiliser la RPC dédiée (compatible RLS) au lieu d'un update direct
  await supabase.rpc("rpc_update_case_expedition", {
    p_case_id: caseId,
    p_date: dateExp,
    p_manual: false,
  });

  // Si scan doublé détecté (ex "130172130172") → on marque le cas tout juste créé physique
  if (forcePhysical) {
    await supabase.rpc("rpc_mark_case_physical", { p_case_id: caseId });
  }

  redirect("/app/design-resine");
}

export async function scanCaseAction(formData: FormData) {
  const supabase = await createClient();
  const caseNumber = String(formData.get("scan") ?? "").trim();
  if (!caseNumber) return;
  const { data, error } = await supabase.rpc("rpc_scan_case", {
    p_sector_code: "design_resine",
    p_case_number: caseNumber,
  });
  if (error) return;
  redirect(`/app/design-resine?focus=${data}`);
}

export async function saveDesignResineCellAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const column = String(formData.get("column") ?? "").trim();
  const kind   = String(formData.get("kind")   ?? "").trim();

  if (column === "date_expedition") {
    const raw = String(formData.get("value") ?? "").trim();
    await supabase.rpc("rpc_update_case_expedition", {
      p_case_id: caseId,
      p_date: raw || null,
      p_manual: true,
    });
    return;
  }

  const allowed = [
    "type_de_dents", "design_dents_resine", "nb_blocs_de_dents",
    "teintes_associees", "complet", "base_type", "dents_type",
    "modele_a_realiser_ok",
  ];
  if (!caseId || !column || !allowed.includes(column)) return;

  let value: any;
  if (kind === "boolean") {
    value = formData.get("current") !== "true";
  } else {
    const raw = String(formData.get("value") ?? "").trim();
    value = raw === "" ? null : raw;
  }

  await supabase.rpc("rpc_update_design_resine", {
    p_case_id: caseId,
    p_patch: { [column]: value },
  });
}

// Save multiple fields at once (used for auto-logic)
export async function saveDesignResineMultiAction(
  caseId: string,
  patch: Record<string, any>
) {
  const supabase = await createClient();
  await supabase.rpc("rpc_update_design_resine", {
    p_case_id: caseId,
    p_patch: patch,
  });
}

export async function completeDesignResineBatchAction(
  _prev: BatchResult | null,
  formData: FormData
): Promise<BatchResult> {
  const supabase = await createClient();
  const caseIds = formData.getAll("case_ids").map(String).filter(Boolean);
  if (caseIds.length === 0)
    return { okIds: [], errors: [{ case_id: "", error_message: "Aucun dossier sélectionné." }] };

  const okIds: string[] = [];
  const errors: BatchResult["errors"] = [];
  for (const id of caseIds) {
    const { error } = await supabase.rpc("rpc_complete_design_resine", { p_case_id: id });
    if (error) errors.push({ case_id: id, error_message: error.message });
    else okIds.push(id);
  }
  revalidatePath("/app/design-resine");
  return { okIds, errors };
}

export async function toggleCasePhysicalAction(caseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_toggle_case_physical", { p_case_id: caseId });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function deleteCaseAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };
  const { error } = await supabase.rpc("rpc_delete_case", { p_case_id: caseId });
  if (error) return { error: error.message };
  return { ok: true };
}
