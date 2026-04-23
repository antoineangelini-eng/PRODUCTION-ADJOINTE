-- Ajout des champs de réception propres à Finition
ALTER TABLE sector_finition
  ADD COLUMN IF NOT EXISTS reception_metal_ok BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reception_metal_ok_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reception_resine_ok BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reception_resine_ok_at TIMESTAMPTZ;
