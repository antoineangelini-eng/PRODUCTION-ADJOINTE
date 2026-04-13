"use server";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPururkcYDvJeR47pB8Y9dazoaT5jVdh9W13VOTW4fwFzVOB3CDSpPSCUZ_h7-8krIDeoYbisHE2vj/pub?gid=2028687807&single=true&output=csv";

let cache: Map<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

async function loadSheet(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  const map  = new Map<string, string>();
  const lines = text.split("\n").slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols   = parseCSVLine(line);
    const disque = cols[1]?.trim().replace(/\r/g, "");
    const valeur = cols[2]?.trim().replace(/\r/g, "");
    if (disque) map.set(disque.toLowerCase(), valeur ?? "");
  }

  console.log(`[Sheet] ${map.size} entrées chargées`);
  cache = map;
  cacheTime = now;
  return map;
}

export async function lookupDisqueAction(
  disque: string
): Promise<{ ok: boolean; valeurC?: string; error?: string }> {
  if (!disque.trim()) return { ok: false };
  try {
    const map = await loadSheet();
    const key = disque.trim().toLowerCase().replace(/\r/g, "");
    console.log(`[Lookup] Cherche "${key}", map size=${map.size}`);

    if (!map.has(key)) {
      // Cherche une correspondance approximative pour debug
      const proche = Array.from(map.keys()).find(k => k.includes(key) || key.includes(k));
      console.log(`[Lookup] Non trouvé. Proche: "${proche}"`);
      return { ok: false, error: `"${disque}" non trouvé dans le sheet` };
    }

    const val = map.get(key)!;
    console.log(`[Lookup] Trouvé: "${key}" → "${val}"`);
    return { ok: true, valeurC: val };
  } catch (e: any) {
    console.error("[Lookup] Erreur:", e.message);
    return { ok: false, error: e.message };
  }
}
