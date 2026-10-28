-- Site görsellerine (logo, karusel, tur fotoğrafları, kurum logoları) sadece
-- admin_users tablosundaki kullanıcılar yazabilsin.
--
-- Neden: Supabase projesinde kayıt (sign up) açık. Önceki kurulum notları
-- storage için "authenticated kullanıcı yazabilir" politikası öneriyordu; bu durumda
-- kendi e-postasıyla kayıt olan herhangi biri örneğin logos/header.png dosyasının
-- üzerine yazabilir. Aşağıdaki RESTRICTIVE politikalar, dashboard'dan eklenmiş mevcut
-- politikaların adını bilmeden hepsinin üstüne "ve admin olmalı" şartı ekler.
--
-- Çalıştırmadan önce kendi admin hesabınızın admin_users tablosunda olduğunu doğrulayın:
--   SELECT * FROM public.admin_users;
-- Yoksa önce ekleyin (yoksa görsel yükleyemezsiniz):
--   INSERT INTO public.admin_users (user_id, email)
--   SELECT id, email FROM auth.users WHERE email = 'ADMIN_EPOSTANIZ'
--   ON CONFLICT (user_id) DO NOTHING;

DROP POLICY IF EXISTS "Admin only writes to site buckets (insert)" ON storage.objects;
DROP POLICY IF EXISTS "Admin only writes to site buckets (update)" ON storage.objects;
DROP POLICY IF EXISTS "Admin only writes to site buckets (delete)" ON storage.objects;

CREATE POLICY "Admin only writes to site buckets (insert)"
  ON storage.objects AS RESTRICTIVE FOR INSERT
  WITH CHECK (bucket_id NOT IN ('site-images', 'tour-images', 'transport-images', 'media') OR public.is_admin());

CREATE POLICY "Admin only writes to site buckets (update)"
  ON storage.objects AS RESTRICTIVE FOR UPDATE
  USING (bucket_id NOT IN ('site-images', 'tour-images', 'transport-images', 'media') OR public.is_admin())
  WITH CHECK (bucket_id NOT IN ('site-images', 'tour-images', 'transport-images', 'media') OR public.is_admin());

CREATE POLICY "Admin only writes to site buckets (delete)"
  ON storage.objects AS RESTRICTIVE FOR DELETE
  USING (bucket_id NOT IN ('site-images', 'tour-images', 'transport-images', 'media') OR public.is_admin());

-- Eski panel, admin şifresinin SHA-256 özetini admin_settings tablosuna da yazıyordu.
-- Giriş artık sadece Supabase Auth ile yapıldığından bu kayıt kullanılmıyor;
-- şifrenizin bir kopyasının veritabanında durmaması için siliniyor.
DELETE FROM public.admin_settings WHERE key = 'adminPassword';
