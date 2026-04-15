import { NatureSelect } from "@/components/sheet/NatureSelect";
import { SearchBar } from "@/components/sheet/SearchBar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DesignMetalTable } from "@/components/sheet/DesignMetalTable";
import { DesignMetalHistoryWrapper } from "@/app/app/design-metal/DesignMetalHistoryWrapper";
import { CaseNumberInput } from "@/components/sheet/CaseNumberInput";

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(
    date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
      .split("/").reverse().join("-")
  );
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function createCaseAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const caseNumber = String(formData.get("case_number") ?? "").trim();
  const nature = String(formData.get("nature_du_travail") ?? "").trim();
  if (!caseNumber || !nature) return;
  const { data, error } = await supabase.rpc("rpc_create_case_from_design_metal", {
    p_case_number: caseNumber,
    p_nature_du_travail: nature,
  });
  if (error) throw new Error(error.message);
  const caseId = typeof data === "string" ? data : String(data);
  if (caseId && caseId !== "null") {
    // Récupérer le nombre de jours ouvrés depuis la config
    const { data: wdConfig } = await supabase
      .from("working_days_config")
      .select("days")
      .eq("nature", nature)
      .single();
    const nbDays = wdConfig?.days ?? 5;
    const dateExp = toDateStr(addBusinessDays(new Date(), nbDays));
    await supabase.rpc("rpc_update_case_expedition", {
      p_case_id: caseId,
      p_date: dateExp,
      p_manual: false,
    });
  }
  revalidatePath("/app/design-metal");
  redirect("/app/design-metal");
}

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
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Créer */}
              <form action={createCaseAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#4ade80", letterSpacing: 0.5 }}>Créer un cas</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <CaseNumberInput
                    style={{ padding: "7px 10px", border: "1px solid rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.03)", color: "white", fontSize: 12, width: 110, outline: "none", borderRadius: 4 }} />
                  <NatureSelect />
                  <button type="submit"
                    style={{ padding: "7px 14px", border: "1px solid #4ade80", background: "rgba(74,222,128,0.08)", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 700, borderRadius: 4 }}>
                    Créer
                  </button>
                </div>
              </form>
              <div style={{ width: 1, background: "#222", alignSelf: "stretch", marginTop: 20 }} />
              <SearchBar basePath="/app/design-metal" />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <DesignMetalTable focusId={focusId} currentUserId="" currentSector="" />
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
