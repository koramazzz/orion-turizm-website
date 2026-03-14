-- Orion Turizm Veritabanı Şeması
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1. Site İçerikleri Tablosu
CREATE TABLE site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5. Admin Ayarları Tablosu (Hashlenmiş Şifre)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin ayarları için RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Varsayılan admin şifresini ekle (orion2024 - ilk girişte değiştirilecek)
-- NOT: Bu şifre uygulama ilk açıldığında otomatik hashlenecek
INSERT INTO admin_settings (key, value) 
VALUES ('adminPassword', 'orion2024') 
ON CONFLICT (key) DO NOTHING;

-- 2. Taşımacılık Kurumları Tablosu
CREATE TABLE transport_orgs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('school', 'factory')) NOT NULL,
  logo_url TEXT,
  buttons_json TEXT, -- JSON array: [{label, url, style}]
  -- Eski alanlar (geriye dönük uyumluluk için korunuyor)
  contract_url TEXT,
  vita_web_url TEXT,
  vita_app_url TEXT,
  payment_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mevcut tabloya buttons_json kolonu eklemek için (zaten varsa çalıştırın):
-- ALTER TABLE transport_orgs ADD COLUMN IF NOT EXISTS buttons_json TEXT;

-- 3. Form Alanları Tablosu
CREATE TABLE form_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  placeholder VARCHAR(255),
  type VARCHAR(20) CHECK (type IN ('text', 'email', 'tel', 'number', 'date', 'select', 'textarea')) NOT NULL,
  options TEXT, -- JSON array for select options
  target VARCHAR(20) CHECK (target IN ('both', 'turlar', 'custom')) DEFAULT 'both',
  required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Form Gönderileri Tablosu
CREATE TABLE form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type VARCHAR(50) NOT NULL, -- 'tours', 'custom-route'
  data_json JSONB NOT NULL, -- Form verileri
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tur Bilgileri Tablosu
CREATE TABLE tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  link VARCHAR(100) UNIQUE NOT NULL,
  details_json JSONB, -- Tur detayları (harita, galeri, program vs.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Medya Dosyaları Tablosu (Görseller için)
CREATE TABLE media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER,
  alt_text VARCHAR(255),
  category VARCHAR(50), -- 'logo', 'carousel', 'tour', 'transport'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (Performans için)
CREATE INDEX idx_site_content_key ON site_content(key);
CREATE INDEX idx_transport_orgs_type ON transport_orgs(type);
CREATE INDEX idx_form_fields_target ON form_fields(target);
CREATE INDEX idx_form_fields_order ON form_fields(order_index);
CREATE INDEX idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX idx_form_submissions_created ON form_submissions(created_at);
CREATE INDEX idx_tours_link ON tours(link);
CREATE INDEX idx_media_files_category ON media_files(category);

-- Row Level Security (RLS) Politikaları
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni (site içerikleri için)
CREATE POLICY "Allow public read access" ON site_content FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON transport_orgs FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON form_fields FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON tours FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON media_files FOR SELECT USING (true);

-- Form gönderileri için sadece INSERT izni
CREATE POLICY "Allow public insert" ON form_submissions FOR INSERT WITH CHECK (true);

-- Admin işlemleri için (şimdilik herkese, sonra auth ekleriz)
CREATE POLICY "Allow all operations" ON site_content FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON transport_orgs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON form_fields FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tours FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON media_files FOR ALL USING (true);

-- Admin settings için özel politika (sadece okuma ve güncelleme)
CREATE POLICY "Allow read admin settings" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Allow update admin settings" ON admin_settings FOR UPDATE USING (true);
CREATE POLICY "Allow insert admin settings" ON admin_settings FOR INSERT WITH CHECK (true);

-- Varsayılan veriler ekle
INSERT INTO site_content (key, value) VALUES
('siteTitle', 'Sakarya Orion Turizm'),
('readyRoutesTitle', 'Hazır Rotalar'),
('readyRoutesDesc', 'Popüler destinasyonlar ve avantajlı paketler.'),
('customRouteTitle', 'Özel Rota İstiyorum'),
('customRouteDesc', 'Size özel güzergâh ve program oluşturalım.'),
('aboutText', 'Sakarya Orion Turizm olarak konforlu, güvenli ve planlı yolculuklar sunuyoruz. Kurumsal organizasyonlardan kişisel seyahatlere, deneyimli ekibimizle yanınızdayız.'),
('contactDescription', 'Teklif, rezervasyon veya bilgi için bizimle iletişime geçin.'),
('phoneNumber', '0 (xxx) xxx xx xx'),
('emailAddress', 'info@orion.com.tr'),
('address', 'Sakarya, Türkiye'),
('instagramLink', 'https://instagram.com/orion_turizm'),
('studentServiceTitle', 'Öğrenci Servisi'),
('studentServiceDesc', 'Güvenli, konforlu ve zamanında ulaşım.'),
('staffServiceTitle', 'Personel Servisi'),
('staffServiceDesc', 'Fabrika ve kurumlar için servis hizmeti.');

-- Örnek taşımacılık kurumları
INSERT INTO transport_orgs (name, type, contract_url, vita_web_url, vita_app_url, payment_url, description) VALUES
('Sakarya Üniversitesi', 'school', 'https://example.com/contract-sau.docx', 'https://vita.sakarya.edu.tr', 'https://play.google.com/store/apps/details?id=com.sau.vita', 'https://odeme.sakarya.edu.tr', 'Sakarya Üniversitesi öğrencileri için güvenli, konforlu ve zamanında taşımacılık hizmeti sunuyoruz. Kampüs-şehir merkezi arasında düzenli seferler.'),
('Orion Koleji', 'school', 'https://example.com/contract-orion.docx', 'https://vita.orionkolej.com', 'https://apps.apple.com/app/orion-vita/id123456789', 'https://odeme.orionkolej.com', 'Orion Koleji öğrencileri için özel tasarlanmış güvenli taşımacılık hizmeti. Deneyimli şoförlerimiz ve modern araçlarımızla hizmetinizdeyiz.');

-- Örnek form alanları
INSERT INTO form_fields (label, placeholder, type, target, required, order_index) VALUES
('İsim Soyisim', 'Adınızı ve soyadınızı girin', 'text', 'both', true, 1),
('E-posta', 'E-posta adresinizi girin', 'email', 'both', true, 2),
('Telefon', 'Telefon numaranızı girin', 'tel', 'both', true, 3),
('Grup Kimliği', 'Örn: 3-B Sınıfı / Ailesi', 'text', 'both', false, 4),
('Seçilen Program', 'Program seçin', 'select', 'turlar', true, 5),
('Rehberlik Dili', 'Dil seçin', 'select', 'both', true, 6),
('Başlangıç Tarihi', 'Tarih seçin', 'date', 'both', true, 7),
('Bitiş Tarihi', 'Tarih seçin', 'date', 'both', true, 8),
('Katılımcı Sayısı', 'Kişi sayısı', 'number', 'both', true, 9),
('Otel Lüksü', '0-10 arası değer', 'number', 'both', false, 10),
('Ziyaret Edilecek Yerler', 'Örn: İstanbul – Kapadokya, 2 gün müze, 1 gün serbest zaman...', 'textarea', 'custom', true, 11),
('İstediğiniz Değişiklik', 'Program üzerinde talep ettiğiniz değişiklikler', 'textarea', 'both', false, 12);

-- Select alanları için seçenekleri güncelle
UPDATE form_fields SET options = '["Kapadokya Kaşifi", "Ege Kıyıları", "Yeşil Karadeniz"]' WHERE label = 'Seçilen Program';
UPDATE form_fields SET options = '["Türkçe", "İngilizce", "Arapça"]' WHERE label = 'Rehberlik Dili';

-- Örnek turlar
INSERT INTO tours (name, description, link, details_json) VALUES
('Kapadokya Kaşifi', 'Uçhisar, Göreme ve vadilerin büyüleyici dünyası', 'kapadokya', '{"mapTitle": "Kapadokya Tur Güzergâhı", "mapDescription": "Göreme, Uçhisar, Avanos ve vadiler", "highlights": ["🏛️ Göreme Açık Hava Müzesi ziyareti", "🏰 Uçhisar Kalesi manzara noktası", "🏺 Avanos seramik atölyesi deneyimi", "🎈 Balon turu opsiyonu (ek ücret)"], "itinerary": ["Gün 1: Uçhisar – Göreme Açık Hava Müzesi", "Gün 2: Vadiler – Avanos seramik atölyesi", "Gün 3: Serbest zaman ve dönüş"]}'),
('Ege Kıyıları', 'İzmir, Çeşme ve Alaçatı turu', 'ege', '{"mapTitle": "Ege Kıyıları Rotası", "mapDescription": "İzmir merkez, Çeşme ve Alaçatı", "highlights": ["🏖️ Çeşme plajları", "🏛️ İzmir Konak Meydanı", "🌊 Alaçatı rüzgar sörfü", "🍷 Şarap tadımı"], "itinerary": ["Gün 1: İzmir şehir turu", "Gün 2: Çeşme ve plajlar", "Gün 3: Alaçatı ve dönüş"]}'),
('Yeşil Karadeniz', 'Trabzon, Uzungöl ve yaylalar', 'karadeniz', '{"mapTitle": "Karadeniz Rotası", "mapDescription": "Trabzon, Uzungöl, Ayder Yaylası", "highlights": ["🏔️ Uzungöl manzarası", "🏛️ Sümela Manastırı", "🌿 Ayder Yaylası", "🍯 Doğal bal tadımı"], "itinerary": ["Gün 1: Trabzon şehir turu", "Gün 2: Uzungöl gezisi", "Gün 3: Ayder Yaylası ve dönüş"]}');

-- Trigger fonksiyonu (updated_at otomatik güncelleme için)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları ekle
CREATE TRIGGER update_transport_orgs_updated_at BEFORE UPDATE ON transport_orgs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUPABASE STORAGE BUCKETS VE POLİTİKALAR
-- =====================================================

-- Storage bucket'ları oluştur (Supabase Dashboard'dan manuel yapılmalı veya SQL ile)
-- 1. site-images: Logolar, carousel, hakkımızda görselleri
-- 2. tour-images: Tur görselleri ve detay görselleri
-- 3. transport-images: Taşımacılık kurumu logoları

-- Storage policies (Public read, authenticated write)
-- NOT: Bu politikalar Supabase Dashboard > Storage > Policies bölümünden ayarlanmalıdır

-- site-images bucket policies:
-- Policy 1: Public read
-- Policy 2: Authenticated upload/update/delete

-- tour-images bucket policies:
-- Policy 1: Public read
-- Policy 2: Authenticated upload/update/delete

-- transport-images bucket policies:
-- Policy 1: Public read
-- Policy 2: Authenticated upload/update/delete

-- Görsel metadata tablosu (opsiyonel - görsellerin track edilmesi için)
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  image_type TEXT, -- 'logo', 'carousel', 'tour', 'transport', 'about'
  reference_id UUID, -- İlişkili kayıt ID'si (tour_id, org_id vs)
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bucket_name, file_path)
);

-- Image metadata trigger
CREATE TRIGGER update_image_metadata_updated_at BEFORE UPDATE ON image_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Image metadata için RLS
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read image metadata" ON image_metadata
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage image metadata" ON image_metadata
  FOR ALL USING (true);

-- =====================================================
-- POPUP SİSTEMİ TABLOSU
-- =====================================================

-- Popup ayarları tablosu
CREATE TABLE IF NOT EXISTS popup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  title TEXT,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT DEFAULT 'Detay',
  show_once BOOLEAN DEFAULT true, -- Kullanıcıya sadece bir kez göster
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popup gösterim geçmişi tablosu (IP bazlı takip - 3 saat aralıklarla)
CREATE TABLE IF NOT EXISTS popup_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popup settings için RLS
ALTER TABLE popup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_views ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni
CREATE POLICY "Public read popup settings" ON popup_settings
  FOR SELECT USING (true);

-- Admin işlemleri için
CREATE POLICY "Allow all operations popup" ON popup_settings
  FOR ALL USING (true);

-- Popup views için politikalar
CREATE POLICY "Allow public insert popup views" ON popup_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read popup views" ON popup_views
  FOR SELECT USING (true);

CREATE POLICY "Allow public update popup views" ON popup_views
  FOR UPDATE USING (true);

-- Popup settings trigger
CREATE TRIGGER update_popup_settings_updated_at BEFORE UPDATE ON popup_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Popup views trigger (opsiyonel - viewed_at zaten manuel güncelleniyor)
-- CREATE TRIGGER update_popup_views_updated_at BEFORE UPDATE ON popup_views FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Varsayılan popup ayarları
INSERT INTO popup_settings (is_active, title, content, link_url, link_text, show_once) VALUES
(false, 'Hoş Geldiniz!', 'Sakarya Orion Turizm''e hoş geldiniz. En güncel tur paketlerimizi keşfedin.', '#', 'Turları İncele', true)
ON CONFLICT DO NOTHING;


