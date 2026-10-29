/*
 * Supabase bağlantısı ve veri erişim katmanı.
 * Tüm sayfalarda (site + admin) ortak kullanılır: window.supabase, window.backendManager
 *
 * Not: Aşağıdaki anon key herkese açık bir anahtardır; güvenlik Supabase RLS
 * politikalarıyla sağlanır (bkz. supabase/migrations).
 */
(function () {
  'use strict';

  if (window.__SUPABASE_BOOTSTRAPPED__) return;
  window.__SUPABASE_BOOTSTRAPPED__ = true;

  var SUPABASE_URL = window.SUPABASE_URL || 'https://fxmmnddcchfhusbhxebp.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bW1uZGRjY2hmaHVzYmh4ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzU1MzgsImV4cCI6MjA4ODY1MTUzOH0.YYl8jCETqtY6D5Mgiw8STC8Vo9rb62YDlGbrot6Qzfc';
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('Supabase SDK yüklenemedi; site çevrimdışı modda.');
    return;
  }

  // Oturum sadece sekme açıkken tutulur (sessionStorage).
  var sessionStore = {
    getItem: function (key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    setItem: function (key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* yok say */ } },
    removeItem: function (key) { try { sessionStorage.removeItem(key); } catch (e) { /* yok say */ } }
  };

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: sessionStore, persistSession: true, autoRefreshToken: true }
  });

  var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  var MAX_IMAGE_BYTES = 12 * 1024 * 1024;
  var EDGE = window.OrionCommon.IMAGE_MAX_EDGE;

  function parseJsonLines(text) {
    return String(text || '')
      .split('\n')
      .filter(function (line) { return line.trim(); })
      .map(function (line) { try { return JSON.parse(line); } catch (e) { return null; } })
      .filter(Boolean);
  }

  function isNetworkError(error) {
    var msg = (error && error.message) || '';
    return msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('ERR_') !== -1;
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  class BackendManager {
    constructor() {
      this.supabase = client;
    }

    // ---------------------------------------------------------------
    // Auth
    // ---------------------------------------------------------------
    async signInWithEmail(email, password) {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Giriş hatası:', error.message);
        return null;
      }
      return data.user;
    }

    async signOut() {
      const { error } = await this.supabase.auth.signOut();
      if (error) console.error('Çıkış hatası:', error.message);
      return !error;
    }

    async getCurrentUser() {
      // getSession yerel oturuma bakar; oturum yoksa ağ isteği atmadan null döner.
      const { data: sessionData } = await this.supabase.auth.getSession();
      if (!sessionData || !sessionData.session) return null;
      const { data, error } = await this.supabase.auth.getUser();
      if (error) return null;
      return data.user;
    }

    async isAuthenticated() {
      return (await this.getCurrentUser()) !== null;
    }

    async updateAuthPassword(newPassword) {
      const { error } = await this.supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('Şifre güncelleme hatası:', error.message);
        return false;
      }
      return true;
    }

    // ---------------------------------------------------------------
    // site_content (anahtar/değer)
    // ---------------------------------------------------------------
    async getSiteContent() {
      try {
        const { data, error } = await this.supabase.from('site_content').select('*');
        if (error) throw error;
        if (!data || data.length === 0) return null;
        const content = {};
        data.forEach(function (row) { content[row.key] = row.value; });
        return content;
      } catch (error) {
        console.error('Site içerikleri alınamadı:', error);
        return null;
      }
    }

    async saveSiteContent(contentData) {
      try {
        const rows = Object.keys(contentData).map(function (key) { return { key: key, value: contentData[key] }; });
        const { error } = await this.supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        // Turlar ayrıca tours tablosunda da tutulur.
        if (Object.prototype.hasOwnProperty.call(contentData, 'toursList')) {
          await this.saveTours(contentData.toursList);
        }
        return true;
      } catch (error) {
        console.error('Site içerikleri kaydedilemedi:', error);
        return false;
      }
    }

    async getAllTourDetails() {
      const content = await this.getSiteContent();
      return content ? parseJsonLines(content.tourDetails) : [];
    }

    async getTourDetails(tourLink) {
      const details = await this.getAllTourDetails();
      return details.find(function (detail) { return detail.link === tourLink; }) || null;
    }

    // ---------------------------------------------------------------
    // transport_orgs
    // ---------------------------------------------------------------
    async getTransportOrgs() {
      try {
        const { data, error } = await this.supabase.from('transport_orgs').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Kurumlar alınamadı:', error);
        return [];
      }
    }

    /**
     * Admin panelindeki kurum listesini veritabanıyla eşitler:
     * listede olmayanları siler, olanları günceller, yenileri ekler.
     * Butonlar, açıklama metni ve yetkili kişiler `description` alanında JSON (v2) olarak saklanır.
     */
    async saveTransportOrgs(orgsArray) {
      const nextOrgs = Array.isArray(orgsArray)
        ? orgsArray.filter(function (org) { return org && String(org.name || '').trim(); })
        : [];

      const existingOrgs = await this.getTransportOrgs();
      const nextIds = new Set(nextOrgs.map(function (org) { return String(org.id || '').trim(); }).filter(Boolean));
      const nextNames = new Set(nextOrgs.map(function (org) { return String(org.name || '').trim(); }));

      const toDelete = existingOrgs.filter(function (org) {
        const id = String(org.id || '').trim();
        const name = String(org.name || '').trim();
        return !(id && nextIds.has(id)) && !nextNames.has(name);
      });
      for (const org of toDelete) {
        const { error } = await this.supabase.from('transport_orgs').delete().eq('id', org.id);
        if (error) throw error;
      }

      const results = [];
      for (const org of nextOrgs) {
        const orgId = String(org.id || '').trim();
        const orgName = String(org.name || '').trim();
        const existing = existingOrgs.find(function (e) { return String(e.id || '') === orgId; })
          || existingOrgs.find(function (e) { return e.name === orgName; });

        const row = {
          name: orgName,
          type: org.type,
          logo_url: org.logo || null,
          description: JSON.stringify({ v: 2, buttons: org.buttons || [], text: (org.text || '').trim(), contacts: org.contacts || [] })
        };

        const query = existing
          ? this.supabase.from('transport_orgs').update(row).eq('id', existing.id).select()
          : this.supabase.from('transport_orgs').insert(row).select();
        const { data, error } = await query;
        if (error) throw error;
        results.push.apply(results, data || []);
      }
      return results;
    }

    /** Kurum adı -> açıklama metni (v2 JSON'daki `text` ya da eski düz metin). */
    async getOrgDescriptions() {
      try {
        const { data, error } = await this.supabase.from('transport_orgs').select('name, description').not('description', 'is', null);
        if (error) throw error;
        const descriptions = {};
        (data || []).forEach(function (org) {
          const text = window.OrionCommon.parseOrgDescription(org.description).text;
          if (text) descriptions[org.name] = text;
        });
        return descriptions;
      } catch (error) {
        console.error('Kurum açıklamaları alınamadı:', error);
        return {};
      }
    }

    // ---------------------------------------------------------------
    // form_fields
    // ---------------------------------------------------------------
    async getFormFields() {
      try {
        const { data, error } = await this.supabase.from('form_fields').select('*').order('order_index', { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Form alanları alınamadı:', error);
        return [];
      }
    }

    /** Form alanlarını etikete göre eşitler (sil / güncelle / ekle). */
    async saveFormFields(fieldsArray) {
      const fields = Array.isArray(fieldsArray) ? fieldsArray : [];
      const existingFields = await this.getFormFields();

      const toDelete = existingFields.filter(function (existing) {
        return !fields.some(function (field) { return field.label === existing.label; });
      });
      for (const field of toDelete) {
        const { error } = await this.supabase.from('form_fields').delete().eq('id', field.id);
        if (error) throw error;
      }

      const results = [];
      for (const field of fields) {
        const existing = existingFields.find(function (e) { return e.label === field.label; });
        const row = {
          label: field.label,
          placeholder: field.placeholder,
          type: field.type,
          options: field.options || null,
          target: field.target,
          required: field.required || false,
          order_index: field.order_index || 0
        };
        const query = existing
          ? this.supabase.from('form_fields').update(row).eq('id', existing.id).select()
          : this.supabase.from('form_fields').insert(row).select();
        const { data, error } = await query;
        if (error) throw error;
        results.push.apply(results, data || []);
      }
      return results;
    }

    // ---------------------------------------------------------------
    // tours
    // ---------------------------------------------------------------
    async getTours() {
      try {
        const { data, error } = await this.supabase.from('tours').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Turlar alınamadı:', error);
        return [];
      }
    }

    /** "ad|açıklama|görsel|link" satırlarını tours tablosuyla eşitler (link'e göre). */
    async saveTours(toursListString) {
      if (!toursListString || toursListString.trim() === '') {
        const { error } = await this.supabase.from('tours').delete().neq('id', 0);
        if (error) throw error;
        return [];
      }

      const tours = window.OrionCommon.parsePipeLines(toursListString, ['name', 'description', 'image', 'link']).map(function (t) {
        return { name: t.name || '', description: t.description || '', image_url: t.image || null, link: t.link || '' };
      });

      const existingTours = await this.getTours();
      const nextLinks = tours.map(function (t) { return t.link; });
      for (const tour of existingTours.filter(function (t) { return nextLinks.indexOf(t.link) === -1; })) {
        const { error } = await this.supabase.from('tours').delete().eq('id', tour.id);
        if (error) throw error;
      }

      const results = [];
      for (const tour of tours) {
        const { data, error } = await this.supabase.from('tours').upsert(tour, { onConflict: 'link', ignoreDuplicates: false }).select();
        if (error) throw error;
        results.push.apply(results, data || []);
      }
      return results;
    }

    // ---------------------------------------------------------------
    // form_submissions
    // ---------------------------------------------------------------
    async saveFormSubmission(formType, formData) {
      try {
        const { data, error } = await this.supabase
          .from('form_submissions')
          .insert({ form_type: formType, data_json: formData, ip_address: null, user_agent: navigator.userAgent })
          .select();
        if (error) throw error;
        return data && data[0];
      } catch (error) {
        console.error('Form gönderisi kaydedilemedi:', error);
        return null;
      }
    }

    // ---------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------
    getImageUrl(bucket, path) {
      return this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }

    async listImages(bucket, folder) {
      try {
        const { data, error } = await this.supabase.storage.from(bucket).list(folder || '');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Görsel listesi alınamadı:', error);
        return [];
      }
    }

    async deleteImage(bucket, path) {
      try {
        const { error } = await this.supabase.storage.from(bucket).remove([path]);
        if (error) {
          if (error.message !== 'Object not found') console.warn('Silme hatası (devam ediliyor): ' + error.message);
          return;
        }
        await this.supabase.from('image_metadata').delete().eq('bucket_name', bucket).eq('file_path', path);
      } catch (error) {
        console.warn('Görsel silinemedi: ' + error.message);
      }
    }

    async saveImageMetadata(metadata) {
      const { error } = await this.supabase.from('image_metadata').upsert(metadata, { onConflict: 'bucket_name,file_path' });
      if (error) console.error('Metadata kaydedilemedi:', error);
    }

    /**
     * Görseli yükler (aynı yoldaki dosyanın üzerine yazar) ve public URL döndürür.
     * Ağ hatalarında 3 kez dener.
     */
    async uploadImage(file, bucket, path, metadata) {
      metadata = metadata || {};
      if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
        throw new Error('Geçersiz dosya tipi. Sadece JPG, PNG, WebP ve GIF desteklenir.');
      }
      // Görseli kullanılacağı boyuta küçült (telefon fotoğrafları 5-12 MB geliyor)
      file = await window.OrionCommon.compressImage(file, metadata.maxEdge || window.OrionCommon.maxEdgeForPath(path), file.name);
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Dosya boyutu çok büyük. Maksimum 12MB olmalıdır.');
      }

      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { error } = await this.supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: true });
          if (error) throw error;

          if (metadata.imageType) {
            await this.saveImageMetadata({
              bucket_name: bucket,
              file_path: path,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              image_type: metadata.imageType,
              reference_id: null
            });
          }
          return this.getImageUrl(bucket, path);
        } catch (error) {
          if (isNetworkError(error) && attempt < maxRetries) {
            console.warn('Ağ hatası, ' + (attempt + 1) + '. deneme yapılıyor... (' + error.message + ')');
            await sleep(1000);
            continue;
          }
          console.error('Görsel yükleme hatası (deneme ' + attempt + '/' + maxRetries + '):', error);
          throw error;
        }
      }
      throw new Error('Görsel yüklenemedi');
    }

    base64ToFile(base64, filename) {
      const parts = base64.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new File([bytes], filename, { type: mime });
    }

    toFile(fileOrDataUrl, filename) {
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        return this.base64ToFile(fileOrDataUrl, filename);
      }
      return fileOrDataUrl;
    }

    /** Storage yolu için güvenli parça (tur linki vb.). Mevcut dosya yollarıyla uyumlu kalmalı. */
    normalizePathSegment(rawValue) {
      return window.OrionCommon.normalizeTourId(rawValue);
    }

    uploadLogo(fileOrDataUrl, type) {
      return this.uploadImage(this.toFile(fileOrDataUrl, type + '-logo.png'), 'site-images', 'logos/' + type + '.png', { imageType: 'logo', maxEdge: EDGE.logo });
    }

    uploadCarouselImage(fileOrDataUrl, index) {
      return this.uploadImage(this.toFile(fileOrDataUrl, 'carousel-' + index + '.png'), 'site-images', 'carousel/slide-' + index + '.png', { imageType: 'carousel', maxEdge: EDGE.carousel });
    }

    uploadAboutImage(fileOrDataUrl) {
      return this.uploadImage(this.toFile(fileOrDataUrl, 'about.png'), 'site-images', 'about/main.png', { imageType: 'about', maxEdge: EDGE.about });
    }

    uploadTransportImage(fileOrDataUrl, serviceType) {
      return this.uploadImage(this.toFile(fileOrDataUrl, serviceType + '.png'), 'site-images', 'transport/' + serviceType + '.png', { imageType: 'transport', maxEdge: EDGE.transport });
    }

    uploadTourImage(fileOrDataUrl, tourId, imageType) {
      imageType = imageType || 'main';
      const safeTourId = this.normalizePathSegment(tourId);
      if (!safeTourId) {
        return Promise.reject(new Error('Geçersiz tur linki. Lütfen sadece harf, sayı ve tire içeren bir link girin.'));
      }
      const safeImageType = this.normalizePathSegment(imageType) || 'main';
      const file = this.toFile(fileOrDataUrl, tourId + '-' + imageType + '.png');
      return this.uploadImage(file, 'tour-images', 'tours/' + safeTourId + '/' + safeImageType + '.png', {
        imageType: 'tour', maxEdge: safeImageType === 'main' ? EDGE.tourMain : EDGE.tourDetail
      });
    }

    uploadTransportOrgLogo(fileOrDataUrl, orgId) {
      return this.uploadImage(this.toFile(fileOrDataUrl, 'org-' + orgId + '.png'), 'transport-images', 'orgs/' + orgId + '.png', { imageType: 'transport-org', maxEdge: EDGE.orgLogo });
    }

    /** Dosyayı verilen yola yükler (popup ve yetkili kişi fotoğrafları); maxEdge verilirse önce küçültür. */
    async uploadRawFile(bucket, path, file, upsert, maxEdge) {
      if (maxEdge) file = await window.OrionCommon.compressImage(file, maxEdge, file.name);
      const { error } = await this.supabase.storage.from(bucket).upload(path, file, upsert ? { upsert: true } : undefined);
      if (error) throw error;
      return this.getImageUrl(bucket, path);
    }

  }

  window.supabase = client;
  if (!window.backendManager) window.backendManager = new BackendManager();
})();
