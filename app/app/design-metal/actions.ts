"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export type BatchResult = {
  okIds: string[];
  errors: { case_id: string | null; error_message: string }[];
};

export type DesignMetalRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  sector_design_metal: {
    design_chassis: boolean | null;
    design_chassis_at: string | null;
    dentall_case_number: string | null;
    envoye_dentall: boolean | null;
    reception_metal_date: string | null;
    type_de_dents: string | null;
    modele_a_faire_ok: boolean | null;
    teintes_associees: string | null;
  } | null;
};

export async function loadDesignMetalRowsAction(): Promise<DesignMetalRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_assignments")
    .select(`
      cases:case_id (
        id, created_at, case_number, date_expedition, nature_du_travail, is_physical,
        sector_design_metal (
          design_chassis, design_chassis_at, dentall_case_number,
          envoye_dentall, reception_metal_date, type_de_dents,
          modele_a_faire_ok, teintes_associees
        )
      )
    `)
    .eq("sector_code", "design_metal")
    .in("status", ["active", "in_progress"])
    .order("activated_at", { ascending: false })
    .limit(200);

  return ((data ?? []) as any[]).map((r: any) => r.cases);
}

export async function saveDesignMetalCellAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const column = String(formData.get("column")  ?? "").trim();
  const kind   = String(formData.get("kind")    ?? "").trim();
  if (!caseId || !column) return;

  let value: any;
  if (kind === "boolean") {
    value = formData.get("current") !== "true";
  } else if (kind === "date") {
    const raw = String(formData.get("value") ?? "").trim();
    value = raw === "" ? null : raw;
  } else {
    value = String(formData.get("value") ?? "").trim() || null;
  }

  await supabase.rpc("rpc_update_design_metal", {
    p_case_id: caseId,
    p_patch: { [column]: value },
  });
}

export async function saveTypeDeDentsAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const value  = String(formData.get("value")   ?? "").trim();
  if (!caseId || !value) return;

  await supabase.rpc("rpc_update_design_metal", {
    p_case_id: caseId,
    p_patch: { type_de_dents: value },
  });
}

export async function completeDesignMetalBatchAction(
  _prev: BatchResult | null,
  formData: FormData
): Promise<BatchResult> {
  const supabase = await createClient();
  const caseIds = formData.getAll("case_ids").map(String);

  if (caseIds.length === 0) {
    return { okIds: [], errors: [{ case_id: null, error_message: "Aucun dossier sélectionné." }] };
  }

  const okIds: string[] = [];
  const errors: BatchResult["errors"] = [];

  for (const caseId of caseIds) {
    const { error } = await supabase.rpc("rpc_complete_design_metal", { p_case_id: caseId });
    if (error) errors.push({ case_id: caseId, error_message: error.message });
    else okIds.push(caseId);
  }

  revalidatePath("/app/design-metal");
  return { okIds, errors };
}

export async function updateCaseInfoAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const field  = String(formData.get("field")   ?? "").trim();
  const value  = String(formData.get("value")   ?? "").trim();
  if (!caseId || !field) return;

  if (field === "date_expedition") {
    await supabase.rpc("rpc_update_case_expedition", {
      p_case_id: caseId,
      p_date: value === "" ? null : value,
      p_manual: true,
    });
    return;
  }

  const allowed = ["nature_du_travail"];
  if (!allowed.includes(field)) return;

  await supabase.from("cases").update({
    [field]: value === "" ? null : value,
  }).eq("id", caseId);
}

export async function deleteCaseAction(formData: FormData) {
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { error } = await supabase.rpc("rpc_delete_case", { p_case_id: caseId });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function toggleCasePhysicalAction(caseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rpc_toggle_case_physical", { p_case_id: caseId });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function createCaseAction(formData: FormData) {
  const supabase = await createClient();
  // Nettoyage agressif : whitespace, tabs, newlines, espaces insécables, tout ce qui traîne
  const rawCaseNumber = String(formData.get("case_number") ?? "")
    .replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "")
    .trim();
  const nature        = String(formData.get("nature_du_travail") ?? "").trim();
  if (!rawCaseNumber || !nature) return;

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
      console.log(`[createCaseAction DM] Double scan détecté : "${rawCaseNumber}" → "${caseNumber}" (physique)`);
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
    redirect(`/app/design-metal?focus=${caseNumber}`);
  }

  const { data, error } = await supabase.rpc("rpc_create_case_from_design_metal", {
    p_case_number:       caseNumber,
    p_nature_du_travail: nature,
  });
  if (error) throw new Error(error.message);

  const caseId = typeof data === "string" ? data : String(data);
  if (!caseId || caseId === "null") return;

  // Défaut type_de_dents = "Dents usinées"
  await supabase
    .from("sector_design_metal")
    .update({ type_de_dents: "Dents usinées" })
    .eq("case_id", caseId);

  // Calculer la date d'expédition en jours ouvrés
  const { data: wdConfig } = await supabase
    .from("working_days_config")
    .select("days")
    .eq("nature", nature)
    .single();
  const nbDays = wdConfig?.days ?? 5;
  const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));
  await supabase.rpc("rpc_update_case_expedition", {
    p_case_id: caseId,
    p_date: dateExp,
    p_manual: false,
  });

  // Si scan doublé détecté (ex "130172130172") → on marque le cas tout juste créé physique
  if (forcePhysical) {
    await supabase.rpc("rpc_mark_case_physical", { p_case_id: caseId });
  }

  revalidatePath("/app/design-metal");
  redirect("/app/design-metal");
}
