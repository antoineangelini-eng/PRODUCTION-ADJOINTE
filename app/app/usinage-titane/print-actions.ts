"use server";
import { buildSimpleZPL } from "@/lib/zebra-print";
import { getCurrentUserPrinterIpAction } from "@/app/app/admin/printer-actions";

export type PrintJobData = {
  zpl: string;
  printerIp: string;
} | null;

export async function buildUtPrintJobAction(data: {
  caseNumber: string;
  dateExpedition: string | null;
  receptionMetal: string | null;
  quantite: number;
  nature?: string | null;
  modele?: boolean;
}): Promise<PrintJobData> {
  const printerIp = await getCurrentUserPrinterIpAction();
  if (!printerIp) return null;
  const zpl = buildSimpleZPL(data.caseNumber, data.dateExpedition, data.receptionMetal, data.quantite, data.nature ?? null, data.modele ?? false);
  return { zpl, printerIp };
}
