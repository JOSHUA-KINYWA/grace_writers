-- Support closing live chat threads and starting fresh conversations

ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'
    CHECK (status IN ('open', 'closed'));

ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

UPDATE chat_rooms SET status = 'open' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_client_status
  ON chat_rooms (client_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_status_last_message
  ON chat_rooms (status, last_message_at DESC);
