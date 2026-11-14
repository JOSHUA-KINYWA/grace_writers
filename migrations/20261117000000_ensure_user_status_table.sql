CREATE TABLE IF NOT EXISTS public.user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_status_user_id_unique_idx
  ON public.user_status (user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_is_online
  ON public.user_status (is_online);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read user status" ON public.user_status;
CREATE POLICY "Users can read user status" ON public.user_status
  FOR SELECT USING (true);
