export type Sector =
  | "design_metal"
  | "design_resine"
  | "usinage_titane"
  | "usinage_resine"
  | "admin";

export type CellType = "text" | "boolean" | "date" | "number" | "readonly";

export type DbTable =
  | "cases"
  | "sector_design_metal"
  | "sector_design_resine"
  | "sector_usinage_titane"
  | "sector_usinage_resine";

export type DbRef = { table: DbTable; column: string } | null; // null => placeholder "—"

export type ColumnDef = {
  key: string;        // identifiant stable côté UI
  header: string;     // nom exact (sheet)
  db: DbRef;          // null => colonne non existante en DB => afficher "—"
  type: CellType;
  widthPx?: number;
};