-- Enable Supabase Realtime for order chat (safe to re-run)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
  END IF;
END $$;
