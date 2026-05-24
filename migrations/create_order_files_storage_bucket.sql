-- Create private storage bucket for order files and chat attachments.
-- Run in Supabase SQL Editor if uploads return "Bucket not found".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-files', 'order-files', false, 52428800, null)
on conflict (id) do update set public = false;

-- Authenticated users can read/write via API (service role used server-side).
-- Optional: allow authenticated upload/read policies if using client-side storage later.
