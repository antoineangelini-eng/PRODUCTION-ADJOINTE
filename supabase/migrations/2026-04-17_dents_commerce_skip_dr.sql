-- ─────────────────────────────────────────────────────────────────────────────
-- Si type_de_dents = "Dents du commerce" dans DM, on ne passe PAS par DR.
-- On marque l'assignment DR comme "done" directement à la validation DM.
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

  -- Si "Dents du commerce" → marquer DR comme done (pas besoin de passer par DR)
  IF v_type_dents = 'Dents du commerce' THEN
    UPDATE case_assignments
       SET status = 'done'
     WHERE case_id = p_case_id
       AND sector_code = 'design_resine';
  END IF;
END;
$$;
