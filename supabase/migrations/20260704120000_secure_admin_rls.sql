-- Secure admin-write RLS policies.
-- Run this on an existing Supabase project, then add your admin Auth user to admin_users.

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
       OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON site_content;
DROP POLICY IF EXISTS "Allow all operations" ON transport_orgs;
DROP POLICY IF EXISTS "Allow all operations" ON form_fields;
DROP POLICY IF EXISTS "Allow all operations" ON tours;
DROP POLICY IF EXISTS "Allow all operations" ON media_files;
DROP POLICY IF EXISTS "Allow read admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow update admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow insert admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated manage image metadata" ON image_metadata;
DROP POLICY IF EXISTS "Allow all operations popup" ON popup_settings;

DROP POLICY IF EXISTS "Allow public read access" ON site_content;
DROP POLICY IF EXISTS "Allow public read access" ON transport_orgs;
DROP POLICY IF EXISTS "Allow public read access" ON form_fields;
DROP POLICY IF EXISTS "Allow public read access" ON tours;
DROP POLICY IF EXISTS "Allow public read access" ON media_files;
DROP POLICY IF EXISTS "Allow public insert" ON form_submissions;
DROP POLICY IF EXISTS "Allow own admin user read" ON admin_users;
DROP POLICY IF EXISTS "Allow admin read form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Allow admin delete form submissions" ON form_submissions;
DROP POLICY IF EXISTS "Allow admin insert" ON site_content;
DROP POLICY IF EXISTS "Allow admin update" ON site_content;
DROP POLICY IF EXISTS "Allow admin delete" ON site_content;
DROP POLICY IF EXISTS "Allow admin insert" ON transport_orgs;
DROP POLICY IF EXISTS "Allow admin update" ON transport_orgs;
DROP POLICY IF EXISTS "Allow admin delete" ON transport_orgs;
DROP POLICY IF EXISTS "Allow admin insert" ON form_fields;
DROP POLICY IF EXISTS "Allow admin update" ON form_fields;
DROP POLICY IF EXISTS "Allow admin delete" ON form_fields;
DROP POLICY IF EXISTS "Allow admin insert" ON tours;
DROP POLICY IF EXISTS "Allow admin update" ON tours;
DROP POLICY IF EXISTS "Allow admin delete" ON tours;
DROP POLICY IF EXISTS "Allow admin insert" ON media_files;
DROP POLICY IF EXISTS "Allow admin update" ON media_files;
DROP POLICY IF EXISTS "Allow admin delete" ON media_files;
DROP POLICY IF EXISTS "Allow admin read admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow admin update admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow admin insert admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Admin manage image metadata" ON image_metadata;
DROP POLICY IF EXISTS "Allow admin insert popup" ON popup_settings;
DROP POLICY IF EXISTS "Allow admin update popup" ON popup_settings;
DROP POLICY IF EXISTS "Allow admin delete popup" ON popup_settings;

CREATE POLICY "Allow public read access" ON site_content FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON transport_orgs FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON form_fields FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON tours FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON media_files FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow own admin user read" ON admin_users FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow admin read form submissions" ON form_submissions FOR SELECT USING (public.is_admin());
CREATE POLICY "Allow admin delete form submissions" ON form_submissions FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin insert" ON site_content FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update" ON site_content FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete" ON site_content FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin insert" ON transport_orgs FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update" ON transport_orgs FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete" ON transport_orgs FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin insert" ON form_fields FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update" ON form_fields FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete" ON form_fields FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin insert" ON tours FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update" ON tours FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete" ON tours FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin insert" ON media_files FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update" ON media_files FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete" ON media_files FOR DELETE USING (public.is_admin());

CREATE POLICY "Allow admin read admin settings" ON admin_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "Allow admin update admin settings" ON admin_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin insert admin settings" ON admin_settings FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage image metadata" ON image_metadata
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin insert popup" ON popup_settings
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update popup" ON popup_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete popup" ON popup_settings
  FOR DELETE USING (public.is_admin());

-- After this migration, add the real admin user:
-- INSERT INTO admin_users (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'admin@example.com'
-- ON CONFLICT (user_id) DO NOTHING;
