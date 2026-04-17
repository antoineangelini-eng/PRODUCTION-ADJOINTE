"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type FeedbackRow = {
  id: string;
  created_at: string;
  user_id: string;
  sector: string | null;
  titre: string;
  description: string;
  priorite: "faible" | "normal" | "haute";
  statut: "ouvert" | "en_cours" | "fait" | "refuse";
  note_admin: string | null;
  seen_by_user: boolean;
  email?: string;
};

export async function submitFeedbackAction(
  titre: string,
  description: string,
  priorite: "faible" | "normal" | "haute"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  const { data: profile } = await supabase.from("profiles").select("sector").eq("user_id", user.id).single();

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    sector: profile?.sector ?? null,
    titre: titre.trim(),
    description: description.trim(),
    priorite,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadMyFeedbackAction(): Promise<FeedbackRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as FeedbackRow[];
}

export async function getMyResolvedCountAction(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("statut", ["fait", "refuse"])
    .eq("seen_by_user", false);

  return count ?? 0;
}

export async function markFeedbackSeenAction(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  // Vérifier que l'utilisateur est connecté
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return;
  // Utiliser adminClient pour bypasser RLS (l'utilisateur n'a pas UPDATE sur feedback)
  // On filtre par user_id pour s'assurer qu'il ne marque que ses propres tickets
  const admin = createAdminClient();
  await admin
    .from("feedback")
    .update({ seen_by_user: true })
    .in("id", ids)
    .eq("user_id", user.id);
}

export async function loadAllFeedbackAction(): Promise<FeedbackRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  // Récupère les emails séparément
  const userIds = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds);

  const emailMap: Record<string, string> = {};
  (profiles ?? []).forEach((p: any) => { emailMap[p.user_id] = p.email; });

  return data.map((r: any) => ({
    ...r,
    email: emailMap[r.user_id] ?? null,
  }));
}

export async function updateFeedbackAction(
  id: string,
  statut: FeedbackRow["statut"],
  note_admin: string | null
): Promise<void> {
  const supabase = createAdminClient();
  // Reset seen_by_user quand l'admin change le statut → l'utilisateur sera re-notifié
  await supabase.from("feedback").update({ statut, note_admin, seen_by_user: false }).eq("id", id);
  revalidatePath("/app/admin");
}

export async function getFeedbackCountAction(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("statut", "ouvert");
  return count ?? 0;
}
