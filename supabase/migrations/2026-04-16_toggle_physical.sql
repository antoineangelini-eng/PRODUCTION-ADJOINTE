-- Toggle is_physical sur un cas.
-- Quand on MARQUE physique : sauvegarde les valeurs modèle actuelles dans le payload
--   de l'event, puis force les modèles à false.
-- Quand on ENLÈVE physique : restaure les valeurs modèle depuis le dernier event
--   CASE_MARKED_PHYSICAL (pas un "oui" par défaut).

create or replace function public.rpc_toggle_case_physical(p_case_id uuid)
returns boolean  -- retourne le NOUVEAU état is_physical
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_physical boolean;
  v_dm_modele    boolean;
  v_dr_modele    boolean;
  v_prev_payload jsonb;
begin
  select is_physical into v_was_physical
    from public.cases
   where id = p_case_id;

  if v_was_physical is null then
    raise exception 'Cas introuvable : %', p_case_id;
  end if;

  if v_was_physical then
    -- ── ENLEVER physique ──
    -- Chercher le dernier event CASE_MARKED_PHYSICAL pour récupérer les anciennes valeurs
    select payload into v_prev_payload
      from public.case_events
     where case_id = p_case_id
       and event_type = 'CASE_MARKED_PHYSICAL'
     order by created_at desc
     limit 1;

    update public.cases set is_physical = false where id = p_case_id;

    -- Restaurer les valeurs sauvegardées (si pas trouvé, on laisse tel quel)
    if v_prev_payload is not null then
      update public.sector_design_metal
         set modele_a_faire_ok = coalesce((v_prev_payload->>'prev_dm_modele')::boolean, modele_a_faire_ok)
       where case_id = p_case_id;

      update public.sector_design_resine
         set modele_a_realiser_ok = coalesce((v_prev_payload->>'prev_dr_modele')::boolean, modele_a_realiser_ok)
       where case_id = p_case_id;
    end if;

    insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
    values (p_case_id, 'CASE_UNMARKED_PHYSICAL', auth.uid(), null,
      jsonb_build_object('reason', 'manual_toggle'));

  else
    -- ── MARQUER physique ──
    -- Sauvegarder les valeurs modèle AVANT de les écraser
    select modele_a_faire_ok into v_dm_modele
      from public.sector_design_metal
     where case_id = p_case_id;

    select modele_a_realiser_ok into v_dr_modele
      from public.sector_design_resine
     where case_id = p_case_id;

    update public.cases set is_physical = true where id = p_case_id;
    update public.sector_design_metal  set modele_a_faire_ok    = false where case_id = p_case_id;
    update public.sector_design_resine set modele_a_realiser_ok = false where case_id = p_case_id;

    -- Stocker les anciennes valeurs dans le payload pour restauration future
    insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
    values (p_case_id, 'CASE_MARKED_PHYSICAL', auth.uid(), null,
      jsonb_build_object(
        'reason', 'manual_toggle',
        'prev_dm_modele', coalesce(v_dm_modele, false),
        'prev_dr_modele', coalesce(v_dr_modele, false)
      ));
  end if;

  return not v_was_physical;
end;
$$;

grant execute on function public.rpc_toggle_case_physical(uuid) to authenticated;
