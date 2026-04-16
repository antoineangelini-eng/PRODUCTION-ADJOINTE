import type { ColumnDef } from "./types";

export const designMetalColumns: ColumnDef[] = [
  // 1) Numéro du cas
  { key: "case_number", header: "Numéro du cas", db: { table: "cases", column: "case_number" }, type: "readonly" },
  // 2) Date de création
  { key: "created_at", header: "Date de création", db: { table: "cases", column: "created_at" }, type: "readonly" },
  // 3) Date d'expédition
  { key: "date_expedition", header: "Date d'expédition", db: { table: "cases", column: "date_expedition" }, type: "readonly" },
  // 4) Nature du travail
  { key: "nature_du_travail", header: "Nature du travail", db: { table: "cases", column: "nature_du_travail" }, type: "readonly" },
  // 5) Design Chassis ✓
  { key: "design_chassis", header: "Design Châssis ✓", db: { table: "sector_design_metal", column: "design_chassis" }, type: "boolean" },
  // 6) Date Design Châssis
  { key: "design_chassis_at", header: "Date Design Châssis", db: { table: "sector_design_metal", column: "design_chassis_at" }, type: "readonly" },
  // 7) Numéro du cas (Dent All Groupe)
  { key: "dentall_case_number", header: "N° Dent All Groupe", db: { table: "sector_design_metal", column: "dentall_case_number" }, type: "text" },
  // 8) Envoyé DentAll
  { key: "envoye_dentall", header: "Envoyé DentAll ✓", db: { table: "sector_design_metal", column: "envoye_dentall" }, type: "boolean" },
  // 9) Réception métal
  { key: "reception_metal_date", header: "Réception métal", db: { table: "sector_design_metal", column: "reception_metal_date" }, type: "date" },
  // 10) Type de dents
  { key: "type_de_dents", header: "Type de dents", db: { table: "sector_design_metal", column: "type_de_dents" }, type: "text" },
  // 11) Modèle à faire ?
  { key: "modele_a_faire_ok", header: "Modèle à faire ✓", db: { table: "sector_design_metal", column: "modele_a_faire_ok" }, type: "boolean" },
  // 12) Teintes associées
  { key: "teintes_associees", header: "Teintes associées", db: { table: "sector_design_metal", column: "teintes_associees" }, type: "text" },
];