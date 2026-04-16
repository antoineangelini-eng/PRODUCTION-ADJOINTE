-- Cas physique : inséré à la main (double scan DM ou DR en < 60 s)
-- Quand un cas est physique : is_physical = true, et les "modele_*_ok" passent à false.
-- Les anciennes valeurs modèle sont sauvegardées dans le payload pour restauration.

alter table public.cases
  add column if not exists is_physical boolean not null default false;

-- RPC : marque un cas comme physique + reset des modèles (avec sauvegarde)
create or replace function public.rpc_mark_case_physical(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dm_modele boolean;
  v_dr_modele boolean;
begin
  -- Sauvegarder les valeurs modèle AVANT de les écraser
  select modele_a_faire_ok into v_dm_modele
    from public.sector_design_metal
   where case_id = p_case_id;

  select modele_a_realiser_ok into v_dr_modele
    from public.sector_design_resine
   where case_id = p_case_id;

  update public.cases
     set is_physical = true
   where id = p_case_id;

  update public.sector_design_metal
     set modele_a_faire_ok = false
   where case_id = p_case_id;

  update public.sector_design_resine
     set modele_a_realiser_ok = false
   where case_id = p_case_id;

  -- trace dans case_events (avec anciennes valeurs pour restauration)
  insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
  values (p_case_id, 'CASE_MARKED_PHYSICAL', auth.uid(), null,
    jsonb_build_object(
      'reason', 'double_scan',
      'prev_dm_modele', coalesce(v_dm_modele, false),
      'prev_dr_modele', coalesce(v_dr_modele, false)
    ));
end;
$$;

grant execute on function public.rpc_mark_case_physical(uuid) to authenticated;
