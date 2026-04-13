import { createClient } from "@/lib/supabase/server";
import HistoryCaseList from "@/components/history/HistoryCaseList";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 🔎 Vérifie le secteur
  const { data: profile } = await supabase
    .from("profiles")
    .select("sector, sectors")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");
  const userSectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  if (!userSectors.includes("design_metal") && !userSectors.includes("admin")) redirect("/app");

  // 🔎 Récupère les événements Design Métal
  const { data: events, error } = await supabase
    .from("case_events")
    .select("id, case_id, event_type, payload, created_at")
    .eq("actor_sector", "design_metal")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <pre style={{ color: "white", padding: 16 }}>
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  const safeEvents = events ?? [];

  // 🔹 Groupement par numéro de cas (ou case_id fallback)
  const grouped = safeEvents.reduce<Record<string, any[]>>((acc, ev) => {
    const key = ev.payload?.case_number ?? ev.case_id;

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(ev);

    return acc;
  }, {});

  return (
    <div style={{ color: "white", padding: 16 }}>
      <h1 style={{ marginBottom: 20 }}>Historique – Design Métal</h1>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ opacity: 0.7 }}>Aucun événement.</div>
      ) : (
        <HistoryCaseList grouped={grouped} />
      )}
    </div>
  );
}