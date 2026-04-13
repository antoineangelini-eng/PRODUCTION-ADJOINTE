import type { ColumnDef } from "./types";

export const designResineColumns: ColumnDef[] = [
  // 1 — Date de création
  { key: "created_at", header: "Date de création", db: { table: "cases", column: "created_at" }, type: "readonly" },

  // 2 — Numéro du cas
  { key: "case_number", header: "Numéro du cas", db: { table: "cases", column: "case_number" }, type: "readonly" },

  // 3 — Date d’expédition
  { key: "date_expedition", header: "Date d'expédition", db: { table: "cases", column: "date_expedition" }, type: "readonly" },

  // 4 — Nature du travail
  { key: "nature_du_travail", header: "Nature du travail", db: { table: "cases", column: "nature_du_travail" }, type: "readonly" },

  // 5 — Design châssis (vient du métal)
  { key: "design_chassis", header: "Design châssis", db: { table: "sector_design_metal", column: "design_chassis" }, type: "readonly" },

  // 6 — Date & heure – Design châssis terminé
  { key: "design_chassis_at", header: "Date & heure – Design châssis terminé", db: { table: "sector_design_metal", column: "design_chassis_at" }, type: "readonly" },

  // 7 — Type de dents
  { key: "type_de_dents", header: "Type de dents", db: { table: "sector_design_resine", column: "type_de_dents" }, type: "text" },

  // 8 — Design dents résine
  { key: "design_dents_resine", header: "Design dents résine", db: { table: "sector_design_resine", column: "design_dents_resine" }, type: "boolean" },

  // 9 — Date & heure – Design dents résine
  { key: "design_dents_resine_at", header: "Date & heure – Design dents résine", db: { table: "sector_design_resine", column: "design_dents_resine_at" }, type: "readonly" },

  // 10 — Nombre de blocs de dents
  { key: "nb_blocs_de_dents", header: "Nombre de blocs de dents", db: { table: "sector_design_resine", column: "nb_blocs_de_dents" }, type: "text" },

  // 11 — Modèle à réaliser
  { key: "modele_a_resiner", header: "Modèle à réaliser", db: { table: "sector_design_resine", column: "modele_a_resiner" }, type: "text" },

  // 12 — Teintes associées
  { key: "teintes_associees", header: "Teintes associées", db: { table: "sector_design_resine", column: "teintes_associees" }, type: "text" },
];