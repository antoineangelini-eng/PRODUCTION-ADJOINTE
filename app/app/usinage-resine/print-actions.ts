"use server";
import { printLabel } from "@/lib/zebra-print";

export async function printUrLabelAction(data: {
  caseNumber: string;
  teinte: string | null;
  machine: string | null;
  disque: string | null;
  nbBlocs: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await printLabel(data);
  if (!result.ok) console.error("[Zebra] Impression échouée:", result.error);
  return result;
}
