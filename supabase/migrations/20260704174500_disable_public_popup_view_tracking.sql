-- Popup views store IP/user-agent history. The site now tracks popup display
-- locally with a cookie, so public database access is no longer needed.

ALTER TABLE popup_views ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'popup_views'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.popup_views', policy_name);
  END LOOP;
END $$;

CREATE POLICY "Allow admin read popup views"
  ON popup_views
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Allow admin delete popup views"
  ON popup_views
  FOR DELETE
  USING (public.is_admin());
