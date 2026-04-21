import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SearchBar } from "@/components/sheet/SearchBar";
import { UsinageTitanePageClient } from "@/components/sheet/UsinageTitanePageClient";
import { UsinageTitaneHistoryWrapper } from "@/app/app/usinage-titane/UsinageTitaneHistoryWrapper";
import { AnnouncementsBanner } from "@/components/sheet/AnnouncementsBanner";

export default async function Page({ searchParams }: { searchParams?: Promise<{ focus?: string; tab?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("sector, sectors").eq("user_id", user.id).single();
  if (!profile) redirect("/login");
  const userSectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  if (!userSectors.includes("usinage_titane") && !userSectors.includes("admin")) redirect("/app");
  const params = await searchParams;
  const focusId = params?.focus ?? null;
  const tab = params?.tab ?? "production";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AnnouncementsBanner sectorCode="usinage_titane" />
      <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 0", borderBottom: "1px solid #1a1a1a" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>Usinage Titane</h1>
        <div style={{ display: "flex", gap: 0 }}>
          {[{ key: "production", label: "⚙ Production" }, { key: "historique", label: "📋 Historique" }].map(({ key, label }) => (
            <a key={key} href={`/app/usinage-titane?tab=${key}`} style={{
              padding: "8px 22px", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "block",
              borderBottom: tab === key ? "2px solid #f59e0b" : "2px solid transparent",
              color: tab === key ? "#f59e0b" : "#555", marginBottom: -1, transition: "color 150ms",
            }}>{label}</a>
          ))}
        </div>
      </div>

      {tab !== "historique" && (
        <>
          <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 8px", borderBottom: "1px solid #1a1a1a" }}>
            <SearchBar basePath="/app/usinage-titane" />
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <UsinageTitanePageClient focusId={focusId} />
          </div>
        </>
      )}

      {tab === "historique" && (
        <div style={{ flex: 1, minHeight: 0, padding: "0 16px 16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <UsinageTitaneHistoryWrapper />
        </div>
      )}
    </div>
  );
}
