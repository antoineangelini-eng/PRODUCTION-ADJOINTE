import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  // ⚠️ Numéro unique à chaque refresh
  const caseNumber = `R-${Date.now()}`;

  const { data, error } = await supabase.rpc("rpc_create_case_from_design_resine", {
    p_case_number: caseNumber,
  });

  return (
    <pre style={{ color: "white", padding: 16 }}>
      {JSON.stringify({ caseNumber, data, error }, null, 2)}
    </pre>
  );
}