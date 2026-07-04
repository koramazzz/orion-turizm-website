-- Lock down visitor-submitted/private data on existing Supabase projects.
-- Run this after older setup scripts so loose legacy policies are removed.

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_views ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_submissions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.form_submissions', policy_name);
  END LOOP;

  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'popup_views'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.popup_views', policy_name);
  END LOOP;
END $$;

CREATE POLICY "Allow public insert form submissions"
  ON form_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow admin read form submissions"
  ON form_submissions
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Allow admin delete form submissions"
  ON form_submissions
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Allow public insert popup views"
  ON popup_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow admin read popup views"
  ON popup_views
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Allow admin delete popup views"
  ON popup_views
  FOR DELETE
  USING (public.is_admin());
