-- Add username to clients so the app can look up clients by username/email
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Populate existing rows with email values when username is missing
UPDATE clients
  SET username = email
  WHERE username IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
