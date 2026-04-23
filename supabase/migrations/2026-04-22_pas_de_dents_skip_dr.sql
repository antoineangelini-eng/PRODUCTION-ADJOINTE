-- Mise à jour du routing DM :
--   • DR : skip si "Dents du commerce" OU "Pas de dents"
--   • UR : skip aussi si "Pas de dents" (pas de dents = pas d'usinage résine)

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

  -- Ouvrir UT uniquement pour "Chassis Argoat"
  IF v_nature = 'Chassis Argoat' THEN
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'usinage_titane', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;

  -- Routing vers DR : skip si "Dents du commerce" ou "Pas de dents"
  IF v_type_dents IN ('Dents du commerce', 'Pas de dents') THEN
    UPDATE case_assignments
       SET status = 'done'
     WHERE case_id = p_case_id
       AND sector_code = 'design_resine';
  ELSE
    INSERT INTO case_assignments (case_id, sector_code, status)
    VALUES (p_case_id, 'design_resine', 'active')
    ON CONFLICT (case_id, sector_code)
      DO UPDATE SET status = 'active'
      WHERE case_assignments.status IS DISTINCT FROM 'done';
  END IF;

  -- Finition : TOUJOURS ouvrir pour tous les cas
  INSERT INTO case_assignments (case_id, sector_code, status)
  VALUES (p_case_id, 'finition', 'active')
  ON CONFLICT (case_id, sector_code)
    DO UPDATE SET status = 'active'
    WHERE case_assignments.status IS DISTINCT FROM 'done';
END;
$$;
