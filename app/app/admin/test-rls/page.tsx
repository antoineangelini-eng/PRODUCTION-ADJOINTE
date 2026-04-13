import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  // 🔎 Récupère le user connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔎 Récupère son secteur
  let sector: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("sector")
      .eq("user_id", user.id)
      .single();

    sector = (profile?.sector as string) ?? null;
  }

  // 🔎 Récupère les events (avec actor_sector)
  const { data: events, error } = await supabase
    .from("case_events")
    .select("id, case_id, actor_sector, event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return (
      <pre style={{ color: "white", padding: 16 }}>
        {JSON.stringify({ error }, null, 2)}
      </pre>
    );
  }

  return (
    <pre style={{ color: "white", padding: 16 }}>
      {JSON.stringify(
        {
          user_id: user?.id ?? null,
          sector,
          events,
        },
        null,
        2
      )}
    </pre>
  );
}