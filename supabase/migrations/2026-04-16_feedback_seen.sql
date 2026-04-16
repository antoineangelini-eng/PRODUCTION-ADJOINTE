-- Ajoute une colonne pour savoir si l'utilisateur a vu la réponse admin
alter table public.feedback
  add column if not exists seen_by_user boolean not null default false;
