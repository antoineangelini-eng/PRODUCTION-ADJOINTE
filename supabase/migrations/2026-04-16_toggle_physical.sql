-- Toggle is_physical sur un cas : si physique → redevient numérique (modèles en true)
-- Si numérique → devient physique (modèles en false)

create or replace function public.rpc_toggle_case_physical(p_case_id uuid)
returns boolean  -- retourne le NOUVEAU état is_physical
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_physical boolean;
begin
  select is_physical into v_was_physical
    from public.cases
   where id = p_case_id;

  if v_was_physical is null then
    raise exception 'Cas introuvable : %', p_case_id;
  end if;

  if v_was_physical then
    -- Enlever physique → modèles repassent en true
    update public.cases set is_physical = false where id = p_case_id;
    update public.sector_design_metal  set modele_a_faire_ok    = true where case_id = p_case_id;
    update public.sector_design_resine set modele_a_realiser_ok = true where case_id = p_case_id;

    insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
    values (p_case_id, 'CASE_UNMARKED_PHYSICAL', auth.uid(), null, jsonb_build_object('reason','manual_toggle'));
  else
    -- Marquer physique → modèles passent en false
    update public.cases set is_physical = true where id = p_case_id;
    update public.sector_design_metal  set modele_a_faire_ok    = false where case_id = p_case_id;
    update public.sector_design_resine set modele_a_realiser_ok = false where case_id = p_case_id;

    insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
    values (p_case_id, 'CASE_MARKED_PHYSICAL', auth.uid(), null, jsonb_build_object('reason','manual_toggle'));
  end if;

  return not v_was_physical;
end;
$$;

grant execute on function public.rpc_toggle_case_physical(uuid) to authenticated;
