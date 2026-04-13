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
  await supabase.from("feedback").update({ statut, note_admin }).eq("id", id);
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
