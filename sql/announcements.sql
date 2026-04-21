-- ============================================================
-- Tables pour le système d'annonces / Nouveautés
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table des annonces
CREATE TABLE IF NOT EXISTS announcements (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL DEFAULT '',
  message    text NOT NULL DEFAULT '',
  sectors    text[] DEFAULT NULL,        -- NULL = tous les secteurs
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour filtrer les annonces actives rapidement
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (active, created_at DESC);

-- 2. Table des dismissals (un utilisateur ferme une annonce)
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  dismissed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_dismissals_user ON announcement_dismissals (user_id);

-- 3. RLS — désactivé pour ces tables (accès via admin client côté serveur)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Policy : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read own dismissals"
  ON announcement_dismissals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert own dismissals"
  ON announcement_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
