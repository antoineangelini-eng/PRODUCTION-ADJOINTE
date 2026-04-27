"use server";
import { buildZPL } from "@/lib/zebra-print";
import { getCurrentUserPrinterIpAction } from "@/app/app/admin/printer-actions";

export type PrintJobData = {
  zpl: string;
  printerIp: string;
} | null;

/** Génère le ZPL + IP imprimante — l'impression se fait côté client via le relais local */
export async function buildUrPrintJobAction(data: {
  caseNumber: string;
  nature: string | null;
  teinte: string | null;
  machine: string | null;
  machine2?: string | null;
  disque: string | null;
  disque2?: string | null;
  nbBlocs: string | null;
  modele: boolean;
  base: string | null;
  baseQty?: number;
  numeroBase1?: string | null;
  numeroBase2?: string | null;
}): Promise<PrintJobData> {
  const printerIp = await getCurrentUserPrinterIpAction();
  if (!printerIp) return null;

  const mergedMachine = [data.machine, data.machine2].filter(Boolean).join(" / ") || null;
  const mergedDisque  = [data.disque, data.disque2].filter(Boolean).join(" / ") || null;
  const mergedNumBase = [data.numeroBase1, data.numeroBase2].filter(Boolean).join(" / ") || null;
  const zpl = buildZPL({
    caseNumber: data.caseNumber,
    nature: data.nature,
    teinte: data.teinte,
    machine: mergedMachine,
    disque: mergedDisque,
    nbBlocs: data.nbBlocs,
    modele: data.modele,
    base: data.base,
    baseQty: data.baseQty ?? 1,
    numeroBase: mergedNumBase,
  });
  return { zpl, printerIp };
}
