-- Create quick_replies table for predefined responses
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  is_global boolean DEFAULT false, -- Global replies available to all admins
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_quick_replies_admin_id ON quick_replies(admin_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(active);

-- Enable RLS
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read their own and global quick replies
CREATE POLICY "Admins can read quick replies" ON quick_replies
  FOR SELECT
  USING (
    admin_id = auth.uid()
    OR is_global = true
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- RLS Policy: Admins can create quick replies
CREATE POLICY "Admins can create quick replies" ON quick_replies
  FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- RLS Policy: Admins can update their own quick replies
CREATE POLICY "Admins can update quick replies" ON quick_replies
  FOR UPDATE
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Add read receipts tracking for better message status
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES order_messages(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(message_id, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_reader_id ON message_read_receipts(reader_id);

-- Similar for support ticket messages
CREATE TABLE IF NOT EXISTS ticket_message_read_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(message_id, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_message_read_receipts_message_id ON ticket_message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_ticket_message_read_receipts_reader_id ON ticket_message_read_receipts(reader_id);
