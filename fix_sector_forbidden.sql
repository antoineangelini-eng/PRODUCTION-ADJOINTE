CREATE OR REPLACE FUNCTION public.rpc_create_case_from_design_resine(p_case_number text, p_nature_du_travail text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_case_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND (sector IN ('design_resine','admin') OR sectors && ARRAY['design_resine','admin'])
  ) THEN RAISE EXCEPTION 'SECTOR_FORBIDDEN'; END IF;
  IF p_case_number IS NULL OR length(trim(p_case_number)) = 0 THEN RAISE EXCEPTION 'CASE_NUMBER_REQUIRED'; END IF;
  BEGIN
    INSERT INTO public.cases (case_number, created_at, date_expedition, nature_du_travail)
    VALUES (trim(p_case_number), now(), public.rpc_default_expedition_date(), p_nature_du_travail)
    RETURNING id INTO v_case_id;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'CASE_NUMBER_EXISTS'; END;
  INSERT INTO public.case_assignments (case_id, sector_code, status, activated_at, created_at, created_by, updated_at, updated_by)
  VALUES (v_case_id, 'design_resine', 'active', now(), now(), auth.uid(), now(), auth.uid())
  ON CONFLICT (case_id, sector_code) DO NOTHING;
  INSERT INTO public.sector_design_resine (case_id, updated_by) VALUES (v_case_id, auth.uid()) ON CONFLICT (case_id) DO NOTHING;
  PERFORM public.rpc_log_case_event(v_case_id, 'CASE_CREATED', NULL,
    jsonb_build_object('case_number', trim(p_case_number), 'nature_du_travail', p_nature_du_travail, 'source', 'rpc_create_case_from_design_resine'));
  RETURN v_case_id;
END;
$$;
