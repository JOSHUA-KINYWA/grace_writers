-- Fix order_messages RLS policy to be more reliable

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read order messages" ON order_messages;
DROP POLICY IF EXISTS "Users can insert order messages" ON order_messages;
DROP POLICY IF EXISTS "Admins can delete order messages" ON order_messages;

-- Fixed RLS Policy: Users can read messages from their own orders or if admin
-- Simplified logic: check if user is admin, or is the sender, or is the client for the order
CREATE POLICY "Users can read order messages" ON order_messages
  FOR SELECT
  USING (
    -- User is admin
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    -- OR user is the sender
    OR auth.uid() = sender_id
    -- OR user is the client who placed the order
    OR EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = order_messages.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert messages into their own orders or if admin
CREATE POLICY "Users can insert order messages" ON order_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- User is admin
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
      -- OR user is the client for this order
      OR EXISTS (
        SELECT 1 FROM orders o
        INNER JOIN clients c ON o.client_id = c.id
        WHERE o.id = order_messages.order_id
        AND c.auth_user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Only admins can delete messages
CREATE POLICY "Admins can delete order messages" ON order_messages
  FOR DELETE
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- RLS Policy: Users can update read status of their own messages or if admin
CREATE POLICY "Users can update order messages read status" ON order_messages
  FOR UPDATE
  USING (
    -- User is admin
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    -- OR user is the sender
    OR auth.uid() = sender_id
    -- OR user is the client receiving the message
    OR EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = order_messages.order_id
      AND c.auth_user_id = auth.uid()
    )
  );
