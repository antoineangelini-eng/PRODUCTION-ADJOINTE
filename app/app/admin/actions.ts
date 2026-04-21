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
  dr_modele_a_realiser_ok: boolean | null;
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
  // Physique
  is_physical: boolean;
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
  custom_display_name: string | null;
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
    .select("id, case_number, created_at, date_expedition, nature_du_travail, is_physical")
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
      "case_id, type_de_dents, design_dents_resine, design_dents_resine_at, nb_blocs_de_dents, teintes_associees, modele_a_realiser_ok"
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

    const dm: any  = dmMap[c.id]  ?? {};
    const dr: any  = drMap[c.id]  ?? {};
    const ut: any  = utMap[c.id]  ?? {};
    const ur: any  = urMap[c.id]  ?? {};
    const fin: any = finMap[c.id] ?? {};

    return {
      id: c.id,
      case_number: c.case_number,
      created_at: c.created_at,
      date_expedition: c.date_expedition,
      nature_du_travail: c.nature_du_travail,
      is_physical: Boolean(c.is_physical),
      type_de_dents: (dr as any).type_de_dents ?? (dm as any).type_de_dents ?? null,
      // DM
      dm_design_chassis:       (dm as any).design_chassis       ?? null,
      dm_design_chassis_at:    (dm as any).design_chassis_at    ?? null,
      dm_dentall_case_number:  (dm as any).dentall_case_number  ?? null,
      dm_envoye_dentall:       (dm as any).envoye_dentall       ?? null,
      dm_reception_metal_date: (dm as any).reception_metal_date ?? null,
      dm_modele_a_faire_ok:    (dm as any).modele_a_faire_ok    ?? null,
      dm_teintes_associees:    (dm as any).teintes_associees    ?? null,
      // DR
      dr_design_dents_resine:    dr.design_dents_resine     ?? null,
      dr_design_dents_resine_at: dr.design_dents_resine_at  ?? null,
      dr_nb_blocs_de_dents:      dr.nb_blocs_de_dents       ?? null,
      // Teintes DR : priorité DR, fallback DM
      dr_teintes_associees:      dr.teintes_associees ?? dm.teintes_associees ?? null,
      dr_modele_a_realiser_ok:   dr.modele_a_realiser_ok ?? null,
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
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (authError) {
        console.error("[loadUsersAction] auth.admin.listUsers error:", authError);
        hasMore = false;
      } else if (!authData?.users?.length) {
        hasMore = false;
      } else {
        authUsers.push(...authData.users.map(u => ({ id: u.id, email: u.email })));
        hasMore = authData.users.length === 100;
        page++;
      }
    }
  } catch (e) {
    console.error("[loadUsersAction] auth listing exception:", e);
  }
  console.log("[loadUsersAction] authUsers.length =", authUsers.length);

  // 2. Récupérer les profils existants — on essaie d'abord avec email + display_name, fallback sans
  let profiles: any[] | null = null;
  {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, sector, sectors, email, password_hint, display_name");
    if (error) {
      console.error("[loadUsersAction] profiles select error (with email):", error);
      // Retry sans email (au cas où la colonne n'existe pas)
      const { data: data2, error: error2 } = await supabase
        .from("profiles")
        .select("user_id, sector, sectors, password_hint");
      if (error2) {
        console.error("[loadUsersAction] profiles select error (without email):", error2);
      } else {
        profiles = data2;
      }
    } else {
      profiles = data;
    }
  }
  console.log("[loadUsersAction] profiles.length =", profiles?.length ?? 0);

  const profileMap = new Map<string, any>();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p);
  }

  // 3. Créer les profils manquants pour les utilisateurs Auth sans profil
  const missing = authUsers.filter(u => !profileMap.has(u.id));
  for (const u of missing) {
    const newProfile: any = {
      user_id: u.id,
      sector: "design_metal",
      sectors: ["design_metal"],
      password_hint: null,
    };
    const { error: insertError } = await supabase.from("profiles").insert(newProfile);
    // Enrichir en mémoire pour l'affichage même si l'email n'est pas en DB
    newProfile.email = u.email ?? "";
    if (!insertError) {
      profileMap.set(u.id, newProfile);
    } else {
      console.error("[loadUsersAction] insert profile error for", u.email, ":", insertError);
      // Le profil existe peut-être déjà — le récupérer
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id, sector, sectors, password_hint")
        .eq("user_id", u.id)
        .single();
      if (existingProfile) {
        profileMap.set(u.id, { ...existingProfile, email: u.email ?? "" });
      } else {
        // Fallback ultime : au moins afficher l'utilisateur auth
        profileMap.set(u.id, {
          user_id: u.id,
          email: u.email ?? "",
          sector: "design_metal",
          sectors: ["design_metal"],
          password_hint: null,
        });
      }
    }
  }

  // Enrichir les profils existants avec l'email auth si manquant
  for (const u of authUsers) {
    const p = profileMap.get(u.id);
    if (p && !p.email && u.email) {
      profileMap.set(u.id, { ...p, email: u.email });
    }
  }
  console.log("[loadUsersAction] profileMap.size =", profileMap.size);

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
      display_name: p.display_name || ((p.email ?? "").split("@")[0] ?? "").split(".").map((w: string) => w ? w[0].toUpperCase() + w.slice(1) : "").join(" ") || p.user_id,
      custom_display_name: p.display_name ?? null,
      password_hint: p.password_hint ?? null,
    };
  });
}

export async function createUserAction(
  email: string, sectors: string[], password: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  let userId: string | null = null;

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });

  if (data?.user) {
    userId = data.user.id;
  } else if (error && /already been registered|already exists/i.test(error.message)) {
    // L'utilisateur existe déjà dans Auth (ex: échec profil au 1er essai)
    // On le retrouve et on met à jour son mot de passe
    let page = 1;
    let found: { id: string } | null = null;
    while (!found) {
      const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (!list?.users?.length) break;
      const match = list.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) { found = { id: match.id }; break; }
      if (list.users.length < 100) break;
      page++;
    }
    if (!found) return { ok: false, error: "Utilisateur existe dans Auth mais introuvable" };
    userId = found.id;
    // Aligner le mot de passe
    await supabase.auth.admin.updateUserById(userId, { password });
  } else {
    return { ok: false, error: error?.message ?? "Erreur" };
  }

  // Upsert du profil (insert si absent, update si déjà là)
  const baseProfile = { user_id: userId, sector: sectors[0] ?? "design_metal", sectors, password_hint: password };
  let profileError: any = null;
  {
    // Essai avec email
    const { error } = await supabase
      .from("profiles")
      .upsert({ ...baseProfile, email }, { onConflict: "user_id" });
    if (error) {
      // Retry sans email
      const { error: error2 } = await supabase
        .from("profiles")
        .upsert(baseProfile, { onConflict: "user_id" });
      profileError = error2;
    }
  }
  if (profileError) return { ok: false, error: profileError.message };

  // Garantie explicite de la sauvegarde du hint (cas triggers DB ou upsert partiel)
  await supabase.from("profiles").update({ password_hint: password }).eq("user_id", userId);

  revalidatePath("/app/admin");
  return { ok: true };
}

export async function updatePasswordHintAction(userId: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ password_hint: newPassword }).eq("user_id", userId);
}

const PROTECTED_ADMIN_EMAIL = "antoine.angelini@labo-argoat.fr";

async function isProtectedUser(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("email").eq("user_id", userId).maybeSingle();
  return (data?.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL;
}

export async function updateUserSectorsAction(userId: string, sectors: string[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  let finalSectors = sectors;
  if (await isProtectedUser(userId) && !sectors.includes("admin")) {
    finalSectors = [...sectors, "admin"];
  }
  const { error } = await supabase
    .from("profiles")
    .update({ sectors: finalSectors, sector: finalSectors[0] ?? "design_metal" })
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
  if (await isProtectedUser(userId)) {
    return { ok: false, error: "Ce compte administrateur est protégé et ne peut pas être supprimé." };
  }
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

export async function updateDisplayNameAction(userId: string, displayName: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  // Mettre à jour le profil
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() || null })
    .eq("user_id", userId);
  if (profileError) return { ok: false, error: profileError.message };
  // Mettre à jour la vue matérialisée / table user_display_names si c'est une vraie table
  await supabase
    .from("user_display_names")
    .upsert({ user_id: userId, display_name: displayName.trim() || null }, { onConflict: "user_id" })
    .then(() => {});
  revalidatePath("/app/admin");
  return { ok: true };
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
  // Utilise le client user-scoped pour que auth.uid() fonctionne dans la RPC
  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_admin_reset_sectors", { p_sectors: sectors });
  if (error) throw new Error(`rpc_admin_reset_sectors: ${error.message}`);
  revalidatePath("/app/admin");
}
