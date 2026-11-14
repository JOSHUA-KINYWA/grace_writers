-- Allow admins to read their own in-app notifications (for toasts/badges in browser)

DROP POLICY IF EXISTS "Admins read own notifications" ON public.notifications;
CREATE POLICY "Admins read own notifications" ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
