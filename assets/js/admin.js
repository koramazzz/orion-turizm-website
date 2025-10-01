// Admin Panel JavaScript
class AdminPanel {
  constructor() {
    // Kaydedilmiş şifreyi yükle, yoksa varsayılan kullan
    this.adminPassword = localStorage.getItem('adminPassword') || "orion2024";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedContent();
  }

  bindEvents() {
    // Giriş formu
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Kategori butonları
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.getAttribute('data-category');
        this.switchCategory(category);
      });
    });

    // Çıkış butonu
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
    });

    // Kaydet butonu
    const saveBtn = document.getElementById('saveChanges');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('Kaydet butonu tıklandı');
        this.saveChanges();
      });
    } else {
      console.error('saveChanges butonu bulunamadı!');
    }



    // Şifre değiştirme
    document.getElementById('changePassword').addEventListener('click', () => {
      this.changePassword();
    });

    // Şifre göster/gizle
    document.getElementById('togglePassword').addEventListener('click', () => {
      this.togglePasswordDisplay();
    });

    // Header logo yükleme
    document.getElementById('headerLogoUpload').addEventListener('change', (e) => {
      this.handleLogoUpload(e, 'header');
    });

    // Header logo sıfırlama
    document.getElementById('resetHeaderLogo').addEventListener('click', () => {
      this.resetLogo('header');
    });

    // Content logo yükleme
    document.getElementById('contentLogoUpload').addEventListener('change', (e) => {
      this.handleLogoUpload(e, 'content');
    });

    // Content logo sıfırlama
    document.getElementById('resetContentLogo').addEventListener('click', () => {
      this.resetLogo('content');
    });

    // Carousel görselleri
    document.querySelectorAll('.carousel-upload').forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleCarouselUpload(e);
      });
    });

    // Hakkımızda görseli
    document.getElementById('aboutImageUpload').addEventListener('change', (e) => {
      this.handleAboutImageUpload(e);
    });

    // Taşımacılık görselleri
    document.getElementById('studentServiceImageUpload').addEventListener('change', (e) => {
      this.handleTransportImageUpload(e, 'studentService');
    });

    document.getElementById('staffServiceImageUpload').addEventListener('change', (e) => {
      this.handleTransportImageUpload(e, 'staffService');
    });



    // Manuel kaydetme için event listener'lar kaldırıldı
    // Sadece "Değişiklikleri Kaydet" butonu kullanılacak

    // Debug: Element kontrolü
    console.log('Admin panel elementleri kontrol ediliyor...');
    console.log('changePassword button:', document.getElementById('changePassword'));
    console.log('newPassword input:', document.getElementById('newPassword'));
    console.log('headerLogoUpload input:', document.getElementById('headerLogoUpload'));
    console.log('contentLogoUpload input:', document.getElementById('contentLogoUpload'));
    console.log('currentHeaderLogo img:', document.getElementById('currentHeaderLogo'));
    console.log('currentContentLogo img:', document.getElementById('currentContentLogo'));
  }

  handleLogin() {
    const password = document.getElementById('adminPassword').value;
    const loginError = document.getElementById('loginError');

    if (password === this.adminPassword) {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      loginError.style.display = 'none';
      
      // Session'da oturum bilgisini sakla
      sessionStorage.setItem('adminLoggedIn', 'true');
    } else {
      loginError.style.display = 'block';
      document.getElementById('adminPassword').value = '';
    }
  }

  logout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
  }

  changePassword() {
    const newPasswordInput = document.getElementById('newPassword');
    const newPassword = newPasswordInput.value.trim();
    
    console.log('Şifre değiştirme başladı:', newPassword);
    
    if (!newPassword) {
      alert('Lütfen yeni şifre girin!');
      return;
    }
    
    if (newPassword.length < 4) {
      alert('Şifre en az 4 karakter olmalıdır!');
      return;
    }
    
    this.adminPassword = newPassword;
    localStorage.setItem('adminPassword', newPassword);
    newPasswordInput.value = '';
    
    // Mevcut şifre yazısını güncelle
    this.updateCurrentPasswordDisplay();
    
    this.showSuccessMessage();
    console.log('Şifre değiştirildi:', newPassword);
    alert('Şifre başarıyla değiştirildi!');
  }

  togglePasswordDisplay() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordDisplay = document.getElementById('currentPasswordDisplay');
    
    if (passwordDisplay.textContent === '••••••••') {
      // Şifreyi göster
      passwordDisplay.textContent = this.adminPassword;
      toggleBtn.textContent = '🙈 Şifreyi Gizle';
    } else {
      // Şifreyi gizle
      passwordDisplay.textContent = '••••••••';
      toggleBtn.textContent = '👁️ Mevcut Şifreyi Göster';
    }
  }

  updateCurrentPasswordDisplay() {
    const passwordDisplay = document.getElementById('currentPasswordDisplay');
    if (passwordDisplay) {
      // Varsayılan olarak gizli kalır, sadece şifre değiştiğinde güncellenir
      // Şifre görünür durumda değilse gizli kalır
      if (passwordDisplay.textContent !== '••••••••') {
        passwordDisplay.textContent = this.adminPassword;
      }
    }
  }

  handleLogoUpload(event, type = 'header') {
    const file = event.target.files[0];
    console.log('Logo yükleme başladı:', type, file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = e.target.result;
        const imageId = type === 'header' ? 'currentHeaderLogo' : 'currentContentLogo';
        const imageElement = document.getElementById(imageId);
        
        console.log('Logo yüklendi:', type, imageId, imageElement);
        
        if (imageElement) {
          imageElement.src = logoData;
        
        // Logo'yu localStorage'a kaydet
          const storageKey = type === 'header' ? 'headerLogo' : 'contentLogo';
          localStorage.setItem(storageKey, logoData);
        this.showSuccessMessage();
          console.log('Logo kaydedildi:', storageKey);
        } else {
          console.error('Logo elementi bulunamadı:', imageId);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  resetLogo(type = 'header') {
    const defaultLogo = 'assets/img/logo.png';
    const imageId = type === 'header' ? 'currentHeaderLogo' : 'currentContentLogo';
    document.getElementById(imageId).src = defaultLogo;
    
    const storageKey = type === 'header' ? 'headerLogo' : 'contentLogo';
    localStorage.removeItem(storageKey);
    this.showSuccessMessage();
  }

  handleCarouselUpload(event) {
    const file = event.target.files[0];
    const index = event.target.getAttribute('data-index');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Admin paneldeki önizlemeyi güncelle
        const carouselItem = document.querySelector(`[data-index="${index}"] img`);
        carouselItem.src = imageData;
        
        // Carousel görsellerini localStorage'a kaydet
        let carouselImages = JSON.parse(localStorage.getItem('carouselImages') || '{}');
        carouselImages[index] = imageData;
        localStorage.setItem('carouselImages', JSON.stringify(carouselImages));
        
        this.showSuccessMessage();
      };
      reader.readAsDataURL(file);
    }
  }

  handleAboutImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        document.getElementById('aboutImage').src = imageData;
        
        // Hakkımızda görselini localStorage'a kaydet
        localStorage.setItem('aboutImage', imageData);
        this.showSuccessMessage();
      };
      reader.readAsDataURL(file);
    }
  }

  handleTransportImageUpload(event, imageType) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Admin paneldeki önizlemeyi güncelle
        const previewImage = document.getElementById(imageType + 'Image');
        if (previewImage) {
          previewImage.src = imageData;
        }
        
        // Taşımacılık görsellerini localStorage'a kaydet
        let transportImages = JSON.parse(localStorage.getItem('transportImages') || '{}');
        transportImages[imageType] = imageData;
        localStorage.setItem('transportImages', JSON.stringify(transportImages));
        
        this.showSuccessMessage();
      };
      reader.readAsDataURL(file);
    }
  }



  saveChanges() {
    console.log('saveChanges fonksiyonu çağrıldı');
    try {
      // Form alanlarını kontrol et
      const siteTitle = document.getElementById('siteTitle');
      console.log('siteTitle elementi:', siteTitle, 'değeri:', siteTitle?.value);
      
      // Dinamik verileri al
      console.log('Dinamik veriler alınıyor...');
      let institutionsData = '';
      let partnersData = '';
      let toursData = '';
      let formFieldsData = '';
      
      try {
        institutionsData = this.getInstitutionsData();
        console.log('Kurumlar:', institutionsData);
      } catch (error) {
        console.error('Kurumlar alınırken hata:', error);
      }
      
      try {
        partnersData = this.getPartnersData();
        console.log('Partnerler:', partnersData);
      } catch (error) {
        console.error('Partnerler alınırken hata:', error);
      }
      
      try {
        toursData = this.getToursData();
        console.log('Turlar:', toursData);
      } catch (error) {
        console.error('Turlar alınırken hata:', error);
      }
      
      try {
        formFieldsData = this.getFormFieldsData();
        console.log('Form alanları:', formFieldsData);
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
        authorizedInstitutions: institutionsData,
        partnerList: partnersData,
        toursList: toursData,
        tourDetails: this.getTourDetailsData(),
        formFields: formFieldsData
      };

      // İçerikleri localStorage'a kaydet
      // Taşımacılık kurumlarını ayrı kaydet (kota aşımını önlemek için)
      try { this.getTransportOrgsData(); } catch(e){ console.warn('transportOrgs kaydı atlandı', e); }
      
      // Kurum açıklamalarını kaydet
      try { this.getOrgDescriptionsData(); } catch(e){ console.warn('orgDescriptions kaydı atlandı', e); }
      
      localStorage.setItem('siteContent', JSON.stringify(contentData));
      console.log('İçerikler localStorage\'a kaydedildi:', contentData);
      
      // Ana siteye değişiklikleri uygula
      this.applyChangesToSite();
      
      this.showSuccessMessage();
      
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme sırasında bir hata oluştu: ' + error.message);
    }
  }

  autoSave() {
    // 2 saniye sonra otomatik kaydet
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      this.saveChanges();
    }, 2000);
  }

  setupDynamicListListeners() {
    // Dinamik listelerdeki değişiklikleri dinle
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Yeni element eklendi veya silindi
          this.autoSave();
          
          // Yeni eklenen input'lara event listener ekle
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea, select') : [];
              inputs.forEach(input => {
                input.addEventListener('input', () => this.autoSave());
                input.addEventListener('change', () => this.autoSave());
              });
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

  loadSavedContent() {
    // Kaydedilmiş içerikleri yükle
    const savedContent = localStorage.getItem('siteContent');
    if (savedContent) {
      const content = JSON.parse(savedContent);
      
      // Basit form alanlarını yükle
      Object.keys(content).forEach(key => {
        const element = document.getElementById(key);
        if (element && typeof content[key] === 'string') {
          element.value = content[key];
        }
      });
    }

    // Kaydedilmiş logoları yükle
    const savedHeaderLogo = localStorage.getItem('headerLogo');
    if (savedHeaderLogo) {
      document.getElementById('currentHeaderLogo').src = savedHeaderLogo;
    }

    const savedContentLogo = localStorage.getItem('contentLogo');
    if (savedContentLogo) {
      document.getElementById('currentContentLogo').src = savedContentLogo;
    }

    // Kaydedilmiş carousel görsellerini yükle
    const savedCarouselImages = localStorage.getItem('carouselImages');
    if (savedCarouselImages) {
      const carouselImages = JSON.parse(savedCarouselImages);
      Object.keys(carouselImages).forEach(index => {
        const carouselItem = document.querySelector(`[data-index="${index}"] img`);
        if (carouselItem) {
          carouselItem.src = carouselImages[index];
        }
      });
    }

    // Kaydedilmiş hakkımızda görselini yükle
    const savedAboutImage = localStorage.getItem('aboutImage');
    if (savedAboutImage) {
      const aboutImage = document.getElementById('aboutImage');
      if (aboutImage) {
        aboutImage.src = savedAboutImage;
      }
    }

    // Kaydedilmiş taşımacılık görsellerini yükle
    const savedTransportImages = localStorage.getItem('transportImages');
    if (savedTransportImages) {
      const transportImages = JSON.parse(savedTransportImages);
      Object.keys(transportImages).forEach(imageType => {
        const previewImage = document.getElementById(imageType + 'Image');
        if (previewImage) {
          previewImage.src = transportImages[imageType];
        }
      });
    }



    // Kaydedilmiş kurum ve partner verilerini yükle
    this.loadInstitutionsData();
    this.loadPartnersData();
    this.loadToursData();
    this.loadTransportOrgs();
    this.loadTourDetailsData();
    this.loadFormFieldsData();
    this.loadOrgDescriptions();

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
      console.log('Değişiklikler ana siteye uygulandı');
    } else {
      console.log('ContentUpdater bulunamadı, değişiklikler sadece localStorage\'a kaydedildi');
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
      const logo = it.querySelector('.org-logo-preview')?.src || '';
      if(!name) return null;
      return { name, type, contractUrl, vitaWebUrl, vitaAppUrl, paymentUrl, logo };
    }).filter(Boolean);
    // Büyük JSON'a gömmeyelim; ayrı anahtar
    localStorage.setItem('transportOrgs', JSON.stringify(result));
    return result;
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
    localStorage.setItem('orgDescriptions', JSON.stringify(result));
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

  loadInstitutionsData() {
    const savedContent = localStorage.getItem('siteContent');
    if (savedContent) {
      const content = JSON.parse(savedContent);
      if (content.authorizedInstitutions) {
        const institutions = content.authorizedInstitutions.split('\n').filter(line => line.trim());
        const container = document.getElementById('institutionsList');
        if (container) {
          container.innerHTML = '';
          institutions.forEach(line => {
            const [name, url] = line.split('|');
            if (name && url) {
              const item = document.createElement('div');
              item.className = 'list-item';
              item.innerHTML = `
                <input type="text" placeholder="Kurum Adı" class="institution-name" value="${name.trim()}" />
                <input type="url" placeholder="https://www.kurum.com" class="institution-url" value="${url.trim()}" />
                <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeInstitution(this)">🗑️</button>
              `;
              container.appendChild(item);
            }
          });
          // Eğer hiç kurum yoksa boş bir item ekle
          if (institutions.length === 0) {
            addInstitution();
          }
        }
      }
    }
  }

  loadPartnersData() {
    const savedContent = localStorage.getItem('siteContent');
    if (savedContent) {
      const content = JSON.parse(savedContent);
      if (content.partnerList) {
        const partners = content.partnerList.split('\n').filter(line => line.trim());
        const container = document.getElementById('partnersList');
        if (container) {
          container.innerHTML = '';
          partners.forEach(line => {
            const [name, url] = line.split('|');
            if (name && url) {
              const item = document.createElement('div');
              item.className = 'list-item';
              item.innerHTML = `
                <input type="text" placeholder="Partner Adı" class="partner-name" value="${name.trim()}" />
                <input type="url" placeholder="https://www.partner.com" class="partner-url" value="${url.trim()}" />
                <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removePartner(this)">🗑️</button>
              `;
              container.appendChild(item);
            }
          });
          // Eğer hiç partner yoksa boş bir item ekle
          if (partners.length === 0) {
            addPartner();
          }
        }
      }
    }
  }

  loadToursData() {
    const savedContent = localStorage.getItem('siteContent');
    const container = document.getElementById('toursList');
    
    if (savedContent) {
      const content = JSON.parse(savedContent);
      if (content.toursList) {
        const tours = content.toursList.split('\n').filter(line => line.trim());
        if (container) {
          container.innerHTML = '';
          tours.forEach(line => {
            const [name, description, image, link] = line.split('|');
            if (name && description && image && link) {
              const item = document.createElement('div');
              item.className = 'list-item';
              item.innerHTML = `
                <input type="text" placeholder="Tur Adı" class="tour-name" value="${name.trim()}" />
                <input type="text" placeholder="Tur Açıklaması" class="tour-description" value="${description.trim()}" />
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div class="file-upload" style="margin: 0;">
                    <input type="file" class="tour-image-upload" accept="image/*" />
                    📁 Tur Görseli Yükle
                  </div>
                  <img class="tour-image-preview" style="width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${image ? 'display: block;' : 'display: none;'}" src="${image.trim()}" />
                </div>
                <input type="text" placeholder="Tur Detay Linki (örn: kapadokya)" class="tour-link" value="${link.trim()}" />
                <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTour(this)">🗑️</button>
              `;
              container.appendChild(item);
              
              // Upload event listener ekle
              setupTourImageUpload(item);
            }
          });
        }
      }
    }
    
    // Eğer hiç tur yoksa boş bırak - admin panelinden eklenmeli
    if (container && (!savedContent || !JSON.parse(savedContent || '{}').toursList)) {
      container.innerHTML = '';
    }
  }

  loadTransportOrgs() {
    const container = document.getElementById('transportOrgsList');
    if(!container) return;
    container.innerHTML = '';
    // Eski kayıtları oku
    let list = [];
    try { list = JSON.parse(localStorage.getItem('transportOrgs') || '[]') || []; } catch(e){ list = []; }
    list.forEach(org => {
      // admin.html'deki yardımcı fonksiyonla render
      if (typeof window.addTransportOrg === 'function') {
        window.addTransportOrg(org);
      } else {
        // Fallback minimal render
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<input value="${org.name||''}" /><span>${org.type||''}</span>`;
        container.appendChild(item);
      }
    });
  }

  loadTourDetailsData() {
    const savedContent = localStorage.getItem('siteContent');
    const container = document.getElementById('tourDetailsList');
    
    if (savedContent) {
      const content = JSON.parse(savedContent);
      if (content.tourDetails) {
        const tourDetails = content.tourDetails.split('\n').filter(line => line.trim());
        if (container) {
          container.innerHTML = '';
          tourDetails.forEach(tourDetailJson => {
            try {
              const tourDetailData = JSON.parse(tourDetailJson);
              addTourDetailItem(tourDetailData);
            } catch (e) {
              console.error('Tur detay yüklenirken hata:', e);
            }
          });
        }
      }
    }
    
    // Eğer hiç tur detay yoksa boş bırak
    if (container && (!savedContent || !JSON.parse(savedContent || '{}').tourDetails)) {
      container.innerHTML = '';
    }
  }

  loadFormFieldsData() {
    const savedContent = localStorage.getItem('siteContent');
    const container = document.getElementById('formFieldsList');
    
    if (savedContent) {
      const content = JSON.parse(savedContent);
      if (content.formFields) {
        const fields = content.formFields.split('\n').filter(line => line.trim());
        if (container) {
          container.innerHTML = '';
          fields.forEach(fieldJson => {
            try {
              const fieldData = JSON.parse(fieldJson);
              const item = document.createElement('div');
              item.className = 'list-item';
              item.innerHTML = `
                <div class="drag-handle" title="Sürükleyerek sırala">⋮⋮</div>
                <input type="text" placeholder="Alan Adı" class="field-label" value="${fieldData.label}" />
                <input type="text" placeholder="Placeholder Metni" class="field-placeholder" value="${fieldData.placeholder}" />
                <select class="field-type" onchange="toggleOptionsField(this)">
                  <option value="text" ${fieldData.type === 'text' ? 'selected' : ''}>Metin</option>
                  <option value="email" ${fieldData.type === 'email' ? 'selected' : ''}>E-posta</option>
                  <option value="tel" ${fieldData.type === 'tel' ? 'selected' : ''}>Telefon</option>
                  <option value="number" ${fieldData.type === 'number' ? 'selected' : ''}>Sayı</option>
                  <option value="date" ${fieldData.type === 'date' ? 'selected' : ''}>Tarih</option>
                  <option value="select" ${fieldData.type === 'select' ? 'selected' : ''}>Seçim Listesi</option>
                  <option value="textarea" ${fieldData.type === 'textarea' ? 'selected' : ''}>Uzun Metin</option>
                </select>
                <input type="text" placeholder="Seçenekler (virgülle ayırın)" class="field-options" value="${fieldData.options}" style="${fieldData.type === 'select' ? 'display:block;' : 'display:none;'}" />
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
              item.draggable = true;
              container.appendChild(item);
            } catch (e) {
              console.error('Form alanı yüklenirken hata:', e);
            }
          });
        }
      }
    }
    
    // Eğer hiç form alanı yoksa varsayılan alanları ekle
    if (container && (!savedContent || !JSON.parse(savedContent || '{}').formFields)) {
      const defaultFields = [
        {
          label: 'İsim Soyisim',
          placeholder: 'Adınızı ve soyadınızı girin',
          type: 'text',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'E-posta',
          placeholder: 'E-posta adresinizi girin',
          type: 'email',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'Telefon',
          placeholder: 'Telefon numaranızı girin',
          type: 'tel',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'Grup Kimliği',
          placeholder: 'Örn: 3-B Sınıfı / Ailesi',
          type: 'text',
          required: false,
          target: 'both',
          options: ''
        },
        {
          label: 'Seçilen Program',
          placeholder: 'Program seçin',
          type: 'select',
          required: true,
          target: 'turlar',
          options: 'Kapadokya Kaşifi,Ege Kıyıları,Yeşil Karadeniz'
        },
        {
          label: 'Rehberlik Dili',
          placeholder: 'Dil seçin',
          type: 'select',
          required: true,
          target: 'both',
          options: 'Türkçe,İngilizce,Arapça'
        },
        {
          label: 'Başlangıç Tarihi',
          placeholder: 'Tarih seçin',
          type: 'date',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'Bitiş Tarihi',
          placeholder: 'Tarih seçin',
          type: 'date',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'Katılımcı Sayısı',
          placeholder: 'Kişi sayısı',
          type: 'number',
          required: true,
          target: 'both',
          options: ''
        },
        {
          label: 'Otel Lüksü',
          placeholder: '0-10 arası değer',
          type: 'number',
          required: false,
          target: 'both',
          options: ''
        },
        {
          label: 'Ziyaret Edilecek Yerler',
          placeholder: 'Örn: İstanbul – Kapadokya, 2 gün müze, 1 gün serbest zaman...',
          type: 'textarea',
          required: true,
          target: 'custom',
          options: ''
        },
        {
          label: 'İstediğiniz Değişiklik',
          placeholder: 'Program üzerinde talep ettiğiniz değişiklikler',
          type: 'textarea',
          required: false,
          target: 'both',
          options: ''
        }
      ];
      
      container.innerHTML = '';
      defaultFields.forEach(field => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
          <div class="drag-handle" title="Sürükleyerek sırala">⋮⋮</div>
          <input type="text" placeholder="Alan Adı" class="field-label" value="${field.label}" />
          <input type="text" placeholder="Placeholder Metni" class="field-placeholder" value="${field.placeholder}" />
          <select class="field-type" onchange="toggleOptionsField(this)">
            <option value="text" ${field.type === 'text' ? 'selected' : ''}>Metin</option>
            <option value="email" ${field.type === 'email' ? 'selected' : ''}>E-posta</option>
            <option value="tel" ${field.type === 'tel' ? 'selected' : ''}>Telefon</option>
            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Sayı</option>
            <option value="date" ${field.type === 'date' ? 'selected' : ''}>Tarih</option>
            <option value="select" ${field.type === 'select' ? 'selected' : ''}>Seçim Listesi</option>
            <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Uzun Metin</option>
          </select>
          <input type="text" placeholder="Seçenekler (virgülle ayırın)" class="field-options" value="${field.options}" style="${field.type === 'select' ? 'display:block;' : 'display:none;'}" />
          <select class="field-target">
            <option value="both" ${field.target === 'both' ? 'selected' : ''}>Her İkisi</option>
            <option value="turlar" ${field.target === 'turlar' ? 'selected' : ''}>Sadece Hazır Rotalar</option>
            <option value="custom" ${field.target === 'custom' ? 'selected' : ''}>Sadece Özel Rota</option>
          </select>
          <label style="display:flex;align-items:center;gap:4px;margin:0; justify-content:center;">
            <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''} />
            <span style="font-size: 12px;">Evet</span>
          </label>
          <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeFormField(this)" title="Bu alanı sil">🗑️</button>
        `;
        item.draggable = true;
        container.appendChild(item);
      });
    }
  }

  loadOrgDescriptions() {
    const savedDescriptions = localStorage.getItem('orgDescriptions');
    const container = document.getElementById('orgDescriptionsList');
    
    if (savedDescriptions && container) {
      const descriptions = JSON.parse(savedDescriptions);
      container.innerHTML = '';
      
      Object.keys(descriptions).forEach(orgName => {
        if (typeof window.addOrgDescription === 'function') {
          window.addOrgDescription({
            name: orgName,
            description: descriptions[orgName]
          });
        }
      });
    }
  }
}

// Admin paneli başlat
document.addEventListener('DOMContentLoaded', () => {
  window.adminPanel = new AdminPanel();
});

// Ana site için içerik güncelleyici
class ContentUpdater {
  static updateSiteContent() {
    const savedContent = localStorage.getItem('siteContent');
    const savedLogo = localStorage.getItem('siteLogo');
    
    // Önce mevcut dinamik içerikleri temizle
    this.clearDynamicContent();
    
    if (!savedContent) return;
    
    const content = JSON.parse(savedContent);
    
    // Site başlığını güncelle
    if (content.siteTitle) {
      document.title = content.siteTitle;
      const titleElements = document.querySelectorAll('title, .brand span');
      titleElements.forEach(el => {
        if (el.tagName === 'TITLE') el.textContent = content.siteTitle;
      });
    }

    // Header logo'yu güncelle
    const savedHeaderLogo = localStorage.getItem('headerLogo');
    if (savedHeaderLogo) {
      const headerLogoElements = document.querySelectorAll('.brand img, .site-header .brand img');
      headerLogoElements.forEach(img => {
        img.src = savedHeaderLogo;
      });
    }

    // Content logo'yu güncelle
    const savedContentLogo = localStorage.getItem('contentLogo');
    if (savedContentLogo) {
      const contentLogoElements = document.querySelectorAll('.brand-col img, .contact-logo img, .footer-grid .brand-col img');
      contentLogoElements.forEach(img => {
        img.src = savedContentLogo;
      });
    }

    // Carousel görsellerini güncelle
    const savedCarouselImages = localStorage.getItem('carouselImages');
    if (savedCarouselImages) {
      const carouselImages = JSON.parse(savedCarouselImages);
      const carouselElement = document.querySelector('.carousel');
      
      if (carouselElement) {
        // data-images attribute'unu güncelle
        const imageUrls = [];
        for (let i = 0; i < 3; i++) {
          imageUrls.push(carouselImages[i] || `https://images.unsplash.com/photo-${i === 0 ? '1473625247510-8ceb1760943f' : i === 1 ? '1526772662000-3f88f10405ff' : '1500530855697-b586d89ba3ee'}?q=80&w=1400&auto=format&fit=crop`);
        }
        carouselElement.setAttribute('data-images', JSON.stringify(imageUrls));
        
        // Carousel'ı yeniden başlat (eğer main.js'te carousel fonksiyonu varsa)
        if (typeof window.initCarousel === 'function') {
          window.initCarousel();
        }
      }
    }

    // Hakkımızda görselini güncelle
    const savedAboutImage = localStorage.getItem('aboutImage');
    if (savedAboutImage) {
      const aboutImageElements = document.querySelectorAll('#hakkimizda .visual-bg');
      aboutImageElements.forEach(element => {
        element.style.setProperty('--bg', `url('${savedAboutImage}')`);
      });
    }

    // Taşımacılık görsellerini güncelle
    const savedTransportImages = localStorage.getItem('transportImages');
    if (savedTransportImages) {
      const transportImages = JSON.parse(savedTransportImages);
      
      // Öğrenci servisi görseli (ana sayfa)
      if (transportImages.studentService) {
        const studentServiceElements = document.querySelectorAll('.transport-card:first-child .visual-bg');
        studentServiceElements.forEach(element => {
          element.style.setProperty('--bg', `url('${transportImages.studentService}')`);
        });
      }
      
      // Personel servisi görseli (ana sayfa)
      if (transportImages.staffService) {
        const staffServiceElements = document.querySelectorAll('.transport-card:last-child .visual-bg');
        staffServiceElements.forEach(element => {
          element.style.setProperty('--bg', `url('${transportImages.staffService}')`);
          });
        }
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

    // Yetkili kurumları güncelle
    if (content.authorizedInstitutions) {
      const institutions = content.authorizedInstitutions.split('\n').filter(line => line.trim());
      const institutionData = institutions.map(line => {
        const [name, url] = line.split('|');
        return { name: name?.trim(), url: url?.trim() };
      }).filter(item => item.name && item.url);
      
      localStorage.setItem('authorizedInstitutions', JSON.stringify(institutionData));
        
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
      
      localStorage.setItem('partnerList', JSON.stringify(partnerData));
      
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
      
      localStorage.setItem('toursList', JSON.stringify(tourData));
      
      // Routes sayfasındaki turları güncelle
      const toursGrid = document.querySelector('#toursGrid');
      if (toursGrid && tourData.length > 0) {
        toursGrid.innerHTML = '';
        const tourImages = JSON.parse(localStorage.getItem('tourImages') || '{}');
        tourData.forEach(tour => {
          const imageSrc = tourImages[tour.name] || tour.image || '';
          const tourCard = document.createElement('article');
          tourCard.className = 'card tour-card';
          tourCard.innerHTML = `
            <img src="${imageSrc}" alt="${tour.name}" />
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

    // Taşımacılık kurumlarını güncelle
    const savedTransportOrgs = localStorage.getItem('transportOrgs');
    if (savedTransportOrgs) {
      const transportOrgs = JSON.parse(savedTransportOrgs);
      const transportOrgsGrid = document.querySelector('.transport-orgs-grid');
      
      if (transportOrgsGrid && transportOrgs.length > 0) {
        transportOrgsGrid.innerHTML = '';
        transportOrgs.forEach(org => {
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
      } else if (transportOrgsGrid && transportOrgs.length === 0) {
        // Kurumlar yoksa bölümü gizle
        const transportOrgsSection = document.querySelector('.section-transport-orgs');
        if (transportOrgsSection) {
          transportOrgsSection.style.display = 'none';
        }
      }
      
      // Seçim modallarını güncelle
      this.updateTransportModals(transportOrgs);
    } else {
      // Veri yoksa bölümü gizle
      const transportOrgsSection = document.querySelector('.section-transport-orgs');
      if (transportOrgsSection) {
        transportOrgsSection.style.display = 'none';
      }
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
      
      console.log('Yüklenen form alanları:', formData);
      localStorage.setItem('formFields', JSON.stringify(formData));
      
      // Routes sayfasındaki formu güncelle (sadece routes ve both hedefli alanlar)
      const routesFormElement = document.querySelector('#toursForm');
      if (routesFormElement && formData.length > 0) {
        const routesFormGrid = routesFormElement.querySelector('.form-grid');
        if (routesFormGrid) {
          routesFormGrid.innerHTML = '';
          const routesFields = formData.filter(field => field.target === 'turlar' || field.target === 'both');
          console.log('Routes sayfası için filtrelenen alanlar:', routesFields);
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
          console.log('Özel rota sayfası için filtrelenen alanlar:', customFields);
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
  
  // Upload edilen görselleri localStorage'dan al
  const tourDetailImages = JSON.parse(localStorage.getItem('tourDetailImages') || '{}');
  const linkImages = tourDetailImages[data.link] || {};
  
  div.innerHTML = `
    <div class="tour-details-grid">
      <div class="edit-group">
        <label>Tur Linki:</label>
        <input type="text" placeholder="kapadokya" class="tour-detail-link" value="${data.link || ''}" />
      </div>
      <div class="edit-group">
        <label>Tur Başlığı:</label>
        <input type="text" placeholder="Kapadokya Kaşifi" class="tour-detail-title" value="${data.title || ''}" />
      </div>
      <div class="edit-group">
        <label>Tur Alt Başlığı:</label>
        <input type="text" placeholder="Uçhisar, Göreme ve vadilerin büyüleyici dünyası" class="tour-detail-subtitle" value="${data.subtitle || ''}" />
      </div>
    </div>
    <div class="tour-details-grid">
      <div class="edit-group">
        <label>Harita Görseli:</label>
        <div class="file-upload" style="margin-bottom: 8px;">
          <input type="file" class="tour-detail-mapimage-upload" accept="image/*" />
          📁 Harita Görseli Yükle
        </div>
        <img class="tour-detail-mapimage-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${linkImages.mapImage ? 'display: block;' : 'display: none;'}" src="${linkImages.mapImage || ''}" />
      </div>
      <div class="edit-group">
        <label>Harita Başlığı:</label>
        <input type="text" placeholder="Kapadokya Haritası" class="tour-detail-maptitle" value="${data.mapTitle || ''}" />
      </div>
      <div class="edit-group">
        <label>Harita Açıklaması:</label>
        <input type="text" placeholder="Tur güzergahı ve önemli noktalar" class="tour-detail-mapdesc" value="${data.mapDescription || ''}" />
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
            <img class="tour-detail-image1-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${linkImages.image1 ? 'display: block;' : 'display: none;'}" src="${linkImages.image1 || ''}" />
          </div>
          <div>
            <div class="file-upload" style="margin-bottom: 8px;">
              <input type="file" class="tour-detail-image2-upload" accept="image/*" />
              📁 Görsel 2
            </div>
            <img class="tour-detail-image2-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${linkImages.image2 ? 'display: block;' : 'display: none;'}" src="${linkImages.image2 || ''}" />
          </div>
          <div>
            <div class="file-upload" style="margin-bottom: 8px;">
              <input type="file" class="tour-detail-image3-upload" accept="image/*" />
              📁 Görsel 3
            </div>
            <img class="tour-detail-image3-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${linkImages.image3 ? 'display: block;' : 'display: none;'}" src="${linkImages.image3 || ''}" />
          </div>
          <div>
            <div class="file-upload" style="margin-bottom: 8px;">
              <input type="file" class="tour-detail-image4-upload" accept="image/*" />
              📁 Görsel 4
            </div>
            <img class="tour-detail-image4-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ${linkImages.image4 ? 'display: block;' : 'display: none;'}" src="${linkImages.image4 || ''}" />
          </div>
        </div>
      </div>
    </div>
    <div class="tour-details-grid tour-details-full-width">
      <div class="edit-group">
        <label>Tur Hakkında (Detaylı Açıklama):</label>
        <textarea placeholder="Tur hakkında detaylı bilgi yazın..." class="tour-detail-description" rows="4">${data.description || ''}</textarea>
      </div>
      <div class="edit-group">
        <label>Turun Öne Çıkan Özellikleri (Her satıra bir özellik):</label>
        <textarea placeholder="🏛️ Tarihi ve kültürel mekanları ziyaret&#10;🍽️ Yerel lezzetleri tatma fırsatı&#10;📸 Profesyonel fotoğraf çekimi&#10;🎁 Anı eşyaları satın alma imkanı" class="tour-detail-highlights" rows="4">${data.highlights ? data.highlights.join('\n') : ''}</textarea>
      </div>
    </div>
    <div class="tour-details-grid tour-details-full-width">
      <div class="edit-group">
        <label>Detaylı Tur Programı (Her satıra bir gün):</label>
        <textarea placeholder="Gün 1: Uçhisar – Göreme Açık Hava Müzesi&#10;Gün 2: Vadiler – Avanos seramik atölyesi&#10;Gün 3: Serbest zaman ve dönüş" class="tour-detail-itinerary" rows="4">${data.itinerary ? data.itinerary.join('\n') : ''}</textarea>
      </div>
    </div>
    <div class="tour-details-actions">
      <button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTourDetail(this)">🗑️ Bu Tur Detayını Sil</button>
    </div>
  `;
  
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

function saveTourImage(tourName, imageData) {
  let tourImages = JSON.parse(localStorage.getItem('tourImages') || '{}');
  tourImages[tourName] = imageData;
  localStorage.setItem('tourImages', JSON.stringify(tourImages));
}

// Ana sayfalarda içerikleri güncelle
if (window.location.pathname !== '/admin.html') {
  document.addEventListener('DOMContentLoaded', () => {
    ContentUpdater.updateSiteContent();
    
    // Gizli admin erişimi: Ctrl+Shift+A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        window.location.href = 'admin.html';
      }
    });
  });
}
