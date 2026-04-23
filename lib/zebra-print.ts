import net from "net";

export type LabelData = {
  caseNumber: string;
  nature: string | null;
  teinte: string | null;
  machine: string | null;
  disque: string | null;
  nbBlocs: string | null;
  modele: boolean;
};

const ZEBRA_PORT = 9100;
const TIMEOUT_MS = 5000;

export function buildZPL(data: LabelData): string {
  const teinte  = data.teinte  ?? "—";
  const machine = data.machine ?? "—";
  const disque  = data.disque  ?? "—";
  const nbBlocs = data.nbBlocs ?? "—";
  const modele  = data.modele ? "Oui" : "Non";

  const nature = data.nature ?? "";

  // 406 x 203 dots — 6 champs sur 2 colonnes
  // Header: 0→45, Contenu: 50→200

  const lines: string[] = [
    "^XA",
    "^CI28",
    "^PW406",
    "^LL230",
    "^LH0,0",

    // ── En-tête : numéro de cas + nature à droite ──
    `^FO6,20^A0N,30,30^FD${data.caseNumber}^FS`,
    `^FO220,24^A0N,20,20^FD${nature}^FS`,
    "^FO4,58^GB398,2,2^FS",

    // ── Colonne gauche ──
    // Teinte
    `^FO12,70^A0N,14,14^FDTeinte :^FS`,
    `^FO12,88^A0N,28,28^FD${teinte}^FS`,

    // Machine
    `^FO12,124^A0N,14,14^FDMachine :^FS`,
    `^FO12,142^A0N,28,28^FD${machine}^FS`,

    // Modele — inversé (blanc sur noir) si Non
    `^FO12,178^A0N,14,14^FDModele :^FS`,
    ...(data.modele
      ? [`^FO12,196^A0N,28,28^FD${modele}^FS`]
      : [
          `^FO8,192^GB80,34,34^FS`,
          `^FO12,196^A0N,28,28^FR^FD${modele}^FS`,
        ]
    ),

    // ── Colonne droite ──
    // Blocs
    `^FO220,70^A0N,14,14^FDBlocs :^FS`,
    `^FO220,88^A0N,28,28^FD${nbBlocs}^FS`,

    // Disque
    `^FO220,124^A0N,14,14^FDDisque :^FS`,
    `^FO220,142^A0N,28,28^FD${disque}^FS`,

    "^XZ",
  ];

  return lines.join("\n");
}

export async function printLabel(data: LabelData, printerIp: string): Promise<{ ok: boolean; error?: string }> {
  if (!printerIp) return { ok: false, error: "Aucune IP imprimante configurée" };
  return new Promise((resolve) => {
    const zpl = buildZPL(data);
    const client = new net.Socket();
    let done = false;
    const finish = (result: { ok: boolean; error?: string }) => {
      if (done) return; done = true; client.destroy(); resolve(result);
    };
    client.setTimeout(TIMEOUT_MS);
    client.connect(ZEBRA_PORT, printerIp, () => {
      client.write(zpl, "utf8", (err) => {
        if (err) finish({ ok: false, error: "Erreur écriture : " + err.message });
        else finish({ ok: true });
      });
    });
    client.on("timeout", () => finish({ ok: false, error: "Timeout — imprimante injoignable" }));
    client.on("error",   (err) => finish({ ok: false, error: "Connexion impossible : " + err.message }));
  });
}
