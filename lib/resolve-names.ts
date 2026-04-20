import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Résout une liste de user_id vers leur display_name.
 * Utilise le client admin pour bypasser RLS sur user_display_names.
 */
export async function resolveDisplayNames(
  userIds: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))] as string[];
  if (unique.length === 0) return {};

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_display_names")
    .select("user_id, display_name")
    .in("user_id", unique);

  const map: Record<string, string> = {};
  (data ?? []).forEach((n: any) => {
    const raw = n.display_name ?? "";
    map[n.user_id] = raw.charAt(0).toUpperCase() + raw.slice(1);
  });
  return map;
}
