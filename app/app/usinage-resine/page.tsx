import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsinageResinePageClient } from "@/components/sheet/UsinageResinePageClient";
import { UsinageResineHistoryWrapper } from "@/app/app/usinage-resine/UsinageResineHistoryWrapper";
import { EmaxPaletteTracker } from "@/app/app/usinage-resine/EmaxPaletteTracker";

const EmaxIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    style={{ transform: "rotate(-12deg)", flexShrink: 0, display: "block" }}>
    <rect x="3" y="8" width="15" height="12" rx="1.5" fill={color} opacity="0.9" />
    <rect x="9" y="4" width="5"  height="5"  rx="1"   fill={color} opacity="0.7" />
    <rect x="11" y="2" width="2" height="3"  rx="0.5" fill={color} opacity="0.5" />
    <text x="5.5" y="18" fontSize="4.5" fontFamily="Arial,sans-serif"
      fontWeight="700" fill="white" letterSpacing="-0.2">EMAX</text>
  </svg>
);

const tabs: { key: string; label: React.ReactNode }[] = [
  { key: "production", label: "⚙ Production" },
  {
    key: "emax",
    label: (
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <EmaxIcon color="currentColor" />
        EMAX
      </span>
    ),
  },
  { key: "historique", label: "📋 Historique" },
];

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("sector, sectors").eq("user_id", user.id).single();
  if (!profile) redirect("/login");
  const userSectors: string[] = profile.sectors ?? (profile.sector ? [profile.sector] : []);
  if (!userSectors.includes("usinage_resine") && !userSectors.includes("admin")) redirect("/app");

  const params  = await searchParams;
  const focusId = params?.focus ?? null;
  const tab     = params?.tab ?? "production";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        flexShrink: 0, background: "#0b0b0b",
        padding: "10px 20px 0", borderBottom: "1px solid #1a1a1a",
      }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>Usinage Résine</h1>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(({ key, label }) => (
            <a key={key} href={`/app/usinage-resine?tab=${key}`} style={{
              padding: "8px 22px", fontSize: 12, fontWeight: 700,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
              borderBottom: tab === key ? "2px solid #9487a8" : "2px solid transparent",
              color: tab === key ? "#9487a8" : "#555",
              marginBottom: -1, transition: "color 150ms",
            }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {tab === "production" && <UsinageResinePageClient focusId={focusId} hideHeader />}

      {tab === "emax" && (
        <div style={{
          flex: 1, minHeight: 0, padding: "0 16px 16px",
          overflow: "auto", display: "flex", flexDirection: "column",
        }}>
          <EmaxPaletteTracker />
        </div>
      )}

      {tab === "historique" && (
        <div style={{
          flex: 1, minHeight: 0, padding: "0 16px 16px",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <UsinageResineHistoryWrapper />
        </div>
      )}
    </div>
  );
}