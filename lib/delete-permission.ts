import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie si l'utilisateur courant peut supprimer un cas dans un secteur donné.
 * Règles :
 *   - Un admin peut tout supprimer
 *   - Un utilisateur normal ne peut supprimer que les cas qu'il a créés
 *
 * Renvoie { allowed: true } ou { allowed: false, error: string }
 */
export async function checkDeletePermission(
  caseId: string,
  sectorCode: string
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const supabase = await createClient();

  // 1. Identifier l'utilisateur courant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, error: "Non authentifié" };

  // 2. Vérifier si l'utilisateur est admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("sectors")
    .eq("user_id", user.id)
    .single();

  const sectors: string[] = (profile as any)?.sectors ?? [];
  if (sectors.includes("admin")) return { allowed: true };

  // 3. Vérifier si l'utilisateur est le créateur du cas dans ce secteur
  const { data: assignment } = await supabase
    .from("case_assignments")
    .select("created_by")
    .eq("case_id", caseId)
    .eq("sector_code", sectorCode)
    .in("status", ["active", "in_progress"])
    .maybeSingle();

  if (!assignment) {
    return { allowed: false, error: "Cas introuvable dans ce secteur" };
  }

  // NULL = cas créé avant la migration → tout le monde peut supprimer
  if (!assignment.created_by || assignment.created_by === user.id) {
    return { allowed: true };
  }

  return { allowed: false, error: "Vous ne pouvez supprimer que les cas que vous avez créés" };
}

/**
 * Renvoie le userId et le statut admin de l'utilisateur courant.
 * Utilisé côté client pour savoir s'il faut afficher le bouton supprimer.
 */
export async function getCurrentUserInfo(): Promise<{
  userId: string;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: "", isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("sectors")
    .eq("user_id", user.id)
    .single();

  const sectors: string[] = (profile as any)?.sectors ?? [];
  return { userId: user.id, isAdmin: sectors.includes("admin") };
}
