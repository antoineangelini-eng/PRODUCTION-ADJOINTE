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
  baseQty: number;
  numeroBase: string | null;
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

  const hasBase = Boolean(data.base);
  const baseQty = data.baseQty ?? 1;
  const baseLabel = data.base ? `${data.base} x${baseQty}` : "";

  // 406 dots wide — layout adaptatif selon présence de base
  // Sans base : 230 dots de haut (3 lignes de 2 colonnes)
  // Avec base : 270 dots (3 lignes + ligne base en bas)
  const labelHeight = hasBase ? 230 : 200;

  const lines: string[] = [
    "^XA",
    "^CI28",
    "^PW406",
    `^LL${labelHeight}`,
    "^LH0,0",

    // ── En-tête : numéro de cas + nature à droite ──
    `^FO6,8^A0N,28,28^FD${data.caseNumber}^FS`,
    `^FO220,12^A0N,18,18^FD${nature}^FS`,
    "^FO4,40^GB398,2,2^FS",

    // ── Ligne 1 : Teinte | Blocs ──
    `^FO12,48^A0N,11,11^FDTeinte :^FS`,
    `^FO12,62^A0N,24,24^FD${teinte}^FS`,
    `^FO220,48^A0N,11,11^FDBlocs :^FS`,
    `^FO220,62^A0N,24,24^FD${nbBlocs}^FS`,

    // ── Ligne 2 : Machine | Disque ──
    `^FO12,92^A0N,11,11^FDMachine :^FS`,
    ...(data.machine
      ? [`^FO12,106^A0N,24,24^FD${machine}^FS`]
      : [
          `^FO20,104^GE20,20,2^FS`,
          `^FO18,102^GD24,24,2,,R^FS`,
        ]
    ),
    `^FO220,92^A0N,11,11^FDDisque :^FS`,
    ...(data.disque
      ? [`^FO220,106^A0N,24,24^FD${disque}^FS`]
      : [
          `^FO228,104^GE20,20,2^FS`,
          `^FO226,102^GD24,24,2,,R^FS`,
        ]
    ),

    // ── Ligne 3 : Modèle ──
    `^FO12,136^A0N,11,11^FDModele :^FS`,
    ...(data.modele
      ? [`^FO12,150^A0N,24,24^FD${modele}^FS`]
      : [
          `^FO8,146^GB64,28,28^FS`,
          `^FO12,150^A0N,24,24^FR^FD${modele}^FS`,
        ]
    ),

    // ── Ligne base (séparateur + Base type x qty | N° Base) ──
    ...(hasBase ? [
      "^FO4,178^GB398,1,1^FS",
      `^FO12,186^A0N,11,11^FDBase :^FS`,
      ...(data.base === "Imprimée"
        ? [
            `^FO8,200^GB120,24,24^FS`,
            `^FO12,202^A0N,20,20^FR^FD${baseLabel}^FS`,
          ]
        : [`^FO12,200^A0N,22,22^FD${baseLabel}^FS`]
      ),
      ...(data.numeroBase && data.base !== "Imprimée" ? [
        `^FO220,186^A0N,11,11^FDN. Base :^FS`,
        `^FO220,200^A0N,22,22^FD${data.numeroBase}^FS`,
      ] : []),
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
    // Quantité en bas à droite — blanc sur noir, bien visible (masqué si 0)
    ...(quantite > 0 ? [
      `^FO300,200^GB100,44,44^FS`,
      `^FO308,204^A0N,36,36^FR^FDQte ${quantite}^FS`,
    ] : []),
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
