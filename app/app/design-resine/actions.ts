"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveDisplayNames } from "@/lib/resolve-names";

export type DesignResineRow = {
  id: string;
  case_number: string;
  created_at: string;
  date_expedition: string | null;
  nature_du_travail: string | null;
  is_physical: boolean | null;
  created_by: string | null;
  sent_by_name: string | null;
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
      created_by, status, on_hold_at, on_hold_reason,
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
    .in("status", ["active", "in_progress", "on_hold"])
    .order("activated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as any[])
    .map((r: any) => r.cases ? { ...r.cases, created_by: r.created_by ?? null, _on_hold: r.status === "on_hold", _on_hold_at: r.on_hold_at ?? null, _on_hold_reason: r.on_hold_reason ?? null } : null)
    .filter(Boolean);

  // Résoudre "Envoyé par" = qui a validé le cas en DM (secteur précédent)
  const caseIds = rows.map((r: any) => r.id).filter(Boolean);
  let senderMap: Record<string, string> = {};
  if (caseIds.length > 0) {
    const admin = createAdminClient();
    const { data: senderData } = await admin
      .from("case_assignments")
      .select("case_id, updated_by")
      .in("case_id", caseIds)
      .eq("sector_code", "design_metal")
      .eq("status", "done");
    const senderIds = (senderData ?? []).map((s: any) => s.updated_by).filter(Boolean);
    const nameMap = await resolveDisplayNames(senderIds);
    (senderData ?? []).forEach((s: any) => {
      if (s.updated_by && nameMap[s.updated_by]) {
        senderMap[s.case_id] = nameMap[s.updated_by];
      }
    });
  }

  return rows.map((r: any) => ({ ...r, sent_by_name: senderMap[r.id] ?? null }));
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

  // ─ Vérification doublon par numéro de cas ─
  const { data: existing } = await supabase
    .from("cases")
    .select("id")
    .eq("case_number", caseNumber)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // Vérifier si le cas est dans le tableau actif DR
    const { data: activeAssign } = await supabase
      .from("case_assignments")
      .select("status")
      .eq("case_id", existing.id)
      .eq("sector_code", "design_resine")
      .in("status", ["active", "in_progress", "on_hold"])
      .maybeSingle();

    if (activeAssign) {
      redirect(`/app/design-resine?msg=in_table&cn=${caseNumber}&focus=${caseNumber}`);
    }

    // Vérifier si le cas est dans l'historique DR
    const { data: doneAssign } = await supabase
      .from("case_assignments")
      .select("status")
      .eq("case_id", existing.id)
      .eq("sector_code", "design_resine")
      .eq("status", "done")
      .maybeSingle();

    if (doneAssign) {
      redirect(`/app/design-resine?msg=in_history&cn=${caseNumber}`);
    }
  }

  const nature = String(formData.get("nature") ?? "Provisoire Résine").trim() || "Provisoire Résine";

  const { data, error } = await supabase.rpc("rpc_create_case_from_design_resine", {
    p_case_number: caseNumber,
    p_nature_du_travail: nature,
  });
  if (error) throw new Error(error.message);

  const caseId = typeof data === "string" ? data : String(data);
  if (!caseId || caseId === "null") return;

  // Défauts pour tout cas créé depuis DR (admin bypass RLS)
  const admin = createAdminClient();
  const drDefaults: Record<string, any> = { modele_a_realiser_ok: true };
  if (nature === "Complet") {
    // Complet : forcer null pour type_de_dents et base
    drDefaults.type_de_dents = null;
    drDefaults.base_type = null;
  } else if (nature === "Deflex") {
    drDefaults.type_de_dents = "Dents usinées";
    drDefaults.base_type = "Usinée";
  } else {
    drDefaults.type_de_dents = "Dents usinées";
  }
  await admin
    .from("sector_design_resine")
    .update(drDefaults)
    .eq("case_id", caseId);

  // Date d'expédition : manuelle si fournie, sinon calcul auto
  const manualDate = String(formData.get("date_expedition") ?? "").trim();
  if (manualDate) {
    await supabase.rpc("rpc_update_case_expedition", {
      p_case_id: caseId,
      p_date: manualDate,
      p_manual: true,
    });
  } else {
    const { data: wdConfig } = await supabase
      .from("working_days_config")
      .select("days")
      .eq("nature", nature)
      .single();
    const nbDays = wdConfig?.days ?? 3;
    const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));
    await supabase.rpc("rpc_update_case_expedition", {
      p_case_id: caseId,
      p_date: dateExp,
      p_manual: false,
    });
  }

  // Si scan doublé détecté (ex "130172130172") → on marque le cas tout juste créé physique
  if (forcePhysical) {
    await supabase.rpc("rpc_mark_case_physical", { p_case_id: caseId });
  }

  revalidatePath("/app/design-resine");
}

export async function scanCaseAction(formData: FormData) {
  const supabase = await createClient();
  const rawInput = String(formData.get("scan") ?? "").trim();
  if (!rawInput) return;

  // Nettoyage identique à createCaseAction
  const caseNumber = rawInput.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "").trim();
  if (!caseNumber) return;

  // Chercher le cas dans le secteur DR
  const { data, error } = await supabase.rpc("rpc_scan_case", {
    p_sector_code: "design_resine",
    p_case_number: caseNumber,
  });

  if (!error && data) {
    // Cas trouvé dans DR → juste focus
    redirect(`/app/design-resine?focus=${caseNumber}`);
  }

  // Cas introuvable dans DR → pré-remplir le numéro de cas pour que l'utilisateur choisisse la nature
  redirect(`/app/design-resine?prefill=${caseNumber}`);
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

  // Admin direct update pour garantir la sauvegarde (bypass RLS + RPC whitelist)
  const admin = createAdminClient();
  await admin
    .from("sector_design_resine")
    .update({ [column]: value })
    .eq("case_id", caseId);
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

export async function updateCaseNatureAction(caseId: string, nature: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("cases").update({ nature_du_travail: nature }).eq("id", caseId);
  revalidatePath("/app/design-resine");
}

/** Créer un volet résine pour un cas existant venant de DM (même case_number, nature DR) */
export async function createResineVoletAction(
  caseNumber: string,
  nature: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Vérifier qu'il n'y a pas déjà un volet résine actif pour ce numéro
  const { data: existingVolets } = await admin
    .from("cases")
    .select("id, nature_du_travail")
    .eq("case_number", caseNumber);
  const drNatures = ["Provisoire Résine", "Deflex", "Complet"];
  const hasVolet = (existingVolets ?? []).some(c => drNatures.includes(c.nature_du_travail));
  if (hasVolet) return { ok: false, error: "Un volet résine existe déjà pour ce cas" };

  // Créer un nouveau cas avec le même numéro
  const { data, error } = await supabase.rpc("rpc_create_case_from_design_resine", {
    p_case_number: caseNumber,
    p_nature_du_travail: nature,
  });
  if (error) return { ok: false, error: error.message };

  const caseId = typeof data === "string" ? data : String(data);
  if (!caseId || caseId === "null") return { ok: false, error: "Erreur création" };

  // Défauts selon la nature
  const drDefaults: Record<string, any> = { modele_a_realiser_ok: true };
  if (nature === "Complet") {
    drDefaults.type_de_dents = null;
    drDefaults.base_type = null;
  } else if (nature === "Deflex") {
    drDefaults.type_de_dents = "Dents usinées";
    drDefaults.base_type = "Usinée";
  } else {
    drDefaults.type_de_dents = "Dents usinées";
  }
  await admin.from("sector_design_resine").update(drDefaults).eq("case_id", caseId);

  // Date d'expédition basée sur les jours ouvrés
  const { data: wdConfig } = await supabase
    .from("working_days_config")
    .select("days")
    .eq("nature", nature)
    .single();
  const nbDays = wdConfig?.days ?? 3;
  const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));
  await supabase.rpc("rpc_update_case_expedition", { p_case_id: caseId, p_date: dateExp, p_manual: false });

  revalidatePath("/app/design-resine");
  return { ok: true };
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

export async function removeCaseFromSectorAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "design_resine");
  if (!perm.allowed) return { error: perm.error };

  const admin = createAdminClient();
  await admin.from("case_assignments").delete().eq("case_id", caseId).eq("sector_code", "design_resine");
  revalidatePath("/app/design-resine");
  return { ok: true };
}

export async function deleteCaseAction(formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "").trim();
  if (!caseId) return { error: "ID manquant" };

  const { checkDeletePermission } = await import("@/lib/delete-permission");
  const perm = await checkDeletePermission(caseId, "design_resine");
  if (!perm.allowed) return { error: perm.error };

  const admin = createAdminClient();
  const { error } = await admin.from("case_events").delete().eq("case_id", caseId);
  if (error) return { error: error.message };
  await admin.from("case_assignments").delete().eq("case_id", caseId);
  await admin.from("sector_design_metal").delete().eq("case_id", caseId);
  await admin.from("sector_design_resine").delete().eq("case_id", caseId);
  await admin.from("sector_usinage_titane").delete().eq("case_id", caseId);
  await admin.from("sector_usinage_resine").delete().eq("case_id", caseId);
  await admin.from("sector_finition").delete().eq("case_id", caseId);
  await admin.from("cases").delete().eq("id", caseId);
  return { ok: true };
}
