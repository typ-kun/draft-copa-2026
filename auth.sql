-- ========================================
-- AUTH: Perfil de usuários e Admin
-- Execute no SQL Editor do Supabase
-- ========================================

-- 1. Tabela de perfis (níveis de privilégio)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  level text DEFAULT 'common',
  created_at timestamptz DEFAULT now()
);

-- 2. Trigger: criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, level, created_at)
  VALUES (new.id, new.email, 'common', now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. RLS na tabela profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admin pode ler todos os perfis (pelo email)
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (
    auth.email() IN ('guilherme_marchese@hotmail.com')
  );

-- Admin pode atualizar qualquer perfil
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    auth.email() IN ('guilherme_marchese@hotmail.com')
  );

-- Qualquer um pode ler o próprio perfil
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 4. Inserir perfis dos usuários já existentes (executar se já há users cadastrados)
INSERT INTO profiles (id, email, level, created_at)
SELECT id, email, 'common', created_at FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Definir admin manualmente (substitua pelo seu email)
UPDATE profiles SET level = 'admin'
WHERE email = 'guilherme_marchese@hotmail.com';

-- 6. Coluna user_id na room_players (se já não existe)
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_room_players_room_user ON room_players(room_id, user_id);

-- 7. RLS para rooms e room_players (se já não existem)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_anyone" ON rooms;
DROP POLICY IF EXISTS "rooms_insert_auth" ON rooms;
DROP POLICY IF EXISTS "rooms_update_moderator" ON rooms;
DROP POLICY IF EXISTS "rooms_delete_moderator" ON rooms;
DROP POLICY IF EXISTS "room_players_select_anyone" ON room_players;
DROP POLICY IF EXISTS "room_players_insert_auth" ON room_players;

CREATE POLICY "rooms_select_anyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_auth" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "rooms_update_moderator" ON rooms FOR UPDATE USING (auth.uid() = moderator_id);
CREATE POLICY "rooms_delete_moderator" ON rooms FOR DELETE USING (auth.uid() = moderator_id);
CREATE POLICY "room_players_select_anyone" ON room_players FOR SELECT USING (true);
CREATE POLICY "room_players_insert_auth" ON room_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
