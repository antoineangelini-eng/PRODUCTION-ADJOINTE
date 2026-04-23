import net from "net";

export type LabelData = {
  caseNumber: string;
  teinte: string | null;
  machine: string | null;
  disque: string | null;
  nbBlocs: string | null;
  modele: boolean;
};

const ZEBRA_PORT = 9100;
const TIMEOUT_MS = 5000;

function buildZPL(data: LabelData): string {
  const teinte  = data.teinte  ?? "—";
  const machine = data.machine ?? "—";
  const disque  = data.disque  ?? "—";
  const nbBlocs = data.nbBlocs ?? "—";
  const modele  = data.modele ? "Oui" : "Non";

  // 406 x 203 dots — 6 champs sur 2 colonnes
  // Header: 0→35, Contenu: 40→195

  const lines: string[] = [
    "^XA",
    "^CI28",
    "^PW406",
    "^LL203",
    "^LH0,0",

    // ── En-tête : numéro de cas ──
    `^FO6,3^A0N,32,32^FD${data.caseNumber}^FS`,
    "^FO4,38^GB398,2,2^FS",

    // ── Colonne gauche ──
    // Teinte
    `^FO12,48^A0N,14,14^FDTeinte :^FS`,
    `^FO12,65^A0N,28,28^FD${teinte}^FS`,

    // Machine
    `^FO12,100^A0N,14,14^FDMachine :^FS`,
    `^FO12,117^A0N,28,28^FD${machine}^FS`,

    // Modele — inversé (blanc sur noir) si Non
    `^FO12,152^A0N,14,14^FDModele :^FS`,
    ...(data.modele
      ? [`^FO12,169^A0N,28,28^FD${modele}^FS`]
      : [
          `^FO8,165^GB80,34,34^FS`,
          `^FO12,169^A0N,28,28^FR^FD${modele}^FS`,
        ]
    ),

    // ── Colonne droite ──
    // Blocs
    `^FO220,48^A0N,14,14^FDBlocs :^FS`,
    `^FO220,65^A0N,28,28^FD${nbBlocs}^FS`,

    // Disque
    `^FO220,100^A0N,14,14^FDDisque :^FS`,
    `^FO220,117^A0N,28,28^FD${disque}^FS`,

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
