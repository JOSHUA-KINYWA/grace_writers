-- Profile save expects clients.avatar_url (auth metadata is fallback only).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.clients.avatar_url IS 'Storage path or URL for profile avatar';
