-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : Ajouter created_by sur case_assignments
-- But : savoir quel utilisateur a envoyé chaque cas dans chaque secteur
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Ajouter la colonne (nullable pour les cas existants)
ALTER TABLE public.case_assignments
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2) Pour les cas existants sans created_by, on met le premier admin trouvé
--    (fallback raisonnable, les nouveaux cas auront le vrai créateur)
UPDATE public.case_assignments
SET created_by = (
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.sectors @> ARRAY['admin']::text[]
  LIMIT 1
)
WHERE created_by IS NULL;

-- 3) Modifier rpc_create_case_from_design_metal pour stocker auth.uid()
CREATE OR REPLACE FUNCTION public.rpc_create_case_from_design_metal(
  p_case_number TEXT,
  p_nature_du_travail TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $fn$
DECLARE
  v_case_id UUID;
  v_routes TEXT[];
BEGIN
  -- Créer le cas
  INSERT INTO public.cases (case_number, nature_du_travail)
  VALUES (p_case_number, p_nature_du_travail)
  RETURNING id INTO v_case_id;

  -- Déterminer les secteurs cibles
  v_routes := (SELECT sectors FROM public.sector_routes WHERE nature = p_nature_du_travail);
  IF v_routes IS NULL THEN
    v_routes := ARRAY['design_metal'];
  END IF;

  -- Créer les assignments avec created_by
  INSERT INTO public.case_assignments (case_id, sector_code, status, activated_at, created_by)
  SELECT v_case_id, unnest(v_routes), 'active', NOW(), auth.uid();

  -- Créer les lignes secteur
  INSERT INTO public.sector_design_metal (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_design_resine (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_usinage_titane (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_usinage_resine (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_finition (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;

  RETURN v_case_id;
END;
$fn$;

-- 4) Modifier rpc_create_case_from_design_resine pour stocker auth.uid()
CREATE OR REPLACE FUNCTION public.rpc_create_case_from_design_resine(
  p_case_number TEXT,
  p_nature_du_travail TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $fn$
DECLARE
  v_case_id UUID;
  v_routes TEXT[];
BEGIN
  INSERT INTO public.cases (case_number, nature_du_travail)
  VALUES (p_case_number, p_nature_du_travail)
  RETURNING id INTO v_case_id;

  v_routes := (SELECT sectors FROM public.sector_routes WHERE nature = p_nature_du_travail);
  IF v_routes IS NULL THEN
    v_routes := ARRAY['design_resine'];
  END IF;

  INSERT INTO public.case_assignments (case_id, sector_code, status, activated_at, created_by)
  SELECT v_case_id, unnest(v_routes), 'active', NOW(), auth.uid();

  INSERT INTO public.sector_design_metal (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_design_resine (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_usinage_titane (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_usinage_resine (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.sector_finition (case_id) VALUES (v_case_id) ON CONFLICT DO NOTHING;

  RETURN v_case_id;
END;
$fn$;
