-- ========================================
-- AUTH: Adicionar coluna user_id e RLS
-- Execute no SQL Editor do Supabase
-- ========================================

-- 1. Adicionar coluna user_id na tabela room_players
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_room_players_room_user ON room_players(room_id, user_id);

-- 3. Habilitar RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- 4. Remover policies existentes (caso já tenham sido criadas)
DROP POLICY IF EXISTS "rooms_select_anyone" ON rooms;
DROP POLICY IF EXISTS "rooms_insert_auth" ON rooms;
DROP POLICY IF EXISTS "rooms_update_moderator" ON rooms;
DROP POLICY IF EXISTS "rooms_delete_moderator" ON rooms;
DROP POLICY IF EXISTS "room_players_select_anyone" ON room_players;
DROP POLICY IF EXISTS "room_players_insert_auth" ON room_players;

-- 5. RLS Policies para rooms
CREATE POLICY "rooms_select_anyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_auth" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "rooms_update_moderator" ON rooms FOR UPDATE USING (auth.uid() = moderator_id);
CREATE POLICY "rooms_delete_moderator" ON rooms FOR DELETE USING (auth.uid() = moderator_id);

-- 6. RLS Policies para room_players
CREATE POLICY "room_players_select_anyone" ON room_players FOR SELECT USING (true);
CREATE POLICY "room_players_insert_auth" ON room_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
