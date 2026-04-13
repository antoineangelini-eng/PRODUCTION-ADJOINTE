"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type AdminCaseRow = {
  id: string;
  case_number: string | null;
  created_at: string | null;
  date_expedition: string | null;
  nature_du_travail: string | null;
  // Type de dents (priorité DR > DM)
  type_de_dents: string | null;
  // Design Métal
  dm_design_chassis: boolean | null;
  dm_design_chassis_at: string | null;
  dm_dentall_case_number: string | null;
  dm_envoye_dentall: boolean | null;
  dm_reception_metal_date: string | null;
  dm_modele_a_faire_ok: boolean | null;
  dm_teintes_associees: string | null;
  // Design Résine
  dr_design_dents_resine: boolean | null;
  dr_design_dents_resine_at: string | null;
  dr_nb_blocs_de_dents: string | null;
  dr_teintes_associees: string | null;
  // Usinage Titane
  ut_envoye_usinage: boolean | null;
  ut_envoye_usinage_at: string | null;
  ut_machine_ut: string | null;
  ut_numero_calcul: string | null;
  ut_numero_calcul_h: string | null;
  ut_nombre_brut: string | null;
  ut_nombre_brut_h: string | null;
  ut_numero_lot_metal: string | null;
  ut_reception_metal_date: string | null;
  ut_modele_a_faire_ok: boolean | null;
  // Usinage Résine
  ur_usinage_dents_resine: boolean | null;
  ur_identite_machine: string | null;
  ur_numero_disque: string | null;
  ur_numero_lot_pmma: string | null;
  ur_reception_resine_at: string | null;
  // Finition
  fin_teintes_associees: string | null;
  fin_nb_blocs: string | null;
  fin_reception_metal_date: string | null;
  fin_reception_resine_at: string | null;
  fin_reception_complete_at: string | null;
  fin_validation: boolean | null;
  // Statut
  current_sector: string | null;
  is_done: boolean;
  sectors_done: string[];
};

export type AdminUser = {
  user_id: string;
  email: string;
  sector: string;
  sectors: string[];
  display_name: string;
  password_hint: string | null;
};

export type WorkingDayConfig = {
  nature: string;
  days: number;
};

export async function loadAllCasesAction(): Promise<AdminCaseRow[]> {
  const supabase = createAdminClient(); // bypass RLS

  // ── 1. Tous les cas ──────────────────────────────────────────────────────
  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id, case_number, created_at, date_expedition, nature_du_travail")
    .order("created_at", { ascending: false })
    .limit(500);

  if (casesError || !cases || cases.length === 0) return [];

  const caseIds = (cases as any[]).map((c: any) => c.id);

  // ── 2. Secteurs — requêtes séparées pour éviter qu'une table manquante  ──
  //      ou une colonne inexistante ne tue toute la requête
  const [
    { data: dmRows },
    { data: drRows },
    { data: utRows },
    { data: urRows },
    { data: finRows },
    { data: assignments },
  ] = await Promise.all([
    supabase.from("sector_design_metal").select(
      "case_id, design_chassis, design_chassis_at, dentall_case_number, envoye_dentall, reception_metal_date, type_de_dents, modele_a_faire_ok, teintes_associees"
    ).in("case_id", caseIds),
    supabase.from("sector_design_resine").select(
      "case_id, type_de_dents, design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, teintes_associees"
    ).in("case_id", caseIds),
    supabase.from("sector_usinage_titane").select("*").in("case_id", caseIds),
    supabase.from("sector_usinage_resine").select(
      "case_id, usinage_dents_resine, identite_machine, numero_disque, numero_lot_pmma, reception_resine_at"
    ).in("case_id", caseIds),
    supabase.from("sector_finition").select("*").in("case_id", caseIds),
    supabase.from("case_assignments").select("case_id, sector_code, status").in("case_id", caseIds),
  ]);

  // ── 3. Index par case_id ────────────────────────────────────────────────
  const idx = <T extends { case_id?: string }>(rows: T[] | null): Record<string, T> =>
    Object.fromEntries((rows ?? []).map(r => [r.case_id, r]));

  const dmMap  = idx(dmRows  as any);
  const drMap  = idx(drRows  as any);
  const utMap  = idx(utRows  as any);
  const urMap  = idx(urRows  as any);
  const finMap = idx(finRows as any);

  const assignMap: Record<string, Record<string, string>> = {};
  for (const a of assignments ?? []) {
    if (!assignMap[a.case_id]) assignMap[a.case_id] = {};
    assignMap[a.case_id][a.sector_code] = a.status;
  }

  // ── 4. Assembly ─────────────────────────────────────────────────────────
  return (cases as any[]).map((c: any) => {
    const sectors = assignMap[c.id] ?? {};
    const current = Object.entries(sectors).find(
      ([, s]) => s === "active" || s === "in_progress"
    )?.[0] ?? null;
    const isDone = Object.values(sectors).length > 0 &&
      Object.values(sectors).every(s => s === "done");
    const sectorsDone = Object.entries(sectors)
      .filter(([, s]) => s === "done").map(([k]) => k);

    const dm  = dmMap[c.id]  ?? {};
    const dr  = drMap[c.id]  ?? {};
    const ut  = utMap[c.id]  ?? {};
    const ur  = urMap[c.id]  ?? {};
    const fin = finMap[c.id] ?? {};

    return {
      id: c.id,
      case_number: c.case_number,
      created_at: c.created_at,
      date_expedition: c.date_expedition,
      nature_du_travail: c.nature_du_travail,
      type_de_dents: (dr as any).type_de_dents ?? (dm as any).type_de_dents ?? null,
      // DM
      dm_design_chassis:       dm.design_chassis       ?? null,
      dm_design_chassis_at:    dm.design_chassis_at    ?? null,
      dm_dentall_case_number:  dm.dentall_case_number  ?? null,
      dm_envoye_dentall:       dm.envoye_dentall       ?? null,
      dm_reception_metal_date: dm.reception_metal_date ?? null,
      dm_modele_a_faire_ok:    dm.modele_a_faire_ok    ?? null,
      dm_teintes_associees:    dm.teintes_associees    ?? null,
      // DR
      dr_design_dents_resine:    dr.design_dents_resine     ?? null,
      dr_design_dents_resine_at: dr.design_dents_resine_at  ?? null,
      dr_nb_blocs_de_dents:      dr.nb_blocs_de_dents       ?? null,
      // Teintes DR : priorité DR, fallback DM
      dr_teintes_associees:      dr.teintes_associees ?? dm.teintes_associees ?? null,
      // UT — noms exacts des colonnes de sector_usinage_titane
      ut_envoye_usinage:       ut.envoye_usinage       ?? null,
      ut_envoye_usinage_at:    ut.envoye_usinage_at    ?? null,
      ut_machine_ut:           ut.machine_ut           ?? null,
      ut_numero_calcul:        ut.numero_calcul        ?? null,
      ut_numero_calcul_h:      ut.numero_calcul_h      ?? null,
      ut_nombre_brut:          ut.nombre_brut          ?? null,
      ut_nombre_brut_h:        ut.nombre_brut_h        ?? null,
      ut_numero_lot_metal:     ut.numero_lot_metal   ?? null,
      ut_reception_metal_date: ut.reception_metal_at ?? null,  // colonne réelle : reception_metal_at
      ut_modele_a_faire_ok:    dm.modele_a_faire_ok ?? null,  // modele vient de sector_design_metal
      // UR
      ur_usinage_dents_resine: ur.usinage_dents_resine ?? null,
      ur_identite_machine:     ur.identite_machine     ?? null,
      ur_numero_disque:        ur.numero_disque        ?? null,
      ur_numero_lot_pmma:      ur.numero_lot_pmma      ?? null,
      ur_reception_resine_at:  ur.reception_resine_at  ?? null,
      // Finition — sector_finition n'a que validation/validation_at
      // Les réceptions viennent de sector_usinage_titane et sector_usinage_resine
      fin_teintes_associees:     dr.teintes_associees  ?? dm.teintes_associees ?? null,
      fin_nb_blocs:              dr.nb_blocs_de_dents  ?? null,
      fin_reception_metal_date:  ut.reception_metal_at ?? null,   // UT : reception_metal_at
      fin_reception_resine_at:   ur.reception_resine_at ?? null,  // UR : reception_resine_at
      fin_reception_complete_at: null, // calculé côté frontend (max des deux)
      fin_validation:            fin.validation        ?? null,
      current_sector: current,
      is_done: isDone,
      sectors_done: sectorsDone,
    };
  });
}

export async function loadUsersAction(): Promise<AdminUser[]> {
  const supabase = createAdminClient(); // bypass RLS pour lire tous les profils

  // 1. Récupérer TOUS les utilisateurs de Supabase Auth
  let authUsers: { id: string; email?: string }[] = [];
  try {
    // listUsers pagine par défaut à 50, on boucle pour tout récupérer
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (authError || !authData?.users?.length) {
        hasMore = false;
      } else {
        authUsers.push(...authData.users.map(u => ({ id: u.id, email: u.email })));
        hasMore = authData.users.length === 100;
        page++;
      }
    }
  } catch {
    // Si l'API admin n'est pas dispo, on fallback sur profiles uniquement
  }

  // 2. Récupérer les profils existants
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, sector, sectors, email, password_hint")
    .order("email", { ascending: true });

  const profileMap = new Map<string, any>();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p);
  }

  // 3. Créer les profils manquants pour les utilisateurs Auth sans profil
  const missing = authUsers.filter(u => !profileMap.has(u.id));
  for (const u of missing) {
    const newProfile = {
      user_id: u.id,
      email: u.email ?? "",
      sector: "design_metal", // secteur par défaut
      sectors: ["design_metal"],
      password_hint: null,
    };
    await supabase.from("profiles").insert(newProfile);
    profileMap.set(u.id, newProfile);
  }

  // 4. Construire la liste finale à partir des profils (maintenant synchronisés)
  const allProfiles = Array.from(profileMap.values());
  allProfiles.sort((a: any, b: any) => (a.email ?? "").localeCompare(b.email ?? ""));

  return allProfiles.map((p: any) => {
    // Supabase peut retourner sectors comme string "{a,b}" ou comme array — on normalise
    let sectors: string[] = [];
    if (Array.isArray(p.sectors)) {
      sectors = p.sectors;
    } else if (typeof p.sectors === "string") {
      // Parse le format PostgreSQL "{admin,design_metal,...}"
      sectors = p.sectors.replace(/^\{|\}$/g, "").split(",").map((s: string) => s.replace(/"/g, "").trim()).filter(Boolean);
    }
    if (sectors.length === 0 && p.sector) {
      sectors = [p.sector];
    }

    return {
      user_id: p.user_id,
      email: p.email ?? "",
      sector: p.sector ?? "",
      sectors,
      display_name: (p.email ?? "").split(".")[0] ?? p.user_id,
      password_hint: p.password_hint ?? null,
    };
  });
}

export async function createUserAction(
  email: string, sectors: string[], password: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data?.user) return { ok: false, error: error?.message ?? "Erreur" };
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: data.user.id, sector: sectors[0] ?? "design_metal", sectors, email, password_hint: password,
  });
  if (profileError) return { ok: false, error: profileError.message };
  revalidatePath("/app/admin");
  return { ok: true };
}

export async function updatePasswordHintAction(userId: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ password_hint: newPassword }).eq("user_id", userId);
}

export async function updateUserSectorsAction(userId: string, sectors: string[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ sectors, sector: sectors[0] ?? "design_metal" })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/admin");
  return { ok: true };
}

/** @deprecated — utiliser updateUserSectorsAction */
export async function updateUserSectorAction(userId: string, sector: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ sector }).eq("user_id", userId);
  revalidatePath("/app/admin");
}

export async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("profiles").delete().eq("user_id", userId);
  revalidatePath("/app/admin");
  return { ok: true };
}

export async function adminResetPasswordAction(userId: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
}

export async function loadWorkingDaysAction(): Promise<WorkingDayConfig[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("working_days_config").select("nature, days").order("nature");
  return data ?? [];
}

export async function saveWorkingDaysAction(nature: string, days: number): Promise<void> {
  const supabase = await createClient();
  await supabase.from("working_days_config").upsert({ nature, days }, { onConflict: "nature" });
}

export async function adminResetSectorsAction(sectors: string[] | null) {
  const supabase = await createClient();
  if (sectors === null) {
    await supabase.rpc("rpc_admin_reset_all");
  } else {
    for (const s of sectors) {
      await supabase.rpc("rpc_admin_reset_sector", { p_sector_code: s });
    }
  }
  revalidatePath("/app/admin");
}
