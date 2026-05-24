-- Add account_type column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'client' CHECK (account_type IN ('client', 'admin'));

-- Create profiles table to store user metadata for easier access
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  account_type TEXT DEFAULT 'client' CHECK (account_type IN ('client', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster account_type queries
CREATE INDEX IF NOT EXISTS idx_clients_account_type ON clients(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (account_type = 'admin');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE
  USING (account_type = 'admin')
  WITH CHECK (account_type = 'admin');

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_actions
CREATE POLICY "Only admins can view admin actions" ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  );

CREATE POLICY "Only admins can insert admin actions" ON admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'admin'
    )
  );
