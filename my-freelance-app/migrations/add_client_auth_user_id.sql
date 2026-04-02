-- Add auth_user_id to clients so the app can link clients to auth.users
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
