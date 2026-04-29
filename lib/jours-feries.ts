/** Jours fériés français (fixes + Pâques-dépendants) */
export function joursFeries(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };

  // Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month, day);

  const set = new Set<string>();
  // Fixes
  set.add(`${year}-01-01`); // Jour de l'an
  set.add(`${year}-05-01`); // Fête du travail
  set.add(`${year}-05-08`); // Victoire 1945
  set.add(`${year}-07-14`); // Fête nationale
  set.add(`${year}-08-15`); // Assomption
  set.add(`${year}-11-01`); // Toussaint
  set.add(`${year}-11-11`); // Armistice
  set.add(`${year}-12-25`); // Noël
  // Mobiles (Pâques)
  set.add(fmt(add(easter, 1)));  // Lundi de Pâques
  set.add(fmt(add(easter, 39))); // Ascension
  set.add(fmt(add(easter, 50))); // Lundi de Pentecôte
  return set;
}

/** Vérifie si une date (YYYY-MM-DD) est un jour ouvré (ni weekend, ni férié) */
export function isBusinessDay(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const feries = joursFeries(d.getFullYear());
  return !feries.has(dateStr);
}

/** Ajoute N jours ouvrés à une date, en sautant weekends et jours fériés */
export function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const feries = joursFeries(d.getFullYear());
    if (feries.has(dateStr)) continue;
    added++;
  }
  return d;
}
