import net from "net";

export type LabelData = {
  caseNumber: string;
  teinte: string | null;
  machine: string | null;
  disque: string | null;
  nbBlocs: string | null;
};

const ZEBRA_IP   = "192.168.1.12";
const ZEBRA_PORT = 9100;
const TIMEOUT_MS = 5000;

function buildZPL(data: LabelData): string {
  const teinte  = data.teinte  ?? "—";
  const machine = data.machine ?? "—";
  const disque  = data.disque  ?? "—";
  const nbBlocs = data.nbBlocs ?? "—";

  // 406 x 203 dots — layout simple sans codes barres de lots
  // Header: 0→33, Contenu: 34→200

  const lines: string[] = [
    "^XA",
    "^CI28",
    "^PW406",
    "^LL203",
    "^LH0,0",

    // En-tête
    `^FO6,3^A0N,30,30^FD${data.caseNumber}^FS`,
    `^FO180,3^A0N,24,24^FDNom produit^FS`,
    "^FO4,36^GB398,2,2^FS",

    // Contenu — 4 infos centrées sur 164 dots
    `^FO20,46^A0N,16,16^FDTeinte :^FS`,
    `^FO20,66^A0N,34,34^FD${teinte}^FS`,

    `^FO20,106^A0N,16,16^FDMachine :^FS`,
    `^FO20,126^A0N,34,34^FD${machine}^FS`,

    `^FO220,46^A0N,16,16^FDBlocs :^FS`,
    `^FO220,66^A0N,34,34^FD${nbBlocs}^FS`,

    `^FO220,106^A0N,16,16^FDDisque :^FS`,
    `^FO220,126^A0N,34,34^FD${disque}^FS`,

    "^XZ",
  ];

  return lines.join("\n");
}

export async function printLabel(data: LabelData): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const zpl = buildZPL(data);
    const client = new net.Socket();
    let done = false;
    const finish = (result: { ok: boolean; error?: string }) => {
      if (done) return; done = true; client.destroy(); resolve(result);
    };
    client.setTimeout(TIMEOUT_MS);
    client.connect(ZEBRA_PORT, ZEBRA_IP, () => {
      client.write(zpl, "utf8", (err) => {
        if (err) finish({ ok: false, error: "Erreur écriture : " + err.message });
        else finish({ ok: true });
      });
    });
    client.on("timeout", () => finish({ ok: false, error: "Timeout — imprimante injoignable" }));
    client.on("error",   (err) => finish({ ok: false, error: "Connexion impossible : " + err.message }));
  });
}
