/**
 * Print Relay — Relais d'impression Zebra
 *
 * Ce script tourne sur un PC du réseau local (celui connecté aux imprimantes).
 * L'app déployée envoie les données d'impression au navigateur,
 * qui les forward à ce relais. Le relais imprime via TCP sur l'imprimante Zebra.
 *
 * Lancement : node server.js
 * Port par défaut : 3001 (configurable via PORT=xxxx)
 */

const http = require("http");
const net = require("net");

const PORT = process.env.PORT || 3001;
const ZEBRA_PORT = 9100;
const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const POST_PRINT_DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendToZebraOnce(zpl, printerIp) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      client.destroy();
      resolve(result);
    };
    client.setTimeout(TIMEOUT_MS);
    client.connect(ZEBRA_PORT, printerIp, () => {
      client.write(zpl, "utf8", (err) => {
        if (err) finish({ ok: false, error: "Erreur écriture : " + err.message });
        else {
          // Petite pause pour laisser l'imprimante traiter avant de fermer
          setTimeout(() => finish({ ok: true }), POST_PRINT_DELAY_MS);
        }
      });
    });
    client.on("timeout", () => finish({ ok: false, error: "Timeout — imprimante injoignable" }));
    client.on("error", (err) => finish({ ok: false, error: "Connexion impossible : " + err.message }));
  });
}

async function sendToZebra(zpl, printerIp) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await sendToZebraOnce(zpl, printerIp);
    if (result.ok) return result;
    if (attempt < MAX_RETRIES) {
      console.log(`[Print] ⟳ Tentative ${attempt}/${MAX_RETRIES} échouée, retry dans ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    } else {
      return result;
    }
  }
}

const server = http.createServer(async (req, res) => {
  // CORS — autorise toutes les origines
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { zpl, printerIp } = JSON.parse(body);
        if (!zpl || !printerIp) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "zpl et printerIp requis" }));
          return;
        }
        console.log(`[Print] → ${printerIp} (${zpl.length} chars)`);
        const result = await sendToZebra(zpl, printerIp);
        if (result.ok) {
          console.log(`[Print] ✓ OK`);
        } else {
          console.log(`[Print] ✗ ${result.error}`);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "JSON invalide" }));
      }
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "print-relay" }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🖨️  Print Relay démarré sur le port ${PORT}`);
  console.log(`   Accessible depuis le réseau local sur http://0.0.0.0:${PORT}`);
  console.log(`   Health check : http://localhost:${PORT}/health\n`);
});
