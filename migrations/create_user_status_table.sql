-- Create user_status table for tracking online/offline status
CREATE TABLE IF NOT EXISTS user_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  is_online boolean DEFAULT true,
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_is_online ON user_status(is_online);

-- Enable RLS
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read user status
CREATE POLICY "Users can read user status" ON user_status
  FOR SELECT
  USING (true);

-- Policy: Users can update their own status or admins can update any
CREATE POLICY "Users can update own status" ON user_status
  FOR UPDATE
  USING (auth.uid() = user_id OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid() = user_id OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Policy: Users can insert their own status
CREATE POLICY "Users can insert own status" ON user_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
