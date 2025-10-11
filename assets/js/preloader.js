// Preloader System - Backend verilerini önceden yükle
// Bu dosya tüm sayfalarda backend verilerini yükleyip cache'ler

class PreloaderSystem {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.isInitialized = false;
    
    // Cache süresi (10 dakika - daha uzun cache)
    this.cacheTimeout = 10 * 60 * 1000;
    
    // Navigation preloading için
    this.isNavigating = false;
  }

  /**
   * Preloader'ı başlat
   */
  async initialize() {
    if (this.isInitialized) return;
    
    const startTime = Date.now();
    const maxLoadTime = 8000; // 8 saniye maksimum yükleme süresi
    
    try {
      
      // Backend manager'ın hazır olmasını bekle
      if (!window.backendManager) {
        await this.waitForBackendManager();
      }

      // Timeout ile temel verileri yükle
      const loadPromise = this.preloadEssentialData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Yükleme zaman aşımı')), maxLoadTime)
      );

      await Promise.race([loadPromise, timeoutPromise]);
      
      this.isInitialized = true;
      const loadTime = Date.now() - startTime;
      
      // Sayfa içeriğini göster
      this.showPageContent();
      
      // Arka planda diğer verileri yükle
      this.preloadSecondaryData();
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`Preloader başlatma hatası (${loadTime}ms):`, error);
      
      // Hata durumunda da sayfayı göster (maksimum 3 saniye bekle)
      if (loadTime < 3000) {
        setTimeout(() => this.showPageContent(), 3000 - loadTime);
      } else {
        this.showPageContent();
      }
    }
  }

  /**
   * Backend manager'ın yüklenmesini bekle
   */
  async waitForBackendManager(maxWait = 5000) {
    const startTime = Date.now();
    
    while (!window.backendManager && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!window.backendManager) {
      throw new Error('Backend manager yüklenemedi');
    }
  }

  /**
   * Temel verileri yükle (sayfa gösterilmeden önce)
   */
  async preloadEssentialData() {
    const essentialPromises = [
      this.loadSiteContent(),
      this.loadTransportOrgs()
      // Logos kaldırıldı - site görselleri olarak yönetiliyor
    ];

    // Tüm temel verileri paralel yükle - en az birinin başarılı olması yeterli
    const results = await Promise.allSettled(essentialPromises);
    
    // Başarılı yüklenen veri sayısını logla
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // En az bir veri yüklendiyse devam et
    if (successful === 0) {
      throw new Error('Hiçbir temel veri yüklenemedi');
    }
  }

  /**
   * İkincil verileri yükle (sayfa gösterildikten sonra arka planda)
   */
  async preloadSecondaryData() {
    try {
      // Arka planda diğer verileri yükle - daha agresif preloading
      const secondaryPromises = [
        this.loadTours(),
        this.loadFormFields(),
        this.loadTourDetails()
      ];

      const results = await Promise.allSettled(secondaryPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // Tüm veriler yüklendikten sonra diğer sayfalara hazır olduğunu bildir
      if (successful === 3) {
        
        // Custom event fırlat - diğer sayfalar dinleyebilir
        window.dispatchEvent(new CustomEvent('preloader-all-data-ready', {
          detail: { cacheSize: this.cache.size }
        }));
      }
    } catch (error) {
      console.warn('İkincil veri yükleme hatası:', error);
    }
  }

  /**
   * Site içeriklerini yükle
   */
  async loadSiteContent() {
    const cacheKey = 'siteContent';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this.fetchSiteContent();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const data = await promise;
      this.setCache(cacheKey, data);
      return data;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async fetchSiteContent() {
    try {
      const content = await window.backendManager.getSiteContent();
      return content;
    } catch (error) {
      console.warn('Site içerikleri yüklenemedi:', error);
      return null;
    }
  }

  /**
   * Taşımacılık kurumlarını yükle
   */
  async loadTransportOrgs() {
    const cacheKey = 'transportOrgs';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this.fetchTransportOrgs();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const data = await promise;
      this.setCache(cacheKey, data);
      return data;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async fetchTransportOrgs() {
    try {
      const orgs = await window.backendManager.getTransportOrgs();
      return orgs;
    } catch (error) {
      console.warn('Taşımacılık kurumları yüklenemedi:', error);
      return [];
    }
  }

  /**
   * Turları yükle
   */
  async loadTours() {
    const cacheKey = 'tours';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this.fetchTours();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const data = await promise;
      this.setCache(cacheKey, data);
      return data;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async fetchTours() {
    try {
      const tours = await window.backendManager.getTours();
      return tours;
    } catch (error) {
      console.warn('Turlar yüklenemedi:', error);
      return [];
    }
  }

  /**
   * Form alanlarını yükle
   */
  async loadFormFields() {
    const cacheKey = 'formFields';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this.fetchFormFields();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const data = await promise;
      this.setCache(cacheKey, data);
      return data;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async fetchFormFields() {
    try {
      const fields = await window.backendManager.getFormFields();
      return fields;
    } catch (error) {
      console.warn('Form alanları yüklenemedi:', error);
      return [];
    }
  }

  /**
   * Tur detaylarını yükle
   */
  async loadTourDetails() {
    const cacheKey = 'tourDetails';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this.fetchTourDetails();
    this.loadingPromises.set(cacheKey, promise);
    
    try {
      const data = await promise;
      this.setCache(cacheKey, data);
      return data;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async fetchTourDetails() {
    try {
      const tourDetails = await window.backendManager.getAllTourDetails();
      return tourDetails;
    } catch (error) {
      console.warn('Tur detayları yüklenemedi:', error);
      return [];
    }
  }

  /**
   * Cache'den veri al
   */
  async getCachedData(key) {
    if (this.isCacheValid(key)) {
      return this.cache.get(key).data;
    }

    // Cache yoksa yükle
    switch (key) {
      case 'siteContent':
        return await this.loadSiteContent();
      case 'transportOrgs':
        return await this.loadTransportOrgs();
      case 'tours':
        return await this.loadTours();
      case 'formFields':
        return await this.loadFormFields();
      case 'tourDetails':
        return await this.loadTourDetails();
      default:
        return null;
    }
  }

  /**
   * Cache'i kontrol et
   */
  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    
    const cached = this.cache.get(key);
    const now = Date.now();
    
    return (now - cached.timestamp) < this.cacheTimeout;
  }

  /**
   * Cache'e veri kaydet
   */
  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Cache'i temizle
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Sayfa içeriğini göster
   */
  showPageContent() {
    const loadingScreen = document.getElementById('loadingScreen');
    const pageContent = document.getElementById('pageContent');
    
    if (loadingScreen && pageContent) {
      // Loading screen'i gizle
      loadingScreen.classList.add('hidden');
      
      // Sayfa içeriğini göster
      pageContent.classList.add('loaded');
      
    }
  }

  /**
   * Veri yenileme (admin panelinden çağrılabilir)
   */
  async refreshData(keys = null) {
    const keysToRefresh = keys || ['siteContent', 'transportOrgs', 'tours', 'formFields', 'tourDetails'];
    
    
    // Cache'i temizle
    keysToRefresh.forEach(key => this.clearCache(key));
    
    // Verileri yeniden yükle
    const promises = keysToRefresh.map(key => this.getCachedData(key));
    await Promise.allSettled(promises);
    
  }

  /**
   * Navigation sırasında hızlı yükleme
   */
  async quickLoad() {
    if (!this.isInitialized) {
      // Eğer preloader henüz başlatılmamışsa hızlı başlat
      
      const quickPromises = [
        this.loadSiteContent(),
        this.loadTransportOrgs()
      ];
      
      await Promise.allSettled(quickPromises);
      this.showPageContent();
      
      // Arka planda tam yükleme yap
      this.initialize();
    } else {
      // Cache'den hızlı yükle
      this.showPageContent();
    }
  }

  /**
   * Sayfa geçişi öncesi preload
   */
  prepareForNavigation() {
    this.isNavigating = true;
    
    // Eğer cache eski ise yenile
    const oldestCache = Math.min(
      ...Array.from(this.cache.values()).map(item => item.timestamp)
    );
    
    const cacheAge = Date.now() - oldestCache;
    
    if (cacheAge > this.cacheTimeout / 2) { // Cache yarı ömrüne geldi
      this.refreshData(['siteContent', 'transportOrgs']);
    }
  }

  /**
   * Preloader durumunu kontrol et
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      loadingPromises: this.loadingPromises.size,
      cachedKeys: Array.from(this.cache.keys()),
      isNavigating: this.isNavigating,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Global preloader instance
window.preloader = new PreloaderSystem();

// Sayfa yüklendiğinde preloader'ı başlat
document.addEventListener('DOMContentLoaded', async () => {
  await window.preloader.initialize();
});

// Sayfa görünür olduğunda cache'i yenile (sayfa değişimlerinde)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.preloader.isInitialized) {
    // Sayfa tekrar görünür olduğunda eski cache'i kontrol et
    setTimeout(() => {
      window.preloader.refreshData();
    }, 1000);
  }
});

// Navigation preloading - link hover'da preload başlat
document.addEventListener('DOMContentLoaded', () => {
  // Tüm navigation linklerine hover listener ekle
  const navLinks = document.querySelectorAll('a[href$=".html"], .site-nav a, .footer-nav a');
  
  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      // Mouse hover'da navigation hazırlığı yap
      if (window.preloader && window.preloader.isInitialized) {
        window.preloader.prepareForNavigation();
      }
    });
    
    link.addEventListener('click', (e) => {
      // Link tıklandığında hızlı yükleme hazırlığı
      if (window.preloader) {
      }
    });
  });
});

// Performans monitoring
window.addEventListener('load', () => {
  if (window.preloader) {
    const status = window.preloader.getStatus();
    
    // Performance timing
    if (performance && performance.timing) {
      const timing = performance.timing;
      if (timing.loadEventEnd > 0 && timing.navigationStart > 0) {
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        if (loadTime > 0 && loadTime < 6000) { // Makul bir süre (6 saniye altı)
        }
      }
    }
  }
});
