-- ─────────────────────────────────────────────────────────────────────────────
-- Routing DM → DR basé sur type_de_dents :
--   • "Dents du commerce" → on NE passe PAS par DR (assignment marqué done)
--   • Tout autre type     → on OUVRE DR (assignment créé/activé)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_complete_design_metal(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nature text;
  v_type_dents text;
BEGIN
  -- Marquer DM terminé
  UPDATE case_assignments
     SET status = 'done'
   WHERE case_id = p_case_id
     AND sector_code = 'design_metal';

  -- Lire la nature du cas
  SELECT nature_du_travail INTO v_nature FROM cases WHERE id = p_case_id;

  -- Lire le type de dents choisi dans DM
  SELECT type_de_dents INTO v_type_dents
    FROM sector_design_metal
   WHERE case_id = p_case_id;

  -- Ouvrir UT pour tous les cas sauf "Provisoire Résine"
  IF v_nature IS NULL OR v_nature <> 'Provisoire Résine' THEN
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'usinage_titane', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;

  -- Routing vers DR basé sur type_de_dents
  IF v_type_dents = 'Dents du commerce' THEN
    -- Pas besoin de passer par DR → marquer done (si l'assignment existe)
    UPDATE case_assignments
       SET status = 'done'
     WHERE case_id = p_case_id
       AND sector_code = 'design_resine';
  ELSE
    -- "Dents usinées" ou autre → ouvrir DR
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'design_resine', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;
END;
$$;
