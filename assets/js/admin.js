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

    // Carousel görselleri (admin.html only)
    document.querySelectorAll('.carousel-upload').forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleCarouselUpload(e);
      });
    });

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
        carouselItem.src = imageData;
        
        // Backend'e yükle
        try {
          const publicUrl = await window.backendManager.uploadCarouselImage(imageData, parseInt(index));
          // Cache-busting ile görseli güncelle
          carouselItem.src = `${publicUrl}?v=${Date.now()}`;
          this.showSuccessMessage();
        } catch (error) {
          console.error(`Carousel görsel yükleme hatası (${index}):`, error);
          alert('Carousel görseli yüklenirken hata oluştu: ' + error.message);
        }
      };
      reader.readAsDataURL(file);
    }
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
        studentServiceTitle: getFieldValue('studentServiceTitle'),
        studentServiceDesc: getFieldValue('studentServiceDesc'),
        staffServiceTitle: getFieldValue('staffServiceTitle'),
        staffServiceDesc: getFieldValue('staffServiceDesc'),
        serviceOrganizations: serviceOrgsData,
        authorizedInstitutions: institutionsData,
        partnerList: partnersData,
        toursList: toursData,
        tourDetails: this.getTourDetailsData(),
        formFields: formFieldsData
      };

      
      // Ana siteye değişiklikleri uygula
      this.applyChangesToSite();
      
      this.showSuccessMessage();
      
      // Backend'e kaydet (eğer varsa)
      if (window.backendManager) {
        try {
          await window.backendManager.saveSiteContent(contentData);
          
          // Taşımacılık kurumlarını da kaydet
          await this.syncTransportOrgs();

          // Kurum açıklamalarını da kaydet
          try {
            const descriptions = this.getOrgDescriptionsData();
            if (descriptions && Object.keys(descriptions).length > 0) {
              await window.backendManager.saveOrgDescriptions(descriptions);
            } else {
            }
          } catch (descErr) {
            console.warn('Kurum açıklamaları kaydedilemedi:', descErr);
          }
          
          // Form alanlarını da kaydet
          await this.syncFormFields();
          
        } catch (error) {
          console.warn('Backend kaydetme hatası:', error);
        }
      }
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

  // transportOrgs verisini kaydet (saveChanges çağrısına gömülüdür)
  getTransportOrgsData() {
    const container = document.getElementById('transportOrgsList');
    if(!container) return [];
    
    const items = Array.from(container.querySelectorAll('.list-item'));
    const result = items.map(it => {
      const name = it.querySelector('.org-name')?.value.trim() || '';
      const type = it.querySelector('.org-type')?.value || 'school';
      const contractUrl = it.querySelector('.org-contract')?.value.trim() || '';
      const vitaWebUrl = it.querySelector('.org-vita-web')?.value.trim() || '';
      const vitaAppUrl = it.querySelector('.org-vita-app')?.value.trim() || '';
      const paymentUrl = it.querySelector('.org-payment')?.value.trim() || '';
      
      // Logo URL'sini cache-busting parametresiz al
      let logo = it.querySelector('.org-logo-preview')?.src || '';
      if (logo && logo.includes('?v=')) {
        logo = logo.split('?v=')[0]; // Cache-busting parametresini kaldır
      }
      
      if(!name) return null;
      return { name, type, contractUrl, vitaWebUrl, vitaAppUrl, paymentUrl, logo };
    }).filter(Boolean);
    
    return result;
  }

  // Taşımacılık kurumlarını backend'e kaydet
  async syncTransportOrgs() {
    if (!window.backendManager) return;
    
    try {
      const orgs = this.getTransportOrgsData();
      if (orgs.length === 0) return;
      
      await window.backendManager.saveTransportOrgs(orgs);
      
    } catch (error) {
      console.error('Taşımacılık kurumları kaydedilemedi:', error);
      throw error;
    }
  }

  getOrgDescriptionsData() {
    const container = document.getElementById('orgDescriptionsList');
    if(!container) return {};
    const items = Array.from(container.querySelectorAll('.list-item'));
    const result = {};
    items.forEach(item => {
      const name = item.querySelector('.org-desc-name')?.value.trim() || '';
      const description = item.querySelector('.org-desc-text')?.value.trim() || '';
      if(name && description) {
        result[name] = description;
      }
    });
    return result;
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

      await window.backendManager.saveFormFields(fields);
      
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
      const orgData = {
        name: org.name,
        type: org.type,
        logo: org.logo_url,
        contractUrl: org.contract_url,
        vitaWebUrl: org.vita_web_url,
        vitaAppUrl: org.vita_app_url,
        paymentUrl: org.payment_url
      };
      
      // Direkt DOM'a ekle
      const item = document.createElement('div');
      item.className = 'list-item';
      item.style.gridTemplateColumns = '2fr 80px 120px 1.5fr 1fr 1fr 1fr 60px';
      item.innerHTML = `
        <input type="text" placeholder="Kurum Adı" class="org-name" value="${orgData.name || ''}" />
        <select class="org-type">
          <option value="school" ${orgData.type === 'school' ? 'selected' : ''}>Okul</option>
          <option value="factory" ${orgData.type === 'factory' ? 'selected' : ''}>Fabrika</option>
        </select>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div class="file-upload" style="margin:0;font-size:10px;padding:4px 8px;">
            <input type="file" class="org-logo-upload" accept="image/*" />
            📁 Logo
          </div>
          <img class="org-logo-preview" style="width:50px;height:30px;object-fit:contain;border:1px solid #ddd;border-radius:4px;${orgData.logo ? 'display:block;' : 'display:none;'}" src="${orgData.logo ? `${orgData.logo}?v=${Date.now()}` : ''}" />
        </div>
        <input type="url" placeholder="Sözleşme URL" class="org-contract" value="${orgData.contractUrl || ''}" />
        <input type="url" placeholder="Vita Web URL" class="org-vita-web" value="${orgData.vitaWebUrl || ''}" />
        <input type="url" placeholder="Vita App URL" class="org-vita-app" value="${orgData.vitaAppUrl || ''}" />
        <input type="url" placeholder="Ödeme URL" class="org-payment" value="${orgData.paymentUrl || ''}" />
        <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="this.parentElement.remove()">🗑️</button>
      `;
      container.appendChild(item);
      
      // Logo upload event listener ekle
      const upload = item.querySelector('.org-logo-upload');
      const preview = item.querySelector('.org-logo-preview');
      if (upload && preview) {
        upload.addEventListener('change', function(e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(ev) {
            preview.src = ev.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        });
      }
      
      // Silme butonu event listener ekle
      const removeBtn = item.querySelector('.remove-item');
      if (removeBtn) {
        removeBtn.addEventListener('click', function() {
          item.remove();
        });
      }
    });
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

  // Kurum açıklamalarını admin panele yükle
  loadOrgDescriptions(descriptionsObj) {
    const container = document.getElementById('orgDescriptionsList');
    if (!container) return;

    // Mevcut açıklamaları temizle
    container.innerHTML = '';

    // Backend'den gelen açıklamaları ekle
    Object.keys(descriptionsObj).forEach(orgName => {
      const descriptionData = {
        orgName: orgName,
        description: descriptionsObj[orgName]
      };
      
      // addOrgDescription fonksiyonunu çağır (global fonksiyon)
      if (typeof addOrgDescription === 'function') {
        addOrgDescription(descriptionData);
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
      const tourId = tour.link || tour.id;
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
        const tourDetailData = {
          link,
          title: title || 'Tur Detayı',
          subtitle: subtitle || 'Örnek program ve görseller aşağıdadır.',
          // Görselleri büyük JSON'a gömmeyelim; render sırasında ayrı depodan okunacak
          mapImage: '',
          mapTitle: mapTitle || 'Tur Güzergâhı',
          mapDescription: mapDesc || 'Detaylı rota ve duraklar',
          images: [],
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

      // Carousel Görselleri (3 adet)
      for (let i = 0; i < 3; i++) {
        try {
          const carouselUrl = window.backendManager.getImageUrl('site-images', `carousel/slide-${i}.png`);
          const carouselImg = document.querySelector(`[data-index="${i}"] img`);
          if (carouselImg) {
            const response = await fetch(carouselUrl, { method: 'HEAD' });
            if (response.ok) {
              // Cache-busting ile görseli yükle
              carouselImg.src = `${carouselUrl}?v=${Date.now()}`;
            }
          }
        } catch (error) {
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
    tourDetailsArray.forEach(detail => {
      const newItem = document.createElement('div');
      newItem.className = 'tour-details-item';
      
      // Highlights ve itinerary'yi string'e çevir
      const highlightsText = Array.isArray(detail.highlights) ? detail.highlights.join('\n') : (detail.highlights || '');
      const itineraryText = Array.isArray(detail.itinerary) ? detail.itinerary.join('\n') : (detail.itinerary || '');
      
      newItem.innerHTML = `
        <div class="tour-details-grid">
          <div class="edit-group">
            <label>Tur Linki:</label>
            <input type="text" placeholder="kapadokya" class="tour-detail-link" value="${detail.link || ''}" />
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
            <label>Harita Görseli:</label>
            <div class="file-upload" style="margin-bottom: 8px;">
              <input type="file" class="tour-detail-mapimage-upload" accept="image/*" />
              📁 Harita Görseli Yükle
            </div>
            <img class="tour-detail-mapimage-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
          </div>
          <div class="edit-group">
            <label>Harita Başlığı:</label>
            <input type="text" placeholder="Kapadokya Haritası" class="tour-detail-maptitle" value="${detail.mapTitle || ''}" />
          </div>
          <div class="edit-group">
            <label>Harita Açıklaması:</label>
            <input type="text" placeholder="Tur güzergahı ve önemli noktalar" class="tour-detail-mapdesc" value="${detail.mapDescription || ''}" />
          </div>
        </div>
        <div class="tour-details-grid tour-details-full-width">
          <div class="edit-group">
            <label>Tur Görselleri (4 adet):</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div>
                <div class="file-upload" style="margin-bottom: 8px;">
                  <input type="file" class="tour-detail-image1-upload" accept="image/*" />
                  📁 Görsel 1
                </div>
                <img class="tour-detail-image1-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
              </div>
              <div>
                <div class="file-upload" style="margin-bottom: 8px;">
                  <input type="file" class="tour-detail-image2-upload" accept="image/*" />
                  📁 Görsel 2
                </div>
                <img class="tour-detail-image2-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
              </div>
              <div>
                <div class="file-upload" style="margin-bottom: 8px;">
                  <input type="file" class="tour-detail-image3-upload" accept="image/*" />
                  📁 Görsel 3
                </div>
                <img class="tour-detail-image3-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
              </div>
              <div>
                <div class="file-upload" style="margin-bottom: 8px;">
                  <input type="file" class="tour-detail-image4-upload" accept="image/*" />
                  📁 Görsel 4
                </div>
                <img class="tour-detail-image4-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />
              </div>
            </div>
          </div>
        </div>
        <div class="tour-details-grid tour-details-full-width">
          <div class="edit-group">
            <label>Tur Hakkında (Detaylı Açıklama):</label>
            <textarea placeholder="Tur hakkında detaylı bilgi yazın..." class="tour-detail-description" rows="4">${detail.description || ''}</textarea>
          </div>
          <div class="edit-group">
            <label>Turun Öne Çıkan Özellikleri (Her satıra bir özellik):</label>
            <textarea placeholder="🏛️ Tarihi ve kültürel mekanları ziyaret&#10;🍽️ Yerel lezzetleri tatma fırsatı&#10;📸 Profesyonel fotoğraf çekimi&#10;🎁 Anı eşyaları satın alma imkanı" class="tour-detail-highlights" rows="4">${highlightsText}</textarea>
          </div>
        </div>
        <div class="tour-details-grid tour-details-full-width">
          <div class="edit-group">
            <label>Detaylı Tur Programı (Her satıra bir gün):</label>
            <textarea placeholder="Gün 1: Uçhisar – Göreme Açık Hava Müzesi&#10;Gün 2: Vadiler – Avanos seramik atölyesi&#10;Gün 3: Serbest zaman ve dönüş" class="tour-detail-itinerary" rows="4">${itineraryText}</textarea>
          </div>
        </div>
        <div class="tour-details-actions">
          <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTourDetail(this)">🗑️ Bu Tur Detayını Sil</button>
        </div>
      `;
      container.appendChild(newItem);
      
      // Upload event listener ekle (global fonksiyon kullanıyoruz)
      if (typeof setupTourDetailUploads === 'function') {
        setupTourDetailUploads(newItem);
      }
    });
  }

  loadFormFieldsData() {
    // localStorage kaldırıldı; backend'den yükleme için loadSavedContent kullanılıyor
  }

  loadOrgDescriptions(descriptionsObj = {}) {
    // localStorage kaldırıldı; backend'den gelen veri doğrudan kullanılıyor
    const container = document.getElementById('orgDescriptionsList');
    
    if (container) {
      container.innerHTML = '';
      
      Object.keys(descriptionsObj).forEach(orgName => {
        if (typeof window.addOrgDescription === 'function') {
          window.addOrgDescription({
            name: orgName,
            description: descriptionsObj[orgName]
          });
        }
      });
    }
  }
}

// Admin paneli başlat (sadece admin.html'de)
document.addEventListener('DOMContentLoaded', () => {
  // Admin paneli sadece admin.html sayfasında başlat
  const isAdminPage = window.location.pathname.includes('admin.html') || 
                      document.getElementById('loginSection') !== null;
  
  if (isAdminPage) {
    window.adminPanel = new AdminPanel();
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
      await this.loadMainPageImages();
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
    if (transportCards.length >= 2) {
      // Öğrenci servisi
      if (content.studentServiceTitle || content.studentServiceDesc) {
        const studentCard = transportCards[0];
        const title = studentCard.querySelector('h3');
        const desc = studentCard.querySelector('p');
        if (title && content.studentServiceTitle) title.textContent = content.studentServiceTitle;
        if (desc && content.studentServiceDesc) desc.textContent = content.studentServiceDesc;
      }
      
      // Personel servisi
      if (content.staffServiceTitle || content.staffServiceDesc) {
        const staffCard = transportCards[1];
        const title = staffCard.querySelector('h3');
        const desc = staffCard.querySelector('p');
        if (title && content.staffServiceTitle) title.textContent = content.staffServiceTitle;
        if (desc && content.staffServiceDesc) desc.textContent = content.staffServiceDesc;
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
        // Dinamik kaydırma için container oluştur
        if (serviceOrgData.length > 5) {
          serviceOrgsGrid.innerHTML = `
            <div class="partners-container">
              <div class="partners-scroll" id="serviceOrgsScroll">
                ${serviceOrgData.map(org => `
                  <div class="partner-item">
                    <a class="logo-pill" href="${org.url}" target="_blank" rel="noopener" title="${org.name}">
                      ${org.name}
                    </a>
                  </div>
                `).join('')}
              </div>
              <div class="scroll-buttons">
                <button class="scroll-btn" id="serviceOrgsScrollLeft">‹</button>
                <button class="scroll-btn" id="serviceOrgsScrollRight">›</button>
              </div>
            </div>
          `;
          
          // Kaydırma butonları için event listener'lar ekle
          this.addScrollButtons('#serviceOrgsScroll', '#serviceOrgsScrollLeft', '#serviceOrgsScrollRight');
        } else {
          // Az sayıda kurum varsa normal flex düzen kullan
          serviceOrgsGrid.innerHTML = '';
          serviceOrgData.forEach(org => {
            const link = document.createElement('a');
            link.className = 'logo-pill';
            link.href = org.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = org.name;
            link.title = org.name;
            serviceOrgsGrid.appendChild(link);
          });
        }
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
        // Dinamik kaydırma için container oluştur
        if (institutionData.length > 5) {
          logoGrid.innerHTML = `
            <div class="partners-container">
              <div class="partners-scroll" id="institutionsScroll">
                ${institutionData.map(inst => `
                  <div class="partner-item">
                    <a class="logo-pill" href="${inst.url}" target="_blank" rel="noopener" title="${inst.name}">
                      ${inst.name}
                    </a>
                  </div>
                `).join('')}
              </div>
              <div class="scroll-buttons">
                <button class="scroll-btn" id="institutionsScrollLeft">‹</button>
                <button class="scroll-btn" id="institutionsScrollRight">›</button>
              </div>
            </div>
          `;
          
          // Kaydırma butonları için event listener'lar ekle
          this.addScrollButtons('#institutionsScroll', '#institutionsScrollLeft', '#institutionsScrollRight');
        } else {
          // Az sayıda kurum varsa normal flex düzen kullan
          logoGrid.innerHTML = '';
          institutionData.forEach(inst => {
            const link = document.createElement('a');
            link.className = 'logo-pill';
            link.href = inst.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = inst.name;
            link.title = inst.name;
            logoGrid.appendChild(link);
          });
        }
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
        // Dinamik kaydırma için container oluştur
        if (partnerData.length > 5) {
          partnerGrid.innerHTML = `
            <div class="partners-container">
              <div class="partners-scroll" id="partnersScroll">
                ${partnerData.map(partner => `
                  <div class="partner-item">
                    <a class="logo-pill" href="${partner.url}" target="_blank" rel="noopener" title="${partner.name}">
                      ${partner.name}
                    </a>
                  </div>
                `).join('')}
              </div>
              <div class="scroll-buttons">
                <button class="scroll-btn" id="partnersScrollLeft">‹</button>
                <button class="scroll-btn" id="partnersScrollRight">›</button>
              </div>
            </div>
          `;
          
          // Kaydırma butonları için event listener'lar ekle
          this.addScrollButtons('#partnersScroll', '#partnersScrollLeft', '#partnersScrollRight');
        } else {
          // Az sayıda partner varsa normal flex düzen kullan
        partnerGrid.innerHTML = '';
          partnerData.forEach(partner => {
            const link = document.createElement('a');
            link.className = 'logo-pill';
            link.href = partner.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = partner.name;
            link.title = partner.name;
            partnerGrid.appendChild(link);
          });
        }
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
          const tourId = tour.link || tour.id;
          // Supabase Storage'dan görsel URL'i al (cache-busting ile)
          const imageSrc = window.backendManager 
            ? `${window.backendManager.getImageUrl('tour-images', `tours/${tourId}/main.png`)}?v=${Date.now()}`
            : (tour.image || '');
          
          const tourCard = document.createElement('article');
          tourCard.className = 'card tour-card';
          tourCard.setAttribute('data-tour-id', tourId); // Görsel yükleme için gerekli
          tourCard.innerHTML = `
            <img src="${imageSrc}" alt="${tour.name}" loading="lazy" />
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

    // Taşımacılık kurumlarını backend'den al ve güncelle
    try {
      const transportOrgs = await window.backendManager.getTransportOrgs() || [];
      if (transportOrgs && transportOrgs.length > 0) {
        const transportOrgsGrid = document.querySelector('.transport-orgs-grid');
        
        if (transportOrgsGrid && transportOrgs.length > 0) {
          transportOrgsGrid.innerHTML = '';
          transportOrgs.forEach(orgRaw => {
            // Supabase'den snake_case ile gelen alanları camelCase'e eşle
            const org = {
              name: orgRaw.name,
              type: orgRaw.type,
              logo: orgRaw.logo_url || '',
              contractUrl: orgRaw.contract_url || '',
              vitaWebUrl: orgRaw.vita_web_url || '',
              vitaAppUrl: orgRaw.vita_app_url || '',
              paymentUrl: orgRaw.payment_url || '',
              description: orgRaw.description || ''
            };
            const orgCard = document.createElement('div');
            orgCard.className = 'transport-org-card';
            
            const logoSrc = org.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iMTIiIGZpbGw9IiNmNmY2ZjkiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2YjZiN2EiIHN0cm9rZS13aWR0aD0iMiI+CjxwYXRoIGQ9Im0zIDkgOS03IDkgN3YxMWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiLz4KPHN0cm9rZSBkPSJtOSAyMiAzLTgiLz4KPHN0cm9rZSBkPSJtMTIgMiAzIDgiLz4KPC9zdmc+Cjwvc3ZnPgo=';
            
            orgCard.innerHTML = `
              <div class="transport-org-header">
                <img src="${logoSrc}" alt="${org.name} Logo" class="transport-org-logo" />
                <div class="transport-org-info">
                  <h3>${org.name}</h3>
                  <span class="transport-org-type ${org.type}">${org.type === 'school' ? 'Okul' : 'Fabrika'}</span>
                </div>
              </div>
              <div class="transport-org-actions">
                ${org.contractUrl ? `<a href="${org.contractUrl}" target="_blank" class="btn btn-outline">📄 Sözleşme</a>` : ''}
                ${org.vitaWebUrl ? `<a href="${org.vitaWebUrl}" target="_blank" class="btn btn-outline">🌐 Vita Web</a>` : ''}
                ${org.vitaAppUrl ? `<a href="${org.vitaAppUrl}" target="_blank" class="btn btn-outline">📱 Vita App</a>` : ''}
                ${org.paymentUrl ? `<a href="${org.paymentUrl}" target="_blank" class="btn btn-primary">💳 Ödeme</a>` : ''}
              </div>
            `;
            
            transportOrgsGrid.appendChild(orgCard);
          });
          // Seçim modallarını güncelle
          this.updateTransportModals(transportOrgs.map(o => ({
            name: o.name,
            type: o.type
          })));
        } else {
          // Kurumlar yoksa bölümü gizle
          const transportOrgsSection = document.querySelector('.section-transport-orgs');
          if (transportOrgsSection) {
            transportOrgsSection.style.display = 'none';
          }
        }
      }
    } catch (error) {
      console.warn('Taşımacılık kurumları yüklenemedi:', error);
    }

    // Form alanlarını güncelle
    if (content.formFields) {
      const fields = content.formFields.split('\n').filter(line => line.trim());
      const formData = fields.map(fieldJson => {
        try {
          return JSON.parse(fieldJson);
        } catch (e) {
          console.error('Form alanı parse hatası:', e, fieldJson);
          return null;
        }
      }).filter(field => field);
      
      // localStorage kaldırıldı
      
      // Routes sayfasındaki formu güncelle (sadece routes ve both hedefli alanlar)
      const routesFormElement = document.querySelector('#toursForm');
      if (routesFormElement && formData.length > 0) {
        const routesFormGrid = routesFormElement.querySelector('.form-grid');
        if (routesFormGrid) {
          routesFormGrid.innerHTML = '';
          const routesFields = formData.filter(field => field.target === 'turlar' || field.target === 'both');
          routesFields.forEach(field => {
            const label = document.createElement('label');
            if (field.type === 'textarea') {
              label.className = 'full';
            }
            
            let inputHTML = '';
            if (field.type === 'select') {
              const options = field.options.split(',').map(opt => opt.trim()).filter(opt => opt);
              inputHTML = `
                <select name="${field.label.toLowerCase().replace(/\s+/g, '_')}" ${field.required ? 'required' : ''}>
                  ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              `;
            } else if (field.type === 'textarea') {
              inputHTML = `
                <textarea name="${field.label.toLowerCase().replace(/\s+/g, '_')}" rows="3" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}></textarea>
              `;
            } else if (field.type === 'number' && field.label.includes('Lüksü')) {
              // Özel range slider için
              inputHTML = `
                <div class="range-wrap">
                  <input type="range" min="0" max="10" step="1" value="5" name="${field.label.toLowerCase().replace(/\s+/g, '_')}" oninput="this.nextElementSibling.textContent = this.value" />
                  <output>5</output>
                </div>
              `;
            } else {
              inputHTML = `
                <input type="${field.type}" name="${field.label.toLowerCase().replace(/\s+/g, '_')}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} />
              `;
            }
            
            label.innerHTML = `
              ${field.label}
              ${inputHTML}
            `;
            routesFormGrid.appendChild(label);
          });
          
          // Range slider'lar için event listener'ları ekle
          routesFormGrid.querySelectorAll('.range-wrap input[type="range"]').forEach(rangeInput => {
            rangeInput.addEventListener('input', function() {
              this.nextElementSibling.textContent = this.value;
            });
          });
          
          // main.js'teki range updater'ı da çalıştır
          if (typeof window !== 'undefined' && window.document) {
            routesFormGrid.querySelectorAll('.range-wrap').forEach(function(w){
              var r = w.querySelector('input[type="range"]');
              var o = w.querySelector('output');
              if(!r || !o) return; 
              o.textContent = r.value;
              r.addEventListener('input', function(){ o.textContent = r.value; });
            });
          }
        }
      }
      
      // Özel rota sayfasındaki formu güncelle (sadece custom ve both hedefli alanlar)
      const customFormElement = document.querySelector('#customRouteForm');
      if (customFormElement && formData.length > 0) {
        const customFormGrid = customFormElement.querySelector('.form-grid');
        if (customFormGrid) {
          customFormGrid.innerHTML = '';
          const customFields = formData.filter(field => field.target === 'custom' || field.target === 'both');
          customFields.forEach(field => {
            const label = document.createElement('label');
            if (field.type === 'textarea') {
              label.className = 'full';
            }
            
            let inputHTML = '';
            if (field.type === 'select') {
              const options = field.options.split(',').map(opt => opt.trim()).filter(opt => opt);
              inputHTML = `
                <select name="${field.label.toLowerCase().replace(/\s+/g, '_')}" ${field.required ? 'required' : ''}>
                  ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              `;
            } else if (field.type === 'textarea') {
              inputHTML = `
                <textarea name="${field.label.toLowerCase().replace(/\s+/g, '_')}" rows="3" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}></textarea>
              `;
            } else if (field.type === 'number' && field.label.includes('Lüksü')) {
              // Özel range slider için
              inputHTML = `
                <div class="range-wrap">
                  <input type="range" min="0" max="10" step="1" value="5" name="${field.label.toLowerCase().replace(/\s+/g, '_')}" oninput="this.nextElementSibling.textContent = this.value" />
                  <output>5</output>
                </div>
              `;
            } else {
              inputHTML = `
                <input type="${field.type}" name="${field.label.toLowerCase().replace(/\s+/g, '_')}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} />
              `;
            }
            
            label.innerHTML = `
              ${field.label}
              ${inputHTML}
            `;
            customFormGrid.appendChild(label);
          });
          
          // Range slider'lar için event listener'ları ekle
          customFormGrid.querySelectorAll('.range-wrap input[type="range"]').forEach(rangeInput => {
            rangeInput.addEventListener('input', function() {
              this.nextElementSibling.textContent = this.value;
            });
          });
          
          // main.js'teki range updater'ı da çalıştır
          if (typeof window !== 'undefined' && window.document) {
            customFormGrid.querySelectorAll('.range-wrap').forEach(function(w){
              var r = w.querySelector('input[type="range"]');
              var o = w.querySelector('output');
              if(!r || !o) return; 
              o.textContent = r.value;
              r.addEventListener('input', function(){ o.textContent = r.value; });
            });
          }
        }
      }
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
    
    // Taşımacılık kurumları bölümünü temizle
    const transportOrgsGrid = document.querySelector('.transport-orgs-grid');
    if (transportOrgsGrid) {
      transportOrgsGrid.innerHTML = '';
    }
    
    // Routes form bölümünü temizle
    const routesFormGrid = document.querySelector('#toursForm .form-grid');
    if (routesFormGrid) {
      routesFormGrid.innerHTML = '';
    }
    
    // Custom form bölümünü temizle
    const customFormGrid = document.querySelector('#customRouteForm .form-grid');
    if (customFormGrid) {
      customFormGrid.innerHTML = '';
    }
  }

  static addScrollButtons(scrollSelector, leftBtnSelector, rightBtnSelector) {
    const scrollContainer = document.querySelector(scrollSelector);
    const leftBtn = document.querySelector(leftBtnSelector);
    const rightBtn = document.querySelector(rightBtnSelector);
    
    if (!scrollContainer || !leftBtn || !rightBtn) return;

    const scrollAmount = 240; // Her seferinde 2 item kaydır (200px + 16px gap)

    const updateButtons = () => {
      const isAtStart = scrollContainer.scrollLeft <= 0;
      const isAtEnd = scrollContainer.scrollLeft >= (scrollContainer.scrollWidth - scrollContainer.clientWidth);
      
      leftBtn.disabled = isAtStart;
      rightBtn.disabled = isAtEnd;
    };

    leftBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    scrollContainer.addEventListener('scroll', updateButtons);
    updateButtons(); // İlk durumu kontrol et
  }

  static async loadMainPageImages() {
    if (!window.backendManager) return;
    
    // Sadece index.html'de çalıştır
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      return;
    }


    // Header Logo (cache-busting ile)
    try {
      const headerLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/header.png');
      const cacheBuster = `?v=${Date.now()}`;
      const headerLogos = document.querySelectorAll('.brand img, header img[alt*="logo"], .logo img');
      
      if (headerLogos.length > 0) {
        headerLogos.forEach(img => {
          img.src = headerLogoUrl + cacheBuster;
          img.onerror = () => {
            console.warn('Header logo yüklenemedi, cache-buster olmadan deneniyor');
            img.src = headerLogoUrl; // Cache-buster olmadan tekrar dene
          };
        });
      }
    } catch (error) {
      console.warn('Header logo hatası:', error);
    }

    // Carousel Görselleri (Preload + Smooth Transition)
    try {
      const carousel = document.querySelector('.carousel');
      
      if (carousel) {
        const carouselUrls = [
          window.backendManager.getImageUrl('site-images', 'carousel/slide-0.png'),
          window.backendManager.getImageUrl('site-images', 'carousel/slide-1.png'),
          window.backendManager.getImageUrl('site-images', 'carousel/slide-2.png')
        ];
        
        // Görselleri preload et (flash'ı önlemek için)
        const preloadImages = carouselUrls.map(url => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(url); // Hata olsa bile devam et
            img.src = url;
          });
        });
        
        // Tüm görseller yüklendikten sonra carousel'i güncelle
        Promise.all(preloadImages).then(() => {
          carousel.setAttribute('data-images', JSON.stringify(carouselUrls));
          
          const carouselImg = carousel.querySelector('img');
          const dots = carousel.querySelector('.carousel-dots');
          
          if (carouselImg && dots) {
            let currentIndex = 0;
            
            const renderCarousel = () => {
              // Smooth fade transition - daha hızlı ve temiz
              carouselImg.style.opacity = '0';
              
              setTimeout(() => {
                carouselImg.src = carouselUrls[currentIndex];
                
                // Dots'ları güncelle
                dots.innerHTML = '';
                carouselUrls.forEach((_, i) => {
                  const btn = document.createElement('button');
                  if (i === currentIndex) btn.classList.add('active');
                  btn.addEventListener('click', () => {
                    currentIndex = i;
                    renderCarousel();
                  });
                  dots.appendChild(btn);
                });
                
                // Fade in - daha hızlı
                setTimeout(() => {
                  carouselImg.style.opacity = '1';
                }, 10);
              }, 150); // Daha kısa fade out duration
            };
            
            // CSS transition ekle - daha hızlı ve temiz
            carouselImg.style.transition = 'opacity 0.15s ease-in-out';
            
            renderCarousel();
            
            // Auto-rotate (4 saniyede bir)
            setInterval(() => {
              currentIndex = (currentIndex + 1) % carouselUrls.length;
              renderCarousel();
            }, 4000);
            
          }
        });
      } else {
      }
    } catch (error) {
      console.warn('Carousel hatası:', error);
    }

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
          const tourId = tour.link || tour.id;
          const mainImageUrl = window.backendManager.getImageUrl('tour-images', `tours/${tourId}/main.png`);
          
          // Tur kartını bul (turlar.html'de)
          const tourCard = document.querySelector(`[data-tour-id="${tourId}"]`);
          
          if (tourCard) {
            const tourImg = tourCard.querySelector('img');
            if (tourImg) {
              tourImg.src = mainImageUrl;
              tourImg.onload = () => console.log(`✅ ${tour.name} görseli yüklendi`);
              tourImg.onerror = () => console.log(`⚠️ ${tour.name} görseli bulunamadı (varsayılan kullanılıyor)`);
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
      
      console.log('✅ Tur görselleri yükleme tamamlandı');
      
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
      console.log('Tur parametresi bulunamadı');
      // İçeriği göster (gizli kalmasın)
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
      }, 50);
      return;
    }

    console.log('🖼️ Tur detayı yükleniyor:', tourLink);

    try {
      // Backend'den tur detayını al
      const tourDetail = await window.backendManager.getTourDetails(tourLink);

      if (!tourDetail) {
        console.log('Tur detayı bulunamadı:', tourLink);
        return;
      }

      console.log('✅ Tur detayı bulundu:', tourDetail);

      // Başlık ve alt başlığı güncelle
      const titleEl = document.getElementById('tourTitle');
      const subtitleEl = document.getElementById('tourSubtitle');
      if (titleEl) titleEl.textContent = tourDetail.title || 'Tur Detayı';
      if (subtitleEl) subtitleEl.textContent = tourDetail.subtitle || '';

      // Harita görselini güncelle
      const mapImageUrl = window.backendManager.getImageUrl('tour-images', `tours/${tourLink}/mapImage.png`);
      const mapImageEl = document.getElementById('mapImage');
      if (mapImageEl) {
        mapImageEl.style.setProperty('--bg', `url('${mapImageUrl}')`);
      }

      // Tur fotoğraflarını güncelle (4 adet)
      const galleryEl = document.getElementById('tourGallery');
      if (galleryEl) {
        galleryEl.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
          const imageUrl = window.backendManager.getImageUrl('tour-images', `tours/${tourLink}/image${i}.png`);
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = `Tur Fotoğrafı ${i}`;
          img.style = 'width:100%;height:200px;object-fit:cover;border-radius:12px;cursor:pointer;transition:transform 0.2s;';
          img.onclick = function() { openImageModal(this.src); };
          galleryEl.appendChild(img);
        }
      }

      // Tur açıklamasını güncelle
      const descriptionEl = document.getElementById('tourDescription');
      if (descriptionEl && tourDetail.description) {
        descriptionEl.textContent = tourDetail.description;
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

      console.log('✅ Tur detay sayfası yüklendi');
      
      // İçeriği göster (fade-in)
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
      }, 50);
    } catch (error) {
      console.error('Tur detay yükleme hatası:', error);
      
      // Hata olsa bile içeriği göster
      setTimeout(() => {
        contentSections.forEach(section => section.style.opacity = '1');
      }, 50);
    }
  }
}

// Tur detay yönetimi fonksiyonları
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
  if (upload && preview) {
    upload.addEventListener('change', function(e) {
      handleTourImageUpload(e, preview);
    });
  }
}

function handleTourImageUpload(event, previewElement) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewElement.src = e.target.result;
      previewElement.style.display = 'block';
      
      // Görseli localStorage'a kaydet
      const tourItem = event.target.closest('.list-item');
      const tourName = tourItem.querySelector('.tour-name').value;
      if (tourName) {
        saveTourImage(tourName, e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }
}

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
    
    console.log('✅ Tur görseli kaydedildi:', tourName, publicUrl);
    
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
if (window.location.pathname !== '/admin.html') {
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

    // Popup ayarlarını yükle (sadece admin sayfasında)
    if (window.location.pathname.includes('admin.html')) {
      loadPopupSettings();
    }
  });
}

// =====================================================
// POPUP YÖNETİMİ FONKSİYONLARI
// =====================================================

// Popup ayarlarını yükle
async function loadPopupSettings() {
  try {
    // Sadece admin sayfasında çalış
    if (!window.location.pathname.includes('admin.html')) {
      return;
    }

    if (!window.supabase) {
      console.warn('Supabase bağlantısı yok');
      return;
    }
    
    const { data, error } = await window.supabase
      .from('popup_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Popup ayarları yüklenirken hata:', error);
      return;
    }

    if (data) {
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
      if (popupActive) popupActive.checked = data.is_active;
      if (popupTitle) popupTitle.value = data.title || '';
      if (popupContent) popupContent.value = data.content || '';
      if (popupLinkUrl) popupLinkUrl.value = data.link_url || '';
      if (popupLinkText) popupLinkText.value = data.link_text || 'Detay';
      if (popupShowOnce) popupShowOnce.checked = data.show_once;

      // Görsel varsa göster
      if (data.image_url && popupImagePreview && popupImageText) {
        popupImagePreview.innerHTML = `
          <img src="${data.image_url}" alt="Popup görseli" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--brand-50);">
          <button onclick="removePopupImage()" class="btn btn-outline btn-sm" style="margin-left: 10px;">Görseli Kaldır</button>
        `;
        popupImageText.textContent = 'Görsel Değiştir';
      }
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
    const filePath = `site-images/${fileName}`;

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
    preview.innerHTML = `
      <img src="${publicUrl}" alt="Popup görseli" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--brand-50);">
      <button onclick="removePopupImage()" class="btn btn-outline btn-sm" style="margin-left: 10px;">Görseli Kaldır</button>
    `;

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
async function savePopupSettings() {
  try {
    const isActive = document.getElementById('popupActive').checked;
    const title = document.getElementById('popupTitle').value.trim();
    const content = document.getElementById('popupContent').value.trim();
    const linkUrl = document.getElementById('popupLinkUrl').value.trim();
    const linkText = document.getElementById('popupLinkText').value.trim();
    const showOnce = document.getElementById('popupShowOnce').checked;
    
    // Görsel URL'sini al
    const imageInput = document.getElementById('popupImage');
    const imageUrl = imageInput.dataset.uploadedUrl || '';

    if (!window.supabase) {
      console.error('Supabase bağlantısı yok');
      alert('Supabase bağlantısı yok!');
      return;
    }

    // Mevcut popup ayarlarını kontrol et
    const { data: existingData } = await window.supabase
      .from('popup_settings')
      .select('id')
      .single();

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
        .eq('id', existingData.id);
    } else {
      // Yeni kayıt oluştur
      result = await window.supabase
        .from('popup_settings')
        .insert([popupData]);
    }

    if (result.error) {
      console.error('Popup ayarları kaydedilirken hata:', result.error);
      alert('Popup ayarları kaydedilirken hata oluştu!');
      return;
    }

    alert('Popup ayarları başarıyla kaydedildi!');
    
    // Cache'i temizle
    if (window.preloader) {
      window.preloader.clearCache('popupSettings');
    }

  } catch (error) {
    console.error('Popup ayarları kaydedilirken hata:', error);
    alert('Popup ayarları kaydedilirken hata oluştu!');
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

  // Popup HTML'i oluştur
  const popupHtml = `
    <div id="popupPreview" class="popup-overlay">
      <div class="popup-container">
        <button class="popup-close" onclick="closePopupPreview()" aria-label="Popup'ı kapat">&times;</button>
        <div class="popup-content-wrapper">
          ${imageUrl ? `<img src="${imageUrl}" alt="Popup görseli" class="popup-image">` : ''}
          ${title ? `<h3 class="popup-title">${title}</h3>` : ''}
          ${content ? `<p class="popup-content">${content}</p>` : ''}
          ${correctedLinkUrl ? `<a href="${correctedLinkUrl}" target="_blank" class="popup-link">${linkText}</a>` : ''}
        </div>
      </div>
    </div>
  `;

  // Popup'ı göster
  document.body.insertAdjacentHTML('beforeend', popupHtml);
}

// Popup önizlemesini kapat
function closePopupPreview() {
  const preview = document.getElementById('popupPreview');
  if (preview) {
    preview.remove();
  }
}
