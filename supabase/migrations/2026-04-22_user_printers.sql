-- Table pour stocker l'IP de l'imprimante Zebra associée à chaque utilisateur
CREATE TABLE IF NOT EXISTS user_printers (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  printer_ip TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS : seuls les admins peuvent lire/écrire (via admin client, RLS bypassé)
ALTER TABLE user_printers ENABLE ROW LEVEL SECURITY;
