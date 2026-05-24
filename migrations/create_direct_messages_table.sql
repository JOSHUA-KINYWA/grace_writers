-- Create direct_messages table for admin-client communication
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own messages" ON direct_messages
  FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Users can insert messages" ON direct_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON direct_messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = sender_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Only senders/admins can delete messages" ON direct_messages
  FOR DELETE
  USING (
    auth.uid() = sender_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  );
