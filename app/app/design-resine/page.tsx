import { SearchBar } from "@/components/sheet/SearchBar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DesignResinePageClient } from "@/components/sheet/DesignResinePageClient";
import { DesignResineHistoryWrapper } from "@/app/app/design-resine/DesignResineHistoryWrapper";
import { FlashMessage } from "@/components/sheet/FlashMessage";
import { AnnouncementsBanner } from "@/components/sheet/AnnouncementsBanner";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string; tab?: string; prefill?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("sector, sectors").eq("user_id", user.id).single();
  if (!profile) redirect("/login");
  const userSectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  if (!userSectors.includes("design_resine") && !userSectors.includes("admin")) redirect("/app");
  const params = await searchParams;
  const focusId = params?.focus ?? null;
  const tab = params?.tab ?? "production";
  const prefill = params?.prefill ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FlashMessage />
      <AnnouncementsBanner sectorCode="design_resine" />
      <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 0", borderBottom: "1px solid #1a1a1a" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>Design Résine</h1>
        <div style={{ display: "flex", gap: 0 }}>
          {[{ key: "production", label: "⚙ Production" }, { key: "historique", label: "📋 Historique" }].map(({ key, label }) => (
            <a key={key} href={`/app/design-resine?tab=${key}`} style={{
              padding: "8px 22px", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "block",
              borderBottom: tab === key ? "2px solid #7c8196" : "2px solid transparent",
              color: tab === key ? "#7c8196" : "#555", marginBottom: -1, transition: "color 150ms",
            }}>{label}</a>
          ))}
        </div>
      </div>

      {tab !== "historique" && (
        <>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DesignResinePageClient focusId={focusId} prefill={prefill} />
          </div>
        </>
      )}

      {tab === "historique" && (
        <div style={{ flex: 1, minHeight: 0, padding: "0 16px 16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <DesignResineHistoryWrapper />
        </div>
      )}
    </div>
  );
}
