/**
 * Regroupe les cas ayant le même case_number.
 * Si maxDaysBetween est défini, ne regroupe que si les cas ont été validés/créés
 * à moins de maxDaysBetween jours d'écart.
 */
export function groupByCaseNumber<T extends { case_number?: string | null; completed_at?: string | null; created_at?: string | null }>(
  rows: T[],
  maxDaysBetween: number = 3,
): T[][] {
  const groups: T[][] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    const cn = row.case_number ?? "";
    if (!cn) { groups.push([row]); continue; }

    if (seen.has(cn)) {
      const groupIdx = seen.get(cn)!;
      const existing = groups[groupIdx];
      // Vérifier l'écart de jours
      const existingDate = existing[0].completed_at ?? existing[0].created_at ?? null;
      const newDate = row.completed_at ?? row.created_at ?? null;
      if (existingDate && newDate) {
        const diff = Math.abs(new Date(existingDate).getTime() - new Date(newDate).getTime());
        const diffDays = diff / (1000 * 60 * 60 * 24);
        if (diffDays > maxDaysBetween) {
          // Trop d'écart → nouveau groupe
          seen.set(cn, groups.length);
          groups.push([row]);
          continue;
        }
      }
      existing.push(row);
    } else {
      seen.set(cn, groups.length);
      groups.push([row]);
    }
  }
  return groups;
}
