-- Enhanced ratings: per-order + platform reviews, admin moderation, public feed

ALTER TABLE public.order_ratings
  ADD COLUMN IF NOT EXISTS rating_type text NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS admin_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_display_name text;

ALTER TABLE public.order_ratings DROP CONSTRAINT IF EXISTS order_ratings_rating_type_check;
ALTER TABLE public.order_ratings
  ADD CONSTRAINT order_ratings_rating_type_check
  CHECK (rating_type IN ('order', 'platform'));

ALTER TABLE public.order_ratings ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.order_ratings DROP CONSTRAINT IF EXISTS order_ratings_order_id_key;
DROP INDEX IF EXISTS order_ratings_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS order_ratings_one_per_order
  ON public.order_ratings (order_id)
  WHERE order_id IS NOT NULL AND rating_type = 'order';

CREATE UNIQUE INDEX IF NOT EXISTS order_ratings_one_platform_per_client
  ON public.order_ratings (client_id)
  WHERE rating_type = 'platform';

CREATE INDEX IF NOT EXISTS idx_order_ratings_published
  ON public.order_ratings (is_published, is_visible, rating);

DROP POLICY IF EXISTS "Clients can view published reviews" ON public.order_ratings;
CREATE POLICY "Clients can view published reviews" ON public.order_ratings
  FOR SELECT
  USING (
    is_visible = true
    AND is_published = true
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR auth.uid() IS NOT NULL
    )
  );
