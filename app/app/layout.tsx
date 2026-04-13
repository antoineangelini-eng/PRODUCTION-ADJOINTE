import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { Sidebar } from "@/components/navigation/Sidebar";
import { FeedbackButton } from "@/components/FeedbackButton";

function labelSector(sector: string) {
  switch (sector) {
    case "design_metal":   return "Design Métal";
    case "design_resine":  return "Design Résine";
    case "usinage_titane": return "Usinage Titane";
    case "usinage_resine": return "Usinage Résine";
    case "finition":       return "Finition";
    case "admin":          return "Admin";
    default:               return "Secteur inconnu";
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("sector, sectors").eq("user_id", user.id).single();
  const sector = profile?.sector ?? "unknown";
  const sectors: string[] = profile?.sectors ?? (sector !== "unknown" ? [sector] : []);
  const isAdmin = sectors.includes("admin");

  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <header style={{ flexShrink: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px", height: 58, borderBottom: "1px solid #2a2a2a", background: "#0a0a0a" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.2, fontSize: 15 }}>Production Adjointe</div>
          <div style={{ display: "flex", gap: 4 }}>
            {sectors.filter(s => s !== "admin").map((s) => (
              <div key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, border: "1px solid #2a2a2a", background: "#141414", color: "#aaa" }}>
                {labelSector(s)}
              </div>
            ))}
            {isAdmin && (
              <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#4ade80" }}>
                Admin
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#666" }}>{user.email}</div>
          {/* Bouton suggestion — client component */}
          <FeedbackButton />
          <form action={logout}>
            <button type="submit" style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar sector={sector} sectors={sectors} isAdmin={isAdmin} />
        <main style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
