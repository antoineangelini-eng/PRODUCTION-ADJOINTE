import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DesignMetalTable } from "@/components/sheet/DesignMetalTable";
import { DesignMetalHistoryWrapper } from "@/app/app/design-metal/DesignMetalHistoryWrapper";
import { DesignMetalCreateBar } from "@/components/sheet/DesignMetalCreateBar";
import { FlashMessage } from "@/components/sheet/FlashMessage";
import { AnnouncementsBanner } from "@/components/sheet/AnnouncementsBanner";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("sector, sectors").eq("user_id", user.id).single();
  if (!profile) redirect("/login");
  const userSectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  if (!userSectors.includes("design_metal") && !userSectors.includes("admin")) redirect("/app");

  const params = await searchParams;
  const focusId = params?.focus ?? null;
  const tab = params?.tab ?? "production";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FlashMessage />
      <AnnouncementsBanner sectorCode="design_metal" />

      {/* En-tête */}
      <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 0", borderBottom: "1px solid #1a1a1a" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>Design Métal</h1>

        {/* Onglets */}
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { key: "production", label: "⚙ Production" },
            { key: "historique", label: "📋 Historique" },
          ].map(({ key, label }) => (
            <a key={key} href={`/app/design-metal?tab=${key}`} style={{
              padding: "8px 22px", fontSize: 12, fontWeight: 700,
              textDecoration: "none", display: "block",
              borderBottom: tab === key ? "2px solid #4ade80" : "2px solid transparent",
              color: tab === key ? "#4ade80" : "#555",
              marginBottom: -1,
              transition: "color 150ms",
            }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Onglet Production ── */}
      {tab !== "historique" && (
        <>
          <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 8px", borderBottom: "1px solid #1a1a1a" }}>
            <DesignMetalCreateBar />
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <DesignMetalTable focusId={focusId} currentUserId={user.id} currentSector={userSectors[0] ?? ""} isAdmin={userSectors.includes("admin")} />
          </div>
        </>
      )}

      {/* ── Onglet Historique ── */}
      {tab === "historique" && (
        <div style={{ flex: 1, minHeight: 0, padding: "0 16px 16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <DesignMetalHistoryWrapper currentSector={profile.sector} />
        </div>
      )}
    </div>
  );
}
