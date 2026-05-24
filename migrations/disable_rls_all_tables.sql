-- Disable RLS on all tables for development/debugging only.
-- WARNING: this removes row-level protections. Do NOT use in production.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

ALTER TABLE admin_actions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins can view admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Only admins can insert admin actions" ON admin_actions;

ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON direct_messages;
DROP POLICY IF EXISTS "Only senders/admins can delete messages" ON direct_messages;

ALTER TABLE order_ratings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clients can view their order ratings" ON order_ratings;
DROP POLICY IF EXISTS "Clients can create ratings for their orders" ON order_ratings;
DROP POLICY IF EXISTS "Clients can update their own ratings" ON order_ratings;
DROP POLICY IF EXISTS "Admins can delete ratings" ON order_ratings;

ALTER TABLE user_status DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view user status" ON user_status;
DROP POLICY IF EXISTS "Users can update own status" ON user_status;
DROP POLICY IF EXISTS "Users can update own status v2" ON user_status;

-- Optional extra tables if added later:
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
