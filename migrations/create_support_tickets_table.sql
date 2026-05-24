-- Create support_tickets table for general questions outside orders
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text CHECK (category IN ('general', 'billing', 'account', 'technical', 'feedback')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  resolved_at timestamp with time zone
);

-- Create support_ticket_messages table for threaded discussions
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  is_admin boolean DEFAULT false,
  parent_message_id uuid REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
  thread_root_id uuid,
  reply_count integer DEFAULT 0,
  file_attachments text[] DEFAULT ARRAY[]::text[],
  read_status text DEFAULT 'unread' CHECK (read_status IN ('read', 'unread')),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_parent_id ON support_ticket_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_thread_root ON support_ticket_messages(thread_root_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Clients can read their own tickets" ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = support_tickets.client_id
      AND c.email = auth.jwt() ->> 'email'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Clients can create tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = support_tickets.client_id
      AND c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients can update their own tickets" ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = support_tickets.client_id
      AND c.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = support_tickets.client_id
      AND c.email = auth.jwt() ->> 'email'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- RLS Policies for support_ticket_messages
CREATE POLICY "Users can read ticket messages" ON support_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      INNER JOIN clients c ON st.client_id = c.id
      WHERE st.id = support_ticket_messages.ticket_id
      AND c.email = auth.jwt() ->> 'email'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Users can insert ticket messages" ON support_ticket_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM support_tickets st
        INNER JOIN clients c ON st.client_id = c.id
        WHERE st.id = support_ticket_messages.ticket_id
        AND c.email = auth.jwt() ->> 'email'
      )
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );

-- Triggers for threading support
CREATE OR REPLACE FUNCTION update_ticket_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE support_ticket_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_message_id;
    
    IF NEW.thread_root_id IS NULL THEN
      UPDATE support_ticket_messages
      SET thread_root_id = COALESCE((
        SELECT id FROM support_ticket_messages WHERE id = NEW.parent_message_id AND parent_message_id IS NULL
      ), NEW.parent_message_id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ticket_reply_count ON support_ticket_messages;
CREATE TRIGGER trigger_update_ticket_reply_count
AFTER INSERT ON support_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION update_ticket_message_reply_count();
