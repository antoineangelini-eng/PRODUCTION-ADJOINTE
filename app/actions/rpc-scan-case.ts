"use server";

import { createClient } from "@/lib/supabase/server";

export async function rpcScanCase(sectorCode: string, caseNumber: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rpc_scan_case", {
    p_sector_code: sectorCode,
    p_case_number: caseNumber,
  });

  if (error) throw new Error(error.message);

  return data as string; // retourne le case_id
}