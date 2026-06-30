-- ============================================================
-- Migration : PEEK (DM) + TEINTE (UT)
-- À exécuter sur le projet Supabase pxjegpicglxobimiqdyl
-- ============================================================

-- 1. Ajouter la colonne peek à sector_design_metal
ALTER TABLE public.sector_design_metal
  ADD COLUMN IF NOT EXISTS peek boolean DEFAULT false;

-- 2. Ajouter la colonne teinte à sector_usinage_titane
ALTER TABLE public.sector_usinage_titane
  ADD COLUMN IF NOT EXISTS teinte text DEFAULT null;

-- 3. Mettre à jour rpc_update_design_metal pour accepter "peek"
CREATE OR REPLACE FUNCTION public.rpc_update_design_metal(p_case_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid; v_sector text;
  v_allowed text[] := array['reception_metal','reception_metal_date','type_de_dents','modele_a_faire','modele_a_faire_ok','teintes_associees','design_chassis','dentall_case_number','envoye_dentall','peek'];
  v_keys text[]; k text; v_prev_design boolean; v_has_design_key boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.sector into v_sector from public.profiles p where p.user_id = v_uid;
  if v_sector is null then raise exception 'PROFILE_SECTOR_MISSING'; end if;
  if v_sector <> 'design_metal' and v_sector <> 'admin' then
    -- Vérifier aussi le champ sectors (array)
    if not exists (
      select 1 from public.profiles
      where user_id = v_uid
      and sectors && ARRAY['design_metal','admin']
    ) then
      raise exception 'SECTOR_FORBIDDEN';
    end if;
  end if;
  if not exists (select 1 from public.case_assignments ca where ca.case_id = p_case_id and ca.sector_code = 'design_metal' and ca.status in ('active','in_progress','done')) then
    raise exception 'ASSIGNMENT_NOT_ALLOWED';
  end if;
  select array_agg(key) into v_keys from jsonb_object_keys(p_patch) as key;
  if v_keys is null then raise exception 'EMPTY_PATCH'; end if;
  foreach k in array v_keys loop
    if not (k = any(v_allowed)) then raise exception 'COLUMN_NOT_ALLOWED_%', k; end if;
  end loop;
  v_has_design_key := (p_patch ? 'design_chassis');
  if v_has_design_key then
    select s.design_chassis into v_prev_design from public.sector_design_metal s where s.case_id = p_case_id;
    if v_prev_design is true and coalesce((p_patch->>'design_chassis')::boolean, true) = false and v_sector <> 'admin' then
      raise exception 'CANNOT_UNCHECK_VALIDATED';
    end if;
  end if;
  update public.sector_design_metal s set
    reception_metal      = case when p_patch ? 'reception_metal' then (p_patch->>'reception_metal')::boolean else s.reception_metal end,
    reception_metal_date = case when p_patch ? 'reception_metal_date' then (p_patch->>'reception_metal_date')::date else s.reception_metal_date end,
    type_de_dents        = case when p_patch ? 'type_de_dents' then (p_patch->>'type_de_dents')::text else s.type_de_dents end,
    modele_a_faire       = case when p_patch ? 'modele_a_faire' then (p_patch->>'modele_a_faire')::text else s.modele_a_faire end,
    modele_a_faire_ok    = case when p_patch ? 'modele_a_faire_ok' then (p_patch->>'modele_a_faire_ok')::boolean else s.modele_a_faire_ok end,
    teintes_associees    = case when p_patch ? 'teintes_associees' then (p_patch->>'teintes_associees')::text else s.teintes_associees end,
    design_chassis       = case when p_patch ? 'design_chassis' then (p_patch->>'design_chassis')::boolean else s.design_chassis end,
    dentall_case_number  = case when p_patch ? 'dentall_case_number' then (p_patch->>'dentall_case_number')::text else s.dentall_case_number end,
    envoye_dentall       = case when p_patch ? 'envoye_dentall' then (p_patch->>'envoye_dentall')::boolean else s.envoye_dentall end,
    peek                 = case when p_patch ? 'peek' then (p_patch->>'peek')::boolean else s.peek end,
    updated_by = v_uid, updated_at = now()
  where s.case_id = p_case_id;
  if not found then raise exception 'SECTOR_ROW_MISSING'; end if;
  perform public.rpc_log_case_event(p_case_id, 'DESIGN_METAL_CELL_UPDATE', null, jsonb_build_object('patch', p_patch));
end;
$function$;

-- 4. Mettre à jour rpc_update_usinage_titane pour accepter "teinte"
CREATE OR REPLACE FUNCTION public.rpc_update_usinage_titane(p_case_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_allowed text[] := ARRAY['envoye_usinage','envoye_usinage_at','numero_lot_metal','numero_lot_metal_h','numero_lot_metal_b','machine_ut','machine_ut_h','machine_ut_b','numero_calcul','numero_calcul_h','numero_calcul_b','nombre_brut','nombre_brut_h','nombre_brut_b','mode_hb_machine','mode_hb_calcul','mode_hb_brut','delai_j1_date','reception_metal_at','teinte'];
  v_key text; v_val jsonb; v_sql text;
BEGIN
  INSERT INTO sector_usinage_titane (case_id) VALUES (p_case_id) ON CONFLICT (case_id) DO NOTHING;
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_patch) LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN CONTINUE; END IF;
    v_sql := format('UPDATE sector_usinage_titane SET %I = ($1#>>''{}'')::%s WHERE case_id = $2', v_key,
      CASE WHEN v_key LIKE 'mode_hb_%' OR v_key = 'envoye_usinage' THEN 'boolean'
           WHEN v_key IN ('envoye_usinage_at','reception_metal_at') THEN 'timestamptz'
           WHEN v_key = 'delai_j1_date' THEN 'date' ELSE 'text' END);
    IF v_val = 'null'::jsonb THEN
      EXECUTE format('UPDATE sector_usinage_titane SET %I = NULL WHERE case_id = $1', v_key) USING p_case_id;
    ELSE
      EXECUTE v_sql USING v_val, p_case_id;
    END IF;
  END LOOP;
  -- Log l'événement
  PERFORM public.rpc_log_case_event(p_case_id, 'USINAGE_TITANE_CELL_UPDATE', null, jsonb_build_object('patch', p_patch));
END;
$function$;

-- 5. Mettre à jour rpc_complete_design_metal pour copier teintes_associees vers teinte UT
--    et aussi copier le flag peek
CREATE OR REPLACE FUNCTION public.rpc_complete_design_metal(p_case_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  UPDATE case_assignments SET status = 'done' WHERE case_id = p_case_id AND sector_code = 'design_metal';

  -- Ouvrir UT pour Chassis Argoat
  INSERT INTO case_assignments (case_id, sector_code, status)
  SELECT p_case_id, 'usinage_titane', 'active' FROM cases WHERE id = p_case_id AND nature_du_travail = 'Chassis Argoat'
  ON CONFLICT (case_id, sector_code) DO UPDATE SET status = 'active' WHERE case_assignments.status IS DISTINCT FROM 'done';

  -- Copier teintes_associees de DM vers teinte dans UT (+ créer la ligne UT si besoin)
  INSERT INTO sector_usinage_titane (case_id, teinte)
  SELECT p_case_id, dm.teintes_associees
  FROM sector_design_metal dm
  WHERE dm.case_id = p_case_id
    AND EXISTS (SELECT 1 FROM cases WHERE id = p_case_id AND nature_du_travail = 'Chassis Argoat')
  ON CONFLICT (case_id) DO UPDATE SET teinte = EXCLUDED.teinte;

  -- Fermer DR si type_de_dents = "Dents du commerce" ou "Pas de dents"
  UPDATE case_assignments SET status = 'done' WHERE case_id = p_case_id AND sector_code = 'design_resine'
    AND EXISTS (SELECT 1 FROM sector_design_metal WHERE case_id = p_case_id AND type_de_dents IN ('Dents du commerce', 'Pas de dents'));

  -- Ouvrir DR si type_de_dents est autre
  INSERT INTO case_assignments (case_id, sector_code, status)
  SELECT p_case_id, 'design_resine', 'active' FROM sector_design_metal WHERE case_id = p_case_id AND type_de_dents NOT IN ('Dents du commerce', 'Pas de dents')
  ON CONFLICT (case_id, sector_code) DO UPDATE SET status = 'active' WHERE case_assignments.status IS DISTINCT FROM 'done';

  -- Ouvrir Finition
  INSERT INTO case_assignments (case_id, sector_code, status) VALUES (p_case_id, 'finition', 'active')
  ON CONFLICT (case_id, sector_code) DO UPDATE SET status = 'active' WHERE case_assignments.status IS DISTINCT FROM 'done';
$function$;
