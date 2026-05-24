-- Run in Supabase SQL Editor if ratings fail with "table not found"
CREATE TABLE IF NOT EXISTS order_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_ratings_order_id ON order_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_client_id ON order_ratings(client_id);

ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their order ratings" ON order_ratings;
CREATE POLICY "Clients can view their order ratings" ON order_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = order_ratings.order_id
      AND (c.auth_user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    )
  );

DROP POLICY IF EXISTS "Clients can create ratings for their orders" ON order_ratings;
CREATE POLICY "Clients can create ratings for their orders" ON order_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = order_ratings.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can update their own ratings" ON order_ratings;
CREATE POLICY "Clients can update their own ratings" ON order_ratings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN clients c ON o.client_id = c.id
      WHERE o.id = order_ratings.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage ratings" ON order_ratings;
CREATE POLICY "Admins can manage ratings" ON order_ratings
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
