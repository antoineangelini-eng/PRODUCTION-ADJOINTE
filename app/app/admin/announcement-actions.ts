"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export type Announcement = {
  id: string;
  title: string;
  message: string;
  sectors: string[] | null;   // null = tous les secteurs
  active: boolean;
  created_at: string;
};

// ── Admin actions ────────────────────────────────────────────────────────────

export async function loadAnnouncementsAction(): Promise<Announcement[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, message, sectors, active, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Announcement[];
}

export async function createAnnouncementAction(
  title: string,
  message: string,
  sectors: string[] | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    message,
    sectors: sectors && sectors.length > 0 ? sectors : null,
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/admin");
  return { ok: true };
}

export async function toggleAnnouncementAction(
  id: string,
  active: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("announcements").update({ active }).eq("id", id);
  revalidatePath("/app/admin");
}

export async function deleteAnnouncementAction(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/app/admin");
}

// ── User-facing actions ──────────────────────────────────────────────────────

/** Charge les annonces non-lues pour un utilisateur dans un secteur donné */
export async function loadUnreadAnnouncementsAction(
  sectorCode: string,
): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Toutes les annonces actives
  const { data: all } = await supabase
    .from("announcements")
    .select("id, title, message, sectors, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (!all || all.length === 0) return [];

  // Filtrer : sectors IS NULL (toutes) OU sectorCode dans sectors
  const relevant = all.filter((a: any) =>
    a.sectors === null || (Array.isArray(a.sectors) && a.sectors.includes(sectorCode))
  );

  if (relevant.length === 0) return [];

  // Récupérer les dismissals de cet utilisateur
  const { data: dismissed } = await supabase
    .from("announcement_dismissals")
    .select("announcement_id")
    .eq("user_id", user.id);

  const dismissedIds = new Set((dismissed ?? []).map((d: any) => d.announcement_id));

  return relevant.filter((a: any) => !dismissedIds.has(a.id)) as Announcement[];
}

/** Marquer une annonce comme lue */
export async function dismissAnnouncementAction(announcementId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("announcement_dismissals").upsert(
    { user_id: user.id, announcement_id: announcementId },
    { onConflict: "user_id,announcement_id" },
  );
}
