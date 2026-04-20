"use server";
import { printLabel } from "@/lib/zebra-print";

export async function printUrLabelAction(data: {
  caseNumber: string;
  teinte: string | null;
  machine: string | null;
  machine2?: string | null;
  disque: string | null;
  disque2?: string | null;
  nbBlocs: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  // Combiner les valeurs doubles pour l'étiquette
  const mergedMachine = [data.machine, data.machine2].filter(Boolean).join(" / ") || null;
  const mergedDisque  = [data.disque, data.disque2].filter(Boolean).join(" / ") || null;
  const result = await printLabel({
    caseNumber: data.caseNumber,
    teinte: data.teinte,
    machine: mergedMachine,
    disque: mergedDisque,
    nbBlocs: data.nbBlocs,
  });
  if (!result.ok) console.error("[Zebra] Impression échouée:", result.error);
  return result;
}
