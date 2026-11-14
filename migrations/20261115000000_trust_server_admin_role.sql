-- Admin roles must live in server-managed app_metadata, never user-editable metadata.
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE raw_user_meta_data ->> 'role' = 'admin'
  AND COALESCE(raw_app_meta_data ->> 'role', '') <> 'admin';

-- Update policies already installed in Supabase so the new role claim is effective.
DO $$
DECLARE
  policy_row record;
  using_sql text;
  check_sql text;
  statement text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual, '') LIKE '%user_metadata%'
        OR COALESCE(with_check, '') LIKE '%user_metadata%')
  LOOP
    using_sql := replace(policy_row.qual, 'user_metadata', 'app_metadata');
    check_sql := replace(policy_row.with_check, 'user_metadata', 'app_metadata');
    statement := format('ALTER POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    IF policy_row.qual IS NOT NULL THEN
      statement := statement || format(' USING (%s)', using_sql);
    END IF;
    IF policy_row.with_check IS NOT NULL THEN
      statement := statement || format(' WITH CHECK (%s)', check_sql);
    END IF;
    EXECUTE statement;
  END LOOP;
END $$;
