-- Cas physique : inséré à la main (double scan DM ou DR en < 60 s)
-- Quand un cas est physique : is_physical = true, et les "modele_*_ok" passent à false.

alter table public.cases
  add column if not exists is_physical boolean not null default false;

-- RPC : marque un cas comme physique + reset des modèles
create or replace function public.rpc_mark_case_physical(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cases
     set is_physical = true
   where id = p_case_id;

  update public.sector_design_metal
     set modele_a_faire_ok = false
   where case_id = p_case_id;

  update public.sector_design_resine
     set modele_a_realiser_ok = false
   where case_id = p_case_id;

  -- trace dans case_events
  insert into public.case_events (case_id, event_type, created_by, actor_sector, payload)
  values (p_case_id, 'CASE_MARKED_PHYSICAL', auth.uid(), null, jsonb_build_object('reason','double_scan'));
end;
$$;

grant execute on function public.rpc_mark_case_physical(uuid) to authenticated;
