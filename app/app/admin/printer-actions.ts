"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UserPrinter = {
  user_id: string;
  email: string;
  display_name: string | null;
  printer_ip: string;
};

/** Charge la liste des utilisateurs avec leur IP imprimante (admin) */
export async function loadUserPrintersAction(): Promise<UserPrinter[]> {
  const supabase = createAdminClient();

  // Tous les utilisateurs auth
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];

  // Tous les profils (pour display_name)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name");
  const profileMap = new Map<string, string | null>();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p.display_name ?? null);
  }

  // Toutes les entrées user_printers
  const { data: printers } = await supabase
    .from("user_printers")
    .select("user_id, printer_ip");
  const printerMap = new Map<string, string>();
  for (const p of printers ?? []) {
    printerMap.set(p.user_id, p.printer_ip);
  }

  return authUsers.map(u => ({
    user_id: u.id,
    email: u.email ?? "",
    display_name: profileMap.get(u.id) ?? null,
    printer_ip: printerMap.get(u.id) ?? "",
  })).sort((a, b) => (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email));
}

/** Sauvegarder l'IP imprimante d'un utilisateur (upsert) */
export async function saveUserPrinterAction(
  userId: string,
  printerIp: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const ip = printerIp.trim();

  if (!ip) {
    // Supprimer l'entrée si IP vide
    await supabase.from("user_printers").delete().eq("user_id", userId);
    return { ok: true };
  }

  const { error } = await supabase.from("user_printers").upsert(
    { user_id: userId, printer_ip: ip, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Récupérer l'IP imprimante de l'utilisateur connecté (côté impression) */
export async function getCurrentUserPrinterIpAction(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_printers")
    .select("printer_ip")
    .eq("user_id", user.id)
    .single();

  return data?.printer_ip || null;
}
