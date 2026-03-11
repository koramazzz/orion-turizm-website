// Supabase Configuration (idempotent bootstrap)
(function(){
  if (window.__SUPABASE_BOOTSTRAPPED__) { return; }
  window.__SUPABASE_BOOTSTRAPPED__ = true;

  // Supabase proje bilgilerinizi buraya girin (window üzerinden tanımla)
  var SUPABASE_URL = window.SUPABASE_URL || 'https://fxmmnddcchfhusbhxebp.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bW1uZGRjY2hmaHVzYmh4ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU1MzgsImV4cCI6MjA4ODY1MTUzOH0.YYl8jCETqtY6D5Mgiw8STC8Vo9rb62YDlGbrot6Qzfc';

  // Global olarak erişilebilir yap (mail gönderimi için)
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Supabase client'ı başlat (SessionStorage ile)
// Session tarayıcı kapatılana kadar saklanır (güvenli)
  const sessionStorageAdapter = {
  getItem: function(key) { 
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: function(key, value) { 
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('SessionStorage yazma hatası:', e);
    }
  },
  removeItem: function(key) { 
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
  };

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('Supabase SDK yüklenemedi; backend offline modda.');
    return;
  }

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        storage: sessionStorageAdapter,
        persistSession: true, // Session'ı sessionStorage'da tut
        autoRefreshToken: true // Token'ı otomatik yenile
      }
    }
  );

// Backend Manager Class
  class BackendManager {
  constructor() {
    this.supabase = supabase;
    this.isOnline = navigator.onLine;
    
    // Online/offline durumu takip et
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // =====================================================
  // SUPABASE AUTH FONKSİYONLARI
  // =====================================================

  /**
   * Admin kullanıcısını Supabase Auth ile giriş yap
   * @param {string} email - Admin email
   * @param {string} password - Admin şifre
   * @returns {Promise<object>} - User objesi veya null
   */
  async signInWithEmail(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      return data.user;
    } catch (error) {
      console.error('Giriş hatası:', error.message);
      return null;
    }
  }

  /**
   * Admin kullanıcısını oluştur (ilk kurulum için)
   * @param {string} email - Admin email
   * @param {string} password - Admin şifre
   */
  async createAdminUser(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password
      });

      if (error) throw error;

      return data.user;
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error.message);
      return null;
    }
  }

  /**
   * Çıkış yap
   */
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Çıkış hatası:', error.message);
      return false;
    }
  }

  /**
   * Şu anki kullanıcıyı al
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Kullanıcı alınamadı:', error.message);
      return null;
    }
  }

  /**
   * Kullanıcı giriş yapmış mı kontrol et
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Kullanıcı şifresini güncelle (Supabase Auth)
   * @param {string} newPassword - Yeni şifre
   */
  async updateAuthPassword(newPassword) {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Auth şifre güncelleme hatası:', error.message);
      return false;
    }
  }

  // =====================================================
  // ŞİFRE HASHLEME FONKSİYONLARI (Web Crypto API)
  // =====================================================

  /**
   * Şifreyi hash'le (SHA-256 + salt)
   * @param {string} password - Plain text şifre
   * @returns {Promise<string>} - Hashlenmiş şifre (salt dahil)
   */
  async hashPassword(password) {
    try {
      // Random salt oluştur (16 byte)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Şifreyi encode et
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      
      // Salt + password birleştir
      const combined = new Uint8Array(salt.length + passwordData.length);
      combined.set(salt);
      combined.set(passwordData, salt.length);
      
      // SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      const hashArray = new Uint8Array(hashBuffer);
      
      // Salt + hash'i base64 olarak birleştir
      const saltBase64 = this.arrayBufferToBase64(salt);
      const hashBase64 = this.arrayBufferToBase64(hashArray);
      
      return `${saltBase64}:${hashBase64}`;
    } catch (error) {
      console.error('Şifre hashleme hatası:', error);
      throw error;
    }
  }

  /**
   * Şifreyi doğrula
   * @param {string} password - Kontrol edilecek şifre
   * @param {string} hashedPassword - Hashlenmiş şifre (salt:hash formatında)
   * @returns {Promise<boolean>} - Şifre eşleşiyor mu?
   */
  async verifyPassword(password, hashedPassword) {
    try {
      const [saltBase64, storedHashBase64] = hashedPassword.split(':');
      
      // Salt'ı decode et
      const salt = this.base64ToArrayBuffer(saltBase64);
      
      // Şifreyi encode et
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      
      // Salt + password birleştir
      const combined = new Uint8Array(salt.length + passwordData.length);
      combined.set(new Uint8Array(salt));
      combined.set(passwordData, salt.length);
      
      // SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      const hashArray = new Uint8Array(hashBuffer);
      const computedHashBase64 = this.arrayBufferToBase64(hashArray);
      
      // Hash'leri karşılaştır
      return computedHashBase64 === storedHashBase64;
    } catch (error) {
      console.error('Şifre doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * ArrayBuffer'ı base64'e çevir
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64'ü ArrayBuffer'a çevir
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // =====================================================
  // ADMİN ŞİFRE YÖNETİMİ
  // =====================================================

  /**
   * Admin şifresini getir (hashlenmiş)
   */
  async getAdminPassword() {
    try {
      const { data, error } = await this.supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'adminPassword')
        .single();
      
      if (error) {
        // Tablo yoksa veya kayıt yoksa varsayılan şifre hash'i oluştur
        if (error.code === 'PGRST116' || error.message.includes('no rows')) {
          const defaultHash = await this.hashPassword('orion2024');
          await this.setAdminPassword('orion2024'); // İlk kurulum
          return defaultHash;
        }
        throw error;
      }
      
      return (data && data.value) || null;
    } catch (error) {
      console.warn('Admin şifresi alınamadı:', error);
      return null;
    }
  }

  /**
   * Admin şifresini kaydet (hashleyerek)
   * @param {string} newPassword - Yeni şifre (plain text)
   */
  async setAdminPassword(newPassword) {
    try {
      // Şifreyi hashle
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Supabase'e kaydet
      const { error } = await this.supabase
        .from('admin_settings')
        .upsert({ 
          key: 'adminPassword', 
          value: hashedPassword 
        }, { onConflict: 'key' });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Admin şifresi kaydedilemedi:', error);
      return false;
    }
  }

  /**
   * Admin girişini doğrula
   * @param {string} password - Girilen şifre (plain text)
   * @returns {Promise<boolean>} - Giriş başarılı mı?
   */
  async verifyAdminLogin(password) {
    try {
      const hashedPassword = await this.getAdminPassword();
      
      if (!hashedPassword) {
        console.error('Admin şifresi bulunamadı');
        return false;
      }
      
      const isValid = await this.verifyPassword(password, hashedPassword);
      
      if (isValid) {
      } else {
      }
      
      return isValid;
    } catch (error) {
      console.error('Admin giriş doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * Acil durum şifre sıfırlama (sadece geliştirici için)
   * Bu fonksiyon browser console'dan çağrılabilir
   */
  async emergencyPasswordReset() {
    try {
      const confirmReset = confirm(
        '⚠️ ACİL DURUM ŞİFRE SIFIRLAMA\n\n' +
        'Bu işlem admin şifresini varsayılan değere sıfırlar.\n' +
        'Yeni şifre: orion2024\n\n' +
        'Devam etmek istediğinizden emin misiniz?'
      );
      
      if (!confirmReset) {
        return false;
      }
      
      // Varsayılan şifreyi ayarla
      const success = await this.setAdminPassword('orion2024');
      
      if (success) {
        
        alert(
          '✅ Şifre sıfırlama başarılı!\n\n' +
          '🔑 Yeni şifre: orion2024\n\n' +
          '⚠️ Güvenlik için hemen admin panelinden şifrenizi değiştirin!'
        );
        
        return true;
      } else {
        console.error('Şifre sıfırlama başarısız');
        alert('Şifre sıfırlama başarısız. Lütfen tekrar deneyin.');
        return false;
      }
    } catch (error) {
      console.error('Acil durum şifre sıfırlama hatası:', error);
      alert('Bir hata oluştu. Console\'u kontrol edin.');
      return false;
    }
  }

  /**
   * Şifre sıfırlama kodu oluştur ve konsola yazdır
   */
  generatePasswordResetCode() {
    const resetCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return resetCode;
  }

  // Site içeriklerini getir
  async getSiteContent() {
    try {
      const { data, error } = await this.supabase
        .from('site_content')
        .select('*');
      
      if (error) throw error;
      // Hiç kayıt yoksa null döndür
      if (!data || data.length === 0) {
        return null;
      }

      // Key-value formatına çevir
      const content = {};
      data.forEach(item => {
        content[item.key] = item.value;
      });
      
      return content;
    } catch (error) {
      console.error('Site içerikleri alınamadı:', error);
      return null;
    }
  }

  // Site içeriklerini kaydet
  async saveSiteContent(contentData) {
    try {
      // Mevcut içerikleri sil ve yenilerini ekle (upsert)
      const updates = Object.keys(contentData).map(key => ({
        key: key,
        value: contentData[key]
      }));

      const { error } = await this.supabase
        .from('site_content')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;
      
      // Turları ayrıca tours tablosuna da kaydet
      if (contentData.toursList) {
        await this.saveTours(contentData.toursList);
      }
      
      return true;
    } catch (error) {
      console.error('Site içerikleri kaydedilemedi:', error);
      return false;
    }
  }

  // Taşımacılık kurumlarını getir
  async getTransportOrgs() {
    try {
      const { data, error } = await this.supabase
        .from('transport_orgs')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Kurumlar alınamadı:', error);
      return [];
    }
  }

  // Taşımacılık kurumu kaydet
  async saveTransportOrg(orgData) {
    try {
      const { data, error } = await this.supabase
        .from('transport_orgs')
        .upsert(orgData, { onConflict: 'id' })
        .select();

      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Kurum kaydedilemedi:', error);
      return null;
    }
  }

  // Tüm taşımacılık kurumlarını akıllı senkronizasyon ile kaydet
  async saveTransportOrgs(orgsArray) {
    try {
      // Mevcut kurumları getir
      const existingOrgs = await this.getTransportOrgs();
      const existingOrgNames = existingOrgs.map(org => org.name);
      const newOrgNames = orgsArray.map(org => org.name);

      // Silinecek kurumları bul (mevcut olup yeni listede olmayan)
      const orgsToDelete = existingOrgs.filter(org => !newOrgNames.includes(org.name));
      
      // Silinecek kurumları sil
      if (orgsToDelete.length > 0) {
        for (const org of orgsToDelete) {
          const { error } = await this.supabase
            .from('transport_orgs')
            .delete()
            .eq('id', org.id);
          
          if (error) throw error;
        }
      }

      // Yeni/güncellenecek kurumları işle
      if (orgsArray && orgsArray.length > 0) {
        const results = [];
        
        for (const org of orgsArray) {
          const existingOrg = existingOrgs.find(existing => existing.name === org.name);
          
          const orgData = {
            name: org.name,
            type: org.type,
            logo_url: org.logo || null,
            contract_url: org.contractUrl || null,
            vita_web_url: org.vitaWebUrl || null,
            vita_app_url: org.vitaAppUrl || null,
            payment_url: org.paymentUrl || null,
            description: org.description || null
          };

          if (existingOrg) {
            // Güncelle
            const { data, error } = await this.supabase
              .from('transport_orgs')
              .update(orgData)
              .eq('id', existingOrg.id)
              .select();
            
            if (error) throw error;
            results.push(...data);
          } else {
            // Yeni ekle
            const { data, error } = await this.supabase
              .from('transport_orgs')
              .insert(orgData)
              .select();
            
            if (error) throw error;
            results.push(...data);
          }
        }
        
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('Taşımacılık kurumları senkronize edilemedi:', error);
      throw error;
    }
  }

  // Taşımacılık kurumu sil
  async deleteTransportOrg(orgId) {
    try {
      const { error } = await this.supabase
        .from('transport_orgs')
        .delete()
        .eq('id', orgId);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Kurum silinemedi:', error);
      return false;
    }
  }

  // Form alanlarını akıllı senkronizasyon ile kaydet
  async saveFormFields(fieldsArray) {
    try {
      // Mevcut form alanlarını getir
      const existingFields = await this.getFormFields();
      
      // Silinecek alanları bul (mevcut olup yeni listede olmayan)
      const fieldsToDelete = existingFields.filter(existing => 
        !fieldsArray.some(newField => newField.label === existing.label)
      );
      
      // Silinecek alanları sil
      if (fieldsToDelete.length > 0) {
        for (const field of fieldsToDelete) {
          const { error } = await this.supabase
            .from('form_fields')
            .delete()
            .eq('id', field.id);
          
          if (error) throw error;
        }
      }

      // Yeni/güncellenecek alanları işle
      if (fieldsArray && fieldsArray.length > 0) {
        const results = [];
        
        for (const field of fieldsArray) {
          const existingField = existingFields.find(existing => existing.label === field.label);
          
          const fieldData = {
            label: field.label,
            placeholder: field.placeholder,
            type: field.type,
            options: field.options || null,
            target: field.target,
            required: field.required || false,
            order_index: field.order_index || 0
          };

          if (existingField) {
            // Güncelle
            const { data, error } = await this.supabase
              .from('form_fields')
              .update(fieldData)
              .eq('id', existingField.id)
              .select();
            
            if (error) throw error;
            results.push(...data);
          } else {
            // Yeni ekle
            const { data, error } = await this.supabase
              .from('form_fields')
              .insert(fieldData)
              .select();
            
            if (error) throw error;
            results.push(...data);
          }
        }
        
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('Form alanları senkronize edilemedi:', error);
      throw error;
    }
  }

  // Form alanlarını getir
  async getFormFields() {
    try {
      const { data, error } = await this.supabase
        .from('form_fields')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Form alanları alınamadı:', error);
      return [];
    }
  }

  // Turları akıllı senkronizasyon ile kaydet
  async saveTours(toursListString) {
    try {
      if (!toursListString || toursListString.trim() === '') {
        // Tüm turları sil
        const { error } = await this.supabase
          .from('tours')
          .delete()
          .neq('id', 0); // Tüm kayıtları sil
        
        if (error) throw error;
        return [];
      }

      // String'i parse et
      const toursData = toursListString.split('\n').filter(line => line.trim()).map(line => {
        const [name, description, image, link] = line.split('|');
        return {
          name: name?.trim() || '',
          description: description?.trim() || '',
          image_url: image?.trim() || null,
          link: link?.trim() || ''
        };
      });

      // Mevcut turları getir
      const existingTours = await this.getTours();
      const existingTourLinks = existingTours.map(tour => tour.link);
      const newTourLinks = toursData.map(tour => tour.link);

      // Silinecek turları bul (mevcut olup yeni listede olmayan)
      const toursToDelete = existingTours.filter(tour => !newTourLinks.includes(tour.link));
      
      // Silinecek turları sil
      if (toursToDelete.length > 0) {
        for (const tour of toursToDelete) {
          const { error } = await this.supabase
            .from('tours')
            .delete()
            .eq('id', tour.id);
          
          if (error) throw error;
        }
      }

      // Yeni/güncellenecek turları işle - upsert kullanarak duplicate key hatasını önle
      if (toursData && toursData.length > 0) {
        const results = [];
        
        for (const tour of toursData) {
          const tourData = {
            name: tour.name,
            description: tour.description,
            image_url: tour.image_url,
            link: tour.link
          };

          // Upsert kullanarak duplicate key hatasını önle
          const { data, error } = await this.supabase
            .from('tours')
            .upsert(tourData, { 
              onConflict: 'link',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) throw error;
          results.push(...data);
        }
        
        return results;
      }
      
      return [];
    } catch (error) {
      console.error('Turlar senkronize edilemedi:', error);
      throw error;
    }
  }

  // Form alanı kaydet
  async saveFormField(fieldData) {
    try {
      const { data, error } = await this.supabase
        .from('form_fields')
        .upsert(fieldData, { onConflict: 'id' })
        .select();

      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Form alanı kaydedilemedi:', error);
      return null;
    }
  }

  // Form alanı sil
  async deleteFormField(fieldId) {
    try {
      const { error } = await this.supabase
        .from('form_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Form alanı silinemedi:', error);
      return false;
    }
  }

  // Form gönderisi kaydet
  async saveFormSubmission(formType, formData, userInfo = {}) {
    try {
      const submission = {
        form_type: formType,
        data_json: formData,
        ip_address: userInfo.ip || null,
        user_agent: navigator.userAgent
      };

      const { data, error } = await this.supabase
        .from('form_submissions')
        .insert(submission)
        .select();

      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Form gönderisi kaydedilemedi:', error);
      return null;
    }
  }

  // Form gönderilerini getir (Admin için)
  async getFormSubmissions(formType = null, limit = 100) {
    try {
      let query = this.supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (formType) {
        query = query.eq('form_type', formType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Form gönderileri alınamadı:', error);
      return [];
    }
  }

  // Turları getir
  async getTours() {
    try {
      const { data, error } = await this.supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Turlar alınamadı:', error);
      return [];
    }
  }

  // Tur kaydet
  async saveTour(tourData) {
    try {
      const { data, error } = await this.supabase
        .from('tours')
        .upsert(tourData, { onConflict: 'id' })
        .select();

      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Tur kaydedilemedi:', error);
      return null;
    }
  }

  // Dosya yükle (Supabase Storage)
  async uploadFile(file, category = 'general') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${category}/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('media')
        .upload(filePath, file);

      if (error) throw error;

      // Public URL al
      const { data: urlData } = this.supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Medya kaydını veritabanına ekle
      const mediaRecord = {
        filename: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category: category
      };

      await this.supabase
        .from('media_files')
        .insert(mediaRecord);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Dosya yüklenemedi:', error);
      return null;
    }
  }

  // Offline durumda bekleyen değişiklikleri senkronize et
  async syncPendingChanges() {
    // Offline senkronizasyon devre dışı (localStorage yok)
  }

  // Offline durumda değişiklikleri kaydet
  addPendingChange(type, data) {
    // Offline değişiklik kaydı devre dışı (localStorage yok)
  }

  // Bağlantı durumunu kontrol et
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('site_content')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Kurum açıklamalarını getir
  async getOrgDescriptions() {
    try {
      const { data, error } = await this.supabase
        .from('transport_orgs')
        .select('name, description')
        .not('description', 'is', null);
      
      if (error) throw error;
      
      // Object formatına çevir
      const descriptions = {};
      data.forEach(org => {
        if (org.description) {
          descriptions[org.name] = org.description;
        }
      });
      
      return descriptions;
    } catch (error) {
      console.error('Kurum açıklamaları alınamadı:', error);
      return {};
    }
  }

  /**
   * Kurum açıklamalarını kaydet
   * @param {Record<string,string>} descriptionsMap - { orgName: description }
   */
  async saveOrgDescriptions(descriptionsMap = {}) {
    try {
      const entries = Object.entries(descriptionsMap).filter(([name, desc]) => name && typeof desc === 'string');
      if (entries.length === 0) {
        return true;
      }

      // Her bir kurum için description alanını güncelle (isme göre)
      for (const [name, description] of entries) {
        const { error } = await this.supabase
          .from('transport_orgs')
          .update({ description })
          .eq('name', name);
        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Kurum açıklamaları kaydedilemedi:', error);
      return false;
    }
  }

  // Turları getir
  async getTours() {
    try {
      const { data, error } = await this.supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Turlar alınamadı:', error);
      return [];
    }
  }

  // Tur detaylarını getir
  async getTourDetails(tourLink) {
    try {
      const content = await this.getSiteContent();
      if (!content || !content.tourDetails) {
        return null;
      }

      // tourDetails string'i satırlara ayır ve her satırı JSON parse et
      const tourDetailsLines = content.tourDetails.split('\n').filter(line => line.trim());
      const tourDetailsArray = tourDetailsLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(item => item !== null);

      // İlgili turu bul
      const tourDetail = tourDetailsArray.find(detail => detail.link === tourLink);
      return tourDetail || null;
    } catch (error) {
      console.error('Tur detayları alınamadı:', error);
      return null;
    }
  }

  // Tüm tur detaylarını getir
  async getAllTourDetails() {
    try {
      const content = await this.getSiteContent();
      if (!content || !content.tourDetails) {
        return [];
      }

      // tourDetails string'i satırlara ayır ve her satırı JSON parse et
      const tourDetailsLines = content.tourDetails.split('\n').filter(line => line.trim());
      const tourDetailsArray = tourDetailsLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(item => item !== null);

      return tourDetailsArray;
    } catch (error) {
      console.error('Tur detayları alınamadı:', error);
      return [];
    }
  }

  // Logoları getir
  async getLogos() {
    try {
      const { data, error } = await this.supabase
        .from('logos')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Logolar alınamadı:', error);
      return [];
    }
  }

  // =====================================================
  // SUPABASE STORAGE METODLARI
  // =====================================================

  /**
   * Görsel yükle (retry mekanizmalı)
   * @param {File} file - Yüklenecek dosya
   * @param {string} bucket - Bucket adı (site-images, tour-images, transport-images)
   * @param {string} path - Dosya yolu (örn: logos/header.png)
   * @param {object} metadata - Opsiyonel metadata
   * @returns {Promise<string>} - Public URL
   */
  async uploadImage(file, bucket, path, metadata = {}) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        
        // Dosya uzantısını kontrol et
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Geçersiz dosya tipi. Sadece JPG, PNG, WebP ve GIF desteklenir.');
        }

        // Dosya boyutunu kontrol et (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error('Dosya boyutu çok büyük. Maksimum 5MB olmalıdır.');
        }

        // Mevcut dosyayı sil (varsa) - sadece ilk denemede
        if (attempt === 1) {
          await this.deleteImage(bucket, path);
        }

        // Yeni dosyayı yükle
        const { data, error } = await this.supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;

        // Public URL al
        const { data: urlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        const publicUrl = urlData.publicUrl;

        // Metadata kaydet (opsiyonel)
        if (metadata.imageType) {
          await this.saveImageMetadata({
            bucket_name: bucket,
            file_path: path,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            image_type: metadata.imageType,
            reference_id: metadata.referenceId || null
          });
        }

        return publicUrl; // Başarılı, döndür

      } catch (error) {
        lastError = error;
        
        // Ağ hatası mı kontrol et
        const isNetworkError = error.message.includes('Failed to fetch') || 
                               error.message.includes('NetworkError') ||
                               error.message.includes('ERR_');
        
        if (isNetworkError && attempt < maxRetries) {
          console.warn(`Ağ hatası, ${attempt + 1}. deneme yapılıyor... (${error.message})`);
          // 1 saniye bekle
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue; // Tekrar dene
        }
        
        // Diğer hatalar veya son deneme - hata fırlat
        console.error(`Görsel yükleme hatası (deneme ${attempt}/${maxRetries}):`, error);
        throw error;
      }
    }
    
    // Tüm denemeler başarısız
    throw lastError || new Error('Görsel yüklenemedi');
  }

  /**
   * Görsel sil
   * @param {string} bucket - Bucket adı
   * @param {string} path - Dosya yolu
   */
  async deleteImage(bucket, path) {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      // Dosya bulunamadı veya ağ hatası - sessizce devam et
      if (error) {
        if (error.message === 'Object not found') {
        } else {
          console.warn(`Silme hatası (devam ediliyor): ${error.message}`);
        }
        return; // Hata atmadan devam et
      }

      // Metadata'yı sil (opsiyonel)
      try {
        await this.supabase
          .from('image_metadata')
          .delete()
          .eq('bucket_name', bucket)
          .eq('file_path', path);
      } catch (metaError) {
        // Metadata silme hatası önemli değil
      }

    } catch (error) {
      // Kritik olmayan hata, devam et
      console.warn(`deleteImage silent fail: ${error.message}`);
    }
  }

  /**
   * Görsel URL'i al
   * @param {string} bucket - Bucket adı
   * @param {string} path - Dosya yolu
   * @returns {string} - Public URL
   */
  getImageUrl(bucket, path) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Bucket içindeki dosyaları listele
   * @param {string} bucket - Bucket adı
   * @param {string} folder - Klasör yolu (opsiyonel)
   */
  async listImages(bucket, folder = '') {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folder);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Görsel listesi alınamadı:', error);
      return [];
    }
  }

  /**
   * Görsel metadata'sını kaydet
   * @param {object} metadata - Metadata objesi
   */
  async saveImageMetadata(metadata) {
    try {
      const { error } = await this.supabase
        .from('image_metadata')
        .upsert(metadata, { onConflict: 'bucket_name,file_path' });

      if (error) throw error;
    } catch (error) {
      console.error('Metadata kaydedilemedi:', error);
    }
  }

  /**
   * Base64'ü File objesine çevir
   * @param {string} base64 - Base64 string
   * @param {string} filename - Dosya adı
   * @returns {File} - File objesi
   */
  base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Logo yükle (wrapper)
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   * @param {string} type - Logo tipi (header, content, about)
   */
  async uploadLogo(fileOrBase64, type) {
    try {
      let file = fileOrBase64;
      
      // Base64 ise File'a çevir
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, `${type}-logo.png`);
      }

      const path = `logos/${type}.png`;
      return await this.uploadImage(file, 'site-images', path, {
        imageType: 'logo',
        referenceId: null
      });
    } catch (error) {
      console.error(`Logo yükleme hatası (${type}):`, error);
      throw error;
    }
  }

  /**
   * Carousel görseli yükle
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   * @param {number} index - Carousel index (0, 1, 2)
   */
  async uploadCarouselImage(fileOrBase64, index) {
    try {
      let file = fileOrBase64;
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, `carousel-${index}.png`);
      }

      const path = `carousel/slide-${index}.png`;
      return await this.uploadImage(file, 'site-images', path, {
        imageType: 'carousel',
        referenceId: null
      });
    } catch (error) {
      console.error(`Carousel görsel yükleme hatası (${index}):`, error);
      throw error;
    }
  }

  /**
   * Hakkımızda görseli yükle
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   */
  async uploadAboutImage(fileOrBase64) {
    try {
      let file = fileOrBase64;
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, 'about.png');
      }

      const path = 'about/main.png';
      return await this.uploadImage(file, 'site-images', path, {
        imageType: 'about',
        referenceId: null
      });
    } catch (error) {
      console.error('Hakkımızda görsel yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Taşımacılık görseli yükle
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   * @param {string} serviceType - Servis tipi (studentService, staffService)
   */
  async uploadTransportImage(fileOrBase64, serviceType) {
    try {
      let file = fileOrBase64;
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, `${serviceType}.png`);
      }

      const path = `transport/${serviceType}.png`;
      return await this.uploadImage(file, 'site-images', path, {
        imageType: 'transport',
        referenceId: null
      });
    } catch (error) {
      console.error(`Taşımacılık görsel yükleme hatası (${serviceType}):`, error);
      throw error;
    }
  }

  /**
   * Tur görseli yükle
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   * @param {string} tourId - Tur ID'si
   * @param {string} imageType - Görsel tipi (main, detail-1, detail-2, vs)
   */
  async uploadTourImage(fileOrBase64, tourId, imageType = 'main') {
    try {
      let file = fileOrBase64;
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, `${tourId}-${imageType}.png`);
      }

      const path = `tours/${tourId}/${imageType}.png`;
      return await this.uploadImage(file, 'tour-images', path, {
        imageType: 'tour',
        referenceId: null  // Tour ID string olduğu için null gönder (UUID bekleniyor)
      });
    } catch (error) {
      console.error(`Tur görsel yükleme hatası (${tourId}):`, error);
      throw error;
    }
  }

  /**
   * Transport org logosu yükle
   * @param {File|string} fileOrBase64 - File objesi veya base64 string
   * @param {string} orgId - Kurum ID'si
   */
  async uploadTransportOrgLogo(fileOrBase64, orgId) {
    try {
      let file = fileOrBase64;
      
      if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        file = this.base64ToFile(fileOrBase64, `org-${orgId}.png`);
      }

      const path = `orgs/${orgId}.png`;
      return await this.uploadImage(file, 'transport-images', path, {
        imageType: 'transport-org',
        referenceId: null  // Org ID string olduğu için null gönder (UUID bekleniyor)
      });
    } catch (error) {
      console.error(`Kurum logo yükleme hatası (${orgId}):`, error);
      throw error;
    }
  }
  }

  // Global supabase instance
  window.supabase = supabase;

  // Global backend manager instance (singleton)
  if (!window.backendManager) {
    window.backendManager = new BackendManager();
  }

  // Sayfa yüklendiğinde bağlantıyı test et
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.backendManager) return;
    const isConnected = await window.backendManager.testConnection();
  });

})();
