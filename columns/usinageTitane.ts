import type { ColumnDef } from "./types";

export const usinageTitaneColumns: ColumnDef[] = [
  // A - Date de création
  { key: "created_at", header: "Date de création", db: { table: "cases", column: "created_at" }, type: "readonly" },

  // B - Numéro du cas
  { key: "case_number", header: "Numéro du cas", db: { table: "cases", column: "case_number" }, type: "readonly" },

  // C - Date d'expédition
  { key: "date_expedition", header: "Date d'expédition", db: { table: "cases", column: "date_expedition" }, type: "readonly" },

  // D - Nature du travail
  { key: "nature_du_travail", header: "Nature du travail", db: { table: "cases", column: "nature_du_travail" }, type: "readonly" },

  // E - Design Chassis (vient de Design Métal)
  { key: "design_chassis", header: "Design Chassis", db: { table: "sector_design_metal", column: "design_chassis" }, type: "readonly" },

  // F - Date et Heure Design Chassis Terminé (vient de Design Métal)
  { key: "design_chassis_at", header: "Date et Heure Design Chassis Terminé", db: { table: "sector_design_metal", column: "design_chassis_at" }, type: "readonly" },

  // G - Envoyé Usinage (que titane) -> table usinage titane
  { key: "envoye_usinage", header: "Envoyé Usinage (que titane)", db: { table: "sector_usinage_titane", column: "envoye_usinage" }, type: "boolean" },

  // H - N° De Lots Métal (pas encore en DB)
  { key: "lots_metal", header: "N° De Lots Métal", db: null, type: "readonly" },

  // I - N° De Calcul (pas encore en DB)
  { key: "numero_calcul", header: "N° De Calcul", db: null, type: "readonly" },

  // J - RÉCEPTION MÉTAL (vient de Design Métal)
  { key: "reception_metal_date", header: "RÉCEPTION MÉTAL", db: { table: "sector_design_metal", column: "reception_metal_date" }, type: "readonly" },

  // K - Modèle à faire ? (vient de Design Métal)
  { key: "modele_a_faire", header: "Modèle à faire ?", db: { table: "sector_design_metal", column: "modele_a_faire" }, type: "readonly" },

  // (Optionnel) J+1 si tu veux l’afficher dans l’usinage titane
  // { key: "delai_j1_date", header: "Délai J+1", db: { table: "sector_usinage_titane", column: "delai_j1_date" }, type: "date" },
];