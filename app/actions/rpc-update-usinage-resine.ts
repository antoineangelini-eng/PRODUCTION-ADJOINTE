"use server";

import { createClient } from "@/lib/supabase/server";

export async function rpcUpdateUsinageResine(caseId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("rpc_update_usinage_resine", {
    p_case_id: caseId,
    p_patch: {
      identite_machine: "M1",
      numero_disque: "D-42",
    },
  });

  if (error) throw new Error(error.message);

  return { ok: true };
}