import { SearchBar } from "@/components/sheet/SearchBar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DesignResinePageClient } from "@/components/sheet/DesignResinePageClient";
import { createCaseAction, scanCaseAction } from "@/app/app/design-resine/actions";
import { CaseNumberInput } from "@/components/sheet/CaseNumberInput";
import { DesignResineHistoryWrapper } from "@/app/app/design-resine/DesignResineHistoryWrapper";
import { FlashMessage } from "@/components/sheet/FlashMessage";

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
  if (!userSectors.includes("design_resine") && !userSectors.includes("admin")) redirect("/app");
  const params = await searchParams;
  const focusId = params?.focus ?? null;
  const tab = params?.tab ?? "production";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FlashMessage />
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
          <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 8px", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <form action={createCaseAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#7c8196", letterSpacing: 0.5 }}>Créer un cas</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <CaseNumberInput style={{ padding: "7px 10px", border: "1px solid rgba(129,140,248,0.35)", background: "rgba(129,140,248,0.03)", color: "white", fontSize: 12, width: 110, outline: "none", borderRadius: 4 }} />
                  <button type="submit" style={{ padding: "7px 14px", border: "1px solid #7c8196", background: "rgba(129,140,248,0.08)", color: "#7c8196", cursor: "pointer", fontSize: 12, fontWeight: 700, borderRadius: 4 }}>Créer</button>
                </div>
              </form>
              <div style={{ width: 1, background: "#222", alignSelf: "stretch", marginTop: 20 }} />
              <form action={scanCaseAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, color: "white", letterSpacing: 0.5 }}>Rechercher / Scanner</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <CaseNumberInput name="scan" placeholder="N° du cas..." style={{ padding: "7px 10px", border: "1px solid #ffffff", background: "transparent", color: "white", fontSize: 12, width: 160, outline: "none", borderRadius: 4 }} />
                  <button type="submit" style={{ padding: "7px 12px", border: "1px solid #ffffff", background: "transparent", color: "white", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>Rechercher</button>
                </div>
              </form>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DesignResinePageClient focusId={focusId} />
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
