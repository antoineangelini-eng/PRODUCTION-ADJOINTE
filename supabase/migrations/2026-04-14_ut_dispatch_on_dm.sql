-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige le flux UT : les cas Définitif Résine doivent arriver en UT
-- quand Design Métal valide (et non plus quand Design Résine valide).
--
-- Stratégie : on patche les RPC rpc_complete_design_metal et
-- rpc_complete_design_resine.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Quand DM termine un cas, on ouvre UT dès maintenant (sauf Provisoire Résine
--    qui n'a pas de pièce métal).
CREATE OR REPLACE FUNCTION rpc_complete_design_metal(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nature text;
BEGIN
  -- Marquer DM terminé
  UPDATE case_assignments
     SET status = 'done'
   WHERE case_id = p_case_id
     AND sector_code = 'design_metal';

  -- Lire la nature du cas
  SELECT nature_du_travail INTO v_nature FROM cases WHERE id = p_case_id;

  -- Ouvrir UT pour tous les cas sauf "Provisoire Résine"
  IF v_nature IS NULL OR v_nature <> 'Provisoire Résine' THEN
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'usinage_titane', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;
END;
$$;

-- 2. Quand DR termine un cas, on n'ouvre plus UT — seulement UR (pour les cas
--    avec résine) ou Finition directe (si pas de résine).
CREATE OR REPLACE FUNCTION rpc_complete_design_resine(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nature text;
BEGIN
  UPDATE case_assignments
     SET status = 'done'
   WHERE case_id = p_case_id
     AND sector_code = 'design_resine';

  SELECT nature_du_travail INTO v_nature FROM cases WHERE id = p_case_id;

  -- Définitif Résine & Provisoire Résine → passent par UR
  IF v_nature IN ('Définitif Résine', 'Provisoire Résine') THEN
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'usinage_resine', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;
END;
$$;
