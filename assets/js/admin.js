// Admin Panel JavaScript
(function(){
  try {
    var ls = window.localStorage;
    ['getItem','setItem','removeItem','clear'].forEach(function(k){
      if (ls && typeof ls[k] === 'function') {
        ls[k] = function(){ throw new Error('Local storage disabled'); };
      }
    });
    window.__LOCAL_STORAGE_DISABLED__ = true;
  } catch(e){ console.warn('LocalStorage disable failed', e); }
})();
// Ekran boyutuna göre kaç öğenin sığacağını hesapla (global fonksiyon)
function calculateVisibleItems() {
  const container = document.querySelector('.logo-grid');
  if (!container) return 4; // Varsayılan değer
  
  const containerWidth = container.offsetWidth;
  const gap = 16; // CSS'teki gap değeri
  
  // Responsive breakpoint'lere göre min-width değerleri
  let minItemWidth;
  if (containerWidth >= 1200) {
    minItemWidth = 200;
  } else if (containerWidth >= 769) {
    minItemWidth = 180;
  } else if (containerWidth >= 481) {
    minItemWidth = 150;
  } else {
    minItemWidth = 120;
  }
  
  // Kaç öğenin sığacağını hesapla
  const visibleItems = Math.floor((containerWidth + gap) / (minItemWidth + gap));
  return Math.max(1, visibleItems); // En az 1 öğe
}

class AdminPanel {
  constructor() {
    // Şifre backend'den yüklenecek; varsayılan başlangıç değeri
    this.adminPassword = "orion2024";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedContent();
    // Session kontrolü yap
    this.checkAuth();
    // Popup ayarlarını yükle
    loadPopupSettings();
  }


  bindEvents() {
    // Giriş formu (sadece admin.html'de var)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Kategori butonları
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.getAttribute('data-category');
        this.switchCategory(category);
      });
    });

    // Çıkış butonu
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Kaydet butonu
    const saveBtn = document.getElementById('saveChanges');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveChanges();
      });
    } else {
      console.error('saveChanges butonu bulunamadı!');
    }



    // Şifre değiştirme (admin.html only)
    const changePasswordBtn = document.getElementById('changePassword');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => {
        this.changePassword();
      });
    }

    // Şifre göster/gizle (admin.html only)
    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener('click', () => {
        this.togglePasswordDisplay();
      });
    }

    // Header logo yükleme (admin.html only)
    const headerLogoUpload = document.getElementById('headerLogoUpload');
    if (headerLogoUpload) {
      headerLogoUpload.addEventListener('change', (e) => {
        this.handleLogoUpload(e, 'header');
      });
    }

    // Header logo sıfırlama (admin.html only)
    const resetHeaderLogo = document.getElementById('resetHeaderLogo');
    if (resetHeaderLogo) {
      resetHeaderLogo.addEventListener('click', () => {
        this.resetLogo('header');
      });
    }

    // Content logo yükleme (admin.html only)
    const contentLogoUpload = document.getElementById('contentLogoUpload');
    if (contentLogoUpload) {
      contentLogoUpload.addEventListener('change', (e) => {
        this.handleLogoUpload(e, 'content');
      });
    }

    // Content logo sıfırlama (admin.html only)
    const resetContentLogo = document.getElementById('resetContentLogo');
    if (resetContentLogo) {
      resetContentLogo.addEventListener('click', () => {
        this.resetLogo('content');
      });
    }

    // Carousel görselleri - event delegation (dinamik eklenen öğeler için)
    const carouselContainer = document.getElementById('carouselImages');
    if (carouselContainer) {
      carouselContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('carousel-upload')) {
          this.handleCarouselUpload(e);
        }
      });
    }

    // Hakkımızda görseli (admin.html only)
    const aboutImageUpload = document.getElementById('aboutImageUpload');
    if (aboutImageUpload) {
      aboutImageUpload.addEventListener('change', (e) => {
        this.handleAboutImageUpload(e);
      });
    }

    // Taşımacılık görselleri (admin.html only)
    const studentServiceImageUpload = document.getElementById('studentServiceImageUpload');
    if (studentServiceImageUpload) {
      studentServiceImageUpload.addEventListener('change', (e) => {
        this.handleTransportImageUpload(e, 'studentService');
      });
    }

    const staffServiceImageUpload = document.getElementById('staffServiceImageUpload');
    if (staffServiceImageUpload) {
      staffServiceImageUpload.addEventListener('change', (e) => {
        this.handleTransportImageUpload(e, 'staffService');
      });
    }

    // Veri import/export (admin.html only)
    const exportDataBtn = document.getElementById('exportData');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        this.exportAllData();
      });
    }

    const importDataInput = document.getElementById('importData');
    if (importDataInput) {
      importDataInput.addEventListener('change', (e) => {
        this.importAllData(e);
      });
    }



    // Manuel kaydetme için event listener'lar kaldırıldı
    // Sadece "Değişiklikleri Kaydet" butonu kullanılacak
  }

  async handleLogin() {
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    
    if (!passwordInput || !loginError || !loginSection || !adminPanel) {
      console.error('Login elementleri bulunamadı');
      return;
    }

    const email = emailInput?.value || 'admin@orion.com';
    const password = passwordInput.value;

    try {
      // Supabase Auth ile giriş yap
      const user = await window.backendManager.signInWithEmail(email, password);
      
      if (user) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
        loginError.style.display = 'none';
        
      } else {
        loginError.style.display = 'block';
        loginError.textContent = 'Yanlış email veya şifre!';
        passwordInput.value = '';
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      loginError.textContent = 'Giriş sırasında bir hata oluştu!';
      loginError.style.display = 'block';
    }
  }

  async logout() {
    await window.backendManager.signOut();
    
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    const passwordInput = document.getElementById('adminPassword');
    
    if (loginSection) loginSection.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
    
  }

  // Session kontrolü yap (sadece admin.html'de)
  async checkAuth() {
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    
    // Admin.html sayfasında değilsek çık
    if (!loginSection || !adminPanel) {
      return;
    }
    
    const isAuth = await window.backendManager.isAuthenticated();
    
    if (isAuth) {
      // Kullanıcı giriş yapmış, paneli göster
      loginSection.style.display = 'none';
      adminPanel.style.display = 'block';
    } else {
      // Kullanıcı giriş yapmamış, login göster
      loginSection.style.display = 'flex';
      adminPanel.style.display = 'none';
    }
  }

  async changePassword() {
    const newPasswordInput = document.getElementById('newPassword');
    const newPassword = newPasswordInput.value.trim();
    
    
    if (!newPassword) {
      alert('Lütfen yeni şifre girin!');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır!');
      return;
    }
    
    // Backend'e hashlenmiş olarak kaydet
    if (window.backendManager) {
      try {
        const ok = await window.backendManager.setAdminPassword(newPassword);
        
        if (!ok) throw new Error('Backend kaydı başarısız');
        
        newPasswordInput.value = '';
        this.showSuccessMessage();
        alert('Şifre başarıyla değiştirildi! (Hashlenmiş olarak güvenli şekilde saklandı)');
      } catch (err) {
        console.error('Şifre değiştirilemedi:', err);
        alert('Şifre değiştirilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } else {
      alert('Backend bulunamadı. Şifre kaydedilemedi.');
    }
  }

  togglePasswordDisplay() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordDisplay = document.getElementById('currentPasswordDisplay');
    
    // Hashlenmiş şifreler gösterilemez
    passwordDisplay.textContent = '🔒 Hashlenmiş (Güvenli)';
    toggleBtn.disabled = true;
    toggleBtn.textContent = '🔐 Şifre Hashlenmiş';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
  }

  updateCurrentPasswordDisplay() {
    const passwordDisplay = document.getElementById('currentPasswordDisplay');
    if (passwordDisplay) {
      // Hashlenmiş şifreler gösterilemez
      passwordDisplay.textContent = '🔒 Hashlenmiş (Güvenli)';
    }
  }

  async loadAdminPassword() {
    try {
      if (window.backendManager) {
        // Şifrenin varlığını kontrol et (hash gösterilmez)
        const hashedPwd = await window.backendManager.getAdminPassword();
        
        if (hashedPwd) {
        } else {
        }
        
        this.updateCurrentPasswordDisplay();
      }
    } catch (e) {
      console.warn('Admin şifresi yüklenemedi:', e);
    }
  }

  async handleLogoUpload(event, type = 'header') {
    const file = event.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const logoData = e.target.result;
        const imageId = type === 'header' ? 'currentHeaderLogo' : 'currentContentLogo';
        const imageElement = document.getElementById(imageId);
        
        
        if (imageElement) {
          // Önce önizlemeyi göster
          imageElement.src = logoData;
          
          // Backend'e yükle
          try {
            const publicUrl = await window.backendManager.uploadLogo(logoData, type);
            // Cache-busting ile görseli güncelle
            imageElement.src = `${publicUrl}?v=${Date.now()}`;
            this.showSuccessMessage();
          } catch (error) {
            console.error('Logo yükleme hatası:', error);
            alert('Logo yüklenirken hata oluştu: ' + error.message);
          }
        } else {
          console.error('Logo elementi bulunamadı:', imageId);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  resetLogo(type = 'header') {
    const defaultLogo = '';
    const imageId = type === 'header' ? 'currentHeaderLogo' : 'currentContentLogo';
    document.getElementById(imageId).src = defaultLogo;
    // Sadece önizleme sıfırlanıyor; backend'e kaydetmek için "Kaydet" butonuna basılmalı
    this.showSuccessMessage();
  }

  async handleCarouselUpload(event) {
    const file = event.target.files[0];
    const index = event.target.getAttribute('data-index');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;
        
        // Admin paneldeki önizlemeyi güncelle
        const carouselItem = document.querySelector(`[data-index="${index}"] img`);
        if (carouselItem) carouselItem.src = imageData;
        
        // Backend'e yükle
        try {
          const publicUrl = await window.backendManager.uploadCarouselImage(imageData, parseInt(index));
          if (carouselItem) carouselItem.src = `${publicUrl}?v=${Date.now()}`;
          this.showSuccessMessage();
        } catch (error) {
          console.error(`Carousel görsel yükleme hatası (${index}):`, error);
          alert('Carousel görseli yüklenirken hata oluştu: ' + error.message);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  createCarouselImageItem(index, imgSrc = '') {
    const div = document.createElement('div');
    div.className = 'carousel-image-item';
    div.setAttribute('data-index', index);
    div.innerHTML = `
      <img src="${imgSrc || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22%3E%3Crect fill=%22%23eee%22 width=%22120%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 font-size=%2212%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${index + 1}. Görsel%3C/text%3E%3C/svg%3E'}" style="width: 120px; height: 80px; object-fit: cover; border-radius: 6px;" />
      <div class="file-upload" style="margin-top: 8px;">
        <input type="file" class="carousel-upload" data-index="${index}" accept="image/*" />
        📁 Değiştir
      </div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top: 4px; font-size: 11px;" onclick="window.adminPanel && window.adminPanel.removeCarouselImage(this)">🗑️ Sil</button>
    `;
    return div;
  }

  addCarouselImage() {
    const container = document.getElementById('carouselImages');
    if (!container) return;
    const items = container.querySelectorAll('.carousel-image-item');
    const indices = Array.from(items).map(el => parseInt(el.getAttribute('data-index')) || 0);
    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    container.appendChild(this.createCarouselImageItem(nextIndex));
  }

  removeCarouselImage(button) {
    const container = document.getElementById('carouselImages');
    if (!container) return;
    const item = button.closest('.carousel-image-item');
    if (!item || container.children.length <= 1) return;

    // Storage'dan da sil
    const img = item.querySelector('img');
    if (img && img.src && !img.src.startsWith('data:') && window.backendManager) {
      const src = img.src.split('?')[0];
      const match = src.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) window.backendManager.deleteImage(match[1], match[2]).catch(() => {});
    }

    item.remove();

    // site_content'teki carouselImages listesini hemen güncelle (kaydet butonunu bekleme)
    if (window.backendManager) {
      const urls = this.getCarouselImagesData();
      window.backendManager.saveSiteContent({ carouselImages: JSON.stringify(urls) }).catch(() => {});
    }
  }

  getCarouselImagesData() {
    const container = document.getElementById('carouselImages');
    if (!container) return [];
    const urls = [];
    container.querySelectorAll('.carousel-image-item img').forEach(img => {
      const src = (img.src || '').trim();
      if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.includes('unsplash.com')) return;
      // Query parametrelerini kaldır (cache-busting vb.) - temiz URL kaydet
      const baseUrl = src.split('?')[0];
      if (baseUrl) urls.push(baseUrl);
    });
    return urls;
  }

  async handleAboutImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;
        const aboutImage = document.getElementById('aboutImage');
        aboutImage.src = imageData;
        
        // Backend'e yükle
        try {
          const publicUrl = await window.backendManager.uploadAboutImage(imageData);
          // Cache-busting ile görseli güncelle
          aboutImage.src = `${publicUrl}?v=${Date.now()}`;
          this.showSuccessMessage();
        } catch (error) {
          console.error('Hakkımızda görsel yükleme hatası:', error);
          alert('Hakkımızda görseli yüklenirken hata oluştu: ' + error.message);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async handleTransportImageUpload(event, imageType) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;
        
        // Admin paneldeki önizlemeyi güncelle
        const previewImage = document.getElementById(imageType + 'Image');
        if (previewImage) {
          previewImage.src = imageData;
        }
        
        // Backend'e yükle
        try {
          const publicUrl = await window.backendManager.uploadTransportImage(imageData, imageType);
          if (previewImage) {
            // Cache-busting ile görseli güncelle
            previewImage.src = `${publicUrl}?v=${Date.now()}`;
          }
          this.showSuccessMessage();
        } catch (error) {
          console.error(`Taşımacılık görsel yükleme hatası (${imageType}):`, error);
          alert('Taşımacılık görseli yüklenirken hata oluştu: ' + error.message);
        }
      };
      reader.readAsDataURL(file);
    }
  }



  async saveChanges() {
    try {
      // Kurum açıklamalarını kaydetmeden önce kurum listesi ile eşitle
      if (typeof window.syncOrgDescriptions === 'function') {
        window.syncOrgDescriptions({ silent: true });
      }

      // Form alanlarını kontrol et
      const siteTitle = document.getElementById('siteTitle');
      
      // Dinamik verileri al
      let institutionsData = '';
      let partnersData = '';
      let toursData = '';
      let formFieldsData = '';
      
      let serviceOrgsData = '';
      
      try {
        serviceOrgsData = this.getServiceOrgsData();
      } catch (error) {
        console.error('Hizmet verdiğimiz kurumlar alınırken hata:', error);
      }
      
      try {
        institutionsData = this.getInstitutionsData();
      } catch (error) {
        console.error('Yetkili kurumlar alınırken hata:', error);
      }
      
      try {
        partnersData = this.getPartnersData();
      } catch (error) {
        console.error('Partnerler alınırken hata:', error);
      }
      
      try {
        toursData = this.getToursData();
      } catch (error) {
        console.error('Turlar alınırken hata:', error);
      }
      
      try {
        formFieldsData = this.getFormFieldsData();
      } catch (error) {
        console.error('Form alanları alınırken hata:', error);
      }

      // Form alanlarını güvenli şekilde al
      const getFieldValue = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Form alanı bulunamadı: ${id}`);
          return defaultValue;
        }
        return element.value || defaultValue;
      };

      const contentData = {
        siteTitle: getFieldValue('siteTitle'),
        readyRoutesTitle: getFieldValue('readyRoutesTitle'),
        readyRoutesDesc: getFieldValue('readyRoutesDesc'),
        customRouteTitle: getFieldValue('customRouteTitle'),
        customRouteDesc: getFieldValue('customRouteDesc'),
        aboutText: getFieldValue('aboutText'),
        contactDescription: getFieldValue('contactDescription'),
        phoneNumber: getFieldValue('phoneNumber'),
        emailAddress: getFieldValue('emailAddress'),
        address: getFieldValue('address'),
        instagramLink: getFieldValue('instagramLink'),
        transportServicesList: JSON.stringify(this.getTransportServicesData()),
        serviceOrganizations: serviceOrgsData,
        authorizedInstitutions: institutionsData,
        partnerList: partnersData,
        toursList: toursData,
        tourDetails: this.getTourDetailsData(),
        formFields: formFieldsData,
        carouselImages: JSON.stringify(this.getCarouselImagesData())
      };

      
      // Ana siteye değişiklikleri uygula
      this.applyChangesToSite();
      let saveError = null;

      // Backend'e kaydet (eğer varsa)
      if (window.backendManager) {
        try {
          const siteSaved = await window.backendManager.saveSiteContent(contentData);
          if (!siteSaved) {
            throw new Error('Site içerikleri kaydedilemedi');
          }
          await this.verifySiteContentSaved(contentData);
          
          // Taşımacılık kurumlarını ve kurum açıklamalarını birlikte kaydet
          // (açıklamalar artık syncTransportOrgs içinde description alanına gömülüyor)
          if (typeof saveCurrentOrgDescription === 'function') {
            saveCurrentOrgDescription();
          }
          await this.syncTransportOrgs();
          
          // Form alanlarını da kaydet
          await this.syncFormFields();
          
        } catch (error) {
          console.warn('Backend kaydetme hatası:', error);
          saveError = error;
        }
      }

      // Popup ayarlarını da ana kaydetme akışına dahil et (backendManager olmasa da)
      if (typeof window.savePopupSettings === 'function') {
        try {
          await window.savePopupSettings({ silent: true, throwOnError: true });
        } catch (popupError) {
          console.warn('Popup kaydetme hatası:', popupError);
          saveError = saveError || popupError;
        }
      }

      if (saveError) {
        throw saveError;
      }

      this.showSuccessMessage();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme sırasında bir hata oluştu: ' + error.message);
    }
  }

  offerDataDownload(contentData) {
    // Backend'den veri indirme özelliği devre dışı (localStorage yok)
    alert('Veri indirme özelliği şu anda backend entegrasyonu için yeniden yapılandırılıyor.');
    console.warn('offerDataDownload: localStorage kullanımı kaldırıldı, backend export eklenecek');
  }

  exportAllData() {
    // Backend'den veri export özelliği gelecekte eklenecek
    alert('Veri dışa aktarma özelliği şu anda backend entegrasyonu için yeniden yapılandırılıyor.');
    console.warn('exportAllData: localStorage kullanımı kaldırıldı, backend export eklenecek');
  }

  importAllData(event) {
    // Backend'e veri import özelliği gelecekte eklenecek
    alert('Veri içe aktarma özelliği şu anda backend entegrasyonu için yeniden yapılandırılıyor.');
    console.warn('importAllData: localStorage kullanımı kaldırıldı, backend import eklenecek');
  }


  setupDynamicListListeners() {
    // Dinamik listelerdeki değişiklikleri dinle
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea, select') : [];
            }
          });
        }
      });
    });

    // Dinamik listeleri gözlemle
    const dynamicLists = document.querySelectorAll('#institutionsList, #partnersList, #toursList, #formFieldsList');
    dynamicLists.forEach(list => {
      observer.observe(list, {
        childList: true,
        subtree: true
      });
    });
  }

  async loadSavedContent() {
    // Sadece backend'den veri çek
    if (window.backendManager) {
      try {
        const backendContent = await window.backendManager.getSiteContent();
        
        if (backendContent) {
          
          // Form alanlarını doldur
          Object.keys(backendContent).forEach(key => {
            const element = document.getElementById(key);
            if (element && typeof backendContent[key] === 'string') {
              element.value = backendContent[key];
            }
          });

          // Taşımacılık kurumlarını backend'den yükle
          try {
            const transportOrgs = await window.backendManager.getTransportOrgs();
            if (transportOrgs && transportOrgs.length > 0) {
              this.loadTransportOrgs(transportOrgs);
            }
          } catch (error) {
            console.warn('Taşımacılık kurumları yüklenemedi:', error);
          }

          // Form alanlarını backend'den yükle
          try {
            const formFields = await window.backendManager.getFormFields();
            if (formFields && formFields.length > 0) {
              this.loadFormFields(formFields);
            }
          } catch (error) {
            console.warn('Form alanları yüklenemedi:', error);
          }

          // Kurum açıklamalarını backend'den yükle
          try {
            const orgDescriptions = await window.backendManager.getOrgDescriptions();
            if (orgDescriptions && Object.keys(orgDescriptions).length > 0) {
              this.loadOrgDescriptions(orgDescriptions);
            }
          } catch (error) {
            console.warn('Kurum açıklamaları yüklenemedi:', error);
          }

          // Yetkili kurumları backend'den yükle
          if (backendContent.authorizedInstitutions) {
            this.loadInstitutions(backendContent.authorizedInstitutions);
          }

          // Partnerleri backend'den yükle
          if (backendContent.partnerList) {
            this.loadPartners(backendContent.partnerList);
          }

          // Hizmet verdiğimiz kurumları backend'den yükle
          if (backendContent.serviceOrganizations) {
            this.loadServiceOrgs(backendContent.serviceOrganizations);
          }

          // Taşımacılık hizmetlerini backend'den yükle
          if (backendContent.transportServicesList) {
            try {
              const services = JSON.parse(backendContent.transportServicesList);
              if (Array.isArray(services)) {
                this.loadTransportServices(services);
              } else {
                if (typeof window._addDefaultTransportServicesIfEmpty === 'function') window._addDefaultTransportServicesIfEmpty();
              }
            } catch(e) {
              console.warn('Taşımacılık hizmetleri parse edilemedi:', e);
              if (typeof window._addDefaultTransportServicesIfEmpty === 'function') window._addDefaultTransportServicesIfEmpty();
            }
          } else {
            // Backend'de kayıt yoksa varsayılanları ekle
            if (typeof window._addDefaultTransportServicesIfEmpty === 'function') window._addDefaultTransportServicesIfEmpty();
          }

          // Tur verilerini backend'den yükle
          try {
            const tours = await window.backendManager.getTours();
            if (tours && tours.length > 0) {
              this.loadTours(tours);
            }
          } catch (error) {
            console.warn('Turlar yüklenemedi (tablo eksik olabilir):', error);
          }

          // Tur detaylarını backend'den yükle
          try {
            await this.loadTourDetailsData();
          } catch (error) {
            console.warn('Tur detayları yüklenemedi:', error);
          }

          // Logo ve görselleri Supabase Storage'dan yükle
          try {
            await this.loadImagesFromStorage();
          } catch (error) {
            console.warn('Logo ve görseller yüklenemedi:', error);
          }
          
          return; // Backend'den yüklendi
        }
      } catch (error) {
        console.error('Backend\'den veri yüklenemedi:', error);
      }
    }

    // Backend başarısızsa hata göster
    console.warn('Veri yüklenemedi ve localStorage kapalı olduğu için içerik doldurulmadı.');

    // Mevcut şifre yazısını güncelle
    this.updateCurrentPasswordDisplay();

    // Oturum kontrolü
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
    }
  }

  applyChangesToSite() {
    // Ana siteye değişiklikleri uygula
    if (typeof ContentUpdater !== 'undefined') {
      ContentUpdater.updateSiteContent();
    } else {
    }
  }

  showSuccessMessage() {
    const message = document.getElementById('successMessage');
    if (message) {
      message.style.display = 'block';
      message.style.background = '#d4edda';
      message.style.color = '#155724';
      message.style.border = '1px solid #c3e6cb';
      message.style.padding = '12px 16px';
      message.style.borderRadius = '8px';
      message.style.marginBottom = '20px';
      message.style.fontWeight = '600';
      message.textContent = 'Değişiklikler başarıyla kaydedildi! ✅';
      
      // Sayfayı en üste kaydır
      message.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      setTimeout(() => {
        message.style.display = 'none';
      }, 5000);
    } else {
      console.warn('successMessage elementi bulunamadı');
    }
  }

  cleanStoredImageUrl(url = '') {
    const value = String(url || '').trim();
    if (!value || value.startsWith('data:image/svg')) return '';
    return value.replace(/[?&]v=\d+$/, '').split('?v=')[0];
  }

  parseTransportOrgDescription(description = '') {
    const empty = { buttons: [], text: '', contacts: [] };
    const trimmed = String(description || '').trim();
    if (!trimmed) return empty;

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          buttons: Array.isArray(parsed.buttons) ? parsed.buttons : [],
          text: typeof parsed.text === 'string' ? parsed.text : '',
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
        };
      } catch (error) {
        return empty;
      }
    }

    if (trimmed.startsWith('[')) {
      try {
        const buttons = JSON.parse(trimmed);
        return {
          buttons: Array.isArray(buttons) ? buttons : [],
          text: '',
          contacts: []
        };
      } catch (error) {
        return empty;
      }
    }

    return { buttons: [], text: trimmed, contacts: [] };
  }

  normalizeTransportButton(button = {}) {
    return {
      label: String(button.label || '').trim(),
      url: String(button.url || '').trim(),
      style: String(button.style || 'outline').trim() || 'outline'
    };
  }

  normalizeTransportContact(contact = {}) {
    return {
      photo: this.cleanStoredImageUrl(contact.photo || ''),
      name: String(contact.name || '').trim(),
      title: String(contact.title || '').trim(),
      phone: String(contact.phone || '').trim(),
      email: String(contact.email || '').trim()
    };
  }

  normalizeTransportOrg(org = {}) {
    const parsed = this.parseTransportOrgDescription(org.description || '');
    const buttons = Array.isArray(org.buttons) ? org.buttons : parsed.buttons;
    const contacts = Array.isArray(org.contacts) ? org.contacts : parsed.contacts;
    const text = typeof org.text === 'string' ? org.text : parsed.text;

    return {
      id: String(org.id || '').trim(),
      name: String(org.name || '').trim(),
      type: String(org.type || 'school').trim() || 'school',
      logo: this.cleanStoredImageUrl(org.logo || org.logo_url || ''),
      text: String(text || '').trim(),
      buttons: buttons
        .map(button => this.normalizeTransportButton(button))
        .filter(button => button.label || button.url),
      contacts: contacts
        .map(contact => this.normalizeTransportContact(contact))
        .filter(contact => contact.name || contact.phone || contact.email || contact.title || contact.photo)
    };
  }

  async verifySiteContentSaved(expectedContent) {
    if (!window.backendManager || typeof window.backendManager.getSiteContent !== 'function') return;

    const savedContent = await window.backendManager.getSiteContent();
    if (!savedContent) {
      throw new Error('Site içerikleri kaydedildi gibi görünüyor ama backend doğrulaması boş döndü');
    }

    const mismatchedKeys = Object.keys(expectedContent).filter(key => {
      return String(savedContent[key] ?? '') !== String(expectedContent[key] ?? '');
    });

    if (mismatchedKeys.length > 0) {
      throw new Error(`Kaydetme doğrulaması başarısız: ${mismatchedKeys.slice(0, 3).join(', ')} alanları backend'de beklenen değerle eşleşmedi`);
    }
  }

  async verifyTransportOrgsSaved(expectedOrgs) {
    if (!window.backendManager || typeof window.backendManager.getTransportOrgs !== 'function') return;

    const savedOrgs = await window.backendManager.getTransportOrgs();
    const expected = expectedOrgs.map(org => this.normalizeTransportOrg(org));
    const actual = savedOrgs.map(org => this.normalizeTransportOrg(org));

    if (expected.length !== actual.length) {
      throw new Error(`Taşımacılık kurumları doğrulanamadı: ${expected.length} kayıt beklenirken ${actual.length} kayıt bulundu`);
    }

    const actualById = new Map(actual.filter(org => org.id).map(org => [org.id, org]));
    const actualByName = new Map(actual.map(org => [org.name, org]));

    expected.forEach(expectedOrg => {
      const actualOrg = (expectedOrg.id && actualById.get(expectedOrg.id)) || actualByName.get(expectedOrg.name);
      if (!actualOrg) {
        throw new Error(`Taşımacılık kurumu kaydı bulunamadı: ${expectedOrg.name}`);
      }

      const comparableExpected = { ...expectedOrg, id: '' };
      const comparableActual = { ...actualOrg, id: '' };
      if (JSON.stringify(comparableExpected) !== JSON.stringify(comparableActual)) {
        throw new Error(`Taşımacılık kurumu kaydedildi ama doğrulama eşleşmedi: ${expectedOrg.name}`);
      }
    });
  }

  async verifyFormFieldsSaved(expectedFields) {
    if (!window.backendManager || typeof window.backendManager.getFormFields !== 'function') return;

    const normalizeField = (field = {}, index = 0) => ({
      label: String(field.label || '').trim(),
      placeholder: String(field.placeholder || '').trim(),
      type: String(field.type || 'text').trim(),
      options: String(field.options || '').trim(),
      target: String(field.target || 'both').trim(),
      required: Boolean(field.required),
      order_index: Number(field.order_index ?? index) || 0
    });

    const savedFields = await window.backendManager.getFormFields();
    const expected = expectedFields.map(normalizeField);
    const actual = savedFields.map(normalizeField);

    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error('Form alanları kaydedildi ama backend doğrulaması eşleşmedi');
    }
  }

  // transportOrgs verisini kaydet (saveChanges çağrısına gömülüdür)
  getTransportOrgsData() {
    const container = document.getElementById('transportOrgsList');
    if(!container) return [];
    
    const items = Array.from(container.querySelectorAll(':scope > .list-item'));
    const result = items.map(it => {
      const id = it.dataset.orgId || '';
      const originalName = it.dataset.originalName || '';
      const name = it.querySelector('.org-name')?.value.trim() || '';
      const type = it.querySelector('.org-type')?.value || 'school';
      
      // Dinamik butonları oku
      const buttons = [];
      it.querySelectorAll('.org-btn-row').forEach(row => {
        const label = row.querySelector('.org-btn-label')?.value.trim() || '';
        const url   = row.querySelector('.org-btn-url')?.value.trim() || '';
        const style = row.querySelector('.org-btn-style')?.value || 'outline';
        if (label || url) buttons.push({ label, url, style });
      });
      
      // Logo URL'sini cache-busting parametresiz al
      const logoPreview = it.querySelector('.org-logo-preview');
      const logo = this.cleanStoredImageUrl(logoPreview?.dataset.url || logoPreview?.src || '');
      
      if(!name) return null;
      let text = (window.orgDescriptionsStore?.[name] || '').trim();
      if (!text && originalName && originalName !== name) {
        text = (window.orgDescriptionsStore?.[originalName] || it.dataset.orgDescription || '').trim();
        if (text && window.orgDescriptionsStore) {
          window.orgDescriptionsStore[name] = text;
        }
      }

      // Yetkili kişileri oku
      const contacts = [];
      it.querySelectorAll('.org-contact-card').forEach(card => {
        const photo = card.querySelector('.contact-photo-preview')?.dataset.url
                   || card.querySelector('.contact-photo-preview')?.src || '';
        const cName  = card.querySelector('.contact-name')?.value.trim()  || '';
        const cTitle = card.querySelector('.contact-title')?.value.trim() || '';
        const cPhone = card.querySelector('.contact-phone')?.value.trim() || '';
        const cEmail = card.querySelector('.contact-email')?.value.trim() || '';
        // Placeholder SVG'yi saklamak istemiyoruz
        const cleanPhoto = photo.startsWith('data:image/svg') ? '' : photo;
        if (cName || cPhone) contacts.push({ photo: cleanPhoto, name: cName, title: cTitle, phone: cPhone, email: cEmail });
      });

      return { id, name, type, buttons, logo, text, contacts };
    }).filter(Boolean);
    
    return result;
  }

  // Taşımacılık kurumlarını backend'e kaydet
  async syncTransportOrgs() {
    if (!window.backendManager) return;
    
    try {
      const orgs = this.getTransportOrgsData();
      const orgNames = orgs.map(org => org.name);
      if (new Set(orgNames).size !== orgNames.length) {
        throw new Error('Taşımacılık kurumlarında aynı isim birden fazla kez kullanılamaz');
      }
      
      await window.backendManager.saveTransportOrgs(orgs);
      await this.verifyTransportOrgsSaved(orgs);
      
    } catch (error) {
      console.error('Taşımacılık kurumları kaydedilemedi:', error);
      throw error;
    }
  }

  getTransportServicesData() {
    const items = document.querySelectorAll('#transportServicesList .list-item');
    const result = [];
    items.forEach(item => {
      const title = item.querySelector('.transport-service-title')?.value.trim() || '';
      const desc = item.querySelector('.transport-service-desc')?.value.trim() || '';
      if (title) result.push({ title, desc });
    });
    return result;
  }

  loadTransportServices(servicesArray) {
    const container = document.getElementById('transportServicesList');
    if (!container) return;
    container.innerHTML = '';
    if (typeof addTransportService === 'function') {
      servicesArray.forEach(s => addTransportService({ title: s.title || '', desc: s.desc || '' }));
    }
  }

  getOrgDescriptionsData() {
    // Önce mevcut textarea değerini depoya kaydet
    if (typeof saveCurrentOrgDescription === 'function') {
      saveCurrentOrgDescription();
    }
    // window.orgDescriptionsStore'dan oku
    if (window.orgDescriptionsStore && typeof window.orgDescriptionsStore === 'object') {
      const result = {};
      Object.keys(window.orgDescriptionsStore).forEach(name => {
        const desc = (window.orgDescriptionsStore[name] || '').trim();
        if (name && desc) result[name] = desc;
      });
      return result;
    }
    return {};
  }

  switchCategory(category) {
    // Tüm kategorileri gizle
    document.querySelectorAll('.category-content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Tüm butonları pasif yap
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    });
    
    // Seçilen kategoriyi göster
    const targetCategory = document.getElementById(category + '-category');
    if (targetCategory) {
      targetCategory.style.display = 'block';
    }
    
    // Seçilen butonu aktif yap
    const activeBtn = document.querySelector(`[data-category="${category}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.classList.remove('btn-outline');
      activeBtn.classList.add('btn-primary');
    }
  }

  getServiceOrgsData() {
    const serviceOrgs = [];
    const items = document.querySelectorAll('#serviceOrgsList .list-item');
    items.forEach(item => {
      const name = item.querySelector('.service-org-name').value.trim();
      let url = item.querySelector('.service-org-url').value.trim();
      if (name && url) {
        // URL'ye https:// ekle eğer yoksa
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        serviceOrgs.push(`${name}|${url}`);
      }
    });
    return serviceOrgs.join('\n');
  }

  getInstitutionsData() {
    const institutions = [];
    const items = document.querySelectorAll('#institutionsList .list-item');
    items.forEach(item => {
      const name = item.querySelector('.institution-name').value.trim();
      let url = item.querySelector('.institution-url').value.trim();
      if (name && url) {
        // URL'ye https:// ekle eğer yoksa
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        institutions.push(`${name}|${url}`);
      }
    });
    return institutions.join('\n');
  }

  getPartnersData() {
    const partners = [];
    const items = document.querySelectorAll('#partnersList .list-item');
    items.forEach(item => {
      const name = item.querySelector('.partner-name').value.trim();
      let url = item.querySelector('.partner-url').value.trim();
      if (name && url) {
        // URL'ye https:// ekle eğer yoksa
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        partners.push(`${name}|${url}`);
      }
    });
    return partners.join('\n');
  }

  getToursData() {
    const tours = [];
    const items = document.querySelectorAll('#toursList .list-item');
    items.forEach(item => {
      const name = item.querySelector('.tour-name').value.trim();
      const description = item.querySelector('.tour-description').value.trim();
      const link = item.querySelector('.tour-link').value.trim();
      // Görseli büyük JSON'a gömmeyelim; boş bırakıyoruz ve render sırasında ayrı depodan okunacak
      const image = '';
      
      if (name && description && link) {
        tours.push(`${name}|${description}|${image}|${link}`);
      }
    });
    return tours.join('\n');
  }

  getFormFieldsData() {
    const fields = [];
    const items = document.querySelectorAll('#formFieldsList .list-item');
    items.forEach(item => {
      const label = item.querySelector('.field-label').value.trim();
      const placeholder = item.querySelector('.field-placeholder').value.trim();
      const type = item.querySelector('.field-type').value;
      const options = item.querySelector('.field-options').value.trim();
      const target = item.querySelector('.field-target').value;
      const required = item.querySelector('.field-required').checked;
      
      if (label && placeholder) {
        const fieldData = {
          label,
          placeholder,
          type,
          required,
          target: target || 'both', // Varsayılan değer
          options: type === 'select' ? options : ''
        };
        fields.push(JSON.stringify(fieldData));
      }
    });
    return fields.join('\n');
  }

  // Form alanlarını backend'e kaydet
  async syncFormFields() {
    if (!window.backendManager) return;
    
    try {
      const fields = [];
      const items = document.querySelectorAll('#formFieldsList .list-item');
      
      items.forEach((item, index) => {
        const label = item.querySelector('.field-label').value.trim();
        const placeholder = item.querySelector('.field-placeholder').value.trim();
        const type = item.querySelector('.field-type').value;
        const options = item.querySelector('.field-options').value.trim();
        const target = item.querySelector('.field-target').value;
        const required = item.querySelector('.field-required').checked;
        
        if (label && placeholder) {
          fields.push({
            label,
            placeholder,
            type,
            required,
            target: target || 'both',
            options: type === 'select' ? options : '',
            order_index: index
          });
        }
      });

      const fieldLabels = fields.map(field => field.label);
      if (new Set(fieldLabels).size !== fieldLabels.length) {
        throw new Error('Form alanlarında aynı ad birden fazla kez kullanılamaz');
      }

      await window.backendManager.saveFormFields(fields);
      await this.verifyFormFieldsSaved(fields);
      
    } catch (error) {
      console.error('Form alanları backend\'e kaydedilemedi:', error);
      throw error;
    }
  }

  // Taşımacılık kurumlarını admin panele yükle
  loadTransportOrgs(orgsArray) {
    const container = document.getElementById('transportOrgsList');
    if (!container) {
      console.error('transportOrgsList container bulunamadı');
      return;
    }

    // Mevcut kurumları temizle
    container.innerHTML = '';

    // Backend'den gelen kurumları ekle
    orgsArray.forEach(org => {
      // Butonları çöz:
      // 1. {v:2, buttons, text} birleşik format (yeni)
      // 2. [...] salt buton dizisi (eski format)
      // 3. Hiçbiri yoksa eski URL sütunlarından oluştur (geriye dönük uyumluluk)
      const parsedDescription = this.parseTransportOrgDescription(org.description || '');
      let buttons = parsedDescription.buttons || [];
      let hasStructuredDescription = false;
      if (org.description) {
        const trimmed = org.description.trim();
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            hasStructuredDescription = Boolean(
              parsed && (parsed.v === 2 || Array.isArray(parsed.buttons) || Object.prototype.hasOwnProperty.call(parsed, 'text') || Array.isArray(parsed.contacts))
            );
            buttons = parsed.buttons || [];
          } catch(e) {}
        } else if (trimmed.startsWith('[')) {
          try { buttons = JSON.parse(trimmed); } catch(e) {}
        }
      }
      if (!buttons.length && !hasStructuredDescription) {
        const legacy = [
          { label: '📄 Sözleşme İndir', url: org.contract_url || '', style: 'outline' },
          { label: '🌐 Vita Web Paneli',  url: org.vita_web_url || '',  style: 'outline' },
          { label: '📱 Vita Uygulaması',  url: org.vita_app_url || '',  style: 'outline' },
          { label: '💳 Ödeme Yap',        url: org.payment_url || '',  style: 'primary'  },
        ];
        buttons = legacy;
      }

      // Yetkili kişileri de çöz
      let contacts = parsedDescription.contacts || [];
      const text = parsedDescription.text || '';
      if (!window.orgDescriptionsStore) window.orgDescriptionsStore = {};
      if (org.name && text) window.orgDescriptionsStore[org.name] = text;

      const orgData = {
        id: org.id,
        name: org.name,
        type: org.type,
        logo: org.logo_url,
        buttons,
        contacts,
        text
      };
      
      // addTransportOrg global fonksiyonu ile DOM'a ekle (logo upload ve butonlar dahil)
      if (typeof addTransportOrg === 'function') {
        addTransportOrg(orgData);
      }
    });

    if (typeof window.refreshOrgDescDropdown === 'function') {
      window.refreshOrgDescDropdown();
    }
  }

  // Form alanlarını admin panele yükle
  loadFormFields(fieldsArray) {
    const container = document.getElementById('formFieldsList');
    if (!container) return;

    // Mevcut alanları temizle
    container.innerHTML = '';

    // Backend'den gelen alanları ekle
    fieldsArray.forEach(field => {
      const fieldData = {
        label: field.label,
        placeholder: field.placeholder,
        type: field.type,
        options: field.options,
        target: field.target,
        required: field.required
      };
      
      // Direkt DOM'a ekle
      const newItem = document.createElement('div');
      newItem.className = 'list-item';
      newItem.draggable = true;
      newItem.innerHTML = `
        <div class="drag-handle" title="Sürükleyerek sırala">⋮⋮</div>
        <input type="text" placeholder="Alan Adı" class="field-label" value="${fieldData.label || ''}" />
        <input type="text" placeholder="Placeholder Metni" class="field-placeholder" value="${fieldData.placeholder || ''}" />
        <select class="field-type" onchange="toggleOptionsField(this)">
          <option value="text" ${fieldData.type === 'text' ? 'selected' : ''}>Metin</option>
          <option value="email" ${fieldData.type === 'email' ? 'selected' : ''}>E-posta</option>
          <option value="tel" ${fieldData.type === 'tel' ? 'selected' : ''}>Telefon</option>
          <option value="number" ${fieldData.type === 'number' ? 'selected' : ''}>Sayı</option>
          <option value="date" ${fieldData.type === 'date' ? 'selected' : ''}>Tarih</option>
          <option value="select" ${fieldData.type === 'select' ? 'selected' : ''}>Seçim Listesi</option>
          <option value="textarea" ${fieldData.type === 'textarea' ? 'selected' : ''}>Uzun Metin</option>
        </select>
        <input type="text" placeholder="Seçenekler (virgülle ayırın)" class="field-options" style="display:${fieldData.type === 'select' ? 'block' : 'none'};" value="${fieldData.options || ''}" />
        <select class="field-target">
          <option value="both" ${fieldData.target === 'both' ? 'selected' : ''}>Her İkisi</option>
          <option value="turlar" ${fieldData.target === 'turlar' ? 'selected' : ''}>Sadece Hazır Rotalar</option>
          <option value="custom" ${fieldData.target === 'custom' ? 'selected' : ''}>Sadece Özel Rota</option>
        </select>
        <label style="display:flex;align-items:center;gap:4px;margin:0; justify-content:center;">
          <input type="checkbox" class="field-required" ${fieldData.required ? 'checked' : ''} />
          <span style="font-size: 12px;">Evet</span>
        </label>
        <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeFormField(this)" title="Bu alanı sil">🗑️</button>
      `;
      container.appendChild(newItem);
      
      // Drag & Drop setup
      if (typeof setupDragAndDrop === 'function') {
        setupDragAndDrop(newItem);
      }
    });
  }

  // Turları admin panele yükle
  loadTours(toursArray) {
    const container = document.getElementById('toursList');
    if (!container) return;

    // Mevcut turları temizle
    container.innerHTML = '';

    // Backend'den gelen turları ekle
    toursArray.forEach(tour => {
      const tourId = window.normalizeTourId(tour.link || tour.id);
      // Supabase Storage'dan görsel URL'i al (cache-busting ile)
      const imageUrl = window.backendManager 
        ? `${window.backendManager.getImageUrl('tour-images', `tours/${tourId}/main.png`)}?v=${Date.now()}`
        : (tour.image_url || '');
      
      const tourData = {
        name: tour.name,
        description: tour.description,
        image: imageUrl,
        link: tour.link
      };
      
      // Direkt DOM'a ekle
      const newItem = document.createElement('div');
      newItem.className = 'list-item';
      newItem.innerHTML = `
        <input type="text" placeholder="Tur Adı" class="tour-name" value="${tourData.name || ''}" />
        <input type="text" placeholder="Tur Açıklaması" class="tour-description" value="${tourData.description || ''}" />
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="file-upload" style="margin: 0;">
            <input type="file" class="tour-image-upload" accept="image/*" />
            📁 Tur Görseli Yükle
          </div>
          <img class="tour-image-preview" style="width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${tourData.image ? 'display: block;' : 'display: none;'}" src="${tourData.image || ''}" />
          <button type="button" class="btn btn-ghost btn-sm remove-tour-image" style="font-size: 11px;">🗑️ Görseli Sil</button>
        </div>
        <input type="text" placeholder="Tur Detay Linki (örn: kapadokya)" class="tour-link" value="${tourData.link || ''}" />
        <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTour(this)">🗑️</button>
      `;
      container.appendChild(newItem);
      
      // Upload event listener ekle
      if (typeof setupTourImageUpload === 'function') {
        setupTourImageUpload(newItem);
      }
    });

    if (typeof window.refreshTourDetailLinkDropdowns === 'function') {
      window.refreshTourDetailLinkDropdowns();
    }
  }

  // Logoları admin panele yükle
  loadLogos(logosArray) {
    logosArray.forEach(logo => {
      switch(logo.logo_type) {
        case 'header':
          const headerImg = document.getElementById('currentHeaderLogo');
          if (headerImg) {
            headerImg.src = logo.image_url;
          }
          break;
        case 'content':
          const contentImg = document.getElementById('currentContentLogo');
          if (contentImg) {
            contentImg.src = logo.image_url;
          }
          break;
        case 'about':
          const aboutImg = document.getElementById('currentAboutImage');
          if (aboutImg) {
            aboutImg.src = logo.image_url;
          }
          break;
      }
    });
  }

  getTourDetailsData() {
    const tourDetails = [];
    const items = document.querySelectorAll('#tourDetailsList .tour-details-item');
    items.forEach(item => {
      const link = item.querySelector('.tour-detail-link')?.value.trim() || '';
      const title = item.querySelector('.tour-detail-title')?.value.trim() || '';
      const subtitle = item.querySelector('.tour-detail-subtitle')?.value.trim() || '';
      const mapTitle = item.querySelector('.tour-detail-maptitle')?.value.trim() || '';
      const mapDesc = item.querySelector('.tour-detail-mapdesc')?.value.trim() || '';
      const description = item.querySelector('.tour-detail-description')?.value.trim() || '';
      const highlights = item.querySelector('.tour-detail-highlights')?.value.trim() || '';
      const itinerary = item.querySelector('.tour-detail-itinerary')?.value.trim() || '';
      
      if (link) {
        const images = [];
        item.querySelectorAll('.tour-detail-image-item img.tour-detail-image-preview').forEach(img => {
          const src = (img.dataset.publicUrl || img.src || '').split('?')[0].trim();
          if (src && !src.startsWith('data:') && !src.startsWith('blob:')) images.push(src);
        });
        const mapImageEl = item.querySelector('.tour-detail-mapimage-preview');
        const mapImageSrc = ((mapImageEl?.dataset.publicUrl || '').split('?')[0] || '').trim();
        const tourDetailData = {
          link,
          title: title || 'Tur Detayı',
          subtitle: subtitle || 'Örnek program ve görseller aşağıdadır.',
          mapImage: (mapImageSrc && !mapImageSrc.startsWith('data:') && !mapImageSrc.startsWith('blob:')) ? mapImageSrc : '',
          mapTitle: mapTitle || 'Gezi Afişi',
          mapDescription: mapDesc || 'Detaylı rota ve duraklar',
          images,
          description: description || '',
          highlights: highlights ? highlights.split('\n').filter(i => i.trim()) : [],
          itinerary: itinerary ? itinerary.split('\n').filter(i => i.trim()) : []
        };
        tourDetails.push(JSON.stringify(tourDetailData));
      }
    });
    return tourDetails.join('\n');
  }

  // Yetkili kurumları admin panele yükle
  loadInstitutions(institutionsData) {
    const container = document.getElementById('institutionsList');
    if (!container) return;

    // Mevcut kurumları temizle
    container.innerHTML = '';

    if (!institutionsData) return;

    // Backend'den gelen veriyi parse et
    const institutions = institutionsData.split('\n').filter(line => line.trim());
    
    institutions.forEach(institutionLine => {
      const [name, url] = institutionLine.split('|');
      if (name && url) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.gridTemplateColumns = '2fr 1fr 60px';
        item.innerHTML = `
          <input type="text" placeholder="Kurum Adı" class="institution-name" value="${name}" />
          <input type="url" placeholder="Kurum URL" class="institution-url" value="${url}" />
          <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="this.parentElement.remove()">🗑️</button>
        `;
        container.appendChild(item);
      }
    });
  }

  // Hizmet verdiğimiz kurumları admin panele yükle
  loadServiceOrgs(serviceOrgsData) {
    const container = document.getElementById('serviceOrgsList');
    if (!container) return;

    // Mevcut kurumları temizle
    container.innerHTML = '';

    if (!serviceOrgsData) return;

    // Backend'den gelen veriyi parse et
    const serviceOrgs = serviceOrgsData.split('\n').filter(line => line.trim());
    
    serviceOrgs.forEach(serviceOrgLine => {
      const [name, url] = serviceOrgLine.split('|');
      if (name && url) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.gridTemplateColumns = '2fr 1fr 60px';
        item.innerHTML = `
          <input type="text" placeholder="Kurum Adı" class="service-org-name" value="${name}" />
          <input type="url" placeholder="Kurum URL" class="service-org-url" value="${url}" />
          <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="this.parentElement.remove()">🗑️</button>
        `;
        container.appendChild(item);
      }
    });
  }

  // Partnerleri admin panele yükle
  loadPartners(partnersData) {
    const container = document.getElementById('partnersList');
    if (!container) return;

    // Mevcut partnerleri temizle
    container.innerHTML = '';

    if (!partnersData) return;

    // Backend'den gelen veriyi parse et
    const partners = partnersData.split('\n').filter(line => line.trim());
    
    partners.forEach(partnerLine => {
      const [name, url] = partnerLine.split('|');
      if (name && url) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.gridTemplateColumns = '2fr 1fr 60px';
        item.innerHTML = `
          <input type="text" placeholder="Partner Adı" class="partner-name" value="${name}" />
          <input type="url" placeholder="Partner URL" class="partner-url" value="${url}" />
          <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="this.parentElement.remove()">🗑️</button>
        `;
        container.appendChild(item);
      }
    });
  }

  // Supabase Storage'dan görselleri yükle
  async loadImagesFromStorage() {
    if (!window.backendManager) return;

    try {
      // Header Logo
      try {
        const headerLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/header.png');
        const headerImg = document.getElementById('currentHeaderLogo');
        if (headerImg) {
          // URL'i test et (dosya var mı kontrol)
          const response = await fetch(headerLogoUrl, { method: 'HEAD' });
          if (response.ok) {
            // Cache-busting ile görseli yükle
            headerImg.src = `${headerLogoUrl}?v=${Date.now()}`;
          }
        }
      } catch (error) {
      }

      // Content Logo
      try {
        const contentLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/content.png');
        const contentImg = document.getElementById('currentContentLogo');
        if (contentImg) {
          const response = await fetch(contentLogoUrl, { method: 'HEAD' });
          if (response.ok) {
            // Cache-busting ile görseli yükle
            contentImg.src = `${contentLogoUrl}?v=${Date.now()}`;
          }
        }
      } catch (error) {
      }

      // Carousel Görselleri (dinamik - sınırsız)
      const carouselContainer = document.getElementById('carouselImages');
      if (carouselContainer) {
        let carouselUrls = [];
        // Önce site_content'ten carouselImages varsa onu kullan
        try {
          const content = await window.backendManager.getSiteContent();
          if (content && content.carouselImages) {
            carouselUrls = JSON.parse(content.carouselImages);
          }
        } catch (e) {}
        // Yoksa storage klasöründen carousel dosyalarını listele
        if (carouselUrls.length === 0) {
          try {
            const files = await window.backendManager.listImages('site-images', 'carousel');
            const slideFiles = (files || [])
              .map(file => file?.name || '')
              .filter(name => /^slide-\d+\.png$/i.test(name))
              .sort((a, b) => {
                const aIdx = parseInt((a.match(/\d+/) || ['0'])[0], 10);
                const bIdx = parseInt((b.match(/\d+/) || ['0'])[0], 10);
                return aIdx - bIdx;
              });
            carouselUrls = slideFiles.map(name => window.backendManager.getImageUrl('site-images', `carousel/${name}`));
          } catch (e) {
            console.warn('Carousel dosyaları listelenemedi:', e);
          }
        }
        carouselContainer.innerHTML = '';
        if (carouselUrls.length === 0) {
          carouselContainer.appendChild(this.createCarouselImageItem(0));
        } else {
          carouselUrls.forEach((url, i) => {
            carouselContainer.appendChild(this.createCarouselImageItem(i, `${url}?v=${Date.now()}`));
          });
        }
      }

      // Hakkımızda Görseli
      try {
        const aboutUrl = window.backendManager.getImageUrl('site-images', 'about/main.png');
        const aboutImg = document.getElementById('aboutImage');
        if (aboutImg) {
          const response = await fetch(aboutUrl, { method: 'HEAD' });
          if (response.ok) {
            // Cache-busting ile görseli yükle
            aboutImg.src = `${aboutUrl}?v=${Date.now()}`;
          }
        }
      } catch (error) {
      }

      // Taşımacılık Görselleri
      try {
        const studentServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/studentService.png');
        const studentImg = document.getElementById('studentServiceImage');
        if (studentImg) {
          const response = await fetch(studentServiceUrl, { method: 'HEAD' });
          if (response.ok) {
            // Cache-busting ile görseli yükle
            studentImg.src = `${studentServiceUrl}?v=${Date.now()}`;
          }
        }
      } catch (error) {
      }

      try {
        const staffServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/staffService.png');
        const staffImg = document.getElementById('staffServiceImage');
        if (staffImg) {
          const response = await fetch(staffServiceUrl, { method: 'HEAD' });
          if (response.ok) {
            // Cache-busting ile görseli yükle
            staffImg.src = `${staffServiceUrl}?v=${Date.now()}`;
          }
        }
      } catch (error) {
      }

    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      throw error;
    }
  }

  loadToursData() {
    // localStorage kaldırıldı; backend'den yükleme için loadSavedContent kullanılıyor
  }


  async loadTourDetailsData() {
    if (!window.backendManager) return;
    
    try {
      const tourDetails = await window.backendManager.getAllTourDetails();
      if (tourDetails && tourDetails.length > 0) {
        this.loadTourDetails(tourDetails);
      }
    } catch (error) {
      console.warn('Tur detayları yüklenemedi:', error);
    }
  }

  loadTourDetails(tourDetailsArray) {
    const container = document.getElementById('tourDetailsList');
    if (!container) return;

    // Mevcut detayları temizle
    container.innerHTML = '';

    // Backend'den gelen tur detaylarını ekle
    tourDetailsArray.forEach((detail, index) => {
      const newItem = document.createElement('div');
      newItem.className = 'tour-details-item';
      
      // Highlights ve itinerary'yi string'e çevir
      const highlightsText = Array.isArray(detail.highlights) ? detail.highlights.join('\n') : (detail.highlights || '');
      const itineraryText = Array.isArray(detail.itinerary) ? detail.itinerary.join('\n') : (detail.itinerary || '');
      
      const linkOptionsHtml = (typeof window.getTourDetailLinkOptions === 'function')
        ? window.getTourDetailLinkOptions(detail.link || '')
        : `<option value="${detail.link || ''}" selected>${detail.link || 'Tur seçin'}</option>`;

      newItem.innerHTML = `
        <div class="tour-detail-accordion-header">
          <button type="button" class="btn btn-outline btn-sm tour-detail-toggle">
            <span class="tour-detail-toggle-label">Tur Detayı</span>
            <span class="tour-detail-toggle-icon">▾</span>
          </button>
        </div>
        <div class="tour-detail-body">
          <div class="tour-details-grid">
            <div class="edit-group">
              <label>Hazır Tur Seçimi:</label>
              <select class="tour-detail-link">${linkOptionsHtml}</select>
            </div>
            <div class="edit-group">
              <label>Tur Başlığı:</label>
              <input type="text" placeholder="Kapadokya Kaşifi" class="tour-detail-title" value="${detail.title || ''}" />
            </div>
            <div class="edit-group">
              <label>Tur Alt Başlığı:</label>
              <input type="text" placeholder="Uçhisar, Göreme ve vadilerin büyüleyici dünyası" class="tour-detail-subtitle" value="${detail.subtitle || ''}" />
            </div>
          </div>
          <div class="tour-details-grid">
            <div class="edit-group">
              <label>Gezi Afişi Görseli:</label>
              <div class="file-upload" style="margin-bottom: 8px;">
                <input type="file" class="tour-detail-mapimage-upload" accept="image/*" />
                📁 Gezi Afişi Görseli Yükle
              </div>
              <img class="tour-detail-mapimage-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
            </div>
            <div class="edit-group">
              <label>Gezi Afişi Başlığı:</label>
              <input type="text" placeholder="Kapadokya Gezi Afişi" class="tour-detail-maptitle" value="${detail.mapTitle || ''}" />
            </div>
            <div class="edit-group">
              <label>Gezi Afişi Açıklaması:</label>
              <input type="text" placeholder="Tur güzergahı ve önemli noktalar" class="tour-detail-mapdesc" value="${detail.mapDescription || ''}" />
            </div>
          </div>
          <div class="tour-details-grid tour-details-full-width">
            <div class="edit-group">
              <label>Tur Görselleri:</label>
              <div class="tour-detail-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;"></div>
              <button type="button" class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="window.addTourDetailImage && window.addTourDetailImage(this)">➕ Görsel Ekle</button>
            </div>
          </div>
          <div class="tour-details-grid tour-details-full-width">
            <div class="edit-group">
              <label>Gezi Noktaları (Her satıra bir madde):</label>
              <textarea placeholder="Gelibolu&#10;Çanakkale Şehitler Abidesi&#10;Truva Antik Kenti" class="tour-detail-description" rows="4">${detail.description || ''}</textarea>
            </div>
            <div class="edit-group">
              <label>Turun Öne Çıkan Özellikleri (Her satıra bir özellik):</label>
              <textarea placeholder="🏛️ Tarihi ve kültürel mekanları ziyaret&#10;🍽️ Yerel lezzetleri tatma fırsatı&#10;📸 Profesyonel fotoğraf çekimi&#10;🎁 Anı eşyaları satın alma imkanı" class="tour-detail-highlights" rows="4">${highlightsText}</textarea>
            </div>
          </div>
          <div class="tour-details-grid tour-details-full-width">
            <div class="edit-group">
              <label>Tur Programı (Her satıra bir madde):</label>
              <textarea placeholder="Uçhisar - Göreme Açık Hava Müzesi&#10;Vadiler - Avanos seramik atölyesi&#10;Serbest zaman ve dönüş" class="tour-detail-itinerary" rows="4">${itineraryText}</textarea>
            </div>
          </div>
          <div class="tour-details-actions">
            <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTourDetail(this)">🗑️ Bu Tur Detayını Sil</button>
          </div>
        </div>
      `;
      container.appendChild(newItem);
      
      // Upload event listener ekle (global fonksiyon kullanıyoruz)
      if (typeof setupTourDetailUploads === 'function') {
        setupTourDetailUploads(newItem, detail);
      }
      if (typeof window.initTourDetailAccordion === 'function') {
        window.initTourDetailAccordion(newItem, { open: index === 0 });
      }
      if (typeof window.updateTourDetailHeader === 'function') {
        window.updateTourDetailHeader(newItem);
      }
    });
  }

  loadFormFieldsData() {
    // localStorage kaldırıldı; backend'den yükleme için loadSavedContent kullanılıyor
  }

  loadOrgDescriptions(descriptionsObj = {}) {
    if (!window.orgDescriptionsStore) window.orgDescriptionsStore = {};
    Object.keys(descriptionsObj).forEach(orgName => {
      if (orgName) window.orgDescriptionsStore[orgName] = descriptionsObj[orgName] || '';
      if (typeof window.addOrgDescription === 'function') {
        window.addOrgDescription({ name: orgName, description: descriptionsObj[orgName] || '' });
      }
    });
  }
}

// Admin paneli başlat (sadece admin.html'de)
document.addEventListener('DOMContentLoaded', () => {
  // Admin paneli sadece admin.html sayfasında başlat
  const isAdminPage = window.location.pathname.includes('admin.html') || 
                      document.getElementById('loginSection') !== null;
  
  if (isAdminPage) {
    window.adminPanel = new AdminPanel();
    setTimeout(() => {
      if (typeof window.auditPageImages === 'function') window.auditPageImages();
    }, 1500);
  } else {
  }
});

// Ana site için içerik güncelleyici
class ContentUpdater {
  static async updateSiteContent() {
    let content = null;
    
    // Dinamik içerikleri gizle (FOUC önleme)
    this.hideDynamicContent();
    
    // Önce backend'den veri çekmeyi dene
    if (window.backendManager) {
      try {
        content = await window.backendManager.getSiteContent();
        
        if (content) {
        }
      } catch (error) {
        console.warn('Backend\'den veri yüklenemedi, localStorage kullanılıyor:', error);
      }
    }
    
    // Backend başarısızsa local fallback kullanılmaz
    if (!content) {
      // İçerik yoksa göster (gizli kalmasın)
      this.showDynamicContent();
      return;
    }
    
    // Önce mevcut dinamik içerikleri temizle
    this.clearDynamicContent();
    
    if (!content) return;
    
    // Site başlığını güncelle
    if (content.siteTitle) {
      document.title = content.siteTitle;
      const titleElements = document.querySelectorAll('title, .brand span');
      titleElements.forEach(el => {
        if (el.tagName === 'TITLE') el.textContent = content.siteTitle;
      });
    }

    // Logo ve görselleri Supabase Storage'dan yükle (Ana sayfa için)
    try {
      await this.loadMainPageImages(content);
    } catch (error) {
    }
      

    // Hazır rotalar kartını güncelle
    if (content.readyRoutesTitle || content.readyRoutesDesc) {
      const readyRouteCard = document.querySelector('a[href="turlar.html"] .card-content');
      if (readyRouteCard) {
        const title = readyRouteCard.querySelector('h2');
        const desc = readyRouteCard.querySelector('p');
        if (title && content.readyRoutesTitle) title.textContent = content.readyRoutesTitle;
        if (desc && content.readyRoutesDesc) desc.textContent = content.readyRoutesDesc;
      }
    }

    // Özel rota kartını güncelle
    if (content.customRouteTitle || content.customRouteDesc) {
      const customRouteCard = document.querySelector('a[href="ozel-rota.html"] .card-content');
      if (customRouteCard) {
        const title = customRouteCard.querySelector('h2');
        const desc = customRouteCard.querySelector('p');
        if (title && content.customRouteTitle) title.textContent = content.customRouteTitle;
        if (desc && content.customRouteDesc) desc.textContent = content.customRouteDesc;
      }
    }

    // Hakkımızda metnini güncelle
    if (content.aboutText) {
      const aboutSection = document.querySelector('#hakkimizda p');
      if (aboutSection) {
        aboutSection.textContent = content.aboutText;
      }
    }

    // İletişim açıklama metnini güncelle
    if (content.contactDescription) {
      const contactDesc = document.querySelector('#iletisim p.muted');
      if (contactDesc) {
        contactDesc.textContent = content.contactDescription;
      }
    }

    // İletişim bilgilerini güncelle
    const contactList = document.querySelector('.contact-list');
    if (contactList && (content.phoneNumber || content.emailAddress || content.address || content.instagramLink)) {
      const items = contactList.querySelectorAll('li');
      if (items[0] && content.phoneNumber) {
        items[0].innerHTML = `<strong>Telefon:</strong> ${content.phoneNumber}`;
      }
      if (items[1] && content.emailAddress) {
        items[1].innerHTML = `<strong>E-posta:</strong> ${content.emailAddress}`;
      }
      if (items[2] && content.address) {
        items[2].innerHTML = `<strong>Adres:</strong> ${content.address}`;
      }
      if (items[3] && content.instagramLink) {
        // Instagram linkinden kullanıcı adını çıkar
        const instagramUsername = content.instagramLink.includes('instagram.com/') 
          ? content.instagramLink.split('instagram.com/')[1].replace('/', '')
          : 'orion_turizm';
        items[3].innerHTML = `<strong>Instagram:</strong> <a href="${content.instagramLink}" target="_blank" rel="noopener">@${instagramUsername}</a>`;
      }
    }

    // Taşımacılık hizmetlerini güncelle
    const transportCards = document.querySelectorAll('.transport-card .card-content');
    if (transportCards.length > 0) {
      // Yeni dinamik format
      if (content.transportServicesList) {
        try {
          const services = JSON.parse(content.transportServicesList);
          services.forEach((service, i) => {
            if (i < transportCards.length) {
              const card = transportCards[i];
              const titleEl = card.querySelector('h3');
              const descEl = card.querySelector('p');
              if (titleEl && service.title) titleEl.textContent = service.title;
              if (descEl && service.desc) descEl.textContent = service.desc;
            }
          });
        } catch(e) {}
      } else {
        // Geriye dönük uyumluluk: eski alan adları
        if (content.studentServiceTitle || content.studentServiceDesc) {
          const title = transportCards[0]?.querySelector('h3');
          const desc = transportCards[0]?.querySelector('p');
          if (title && content.studentServiceTitle) title.textContent = content.studentServiceTitle;
          if (desc && content.studentServiceDesc) desc.textContent = content.studentServiceDesc;
        }
        if ((content.staffServiceTitle || content.staffServiceDesc) && transportCards.length >= 2) {
          const title = transportCards[1]?.querySelector('h3');
          const desc = transportCards[1]?.querySelector('p');
          if (title && content.staffServiceTitle) title.textContent = content.staffServiceTitle;
          if (desc && content.staffServiceDesc) desc.textContent = content.staffServiceDesc;
        }
      }
    }

    // Hizmet verdiğimiz kurumları güncelle
    if (content.serviceOrganizations) {
      const serviceOrgs = content.serviceOrganizations.split('\n').filter(line => line.trim());
      const serviceOrgData = serviceOrgs.map(line => {
        const [name, url] = line.split('|');
        return { name: name?.trim(), url: url?.trim() };
      }).filter(item => item.name && item.url);
      
      // Ana sayfadaki hizmet verdiğimiz kurumlar bölümünü güncelle
      const serviceOrgsGrid = document.querySelector('#tasimacilik-kurumlari .logo-grid');
      if (serviceOrgsGrid && serviceOrgData.length > 0) {
        this.renderPillScroller(serviceOrgsGrid, serviceOrgData, 'serviceOrgsScroll', 'kurum');
      }
    }

    // Yetkili kurumları güncelle
    if (content.authorizedInstitutions) {
      const institutions = content.authorizedInstitutions.split('\n').filter(line => line.trim());
      const institutionData = institutions.map(line => {
        const [name, url] = line.split('|');
        return { name: name?.trim(), url: url?.trim() };
      }).filter(item => item.name && item.url);
      
      // localStorage kaldırıldı
        
        // Ana sayfadaki yetkili kurumlar bölümünü güncelle
        const logoGrid = document.querySelector('#yetkili-kurumlar .logo-grid');
      if (logoGrid && institutionData.length > 0) {
        this.renderPillScroller(logoGrid, institutionData, 'institutionsScroll', 'yetkili kurum');
      }
    }

    // Partnerleri güncelle
    if (content.partnerList) {
      const partners = content.partnerList.split('\n').filter(line => line.trim());
      const partnerData = partners.map(line => {
        const [name, url] = line.split('|');
        return { name: name?.trim(), url: url?.trim() };
      }).filter(item => item.name && item.url);
      
      // localStorage kaldırıldı
      
      // Ana sayfadaki partnerler bölümünü güncelle
      const partnerGrid = document.querySelector('#partnerler .logo-grid');
      if (partnerGrid && partnerData.length > 0) {
        this.renderPillScroller(partnerGrid, partnerData, 'partnersScroll', 'partner');
      }
    }

    // Turları güncelle
    if (content.toursList) {
      const tours = content.toursList.split('\n').filter(line => line.trim());
      const tourData = tours.map(line => {
        const [name, description, image, link] = line.split('|');
        return { 
          name: name?.trim(), 
          description: description?.trim(), 
          image: image?.trim(), 
          link: link?.trim() 
        };
      }).filter(item => item.name && item.description && item.link);
      
      // localStorage kaldırıldı
      
      // Routes sayfasındaki turları güncelle
      const toursGrid = document.querySelector('#toursGrid');
      if (toursGrid && tourData.length > 0) {
        toursGrid.innerHTML = '';
        tourData.forEach(tour => {
          const tourId = window.normalizeTourId(tour.link || tour.id);
          // Supabase Storage'dan görsel URL'i al
          const imageSrc = window.backendManager 
            ? window.backendManager.getImageUrl('tour-images', `tours/${tourId}/main.png`)
            : (tour.image || '');
          
          const tourCard = document.createElement('article');
          tourCard.className = 'card tour-card';
          tourCard.setAttribute('data-tour-id', tourId); // Görsel yükleme için gerekli
          tourCard.innerHTML = `
            <img src="${imageSrc}" alt="${tour.name}" loading="lazy" decoding="async" />
            <div class="card-content">
              <h3>${tour.name}</h3>
              <p>${tour.description}</p>
              <div class="actions">
                <a class="btn btn-outline" href="tur-detay.html?tour=${tour.link}">Detay</a>
              </div>
            </div>
          `;
          toursGrid.appendChild(tourCard);
        });
      }
    }

    // Taşımacılık kurumlarını backend'den al ve seçim modallarını güncelle
    try {
      const transportOrgs = await window.backendManager.getTransportOrgs() || [];
      if (transportOrgs && transportOrgs.length > 0) {
        // Seçim modallarını güncelle
        this.updateTransportModals(transportOrgs.map(o => ({
          name: o.name,
          type: o.type
        })));
      }
    } catch (error) {
      console.warn('Taşımacılık kurumları yüklenemedi:', error);
    }

    // Form alanlarını güncelle
    let formData = [];
    if (content.formFields) {
      const fields = content.formFields.split('\n').filter(line => line.trim());
      formData = fields.map(fieldJson => {
        try {
          return JSON.parse(fieldJson);
        } catch (e) {
          console.error('Form alanı parse hatası:', e, fieldJson);
          return null;
        }
      }).filter(field => field);
    }

    if (formData.length === 0 && window.backendManager && typeof window.backendManager.getFormFields === 'function') {
      try {
        formData = await window.backendManager.getFormFields() || [];
      } catch (error) {
        console.warn('Form alanları form_fields tablosundan yüklenemedi:', error);
      }
    }

    if (formData.length > 0) {
      this.renderDynamicForms(formData);
    }
    
    // İçerikler yüklendi, göster (fade-in)
    this.showDynamicContent();
  }

  static hideDynamicContent() {
    // Dinamik içerikleri gizle (FOUC önleme)
    const dynamicSections = document.querySelectorAll(
      '.carousel, #turlar, #yetkili-kurumlar, #partnerler, #hakkimizda, #tasimacilik, .transport-card'
    );
    
    dynamicSections.forEach(section => {
      section.style.opacity = '0';
      section.style.transition = 'opacity 0.3s ease-in-out';
    });
  }

  static renderDynamicForms(formData) {
    this.renderFieldsForForm('#toursForm', formData.filter(field => field.target === 'turlar' || field.target === 'both'));
    this.renderFieldsForForm('#customRouteForm', formData.filter(field => field.target === 'custom' || field.target === 'both'));
  }

  static renderFieldsForForm(formSelector, fields) {
    const form = document.querySelector(formSelector);
    if (!form || !fields || fields.length === 0) return;

    const grid = form.querySelector('.form-grid');
    if (!grid) return;

    grid.innerHTML = '';
    fields.forEach(field => {
      grid.appendChild(this.createFormField(field));
    });
    this.bindRangeOutputs(grid);
  }

  static createFormField(field) {
    const label = document.createElement('label');
    const fieldLabel = String(field.label || '').trim();
    const fieldType = field.type || 'text';
    const fieldName = fieldLabel.toLowerCase().replace(/\s+/g, '_');

    if (fieldType === 'textarea') {
      label.className = 'full';
    }

    label.appendChild(document.createTextNode(fieldLabel));

    if (fieldType === 'select') {
      const select = document.createElement('select');
      select.name = fieldName;
      select.required = Boolean(field.required);

      this.parseFieldOptions(field.options).forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        select.appendChild(option);
      });

      label.appendChild(select);
      return label;
    }

    if (fieldType === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.name = fieldName;
      textarea.rows = 3;
      textarea.placeholder = field.placeholder || '';
      textarea.required = Boolean(field.required);
      label.appendChild(textarea);
      return label;
    }

    if (fieldType === 'number' && fieldLabel.includes('Lüksü')) {
      const rangeWrap = document.createElement('div');
      rangeWrap.className = 'range-wrap';

      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '10';
      input.step = '1';
      input.value = '5';
      input.name = fieldName;

      const output = document.createElement('output');
      output.textContent = input.value;

      rangeWrap.appendChild(input);
      rangeWrap.appendChild(output);
      label.appendChild(rangeWrap);
      return label;
    }

    const input = document.createElement('input');
    input.type = fieldType;
    input.name = fieldName;
    input.placeholder = field.placeholder || '';
    input.required = Boolean(field.required);
    label.appendChild(input);
    return label;
  }

  static parseFieldOptions(options) {
    if (Array.isArray(options)) {
      return options.map(String).map(opt => opt.trim()).filter(Boolean);
    }

    const raw = String(options || '').trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(opt => opt.trim()).filter(Boolean);
      }
    } catch (error) {}

    return raw.split(',').map(opt => opt.trim()).filter(Boolean);
  }

  static bindRangeOutputs(container) {
    container.querySelectorAll('.range-wrap').forEach(function(w){
      var r = w.querySelector('input[type="range"]');
      var o = w.querySelector('output');
      if(!r || !o) return;
      o.textContent = r.value;
      r.addEventListener('input', function(){ o.textContent = r.value; });
    });
  }

  static showDynamicContent() {
    // Dinamik içerikleri göster (fade-in)
    const dynamicSections = document.querySelectorAll(
      '.carousel, #turlar, #yetkili-kurumlar, #partnerler, #hakkimizda, #tasimacilik, .transport-card'
    );
    
    // Küçük bir gecikme ile smooth transition
    setTimeout(() => {
      dynamicSections.forEach(section => {
        section.style.opacity = '1';
      });
    }, 50);
  }

  static renderPillScroller(container, items, scrollId, label = 'kurum') {
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'partners-container';

    const scroll = document.createElement('div');
    scroll.className = 'partners-scroll';
    scroll.id = scrollId;

    items.forEach(item => {
      const partnerItem = document.createElement('div');
      partnerItem.className = 'partner-item';
      partnerItem.dataset.label = item.name;

      const link = document.createElement('a');
      link.className = 'logo-pill';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = item.name;

      const text = document.createElement('span');
      text.className = 'logo-pill-text';
      text.textContent = item.name;

      link.appendChild(text);
      partnerItem.appendChild(link);
      scroll.appendChild(partnerItem);
    });

    const buttons = document.createElement('div');
    buttons.className = 'scroll-buttons';

    const leftButton = document.createElement('button');
    leftButton.className = 'scroll-btn';
    leftButton.id = `${scrollId}Left`;
    leftButton.type = 'button';
    leftButton.setAttribute('aria-label', `Önceki ${label}`);
    leftButton.textContent = '‹';

    const rightButton = document.createElement('button');
    rightButton.className = 'scroll-btn';
    rightButton.id = `${scrollId}Right`;
    rightButton.type = 'button';
    rightButton.setAttribute('aria-label', `Sonraki ${label}`);
    rightButton.textContent = '›';

    buttons.append(leftButton, rightButton);
    wrapper.append(scroll, buttons);
    container.appendChild(wrapper);

    this.addScrollButtons(`#${scrollId}`, `#${scrollId}Left`, `#${scrollId}Right`);
    requestAnimationFrame(() => this.updatePillOverflow(wrapper));
  }

  static updatePillOverflow(root = document) {
    root.querySelectorAll('.partner-item').forEach(item => {
      const pill = item.querySelector('.logo-pill');
      const text = item.querySelector('.logo-pill-text');
      if (!pill || !text) return;

      const pillStyle = getComputedStyle(pill);
      const availableWidth = pill.clientWidth
        - parseFloat(pillStyle.paddingLeft || '0')
        - parseFloat(pillStyle.paddingRight || '0');
      const overflowAmount = Math.ceil(text.scrollWidth - availableWidth);
      const isOverflowing = overflowAmount > 2;

      item.classList.toggle('is-overflowing', isOverflowing);
      if (isOverflowing) {
        const distance = overflowAmount + 10;
        item.style.setProperty('--scroll-distance', `${distance}px`);
        item.style.setProperty('--scroll-duration', `${Math.min(Math.max(distance / 22, 3), 8)}s`);
      } else {
        item.style.removeProperty('--scroll-distance');
        item.style.removeProperty('--scroll-duration');
      }
    });
  }

  static clearDynamicContent() {
    // Yetkili kurumlar bölümünü temizle
    const institutionsGrid = document.querySelector('#yetkili-kurumlar .logo-grid');
    if (institutionsGrid) {
      institutionsGrid.innerHTML = '';
    }
    
    // Partnerler bölümünü temizle
    const partnersGrid = document.querySelector('#partnerler .logo-grid');
    if (partnersGrid) {
      partnersGrid.innerHTML = '';
    }
    
    // Turlar bölümünü temizle
    const toursGrid = document.querySelector('#toursGrid');
    if (toursGrid) {
      toursGrid.innerHTML = '';
    }
    
  }

  static addScrollButtons(scrollSelector, leftBtnSelector, rightBtnSelector, singleItem = false) {
    const scrollContainer = document.querySelector(scrollSelector);
    const leftBtn = document.querySelector(leftBtnSelector);
    const rightBtn = document.querySelector(rightBtnSelector);
    
    if (!scrollContainer || !leftBtn || !rightBtn) return;

    const getScrollAmount = () => {
      if (singleItem) {
        // Tek resim genişliği + gap (resim yüklenmiş olabilir, clientWidth kullan)
        const firstImg = scrollContainer.querySelector('img');
        return firstImg ? firstImg.clientWidth + 12 : 212;
      }
      return 240; // 2 öğe kaydır (partner mantığı)
    };

    const updateButtons = () => {
      const isAtStart = scrollContainer.scrollLeft <= 0;
      const isAtEnd = scrollContainer.scrollLeft >= (scrollContainer.scrollWidth - scrollContainer.clientWidth - 1);
      leftBtn.disabled = isAtStart;
      rightBtn.disabled = isAtEnd;
    };

    leftBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    scrollContainer.addEventListener('scroll', updateButtons);
    updateButtons();
  }

  static async loadMainPageImages(content = null) {
    if (!window.backendManager) return;
    
    // Sadece index.html'de çalıştır
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      return;
    }

    // Header Logo
    try {
      const headerLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/header.png');
      const headerLogos = document.querySelectorAll('.brand img, header img[alt*="logo"], .logo img');
      
      if (headerLogos.length > 0) {
        headerLogos.forEach(img => {
          img.decoding = 'async';
          img.loading = 'eager';
          img.fetchPriority = 'high';
          img.hidden = false;
          img.onerror = () => {
            img.hidden = true;
          };
          img.src = headerLogoUrl;
        });
      }
    } catch (error) {
      console.warn('Header logo hatası:', error);
    }

    // Carousel: main.js (updatePageWithSiteContent / loadCarouselFromStorage) üzerinden yönetiliyor.
    // Çakışma (çift setInterval, hızlı dönüş) önlemek için ContentUpdater carousel'e dokunmuyor.

    // Hakkımızda Görseli (.visual-bg CSS background güncelle)
    try {
      const aboutUrl = window.backendManager.getImageUrl('site-images', 'about/main.png');
      const aboutBg = document.querySelector('#hakkimizda .visual-bg, .about-visual');
      
      if (aboutBg) {
        aboutBg.style.setProperty('--bg', `url('${aboutUrl}')`);
      } else {
      }
    } catch (error) {
      console.warn('Hakkımızda görseli hatası:', error);
    }

    // Taşımacılık Görselleri (.visual-bg CSS background güncelle)
    try {
      const studentServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/studentService.png');
      const studentCards = document.querySelectorAll('.transport-card');
      
      if (studentCards.length > 0) {
        const studentBg = studentCards[0].querySelector('.visual-bg');
        if (studentBg) {
          studentBg.style.setProperty('--bg', `url('${studentServiceUrl}')`);
        }
      }
    } catch (error) {
      console.warn('Öğrenci servisi görseli hatası:', error);
    }

    try {
      const staffServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/staffService.png');
      const transportCards = document.querySelectorAll('.transport-card');
      
      if (transportCards.length > 1) {
        const staffBg = transportCards[1].querySelector('.visual-bg');
        if (staffBg) {
          staffBg.style.setProperty('--bg', `url('${staffServiceUrl}')`);
        }
      }
    } catch (error) {
      console.warn('Personel servisi görseli hatası:', error);
    }
  }

  static updateTransportModals(transportOrgs) {
    // Okul seçim modalını güncelle
    const schoolSelect = document.querySelector('#schoolSelect');
    if (schoolSelect) {
      const schools = transportOrgs.filter(org => org.type === 'school');
      schoolSelect.innerHTML = '<option value="">Seçiniz</option>';
      schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.name;
        option.textContent = school.name;
        schoolSelect.appendChild(option);
      });
    }

    // Fabrika seçim modalını güncelle
    const factorySelect = document.querySelector('#factorySelect');
    if (factorySelect) {
      const factories = transportOrgs.filter(org => org.type === 'factory');
      factorySelect.innerHTML = '<option value="">Seçiniz</option>';
      factories.forEach(factory => {
        const option = document.createElement('option');
        option.value = factory.name;
        option.textContent = factory.name;
        factorySelect.appendChild(option);
      });
    }
  }

  static async loadTourImages() {
    if (!window.backendManager) return;
    
    // Tur kartlarını gizle (FOUC önleme)
    const tourCards = document.querySelectorAll('.tour-card');
    tourCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transition = 'opacity 0.3s ease-in-out';
    });
    
    
    try {
      // Backend'den turları al
      const tours = await window.backendManager.getTours();
      
      if (!tours || tours.length === 0) {
        // Kartları göster (boş olsa bile)
        setTimeout(() => {
          tourCards.forEach(card => card.style.opacity = '1');
        }, 50);
        return;
      }
      
      // Her tur için görsel yükle (Promise.all ile bekle)
      await Promise.all(tours.map(async (tour) => {
        try {
          const tourId = window.normalizeTourId(tour.link || tour.id);
          const mainImageUrl = window.backendManager.getImageUrl('tour-images', `tours/${tourId}/main.png`);
          
          // Tur kartını bul (turlar.html'de)
          const tourCard = document.querySelector(`[data-tour-id="${tourId}"]`);
          
          if (tourCard) {
            const tourImg = tourCard.querySelector('img');
            if (tourImg) {
              tourImg.src = mainImageUrl;
            }
            
            // Visual-bg elementini bul (eğer varsa)
            const visualBg = tourCard.querySelector('.visual-bg');
            if (visualBg) {
              visualBg.style.setProperty('--bg', `url('${mainImageUrl}')`);
            }
          }
        } catch (error) {
          console.warn(`${tour.name} görseli yüklenemedi:`, error);
        }
      }));
      
      
      // Kartları göster (fade-in)
      setTimeout(() => {
        tourCards.forEach(card => card.style.opacity = '1');
      }, 50);
    } catch (error) {
      console.error('Tur görselleri yükleme hatası:', error);
      
      // Hata olsa bile kartları göster
      setTimeout(() => {
        tourCards.forEach(card => card.style.opacity = '1');
      }, 50);
    }
  }

  // tur-detay.html sayfası için içerik yükle
  static async loadTourDetailPage() {
    if (!window.backendManager) return;

    // Dinamik içeriği gizle (FOUC önleme)
    const contentSections = document.querySelectorAll(
      '.tour-header, .map-section, .gallery-section, .tour-description, .itinerary'
    );
    contentSections.forEach(section => {
      section.style.opacity = '0';
      section.style.transition = 'opacity 0.3s ease-in-out';
    });

    // URL'den tour parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const tourLink = urlParams.get('tour');

    if (!tourLink) {
      // İçeriği göster (gizli kalmasın)
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
        if (typeof window.auditPageImages === 'function') window.auditPageImages();
      }, 50);
      return;
    }


    try {
      // Backend'den tur detayını al
      const tourDetail = await window.backendManager.getTourDetails(tourLink);

      if (!tourDetail) {
        setTimeout(() => {
          contentSections.forEach(section => section.style.opacity = '1');
          if (typeof window.auditPageImages === 'function') window.auditPageImages();
        }, 50);
        return;
      }


      // Başlık ve alt başlığı güncelle
      const titleEl = document.getElementById('tourTitle');
      const subtitleEl = document.getElementById('tourSubtitle');
      if (titleEl) titleEl.textContent = tourDetail.title || 'Tur Detayı';
      if (subtitleEl) subtitleEl.textContent = tourDetail.subtitle || '';

      // Gezi afişi görselini güncelle
      const normalizedTourId = window.normalizeTourId(tourLink);
      const savedMapImageUrl = window.sanitizeImageUrl(tourDetail.mapImage || '');
      const mapImageUrl = await resolveTourMapImageUrl(normalizedTourId, savedMapImageUrl);
      const mapImageEl = document.getElementById('mapImage');
      const mapSectionEl = mapImageEl?.closest('.map-section');
      if (mapImageEl && mapImageUrl) {
        mapImageEl.style.setProperty('--bg', `url('${mapImageUrl}')`);
        mapImageEl.dataset.mapImageUrl = mapImageUrl;
        if (mapSectionEl) mapSectionEl.style.display = '';
      } else if (mapImageEl) {
        mapImageEl.style.removeProperty('--bg');
        delete mapImageEl.dataset.mapImageUrl;
        if (mapSectionEl) mapSectionEl.style.display = 'none';
      }

      // Tur fotoğraflarını güncelle (tourDetail.images varsa onu kullan, yoksa storage'dan probe)
      const galleryEl = document.getElementById('tourGallery');
      if (galleryEl) {
        galleryEl.innerHTML = '';
        const savedImageUrls = (tourDetail.images && Array.isArray(tourDetail.images))
          ? tourDetail.images
          : [];
        const storageImageUrls = await getTourStorageImageUrls(normalizedTourId);
        const imageUrls = mergeTourImageUrls(savedImageUrls, storageImageUrls);
        imageUrls.forEach((url, i) => {
          const img = document.createElement('img');
          const imageSrc = window.withSafeCacheBuster(url);
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = `Tur Fotoğrafı ${i + 1}`;
          window.watchImageQuality(img, {
            section: `Tur fotoğrafları ${i + 1}`,
            removeOnError: true
          });
          img.src = imageSrc;
          img.onclick = function() {
            if (typeof openImageModal === 'function') {
              const gallerySources = imageUrls.map((imageUrl) => window.withSafeCacheBuster(imageUrl));
              openImageModal(this.src, gallerySources, i);
            }
          };
          galleryEl.appendChild(img);
        });
        ContentUpdater.addScrollButtons('#tourGallery', '#tourGalleryScrollLeft', '#tourGalleryScrollRight', true);
      }

      // Tur açıklamasını güncelle
      const descriptionEl = document.getElementById('tourDescription');
      if (descriptionEl && tourDetail.description) {
        const descriptionLines = String(tourDetail.description)
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);
        descriptionEl.innerHTML = '';
        descriptionLines.forEach((line, index) => {
          const li = document.createElement('li');
          li.style = `padding: 8px 0; ${index < descriptionLines.length - 1 ? 'border-bottom: 1px solid #eee;' : ''}`;
          li.textContent = line;
          descriptionEl.appendChild(li);
        });
      }

      // Öne çıkan özellikleri güncelle
      const highlightsEl = document.getElementById('tourHighlights');
      if (highlightsEl && tourDetail.highlights && tourDetail.highlights.length > 0) {
        highlightsEl.innerHTML = '';
        tourDetail.highlights.forEach((highlight, index) => {
          const li = document.createElement('li');
          li.style = `padding: 8px 0; ${index < tourDetail.highlights.length - 1 ? 'border-bottom: 1px solid #eee;' : ''}`;
          li.textContent = highlight;
          highlightsEl.appendChild(li);
        });
      }

      // Tur programını güncelle
      const itineraryEl = document.getElementById('itineraryList');
      if (itineraryEl && tourDetail.itinerary && tourDetail.itinerary.length > 0) {
        itineraryEl.innerHTML = '';
        tourDetail.itinerary.forEach((day, index) => {
          const li = document.createElement('li');
          li.style = `padding: 12px 0; ${index < tourDetail.itinerary.length - 1 ? 'border-bottom: 1px solid #f0f0f0;' : ''} font-size: 1.1rem; line-height: 1.6;`;
          li.textContent = day;
          itineraryEl.appendChild(li);
        });
      }

      
      // İçeriği göster (fade-in)
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
        if (typeof window.auditPageImages === 'function') window.auditPageImages();
      }, 50);
    } catch (error) {
      console.error('Tur detay yükleme hatası:', error);
      
      // Hata olsa bile içeriği göster
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
        if (typeof window.auditPageImages === 'function') window.auditPageImages();
      }, 50);
    }
  }
}

// Tur detay yönetimi fonksiyonları
window.normalizeTourId = window.normalizeTourId || function(rawValue = '') {
  return String(rawValue || '')
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

window.sanitizeImageUrl = window.sanitizeImageUrl || function(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value.split('?')[0];
  }
  return value;
};

window.withSafeCacheBuster = window.withSafeCacheBuster || function(url = '') {
  const cleanUrl = window.sanitizeImageUrl(url);
  if (!cleanUrl) return '';
  const isAdminPage = window.location.pathname.includes('admin.html');
  if (!isAdminPage) return cleanUrl;

  const isHttpOrRelative = /^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('/');
  if (!isHttpOrRelative) return cleanUrl;
  return `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
};

window.logImageWarning = window.logImageWarning || function(message, details = {}) {
  const section = details.section || 'sayfa';
  const alt = details.alt ? ` | alt: ${details.alt}` : '';
  const natural = details.natural ? ` | doğal: ${details.natural}` : '';
  const rendered = details.rendered ? ` | görünen: ${details.rendered}` : '';
  const url = details.url ? ` | url: ${details.url}` : '';
  console.warn(`${message} | bölüm: ${section}${alt}${natural}${rendered}${url}`);
};

window.getImageElementUrl = window.getImageElementUrl || function(img) {
  if (!(img instanceof HTMLImageElement)) return '';
  const attrSrc = img.getAttribute('src') || '';
  const src = attrSrc || img.currentSrc || '';
  const cleanUrl = window.sanitizeImageUrl(src);
  if (!cleanUrl || cleanUrl === window.location.href) return '';
  return cleanUrl;
};

window.watchImageQuality = window.watchImageQuality || function(img, context = {}) {
  if (!(img instanceof HTMLImageElement) || img.dataset.qualityWatch === '1') return;
  if (img.hidden) return;

  const sourceUrl = window.getImageElementUrl(img);
  if (!sourceUrl) return;

  const style = getComputedStyle(img);
  if (style.display === 'none' || style.visibility === 'hidden') return;

  img.dataset.qualityWatch = '1';

  const getContext = () => ({
    section: context.section || img.closest('section')?.id || img.closest('[class]')?.className || 'sayfa',
    alt: img.alt || '',
    url: window.getImageElementUrl(img) || sourceUrl
  });

  const checkResolution = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const renderedWidth = img.clientWidth || img.width || 0;
    const renderedHeight = img.clientHeight || img.height || 0;
    if (!renderedWidth || !renderedHeight) return;

    if (img.naturalWidth < renderedWidth || img.naturalHeight < renderedHeight) {
      window.logImageWarning('Görsel düşük çözünürlükte olabilir', {
        ...getContext(),
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        rendered: `${Math.round(renderedWidth)}x${Math.round(renderedHeight)}`
      });
    }
  };

  img.addEventListener('error', () => {
    window.logImageWarning('Görsel yüklenemedi', getContext());
    if (context.removeOnError) img.remove();
  });

  img.addEventListener('load', checkResolution);
  if (img.complete) {
    if (img.naturalWidth) checkResolution();
    else window.logImageWarning('Görsel yüklenemedi', getContext());
  }
};

window.getBackgroundImageUrl = window.getBackgroundImageUrl || function(element) {
  if (!(element instanceof HTMLElement)) return '';

  const extract = (value = '') => {
    const match = String(value).match(/url\((['"]?)(.*?)\1\)/i);
    return match && match[2] ? match[2] : '';
  };

  let value = '';
  try {
    value = getComputedStyle(element).getPropertyValue('--bg') || '';
  } catch (error) {}
  const customPropertyUrl = extract(value);
  if (customPropertyUrl) return customPropertyUrl;

  try {
    value = getComputedStyle(element).backgroundImage || '';
  } catch (error) {}
  return extract(value);
};

window.watchBackgroundImageQuality = window.watchBackgroundImageQuality || function(element, context = {}) {
  if (!(element instanceof HTMLElement) || element.dataset.bgQualityWatch === '1') return;

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return;

  const url = window.sanitizeImageUrl(window.getBackgroundImageUrl(element));
  if (!url) return;

  element.dataset.bgQualityWatch = '1';
  const probe = new Image();
  probe.onload = () => {
    const renderedWidth = element.clientWidth || 0;
    const renderedHeight = element.clientHeight || 0;
    if (!renderedWidth || !renderedHeight) return;

    if (probe.naturalWidth < renderedWidth || probe.naturalHeight < renderedHeight) {
      window.logImageWarning('Arka plan görseli düşük çözünürlükte olabilir', {
        section: context.section || element.id || element.className || 'sayfa',
        natural: `${probe.naturalWidth}x${probe.naturalHeight}`,
        rendered: `${Math.round(renderedWidth)}x${Math.round(renderedHeight)}`,
        url
      });
    }
  };
  probe.onerror = () => {
    window.logImageWarning('Arka plan görseli yüklenemedi', {
      section: context.section || element.id || element.className || 'sayfa',
      url
    });
  };
  probe.src = window.withSafeCacheBuster(url);
};

window.auditPageImages = window.auditPageImages || function(root = document) {
  root.querySelectorAll('img').forEach((img) => window.watchImageQuality(img));
  root.querySelectorAll('.visual-bg, [data-student-service-bg], [data-staff-service-bg]').forEach((element) => {
    window.watchBackgroundImageQuality(element);
  });
};

function parseTourImageIndex(url = '') {
  const cleanUrl = window.sanitizeImageUrl(url);
  const match = cleanUrl.match(/\/image(\d+)\.png$/i);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function mergeTourImageUrls(savedUrls = [], storageUrls = []) {
  const unique = new Map();
  [...savedUrls, ...storageUrls].forEach((url) => {
    const clean = window.sanitizeImageUrl(url);
    if (!clean) return;
    if (!unique.has(clean)) unique.set(clean, clean);
  });
  return Array.from(unique.values()).sort((a, b) => parseTourImageIndex(a) - parseTourImageIndex(b));
}

async function getTourStorageImageUrls(linkOrTourId = '') {
  if (!window.backendManager || !linkOrTourId) return [];
  const tourId = window.normalizeTourId(linkOrTourId);
  try {
    const folderFiles = await window.backendManager.listImages('tour-images', `tours/${tourId}`);
    const imageFiles = (folderFiles || [])
      .map(file => file?.name || '')
      .filter(name => /^image\d+\.png$/i.test(name))
      .sort((a, b) => {
        const aIdx = parseInt((a.match(/\d+/) || ['0'])[0], 10);
        const bIdx = parseInt((b.match(/\d+/) || ['0'])[0], 10);
        return aIdx - bIdx;
      });
    return imageFiles.map(name => window.backendManager.getImageUrl('tour-images', `tours/${tourId}/${name}`));
  } catch (error) {
    console.warn('Tur detay görselleri listelenemedi:', error);
    return [];
  }
}

async function getTourStorageMapImageUrl(linkOrTourId = '') {
  if (!window.backendManager || !linkOrTourId) return '';
  const tourId = window.normalizeTourId(linkOrTourId);
  try {
    const folderFiles = await window.backendManager.listImages('tour-images', `tours/${tourId}`);
    const hasMapImage = (folderFiles || []).some(file => /^mapImage\.png$/i.test(file?.name || ''));
    return hasMapImage
      ? window.backendManager.getImageUrl('tour-images', `tours/${tourId}/mapImage.png`)
      : '';
  } catch (error) {
    console.warn('Gezi afişi görseli listelenemedi:', error);
    return '';
  }
}

function getTourStoragePathFromPublicUrl(url = '') {
  const cleanUrl = window.sanitizeImageUrl(url);
  const match = cleanUrl.match(/\/storage\/v1\/object\/public\/tour-images\/(.+)$/i);
  return match && match[1] ? decodeURIComponent(match[1].split('?')[0]) : '';
}

function imageUrlLoads(url = '') {
  const cleanUrl = window.sanitizeImageUrl(url);
  if (!cleanUrl) return Promise.resolve(false);

  return new Promise((resolve) => {
    const probe = new Image();
    const timeout = setTimeout(() => {
      probe.onload = null;
      probe.onerror = null;
      resolve(false);
    }, 5000);

    probe.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    probe.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    probe.src = window.withSafeCacheBuster(cleanUrl);
  });
}

async function resolveTourMapImageUrl(tourId = '', savedUrl = '') {
  const cleanSavedUrl = window.sanitizeImageUrl(savedUrl);
  const storagePath = getTourStoragePathFromPublicUrl(cleanSavedUrl);
  const expectedStoragePath = `tours/${window.normalizeTourId(tourId)}/mapImage.png`;

  if (storagePath && storagePath.toLowerCase() === expectedStoragePath.toLowerCase()) {
    return getTourStorageMapImageUrl(tourId);
  }

  if (cleanSavedUrl && await imageUrlLoads(cleanSavedUrl)) {
    return cleanSavedUrl;
  }

  return getTourStorageMapImageUrl(tourId);
}

function addTourDetail() {
  const tourDetailsList = document.getElementById('tourDetailsList');
  if (tourDetailsList) {
    const newItem = createTourDetailItem();
    tourDetailsList.appendChild(newItem);
  }
}

function removeTourDetail(button) {
  button.closest('.tour-details-item').remove();
}

function createTourDetailItem(data = {}) {
  const div = document.createElement('div');
  div.className = 'tour-details-item';
  
  // Görseller backend'den gelecek
  const linkImages = {};

  // Upload event listener'ları ekle
  setupTourDetailUploads(div);
  
  return div;
}

function addTourDetailItem(data) {
  const tourDetailsList = document.getElementById('tourDetailsList');
  if (tourDetailsList) {
    const newItem = createTourDetailItem(data);
    tourDetailsList.appendChild(newItem);
  }
}

// Tur görseli upload fonksiyonları
function setupTourImageUpload(item) {
  const upload = item.querySelector('.tour-image-upload');
  const preview = item.querySelector('.tour-image-preview');
  const removeBtn = item.querySelector('.remove-tour-image');
  if (upload && preview) {
    upload.addEventListener('change', function(e) {
      handleTourImageUpload(e, preview);
    });
  }
  if (removeBtn && preview) {
    removeBtn.addEventListener('click', function() {
      const tourItem = removeBtn.closest('.list-item');
      const link = tourItem?.querySelector('.tour-link')?.value?.trim();
      if (link && window.backendManager) {
        const tourId = link.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        window.backendManager.deleteImage('tour-images', `tours/${tourId}/main.png`).catch(() => {});
      }
      preview.src = '';
      preview.style.display = 'none';
    });
  }
}

function handleTourImageUpload(event, previewElement) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      previewElement.src = e.target.result;
      previewElement.style.display = 'block';
      const tourItem = event.target.closest('.list-item');
      const tourLink = tourItem?.querySelector('.tour-link')?.value?.trim();
      if (tourLink && window.backendManager) {
        try {
          const tourId = tourLink.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          const publicUrl = await window.backendManager.uploadTourImage(e.target.result, tourId, 'main');
          previewElement.src = window.withSafeCacheBuster(publicUrl);
          if (window.adminPanel) window.adminPanel.showSuccessMessage();
        } catch (err) {
          console.error('Tur görseli yükleme hatası:', err);
          alert('Tur görseli yüklenirken hata oluştu.');
        }
      } else {
        alert('Lütfen önce tur detay linkini girin (örn: kapadokya)');
      }
    };
    reader.readAsDataURL(file);
  }
}

// Tur detay görsel slotu oluştur (dinamik - sınırsız)
window.createTourDetailImageSlot = function(container, index, imgSrc = '') {
  const div = document.createElement('div');
  div.className = 'tour-detail-image-item';
  div.setAttribute('data-index', index);
  div.innerHTML = `
    <div class="file-upload" style="margin-bottom: 8px;">
      <input type="file" class="tour-detail-image-upload" data-index="${index}" accept="image/*" />
      📁 Değiştir
    </div>
    <img class="tour-detail-image-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${imgSrc ? 'display:block;' : 'display:none;'}" src="${imgSrc || ''}" />
    <button type="button" class="btn btn-ghost btn-sm remove-tour-detail-image" style="margin-top: 4px; font-size: 11px;">🗑️ Sil</button>
  `;
  container.appendChild(div);
  const img = div.querySelector('.tour-detail-image-preview');
  const cleanUrl = window.sanitizeImageUrl(imgSrc);
  if (img && cleanUrl && !cleanUrl.startsWith('data:') && !cleanUrl.startsWith('blob:')) {
    img.dataset.publicUrl = cleanUrl;
  }
};

// Tur detay görsellerini yükle (admin panelinde göster) - images array veya storage probe
window.loadTourDetailImagesFromStorage = async function(item, link, imagesArray) {
  const container = item?.querySelector('.tour-detail-images');
  if (!container) return;
  const savedUrls = Array.isArray(imagesArray) ? imagesArray : [];
  const storageUrls = link ? await getTourStorageImageUrls(link) : [];
  const urls = mergeTourImageUrls(savedUrls, storageUrls);
  container.innerHTML = '';
  if (urls.length === 0) {
    window.createTourDetailImageSlot(container, 1);
  } else {
    urls.forEach((url, i) => {
      const imageSrc = window.withSafeCacheBuster(url);
      window.createTourDetailImageSlot(container, i + 1, imageSrc);
    });
  }
};

async function saveTourImage(tourName, imageData) {
  try {
    // Tur adını URL-safe hale getir (id olarak kullanılacak)
    const tourId = tourName.toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Görseli Supabase Storage'a yükle
    const publicUrl = await window.backendManager.uploadTourImage(imageData, tourId, 'main');
    
    
    // Başarı mesajı göster
    if (window.adminPanel) {
      window.adminPanel.showSuccessMessage();
    }
    
    return publicUrl;
  } catch (error) {
    console.error('Tur görseli kaydetme hatası:', error);
    alert('Tur görseli kaydedilemedi: ' + error.message);
  }
}

// Ana sayfalarda içerikleri güncelle
if (!window.location.pathname.includes('admin.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    ContentUpdater.updateSiteContent();
    
    // Turlar sayfasında tur görsellerini yükle
    if (window.location.pathname.includes('turlar.html')) {
      ContentUpdater.loadTourImages();
    }
    
    // Tur detay sayfasında içeriği yükle
    if (window.location.pathname.includes('tur-detay.html')) {
      ContentUpdater.loadTourDetailPage();
    }

    // Gizli admin erişimi: Ctrl+Shift+A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        window.location.href = 'admin.html';
      }
    });

    // Popup ayarları AdminPanel.init() içinden yükleniyor
  });
}

// =====================================================
// POPUP YÖNETİMİ FONKSİYONLARI
// =====================================================

// Popup ayarlarını yükle
async function loadPopupSettings() {
  try {
    if (!window.supabase) {
      console.warn('Supabase bağlantısı yok');
      return;
    }
    
    const { data, error } = await window.supabase
      .from('popup_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Popup ayarları yüklenirken hata:', error);
      return;
    }

    const row = data || null;
    if (row) {
      // HTML elementlerini güvenli şekilde al
      const popupActive = document.getElementById('popupActive');
      const popupTitle = document.getElementById('popupTitle');
      const popupContent = document.getElementById('popupContent');
      const popupLinkUrl = document.getElementById('popupLinkUrl');
      const popupLinkText = document.getElementById('popupLinkText');
      const popupShowOnce = document.getElementById('popupShowOnce');
      const popupImagePreview = document.getElementById('popupImagePreview');
      const popupImageText = document.getElementById('popupImageText');

      // Elementler varsa değerleri ata
      if (popupActive) popupActive.checked = row.is_active;
      if (popupTitle) popupTitle.value = row.title || '';
      if (popupContent) popupContent.value = row.content || '';
      if (popupLinkUrl) popupLinkUrl.value = row.link_url || '';
      if (popupLinkText) popupLinkText.value = row.link_text || 'Detay';
      if (popupShowOnce) popupShowOnce.checked = row.show_once;
      togglePopupActive();

      // Görsel varsa göster
      if (row.image_url && popupImagePreview && popupImageText) {
        popupImagePreview.innerHTML = `
          <img src="${row.image_url}" alt="Popup görseli" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--brand-50);">
          <button onclick="removePopupImage()" class="btn btn-outline btn-sm" style="margin-left: 10px;">Görseli Kaldır</button>
        `;
        popupImageText.textContent = 'Görsel Değiştir';
        const popupImageInput = document.getElementById('popupImage');
        if (popupImageInput) {
          popupImageInput.dataset.uploadedUrl = row.image_url;
        }
      }
    } else {
      togglePopupActive();
    }
  } catch (error) {
    console.error('Popup ayarları yüklenirken hata:', error);
  }
}

// Popup aktif/pasif durumunu değiştir
function togglePopupActive() {
  const isActive = document.getElementById('popupActive').checked;
  const inputs = ['popupTitle', 'popupContent', 'popupLinkUrl', 'popupLinkText'];
  
  inputs.forEach(id => {
    const input = document.getElementById(id);
    input.disabled = !isActive;
  });
  
  document.getElementById('popupImage').disabled = !isActive;
  document.getElementById('popupShowOnce').disabled = !isActive;
}

// Popup görsel yükleme
async function handlePopupImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  try {
    // Dosyayı Supabase Storage'a yükle
    const fileExt = file.name.split('.').pop();
    const fileName = `popup-${Date.now()}.${fileExt}`;
    const filePath = `popups/${fileName}`;

    const { data, error } = await window.supabase.storage
      .from('site-images')
      .upload(filePath, file);

    if (error) {
      console.error('Görsel yükleme hatası:', error);
      alert('Görsel yüklenirken hata oluştu!');
      return;
    }

    // Public URL al
    const { data: { publicUrl } } = window.supabase.storage
      .from('site-images')
      .getPublicUrl(filePath);

    // Önizleme göster
    const preview = document.getElementById('popupImagePreview');
    preview.innerHTML = '';

    const previewImage = document.createElement('img');
    previewImage.src = publicUrl;
    previewImage.alt = 'Popup görseli';
    previewImage.style.cssText = 'max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--brand-50);';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-outline btn-sm';
    removeButton.style.marginLeft = '10px';
    removeButton.textContent = 'Görseli Kaldır';
    removeButton.addEventListener('click', removePopupImage);

    preview.appendChild(previewImage);
    preview.appendChild(removeButton);

    document.getElementById('popupImageText').textContent = 'Görsel Değiştir';
    
    // Geçici olarak URL'yi sakla
    input.dataset.uploadedUrl = publicUrl;

  } catch (error) {
    console.error('Görsel yükleme hatası:', error);
    alert('Görsel yüklenirken hata oluştu!');
  }
}

// Popup görselini kaldır
function removePopupImage() {
  document.getElementById('popupImagePreview').innerHTML = '';
  document.getElementById('popupImageText').textContent = 'Görsel Seç';
  document.getElementById('popupImage').value = '';
  document.getElementById('popupImage').dataset.uploadedUrl = '';
}

// Popup ayarlarını kaydet
async function savePopupSettings(options = {}) {
  const silent = options.silent === true;
  const throwOnError = options.throwOnError === true;
  try {
    const isActive = document.getElementById('popupActive').checked;
    const title = document.getElementById('popupTitle').value.trim();
    const content = document.getElementById('popupContent').value.trim();
    const linkUrl = document.getElementById('popupLinkUrl').value.trim();
    const linkText = document.getElementById('popupLinkText').value.trim();
    const showOnce = document.getElementById('popupShowOnce').checked;
    
    // Görsel URL'sini al
    const imageInput = document.getElementById('popupImage');
    const previewImage = document.querySelector('#popupImagePreview img');
    const imageUrl = imageInput.dataset.uploadedUrl || previewImage?.src || '';

    if (!window.supabase) {
      console.error('Supabase bağlantısı yok');
      if (!silent) alert('Supabase bağlantısı yok!');
      if (throwOnError) throw new Error('Supabase bağlantısı yok');
      return false;
    }

    // Mevcut popup ayarını kontrol et (en son güncellenen kaydı al)
    const { data: existingData, error: existingRowsError } = await window.supabase
      .from('popup_settings')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingRowsError) {
      console.error('Popup mevcut kayıt kontrolü hatası:', existingRowsError);
      if (throwOnError) throw existingRowsError;
      return false;
    }

    const popupData = {
      is_active: isActive,
      title: title,
      content: content,
      image_url: imageUrl,
      link_url: linkUrl,
      link_text: linkText,
      show_once: showOnce
    };

    let result;
    if (existingData) {
      // Güncelle
      result = await window.supabase
        .from('popup_settings')
        .update(popupData)
        .eq('id', existingData.id)
        .select();
    } else {
      // Yeni kayıt oluştur
      result = await window.supabase
        .from('popup_settings')
        .insert([popupData])
        .select();
    }

    if (result.error) {
      console.error('Popup ayarları kaydedilirken hata:', result.error);
      if (!silent) alert('Popup ayarları kaydedilirken hata oluştu: ' + result.error.message);
      if (throwOnError) throw result.error;
      return false;
    }

    // Hiç satır etkilenmediyse (örn. RLS politikası engelledi) hata ver
    if (!result.data || result.data.length === 0) {
      const rlsError = new Error('Popup ayarları kaydedilemedi. Supabase izin politikası (RLS) güncellemeyi engelliyor olabilir.');
      console.error(rlsError.message);
      if (!silent) alert(rlsError.message);
      if (throwOnError) throw rlsError;
      return false;
    }

    if (!silent) alert('Popup ayarları başarıyla kaydedildi!');
    
    // Cache'i temizle
    if (window.preloader) {
      window.preloader.clearCache('popupSettings');
    }
    return true;

  } catch (error) {
    console.error('Popup ayarları kaydedilirken hata:', error);
    if (!silent) alert('Popup ayarları kaydedilirken hata oluştu!');
    if (throwOnError) throw error;
    return false;
  }
}

// Popup önizleme
function previewPopup() {
  const isActive = document.getElementById('popupActive').checked;
  const title = document.getElementById('popupTitle').value.trim();
  const content = document.getElementById('popupContent').value.trim();
  const linkUrl = document.getElementById('popupLinkUrl').value.trim();
  const linkText = document.getElementById('popupLinkText').value.trim();
  
  // Görsel URL'sini al
  const imageInput = document.getElementById('popupImage');
  const imageUrl = imageInput.dataset.uploadedUrl || '';

  if (!title && !content && !imageUrl) {
    alert('Lütfen en az bir içerik ekleyin!');
    return;
  }

  // Link URL'sini düzelt
  let correctedLinkUrl = linkUrl;
  if (linkUrl && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://') && !linkUrl.startsWith('mailto:') && !linkUrl.startsWith('tel:')) {
    correctedLinkUrl = 'https://' + linkUrl;
  }

  const popup = document.createElement('div');
  popup.id = 'popupPreview';
  popup.className = 'popup-overlay';

  const container = document.createElement('div');
  container.className = 'popup-container';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'popup-close';
  closeButton.setAttribute('aria-label', 'Popup\'ı kapat');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', closePopupPreview);

  const wrapper = document.createElement('div');
  wrapper.className = 'popup-content-wrapper';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = 'Popup görseli';
    image.className = 'popup-image';
    wrapper.appendChild(image);
  }

  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'popup-title';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  if (content) {
    const contentEl = document.createElement('p');
    contentEl.className = 'popup-content';
    contentEl.textContent = content;
    wrapper.appendChild(contentEl);
  }

  if (correctedLinkUrl) {
    const link = document.createElement('a');
    link.href = correctedLinkUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'popup-link';
    link.textContent = linkText;
    wrapper.appendChild(link);
  }

  container.appendChild(closeButton);
  container.appendChild(wrapper);
  popup.appendChild(container);
  document.body.appendChild(popup);
}

// Popup önizlemesini kapat
function closePopupPreview() {
  const preview = document.getElementById('popupPreview');
  if (preview) {
    preview.remove();
  }
}
