DO $$
DECLARE
  relation_kind "char";
  existing_type_kind "char";
BEGIN
  SELECT relkind INTO relation_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'user_status';

  IF relation_kind IS NULL THEN
    -- A standalone PostgreSQL type can reserve the name and block CREATE TABLE.
    SELECT t.typtype INTO existing_type_kind
    FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_status';
    IF existing_type_kind = 'd' THEN
      ALTER DOMAIN public.user_status RENAME TO user_status_legacy_type_20261117;
    ELSIF existing_type_kind IS NOT NULL THEN
      ALTER TYPE public.user_status RENAME TO user_status_legacy_type_20261117;
    END IF;

    CREATE TABLE public.user_status (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      is_online boolean NOT NULL DEFAULT false,
      last_seen timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  ELSIF relation_kind NOT IN ('r', 'p') THEN
    RAISE EXCEPTION 'public.user_status exists but is not a table (relkind=%)', relation_kind;
  END IF;
END $$;

ALTER TABLE public.user_status
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS user_status_user_id_unique_idx
  ON public.user_status (user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_is_online
  ON public.user_status (is_online);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read user status" ON public.user_status;
CREATE POLICY "Users can read user status" ON public.user_status
  FOR SELECT USING (true);
