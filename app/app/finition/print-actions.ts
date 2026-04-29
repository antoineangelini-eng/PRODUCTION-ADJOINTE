"use server";
import { buildSimpleZPL } from "@/lib/zebra-print";
import { getCurrentUserPrinterIpAction } from "@/app/app/admin/printer-actions";

export type PrintJobData = {
  zpl: string;
  printerIp: string;
} | null;

/** Étiquette Finition pour Chassis Dent All : même format que UT mais sans quantité */
export async function buildFinitionMetalPrintJobAction(data: {
  caseNumber: string;
  dateExpedition: string | null;
  receptionMetal: string | null;
  nature: string | null;
}): Promise<PrintJobData> {
  const printerIp = await getCurrentUserPrinterIpAction();
  if (!printerIp) return null;
  // quantite = 0 → on ne l'affiche pas sur l'étiquette
  const zpl = buildSimpleZPL(data.caseNumber, data.dateExpedition, data.receptionMetal, 0, data.nature);
  return { zpl, printerIp };
}
