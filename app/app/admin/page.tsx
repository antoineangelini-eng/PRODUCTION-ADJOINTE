import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageClient } from "@/components/sheet/AdminPageClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("sector, sectors")
    .eq("user_id", user.id)
    .single();
  const userSectors: string[] = profile?.sectors ?? (profile?.sector ? [profile.sector] : []);
  if (!userSectors.includes("admin")) redirect("/app");
  return <AdminPageClient />;
}
