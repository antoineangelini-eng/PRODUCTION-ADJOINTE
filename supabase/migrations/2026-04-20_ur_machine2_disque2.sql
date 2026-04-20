-- Ajouter les colonnes pour le mode double machine / double disque
ALTER TABLE sector_usinage_resine ADD COLUMN IF NOT EXISTS identite_machine_2 TEXT;
ALTER TABLE sector_usinage_resine ADD COLUMN IF NOT EXISTS numero_disque_2 TEXT;
