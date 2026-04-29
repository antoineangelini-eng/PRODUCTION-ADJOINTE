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
  machineBase: string | null;
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

  // 406 dots wide — layout avec titres DENTS / BASE
  const labelHeight = hasBase ? 260 : 216;

  const lines: string[] = [
    "^XA",
    "^CI28",
    "^PW406",
    `^LL${labelHeight}`,
    "^LH0,0",

    // ── En-tête : numéro de cas + nature à droite ──
    `^FO6,8^A0N,28,28^FD${data.caseNumber}^FS`,
    `^FO220,12^A0N,18,18^FD${nature}^FS`,
    "^FO4,38^GB398,2,2^FS",

    // ── Titre DENTS (blanc sur noir) ──
    `^FO4,44^GB398,16,16^FS`,
    `^FO12,46^A0N,12,12^FR^FDDENTS^FS`,

    // ── Ligne 1 : Teinte | Blocs ──
    `^FO12,66^A0N,11,11^FDTeinte :^FS`,
    `^FO12,80^A0N,24,24^FD${teinte}^FS`,
    `^FO220,66^A0N,11,11^FDBlocs :^FS`,
    `^FO220,80^A0N,24,24^FD${nbBlocs}^FS`,

    // ── Ligne 2 : Machine | Disque ──
    `^FO12,108^A0N,11,11^FDMachine :^FS`,
    ...(data.machine
      ? [`^FO12,122^A0N,24,24^FD${machine}^FS`]
      : [
          `^FO20,120^GE20,20,2^FS`,
          `^FO18,118^GD24,24,2,,R^FS`,
        ]
    ),
    `^FO220,108^A0N,11,11^FDDisque :^FS`,
    ...(data.disque
      ? [`^FO220,122^A0N,24,24^FD${disque}^FS`]
      : [
          `^FO228,120^GE20,20,2^FS`,
          `^FO226,118^GD24,24,2,,R^FS`,
        ]
    ),

    // ── Ligne 3 : Modèle ──
    `^FO12,150^A0N,11,11^FDModele :^FS`,
    ...(data.modele
      ? [`^FO12,164^A0N,24,24^FD${modele}^FS`]
      : [
          `^FO8,160^GB64,28,28^FS`,
          `^FO12,164^A0N,24,24^FR^FD${modele}^FS`,
        ]
    ),

    // ── Section BASE ──
    ...(hasBase ? [
      // Titre BASE (blanc sur noir)
      `^FO4,194^GB398,16,16^FS`,
      `^FO12,196^A0N,12,12^FR^FDBASE^FS`,

      // Colonne 1 : Base type x qty
      `^FO12,216^A0N,11,11^FDType :^FS`,
      ...(data.base === "Imprimée"
        ? [
            `^FO8,230^GB120,24,24^FS`,
            `^FO12,232^A0N,20,20^FR^FD${baseLabel}^FS`,
          ]
        : [`^FO12,230^A0N,22,22^FD${baseLabel}^FS`]
      ),
      // Colonne 2 : Machine base (sauf Imprimée)
      ...(data.machineBase && data.base !== "Imprimée" ? [
        `^FO150,216^A0N,11,11^FDMachine :^FS`,
        `^FO150,230^A0N,22,22^FD${data.machineBase}^FS`,
      ] : []),
      // Colonne 3 : N° Base (sauf Imprimée)
      ...(data.numeroBase && data.base !== "Imprimée" ? [
        `^FO280,216^A0N,11,11^FDN. Base :^FS`,
        `^FO280,230^A0N,22,22^FD${data.numeroBase}^FS`,
      ] : []),
    ] : []),

    "^XZ",
  ];

  return lines.join("\n");
}

/** Étiquette simple pour UT : numéro de cas + code-barres + nature + date d'expédition + réception métal + quantité + modèle */
export function buildSimpleZPL(caseNumber: string, dateExpedition: string | null, receptionMetal: string | null = null, quantite: number = 1, nature: string | null = null, modele: boolean = false): string {
  const dateFr = dateExpedition
    ? new Date(dateExpedition.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR")
    : "—";
  const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const expDay = dateExpedition ? JOURS[new Date(dateExpedition.slice(0, 10) + "T00:00:00").getDay()] : "";

  const recepFr = receptionMetal
    ? new Date(receptionMetal.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR")
    : null;
  const recepDay = receptionMetal ? JOURS[new Date(receptionMetal.slice(0, 10) + "T00:00:00").getDay()] : "";

  const modeleLabel = modele ? "Oui" : "Non";

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
    // Séparation horizontale
    "^FO12,75^GB382,3,3^FS",
    // Trait vertical séparant dates (gauche) et modèle (droite)
    "^FO296,78^GB2,180,2^FS",

    // ── Colonne gauche : dates ──
    // Date d'expédition + jour de la semaine
    `^FO16,88^A0N,16,16^FDExpedition :^FS`,
    `^FO16,110^A0N,40,40^FD${expDay}^FS`,
    `^FO16,152^A0N,28,28^FD${dateFr}^FS`,
    // Séparation fine (colonne gauche seulement)
    "^FO12,186^GB280,1,1^FS",
    // Réception métal en dessous + jour de la semaine
    ...(recepFr ? [
      `^FO16,194^A0N,14,14^FDReception metal :^FS`,
      `^FO16,212^A0N,24,24^FD${recepDay} ${recepFr}^FS`,
    ] : []),

    // ── Colonne droite : modèle + quantité ──
    `^FO304,84^A0N,18,18^FDModele^FS`,
    // Valeur modèle en gros — Oui = texte normal, Non = blanc sur noir
    ...(modele
      ? [`^FO312,108^A0N,44,44^FD${modeleLabel}^FS`]
      : [
          `^FO302,104^GB96,48,48^FS`,
          `^FO312,108^A0N,44,44^FR^FD${modeleLabel}^FS`,
        ]
    ),
    // Quantité en bas de la colonne droite (masqué si 0)
    ...(quantite > 0 ? [
      `^FO302,200^GB96,44,44^FS`,
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
