import net from "net";

export type LabelData = {
  caseNumber: string;
  nature: string | null;
  teinte: string | null;
  machine: string | null;
  disque: string | null;
  nbBlocs: string | null;
  modele: boolean;
  base: string | null;
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
    ...(data.machine
      ? [`^FO12,142^A0N,28,28^FD${machine}^FS`]
      : [
          // Cercle barré (N/A)
          `^FO20,140^GE24,24,2^FS`,
          `^FO18,138^GD28,28,2,,R^FS`,
        ]
    ),

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
    ...(data.disque
      ? [`^FO220,142^A0N,28,28^FD${disque}^FS`]
      : [
          // Cercle barré (N/A)
          `^FO228,140^GE24,24,2^FS`,
          `^FO226,138^GD28,28,2,,R^FS`,
        ]
    ),

    // Base (si renseignée) — inversé si Imprimée
    ...(data.base ? [
      `^FO220,178^A0N,14,14^FDBase :^FS`,
      ...(data.base === "Imprimée"
        ? [
            `^FO216,192^GB140,34,34^FS`,
            `^FO220,196^A0N,28,28^FR^FD${data.base}^FS`,
          ]
        : [`^FO220,196^A0N,28,28^FD${data.base}^FS`]
      ),
    ] : []),

    "^XZ",
  ];

  return lines.join("\n");
}

/** Étiquette simple pour UT : numéro de cas + code-barres + nature + date d'expédition + réception métal + quantité */
export function buildSimpleZPL(caseNumber: string, dateExpedition: string | null, receptionMetal: string | null = null, quantite: number = 1, nature: string | null = null): string {
  const dateFr = dateExpedition
    ? new Date(dateExpedition.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR")
    : "—";
  const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const expDay = dateExpedition ? JOURS[new Date(dateExpedition.slice(0, 10) + "T00:00:00").getDay()] : "";

  const recepFr = receptionMetal
    ? new Date(receptionMetal.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR")
    : null;
  const recepDay = receptionMetal ? JOURS[new Date(receptionMetal.slice(0, 10) + "T00:00:00").getDay()] : "";

  return [
    "^XA",
    "^CI28",
    "^PW406",
    "^LL270",
    "^LH0,0",
    // Gauche : numéro de cas + nature en dessous
    `^FO16,12^A0N,38,38^FD${caseNumber}^FS`,
    ...(nature ? [`^FO16,50^A0N,16,16^FD${nature}^FS`] : []),
    // Droite : code-barres Code 128 (^BY2 = scannable à distance)
    `^BY2^FO200,8^BCN,58,N,N,N^FD${caseNumber}^FS`,
    // Séparation
    "^FO12,75^GB382,3,3^FS",
    // Date d'expédition en gros + jour de la semaine
    `^FO16,90^A0N,18,18^FDExpedition :^FS`,
    `^FO16,114^A0N,44,44^FD${expDay} ${dateFr}^FS`,
    // Séparation fine
    "^FO12,168^GB382,1,1^FS",
    // Réception métal en dessous + jour de la semaine
    ...(recepFr ? [
      `^FO16,178^A0N,16,16^FDReception metal :^FS`,
      `^FO16,200^A0N,28,28^FD${recepDay} ${recepFr}^FS`,
    ] : []),
    // Quantité en bas à droite — blanc sur noir, bien visible
    `^FO300,200^GB100,44,44^FS`,
    `^FO308,204^A0N,36,36^FR^FDQte ${quantite}^FS`,
    "^XZ",
  ].join("\n");
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
