-- Ajout colonnes base_type et dents_type pour DR
ALTER TABLE sector_design_resine
  ADD COLUMN IF NOT EXISTS base_type TEXT,
  ADD COLUMN IF NOT EXISTS dents_type TEXT;
