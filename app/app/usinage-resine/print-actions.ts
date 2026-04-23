"use server";
import { printLabel } from "@/lib/zebra-print";
import { getCurrentUserPrinterIpAction } from "@/app/app/admin/printer-actions";

export async function printUrLabelAction(data: {
  caseNumber: string;
  teinte: string | null;
  machine: string | null;
  machine2?: string | null;
  disque: string | null;
  disque2?: string | null;
  nbBlocs: string | null;
  modele: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  // Récupérer l'IP imprimante de l'utilisateur connecté
  const printerIp = await getCurrentUserPrinterIpAction();
  if (!printerIp) {
    // Pas d'imprimante configurée → skip silencieux
    return { ok: true };
  }

  // Combiner les valeurs doubles pour l'étiquette
  const mergedMachine = [data.machine, data.machine2].filter(Boolean).join(" / ") || null;
  const mergedDisque  = [data.disque, data.disque2].filter(Boolean).join(" / ") || null;
  const result = await printLabel({
    caseNumber: data.caseNumber,
    teinte: data.teinte,
    machine: mergedMachine,
    disque: mergedDisque,
    nbBlocs: data.nbBlocs,
    modele: data.modele,
  }, printerIp);
  if (!result.ok) console.error("[Zebra] Impression échouée:", result.error);
  return result;
}
