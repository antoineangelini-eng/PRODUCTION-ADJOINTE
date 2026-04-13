import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SECTOR_PATHS: Record<string, string> = {
  design_metal:   "/app/design-metal",
  design_resine:  "/app/design-resine",
  usinage_titane: "/app/usinage-titane",
  usinage_resine: "/app/usinage-resine",
  finition:       "/app/finition",
  admin:          "/app/admin",
};

export default async function AppDispatcher() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sector, sectors")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/app/unauthorized");
  }

  // Utiliser le premier secteur du tableau, sinon le secteur legacy
  const sectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  const primary = sectors[0] ?? profile.sector;
  const path = SECTOR_PATHS[primary];

  if (path) {
    redirect(path);
  } else {
    redirect("/app/unauthorized");
  }
}
