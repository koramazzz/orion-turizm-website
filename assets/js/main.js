(function(){
  try {
    var ls = window.localStorage;
    ['getItem','setItem','removeItem','clear'].forEach(function(k){
      if (ls && typeof ls[k] === 'function') {
        ls[k] = function(){ throw new Error('Local storage disabled'); };
      }
    });
    window.__LOCAL_STORAGE_DISABLED__ = true;
  } catch(e){ /* ignore */ }

  // Backend verilerini yükle ve sayfayı güncelle
  async function loadBackendData() {
    
    if (!window.preloader || !window.preloader.isInitialized) {
      console.warn('⚠️ Preloader henüz hazır değil');
      return;
    }

    try {
      // Site içeriklerini al
      const siteContent = await window.preloader.getCachedData('siteContent');
      
      if (siteContent) {
        updatePageWithSiteContent(siteContent);
      } else {
        console.warn('⚠️ Site içerikleri bulunamadı');
      }

      // Taşımacılık kurumlarını al
      const transportOrgs = await window.preloader.getCachedData('transportOrgs');
      
      if (transportOrgs && transportOrgs.length > 0) {
        populateOrgSelects(transportOrgs);
      } else {
        console.warn('⚠️ Taşımacılık kurumları bulunamadı');
      }

      // Hizmet verdiğimiz kurumları güncelle (site içeriklerinden)
      if (siteContent && siteContent.serviceOrganizations) {
        updateServiceOrganizations(siteContent.serviceOrganizations);
      }

      // Turları al
      const tours = await window.preloader.getCachedData('tours');
      if (tours && tours.length > 0) {
        updateTours(tours);
      }

      // Taşımacılık görsellerini yükle
      await loadTransportImages();

    } catch (error) {
      console.error('Backend veri yükleme hatası:', error);
    }
  }
  // Okul/Fabrika seçim listelerini backend'den doldur
  function populateOrgSelects(orgs){
    try{
      const schoolSelect = document.getElementById('schoolSelect');
      const factorySelect = document.getElementById('factorySelect');

      if (schoolSelect){
        schoolSelect.innerHTML = '<option value="">Seçiniz</option>';
        orgs.filter(o => (o.type||'').toLowerCase() === 'school')
           .forEach(o => {
             const opt = document.createElement('option');
             opt.value = o.name;
             opt.textContent = o.name;
             schoolSelect.appendChild(opt);
           });
      }

      if (factorySelect){
        factorySelect.innerHTML = '<option value="">Seçiniz</option>';
        orgs.filter(o => (o.type||'').toLowerCase() === 'factory')
           .forEach(o => {
             const opt = document.createElement('option');
             opt.value = o.name;
             opt.textContent = o.name;
             factorySelect.appendChild(opt);
           });
      }
    }catch(e){ console.warn('Seçim listeleri doldurulamadı', e); }
  }

  // Site içeriklerini sayfaya uygula
  function updatePageWithSiteContent(content) {
    
    // Carousel görsellerini güncelle
    const carousel = document.querySelector('.carousel');
    let carouselSet = false;
    if (content.carouselImages) {
      try {
        const images = JSON.parse(content.carouselImages);
        if (carousel && images && images.length > 0) {
          carousel.setAttribute('data-images', JSON.stringify(images));
          initializeCarousel();
          carouselSet = true;
        }
      } catch (e) { 
        console.warn('Carousel görselleri parse edilemedi:', e);
      }
    }
    if (carousel && !carouselSet) loadCarouselFromStorage();

    // Logo güncellemeleri
    // Üst menü logosu (header)
    if (content.headerLogo) {
      const headerImgs = document.querySelectorAll('.brand img');
      headerImgs.forEach(img => {
        img.src = content.headerLogo;
        img.hidden = false;
      });
    } else {
      // Header logo yoksa backend storage'dan yükle
      loadHeaderLogoFromStorage();
    }

    // Sayfa içi logo (iletişim bölümündeki logo)
    if (content.contentLogo) {
      const contentImgs = document.querySelectorAll('.contact-logo img');
      contentImgs.forEach(img => {
        img.src = content.contentLogo;
        img.hidden = false;
      });
    } else {
      // Content logo yoksa backend storage'dan yükle
      loadContentLogoFromStorage();
    }

    // İletişim bilgileri
    if (content.contactPhone) {
      const phoneElements = document.querySelectorAll('[data-contact="phone"]');
      phoneElements.forEach(el => {
        el.textContent = content.contactPhone;
      });
    }

    if (content.contactEmail) {
      const emailElements = document.querySelectorAll('[data-contact="email"]');
      emailElements.forEach(el => {
        el.textContent = content.contactEmail;
      });
    }

    if (content.contactAddress) {
      const addressElements = document.querySelectorAll('[data-contact="address"]');
      addressElements.forEach(el => {
        el.textContent = content.contactAddress;
      });
    }

    if (content.contactInstagram) {
      const instagramElements = document.querySelectorAll('[data-contact="instagram"]');
      instagramElements.forEach(el => {
        el.textContent = content.contactInstagram;
        if (el.tagName === 'A') {
          el.href = `https://instagram.com/${content.contactInstagram.replace('@', '')}`;
        }
      });
    }

    // Hakkımızda metni
    if (content.aboutText) {
      const aboutElements = document.querySelectorAll('[data-content="about"]');
      aboutElements.forEach(el => {
        el.textContent = content.aboutText;
      });
    }

    // Hakkımızda görseli
    if (content.aboutImage) {
      const aboutVisuals = document.querySelectorAll('.about-visual');
      aboutVisuals.forEach(visual => {
        visual.style.setProperty('--bg', `url(${content.aboutImage})`);
      });
    } else {
      // About image yoksa backend storage'dan yükle
      loadAboutImageFromStorage();
    }
  }

  // Header logosu için storage tabanlı yedek yükleyici (tüm sayfalar)
  function ensureHeaderLogoFallback(){
    try{
      const imgs = document.querySelectorAll('.brand img');
      if(!imgs || imgs.length === 0) return;

      // Herhangi birinde kaynak yoksa veya gizliyse yedek uygula
      var needsFallback = false;
      imgs.forEach(function(img){
        var src = img.getAttribute('src');
        if(!src || src === ''){ needsFallback = true; }
      });
      if(!needsFallback) return;

      if(window.backendManager && typeof window.backendManager.getImageUrl === 'function'){
        var url = window.backendManager.getImageUrl('site-images','logos/header.png');
        var cacheBuster = '?v=' + Date.now();
        imgs.forEach(function(img){
          img.src = url + cacheBuster;
          img.hidden = false;
          img.onerror = function(){ img.src = url; img.hidden = false; };
        });
      }
    }catch(e){ /* ignore */ }
  }

  // İçerik logosu (iletişim bölümü) için storage tabanlı yedek
  function ensureContentLogoFallback(){
    try{
      const imgs = document.querySelectorAll('.contact-logo img');
      if(!imgs || imgs.length === 0) return;

      var needsFallback = false;
      imgs.forEach(function(img){
        var src = img.getAttribute('src');
        if(!src || src === ''){ needsFallback = true; }
      });
      if(!needsFallback) return;

      if(window.backendManager && typeof window.backendManager.getImageUrl === 'function'){
        var url = window.backendManager.getImageUrl('site-images','logos/content.png');
        var cacheBuster = '?v=' + Date.now();
        imgs.forEach(function(img){
          img.src = url + cacheBuster;
          img.hidden = false;
          img.onerror = function(){ img.src = url; img.hidden = false; };
        });
      }
    }catch(e){ /* ignore */ }
  }


  // Ekran boyutuna göre kaç öğenin sığacağını hesapla
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

  // Hizmet verdiğimiz kurumları güncelle
  function updateServiceOrganizations(serviceOrgsData) {
    if (!serviceOrgsData) return;
    
    const serviceOrgs = serviceOrgsData.split('\n').filter(line => line.trim());
    const serviceOrgData = serviceOrgs.map(line => {
      const [name, url] = line.split('|');
      return { name: name?.trim(), url: url?.trim() };
    }).filter(item => item.name && item.url);
    
    const container = document.querySelector('#tasimacilik-kurumlari .logo-grid');
    if (!container) return;

    if (serviceOrgData.length === 0) {
      container.innerHTML = '<p class="muted">Henüz hizmet verdiğimiz kurum eklenmemiş.</p>';
      return;
    }

    // Ekran boyutuna göre kaç öğenin sığacağını hesapla
    const visibleItems = calculateVisibleItems();
    
    // Dinamik kaydırma için container oluştur (görünür öğe sayısından fazla varsa)
    if (serviceOrgData.length > visibleItems) {
      container.innerHTML = `
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
      addScrollButtons('#serviceOrgsScroll', '#serviceOrgsScrollLeft', '#serviceOrgsScrollRight');
    } else {
      // Az sayıda kurum varsa normal flex düzen kullan
      container.innerHTML = serviceOrgData.map(org => `
        <a class="logo-pill" href="${org.url}" target="_blank" rel="noopener" title="${org.name}">
          ${org.name}
        </a>
      `).join('');
    }
  }

  // Kaydırma butonları için yardımcı fonksiyon
  function addScrollButtons(scrollSelector, leftBtnSelector, rightBtnSelector) {
    const scrollContainer = document.querySelector(scrollSelector);
    const leftBtn = document.querySelector(leftBtnSelector);
    const rightBtn = document.querySelector(rightBtnSelector);
    
    if (!scrollContainer || !leftBtn || !rightBtn) return;
    
    leftBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });
    
    rightBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }

  // Turları güncelle
  function updateTours(tours) {
    // Bu fonksiyon turlar.html sayfasında daha detaylı implement edilecek
  }

  // Preloader hazır olduğunda verileri yükle
  function waitForPreloader() {
    
    if (window.preloader && window.preloader.isInitialized) {
      loadBackendData();
      // İçerik sonrası header logosu yoksa yedeği dene
      ensureHeaderLogoFallback();
      ensureContentLogoFallback();
    } else {
      setTimeout(waitForPreloader, 100);
    }
  }

  // Sayfa yüklendiğinde backend verilerini yükle
  document.addEventListener('DOMContentLoaded', function() {
    
    waitForPreloader();
    
    // Ekran boyutu değiştiğinde responsive düzeni yeniden hesapla
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        // Sayfa içeriğini yeniden yükle (responsive düzen için)
        if (window.preloader && window.preloader.isInitialized) {
          loadBackendData();
        }
      }, 250);
    });
  });

  // Preloader'dan veri güncellemesi geldiğinde sayfayı yenile
  window.addEventListener('preloader-data-updated', function() {
    loadBackendData();
    ensureHeaderLogoFallback();
    ensureContentLogoFallback();
  });
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('open');
    });
  }

  // Header scroll efekti
  var header = document.querySelector('.site-header');
  if(header){
    var lastScrollY = window.scrollY;
    var ticking = false;
    
    function updateHeader(){
      var scrollY = window.scrollY;
      
      if(scrollY > 100){
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      
      lastScrollY = scrollY;
      ticking = false;
    }
    
    function requestTick(){
      if(!ticking){
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
  }

  // Footer year
  var yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

  // Global modals for routes & student selector
  function openModal(id){
    var m = document.getElementById(id); if(!m) return; m.setAttribute('aria-hidden','false');
  }
  function closeModal(e){
    var t = e.target; if(!t) return; var m = t.closest('.modal'); if(!m) return; m.setAttribute('aria-hidden','true');
  }
  ['routesModal','studentModal','factoryModal'].forEach(function(id){
    var m = document.getElementById(id); if(!m) return;
    m.querySelectorAll('[data-close]').forEach(function(x){ x.addEventListener('click', closeModal); });
  });
  var navRoutes = document.getElementById('navRoutes');
  if(navRoutes){ navRoutes.addEventListener('click', function(e){ e.preventDefault(); openModal('routesModal'); }); }
  var navStudent = document.getElementById('navStudent');
  if(navStudent){ navStudent.addEventListener('click', function(e){ e.preventDefault(); openModal('studentModal'); }); }
  var navFactory = document.getElementById('navFactory');
  if(navFactory){ navFactory.addEventListener('click', function(e){ e.preventDefault(); openModal('factoryModal'); }); }
  var gotoStudent = document.getElementById('gotoStudent');
  if(gotoStudent){
    gotoStudent.addEventListener('click', function(){
      var s = document.getElementById('schoolSelect');
      var val = s && s.value ? s.value : '';
      if(val) {
        window.location.href = 'kurum.html?org=' + encodeURIComponent(val);
      } else {
        alert('Lütfen bir okul seçin.');
      }
    });
  }
  var gotoFactory = document.getElementById('gotoFactory');
  if(gotoFactory){
    gotoFactory.addEventListener('click', function(){
      var s = document.getElementById('factorySelect');
      var val = s && s.value ? s.value : '';
      if(val) {
        window.location.href = 'kurum.html?org=' + encodeURIComponent(val);
      } else {
        alert('Lütfen bir fabrika seçin.');
      }
    });
  }

  // Simple image carousel on homepage
  // NOT: Carousel admin.js tarafından yönetiliyor (Supabase Storage entegrasyonu için)
  // Eğer admin.js yüklü değilse fallback olarak çalışır
  var carousel = document.querySelector('.carousel');
  if (carousel && !window.adminPanel){
    // Sadece admin.js yoksa carousel'i başlat
    setTimeout(function(){
      // admin.js'in yüklenmesini bekle
      if(window.backendManager) return; // admin.js var, skip et
      
      try{
        var images = JSON.parse(carousel.getAttribute('data-images'));
        var imgEl = carousel.querySelector('img');
        var dots = carousel.querySelector('.carousel-dots');
        var index = 0;
        function render(){
          if(!images || !images.length) return;
          imgEl.src = images[index];
          dots.innerHTML = '';
          images.forEach(function(_,i){
            var b = document.createElement('button');
            if(i===index) b.classList.add('active');
            b.addEventListener('click', function(){ index = i; render(); });
            dots.appendChild(b);
          });
        }
        render();
        setInterval(function(){ index = (index+1)%images.length; render(); }, 4000);
      }catch(e){ /* ignore */ }
    }, 500); // admin.js'in initialize olmasını bekle
  }

  // Scroll reveal
  (function initReveal(){
    var revealEls = document.querySelectorAll('[data-reveal]');
    if(!('IntersectionObserver' in window) || !revealEls.length){
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.15 });
    revealEls.forEach(function(el){ io.observe(el); });
  })();

  // Rotating testimonials (placeholder random)
  var quotes = [
    {q:'Harika bir deneyimdi, tüm süreç çok profesyoneldi.', a:'— Sevgi A.'},
    {q:'Araçlar temiz ve konforluydu. Tavsiye ederim.', a:'— Mehmet K.'},
    {q:'Planlama ve iletişim çok iyiydi, teşekkürler.', a:'— Elif D.'},
  ];
  var quoteEl = document.getElementById('testimonial-quote');
  var authorEl = document.getElementById('testimonial-author');
  var dotsEl = document.querySelector('.testimonial-dots');
  if(quoteEl && authorEl && dotsEl){
    var qi = 0;
    function renderQuote(){
      var c = quotes[qi];
      quoteEl.textContent = c.q; authorEl.textContent = c.a;
      dotsEl.innerHTML='';
      quotes.forEach(function(_,i){
        var b = document.createElement('button');
        if(i===qi) b.classList.add('active');
        b.addEventListener('click', function(){ qi=i; renderQuote(); });
        dotsEl.appendChild(b);
      });
    }
    renderQuote();
    setInterval(function(){ qi=(qi+1)%quotes.length; renderQuote(); }, 4500);
  }

  // Forms: backend entegrasyonu ile form gönderimi
  function handleForm(formId, statusId){
    var form = document.getElementById(formId);
    var status = document.getElementById(statusId);
    if(!form || !status) return;
    
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      status.textContent = 'Gönderiliyor...';
      
      try {
        // Form verilerini topla
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
          data[key] = value;
        }
        
        // Form tipini belirle
        let formType = 'contactForm';
        if (formId === 'toursForm') formType = 'toursForm';
        else if (formId === 'customRouteForm') formType = 'customRouteForm';
        
        // Backend'e kaydet
        if (window.backendManager) {
          try {
            await window.backendManager.saveFormSubmission(formType, data);
          } catch (error) {
            console.warn('Form backend\'e kaydedilemedi:', error);
          }
        }
        
        // Admin'e mail gönder (Web3Forms)
        try {
          // ─────────────────────────────────────────────────
          // Web3Forms erişim anahtarı:
          //   1. https://web3forms.com adresine git
          //   2. koramazomerfaruk@gmail.com adresini gir
          //   3. Gelen e-postadaki anahtarı buraya yapıştır
          // ─────────────────────────────────────────────────
          const WEB3FORMS_KEY = 'fcb83578-e1c5-42e0-ad20-8cd799189176';

          if (WEB3FORMS_KEY && WEB3FORMS_KEY !== 'BURAYA_WEB3FORMS_ANAHTARINI_YAZ') {
            const formTitles = {
              contactForm:      '🔔 Orion Turizm — Yeni İletişim Formu',
              toursForm:        '🎫 Orion Turizm — Yeni Tur Rezervasyon Talebi',
              customRouteForm:  '🗺️ Orion Turizm — Yeni Özel Rota Talebi',
            };
            const subject = formTitles[formType] || '📝 Orion Turizm — Yeni Form Gönderimi';

            // Form alanlarını okunabilir satırlara çevir
            const bodyLines = Object.entries(data)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n');

            const emailResponse = await fetch('https://api.web3forms.com/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_key:  WEB3FORMS_KEY,
                subject:     subject,
                from_name:   'Orion Turizm Website',
                message:     `${bodyLines}\n\nGönderim: ${new Date().toLocaleString('tr-TR')}`,
                ...data
              })
            });

            const emailResult = await emailResponse.json();
            if (!emailResult.success) {
              console.error('Mail gönderilemedi:', emailResult);
            }
          } else {
            console.warn('Web3Forms anahtarı ayarlanmamış — mail gönderilmedi.');
          }
        } catch (emailError) {
          console.error('Mail gönderim hatası:', emailError);
          // Mail hatası form gönderimini engellemez
        }
        
        // Başarı mesajı
        status.textContent = 'Talebiniz alındı. En kısa sürede dönüş yapacağız.';
        form.reset();
        
      } catch (error) {
        console.error('Form gönderim hatası:', error);
        status.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      }
    });
  }
  handleForm('contactForm','contactStatus');
  handleForm('customRouteForm','customRouteStatus');
  handleForm('toursForm','toursFormStatus');

  // Range output updater
  document.querySelectorAll('.range-wrap').forEach(function(w){
    var r = w.querySelector('input[type="range"]');
    var o = w.querySelector('output');
    if(!r || !o) return; o.textContent = r.value;
    r.addEventListener('input', function(){ o.textContent = r.value; });
  });

  // Student page: populate driver by school
  function getParam(name){
    var p = new URLSearchParams(window.location.search); return p.get(name);
  }
  var driverData = {
    'Orion Koleji': { name:'Ahmet Yılmaz', phone:'0 (5xx) 111 22 33', photo:'https://images.unsplash.com/photo-1606346607215-cf5238ebc79e?q=80&w=400&auto=format&fit=crop', note:'Güzergâh: Serdivan - Orion Koleji' },
    'Sakarya Lisesi': { name:'Mehmet Demir', phone:'0 (5xx) 222 33 44', photo:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop', note:'Güzergâh: Erenler - Sakarya Lisesi' },
    'Ada Koleji': { name:'Elif Korkmaz', phone:'0 (5xx) 333 44 55', photo:'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=400&auto=format&fit=crop', note:'Güzergâh: Adapazarı - Ada Koleji' }
  };
  var schoolSelectPage = document.getElementById('schoolSelectPage');
  function renderDriver(school){
    var d = driverData[school || ''];
    var card = document.getElementById('driverCard'); if(!card) return;
    if(!d){ card.hidden = true; return; }
    card.hidden = false;
    var img = document.getElementById('driverPhoto'); if(img) img.src = d.photo;
    var nm = document.getElementById('driverName'); if(nm) nm.textContent = d.name + ' — ' + (school||'');
    var ph = document.getElementById('driverPhone'); if(ph) ph.textContent = d.phone;
    var nt = document.getElementById('driverNote'); if(nt) nt.textContent = d.note;
    var link = document.getElementById('trackingLink'); if(link) link.href = 'https://takip.orion.example/school?name=' + encodeURIComponent(school);
  }
  if(schoolSelectPage){
    var init = getParam('school');
    if(init){ schoolSelectPage.value = init; renderDriver(init); }
    schoolSelectPage.addEventListener('change', function(){ renderDriver(schoolSelectPage.value); });
  }

  // Tour details page content by query param - Admin panelinden yüklenir
  var tourMap = {};
  
  // Tur detayları backend'den gelecek; şimdilik varsayılan veriler
  function loadTourDetailsFromAdmin() {
    // localStorage kaldırıldı; backend entegrasyonu eklenecek
    tourMap = {
      kapadokya: {
        title: 'Kapadokya Kaşifi',
        subtitle: 'Uçhisar, Göreme ve vadilerin büyüleyici dünyası.',
        mapImage: 'https://images.unsplash.com/photo-1468109320504-ff0cd3d2d0fc?q=80&w=1200&auto=format&fit=crop',
        mapTitle: 'Kapadokya Tur Güzergâhı',
        mapDescription: 'Göreme, Uçhisar, Avanos ve vadiler',
        images:[
          'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1516542076529-1ea3854896e1?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-14b1e0d35b47?q=80&w=800&auto=format&fit=crop'
        ],
        description: 'Göreme Açık Hava Müzesi\nUçhisar Kalesi\nAvanos seramik atölyeleri',
        highlights: [
          '🏛️ Göreme Açık Hava Müzesi ziyareti',
          '🏰 Uçhisar Kalesi manzara noktası',
          '🏺 Avanos seramik atölyesi deneyimi',
          '🎈 Balon turu opsiyonu (ek ücret)'
        ],
        itinerary:['Uçhisar - Göreme Açık Hava Müzesi','Vadiler - Avanos seramik atölyesi','Serbest zaman ve dönüş']
      }
    };
  }
  
  // Sayfa yüklendiğinde tur detaylarını yükle
  loadTourDetailsFromAdmin();
  
  // Tur detay sayfasındaysa verileri yeniden yükle
  if (window.location.pathname.includes('tur-detay.html')) {
    loadTourDetailsFromAdmin();
  }
  
  var params = new URLSearchParams(window.location.search);
  var tourKey = params.get('tour');
  var tour = tourMap[tourKey||''] || null;
  if(tour){
    // Temel bilgiler
    var tTitle = document.getElementById('tourTitle'); if(tTitle) tTitle.textContent = tour.title;
    var tSub = document.getElementById('tourSubtitle'); if(tSub) tSub.textContent = tour.subtitle;
    
    // Harita bilgileri
    var mapImage = document.getElementById('mapImage'); 
    if(mapImage){
      var mapSrc = tour.mapImage || '';
      if (mapSrc) mapImage.style.setProperty('--bg', 'url(' + mapSrc + ')');
    }
    
    // Galeri
    var g = document.getElementById('tourGallery');
    if(g){ 
      var imgs = g.querySelectorAll('img'); 
      var gallery = tour.images || [];
      imgs.forEach(function(img, idx){ 
        img.src = gallery[idx] || gallery[0] || '';
        img.alt = tour.title + ' - Fotoğraf ' + (idx + 1);
      });
    }
    
    // Tur açıklaması
    var description = document.getElementById('tourDescription');
    if(description && tour.description) {
      var descriptionLines = String(tour.description).split('\n').map(function(line) {
        return line.trim();
      }).filter(Boolean);
      description.innerHTML = '';
      descriptionLines.forEach(function(line, index) {
        var li = document.createElement('li');
        li.style.padding = '8px 0';
        if (index < descriptionLines.length - 1) li.style.borderBottom = '1px solid #eee';
        li.textContent = line;
        description.appendChild(li);
      });
    }
    
    // Tur öne çıkan özellikleri
    var highlights = document.getElementById('tourHighlights');
    if(highlights && tour.highlights) {
      highlights.innerHTML = '';
      tour.highlights.forEach(function(highlight) {
        var li = document.createElement('li');
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid #eee';
        li.textContent = highlight;
        highlights.appendChild(li);
      });
    }
    
    // Tur programı
    var itin = document.getElementById('itineraryList');
    if(itin){ 
      itin.innerHTML = ''; 
      tour.itinerary.forEach(function(item){ 
        var li=document.createElement('li'); 
        li.textContent = item; 
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px solid #f0f0f0';
        li.style.fontSize = '1.1rem';
        li.style.lineHeight = '1.6';
        itin.appendChild(li); 
      }); 
    }
  }

  // Fotoğraf modalı durumu (yan oklarla gezme için)
  var modalGalleryImages = [];
  var modalCurrentIndex = -1;

  function showModalImageAt(index) {
    var modalImage = document.getElementById('modalImage');
    if (!modalImage || !modalGalleryImages.length) return;
    var safeIndex = (index + modalGalleryImages.length) % modalGalleryImages.length;
    modalCurrentIndex = safeIndex;
    modalImage.src = modalGalleryImages[safeIndex];
  }

  function closeImageModal() {
    var modal = document.getElementById('imageModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    var modalImage = modal.querySelector('#modalImage');
    if (modalImage) modalImage.removeAttribute('src');
    document.body.style.overflow = '';
    modalGalleryImages = [];
    modalCurrentIndex = -1;
  }

  function getMapImageSrc(mapEl) {
    if (!mapEl) return '';
    var datasetUrl = (mapEl.dataset && mapEl.dataset.mapImageUrl) ? mapEl.dataset.mapImageUrl : '';
    if (datasetUrl) return datasetUrl;

    var bgVar = '';
    try {
      bgVar = getComputedStyle(mapEl).getPropertyValue('--bg') || '';
    } catch (err) {}
    var fromVar = bgVar.match(/url\((['"]?)(.*?)\1\)/i);
    if (fromVar && fromVar[2]) return fromVar[2];

    var bgImage = '';
    try {
      bgImage = getComputedStyle(mapEl).backgroundImage || '';
    } catch (err) {}
    var fromBg = bgImage.match(/url\((['"]?)(.*?)\1\)/i);
    return (fromBg && fromBg[2]) ? fromBg[2] : '';
  }

  // Fotoğraf modalı fonksiyonu
  window.openImageModal = function(imageSrc, imageList, imageIndex) {
    var modal = document.getElementById('imageModal');
    if(modal && imageSrc) {
      var gallery = Array.isArray(imageList) && imageList.length ? imageList : [imageSrc];
      modalGalleryImages = gallery;
      modalCurrentIndex = typeof imageIndex === 'number' ? imageIndex : gallery.indexOf(imageSrc);
      if (modalCurrentIndex < 0) modalCurrentIndex = 0;
      showModalImageAt(modalCurrentIndex);
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  };

  // Galeri görsellerine tek yerden tıklama davranışı ekle
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!(target instanceof HTMLImageElement) || !target.closest('#tourGallery')) return;
    var galleryImages = Array.from(document.querySelectorAll('#tourGallery img'))
      .map(function(img) { return img.src; })
      .filter(Boolean);
    var currentIndex = galleryImages.indexOf(target.src);
    window.openImageModal(target.src, galleryImages, currentIndex);
  });

  // Harita görselini ayrı olarak aç (galeri geçişine dahil etme)
  document.addEventListener('click', function(e) {
    var mapEl = e.target.closest('#mapImage');
    if (!mapEl) return;
    var mapSrc = getMapImageSrc(mapEl);
    if (!mapSrc || typeof window.openImageModal !== 'function') return;
    window.openImageModal(mapSrc, [mapSrc], 0);
  });

  // Modal kapatma fonksiyonu
  document.addEventListener('click', function(e) {
    if(e.target.hasAttribute('data-close')) {
      var modal = e.target.closest('.modal');
      if (modal && modal.id === 'imageModal') closeImageModal();
    }
  });

  // ESC ile kapat, yan oklarla galeri içinde ilerle
  document.addEventListener('keydown', function(e) {
    var modal = document.getElementById('imageModal');
    var isImageModalOpen = modal && modal.getAttribute('aria-hidden') === 'false';
    if (!isImageModalOpen) return;

    if (e.key === 'Escape') {
      closeImageModal();
      return;
    }

    if (e.key === 'ArrowRight' && modalGalleryImages.length > 1) {
      e.preventDefault();
      showModalImageAt(modalCurrentIndex + 1);
      return;
    }

    if (e.key === 'ArrowLeft' && modalGalleryImages.length > 1) {
      e.preventDefault();
      showModalImageAt(modalCurrentIndex - 1);
    }
  });

  // Taşımacılık görsellerini backend'den yükle
  async function loadTransportImages() {
    if (!window.backendManager) return;

    try {
      // Öğrenci Servisi Görseli
      try {
        const studentServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/studentService.png');
        const studentBg = document.querySelector('[data-student-service-bg]');
        if (studentBg) {
          const response = await fetch(studentServiceUrl, { method: 'HEAD' });
          if (response.ok) {
            studentBg.style.setProperty('--bg', `url('${studentServiceUrl}?v=${Date.now()}')`);
          }
        }
      } catch (error) {
      }

      // Personel Servisi Görseli
      try {
        const staffServiceUrl = window.backendManager.getImageUrl('site-images', 'transport/staffService.png');
        const staffBg = document.querySelector('[data-staff-service-bg]');
        if (staffBg) {
          const response = await fetch(staffServiceUrl, { method: 'HEAD' });
          if (response.ok) {
            staffBg.style.setProperty('--bg', `url('${staffServiceUrl}?v=${Date.now()}')`);
          }
        }
      } catch (error) {
      }

    } catch (error) {
      console.error('Taşımacılık görselleri yüklenirken hata:', error);
    }
  }

  // Header logo'yu backend storage'dan yükle
  async function loadHeaderLogoFromStorage() {
    if (!window.backendManager) return;
    
    try {
      const headerLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/header.png');
      const cacheBuster = `?v=${Date.now()}`;
      const headerImgs = document.querySelectorAll('.brand img');
      
      if (headerImgs.length > 0) {
        const response = await fetch(headerLogoUrl, { method: 'HEAD' });
        if (response.ok) {
          headerImgs.forEach(img => {
            img.src = headerLogoUrl + cacheBuster;
            img.hidden = false;
            img.onerror = () => {
              console.warn('Header logo yüklenemedi, cache-buster olmadan deneniyor');
              img.src = headerLogoUrl;
            };
          });
        } else {
          console.warn('⚠️ Header logo backend storage\'da bulunamadı');
        }
      }
    } catch (error) {
      console.error('❌ Header logo yükleme hatası:', error);
    }
  }

  // Content logo'yu backend storage'dan yükle
  async function loadContentLogoFromStorage() {
    if (!window.backendManager) return;
    
    try {
      const contentLogoUrl = window.backendManager.getImageUrl('site-images', 'logos/content.png');
      const cacheBuster = `?v=${Date.now()}`;
      const contentImgs = document.querySelectorAll('.contact-logo img');
      
      if (contentImgs.length > 0) {
        const response = await fetch(contentLogoUrl, { method: 'HEAD' });
        if (response.ok) {
          contentImgs.forEach(img => {
            img.src = contentLogoUrl + cacheBuster;
            img.hidden = false;
            img.onerror = () => {
              console.warn('Content logo yüklenemedi, cache-buster olmadan deneniyor');
              img.src = contentLogoUrl;
            };
          });
        } else {
          console.warn('⚠️ Content logo backend storage\'da bulunamadı');
        }
      }
    } catch (error) {
      console.error('❌ Content logo yükleme hatası:', error);
    }
  }

  // About image'ı backend storage'dan yükle
  async function loadAboutImageFromStorage() {
    if (!window.backendManager) return;
    
    try {
      // Farklı path'leri dene (Supabase storage tablosuna göre)
      const possiblePaths = [
        'about/main.png',  // Gerçek path (storage tablosunda görülen)
      ];
      
      const aboutVisuals = document.querySelectorAll('.about-visual');
      if (aboutVisuals.length === 0) return;
      
      let found = false;
      
      for (const path of possiblePaths) {
        try {
          const aboutImageUrl = window.backendManager.getImageUrl('site-images', path);
          
          const response = await fetch(aboutImageUrl, { method: 'HEAD' });
          if (response.ok) {
            const cacheBuster = `?v=${Date.now()}`;
            aboutVisuals.forEach(visual => {
              visual.style.setProperty('--bg', `url('${aboutImageUrl}${cacheBuster}')`);
            });
            found = true;
            break;
          } else {
          }
        } catch (error) {
        }
      }
      
      if (!found) {
        console.warn('⚠️ About image hiçbir path\'te bulunamadı');
      }
    } catch (error) {
      console.error('❌ About image yükleme hatası:', error);
    }
  }

  // Carousel görsellerini backend storage'dan yükle
  async function loadCarouselFromStorage() {
    if (!window.backendManager) return;
    
    try {
      const carousel = document.querySelector('.carousel');
      if (!carousel) return;
      
      const images = [];
      
      // Farklı carousel path'lerini dene (Supabase storage tablosuna göre)
      const possiblePaths = [
        'carousel/slide-{i}.png'
      ];
      
      // Carousel görsellerini yükle (sınırsız - slide-0, slide-1, ... 404 gelene kadar)
      for (let i = 0; i < 50; i++) {
        let found = false;
        for (const pathTemplate of possiblePaths) {
          const path = pathTemplate.replace('{i}', i);
          try {
            const carouselUrl = window.backendManager.getImageUrl('site-images', path);
            const response = await fetch(carouselUrl, { method: 'HEAD' });
            if (response.ok) {
              images.push(carouselUrl);
              found = true;
              break;
            }
          } catch (error) {}
        }
        if (!found) break;
      }
      
      if (images.length > 0) {
        carousel.setAttribute('data-images', JSON.stringify(images));
        
        // Carousel'i yeniden başlat
        initializeCarousel();
      } else {
        console.warn('⚠️ Hiç carousel görseli yüklenemedi');
      }
    } catch (error) {
      console.error('❌ Carousel yükleme hatası:', error);
    }
  }

  // Carousel'i başlat
  function initializeCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;
    
    const carouselImg = carousel.querySelector('img');
    const dots = carousel.querySelector('.carousel-dots');
    
    if (!carouselImg || !dots) {
      console.warn('⚠️ Carousel img veya dots bulunamadı');
      return;
    }
    
    const dataImages = carousel.getAttribute('data-images');
    if (!dataImages) {
      console.warn('⚠️ Carousel data-images bulunamadı');
      return;
    }
    
    try {
      const images = JSON.parse(dataImages);
      if (!images || images.length === 0) {
        console.warn('⚠️ Carousel görselleri boş');
        return;
      }
      
      
      // Görselleri önceden yükle (beyaz flash önleme)
      images.forEach(url => {
        const img = new Image();
        img.src = url;
      });
      
      let currentIndex = 0;
      
      const renderCarousel = () => {
        const nextUrl = images[currentIndex];
        
        // Fade out
        carouselImg.style.opacity = '0';
        
        setTimeout(() => {
          // Yeni görseli yükle - sadece yüklendikten sonra fade in (beyaz flash önlenir)
          const doFadeIn = () => {
            carouselImg.style.opacity = '1';
          };
          carouselImg.onload = doFadeIn;
          carouselImg.onerror = doFadeIn;
          carouselImg.src = nextUrl;
          
          // Dots'ları güncelle
          dots.innerHTML = '';
          images.forEach((_, i) => {
            const btn = document.createElement('button');
            if (i === currentIndex) btn.classList.add('active');
            btn.addEventListener('click', () => {
              currentIndex = i;
              renderCarousel();
            });
            dots.appendChild(btn);
          });
        }, 80);
      };
      
      // CSS transition ekle
      carouselImg.style.transition = 'opacity 0.25s ease-in-out';
      
      // İlk görseli göster
      renderCarousel();
      
      // Önceki interval varsa temizle (çoklu çağrıda sızıntı önleme)
      if (window.__carouselInterval) clearInterval(window.__carouselInterval);
      // Auto-rotate (4 saniyede bir)
      window.__carouselInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % images.length;
        renderCarousel();
      }, 4000);
      
      
    } catch (error) {
      console.error('❌ Carousel başlatma hatası:', error);
    }
  }

  // =====================================================
  // POPUP SİSTEMİ FONKSİYONLARI
  // =====================================================

  // Kullanıcının IP adresini al
  async function getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('IP adresi alınamadı, fallback kullanılıyor');
      // Fallback: rastgele bir değer (aynı tarayıcıda aynı kalacak)
      return 'unknown-' + Math.random().toString(36).substr(2, 9);
    }
  }

  // Popup görüntüleme geçmişini kontrol et
  async function checkPopupViewHistory() {
    try {
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        return false;
      }
      
      const userIP = await getUserIP();
      
      if (!userIP || userIP === 'unknown') {
        return false;
      }
      
      const { data, error } = await window.supabase
        .from('popup_views')
        .select('viewed_at')
        .eq('ip_address', userIP)
        .single();

      if (error) {
        return false;
      }

      if (!data) {
        return false;
      }

      const lastViewed = new Date(data.viewed_at);
      const now = new Date();
      const hoursDiff = (now - lastViewed) / (1000 * 60 * 60);

      const showOnce = window.popupShowOnce;
      
      if (showOnce) {
        return true;
      } else {
        return hoursDiff < 3;
      }
    } catch (error) {
      return false;
    }
  }

  // Popup görüntüleme kaydını oluştur/güncelle
  async function recordPopupView() {
    try {
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        return;
      }
      
      const userIP = await getUserIP();
      
      if (!userIP || userIP === 'unknown') {
        return;
      }
      
      const userAgent = navigator.userAgent;
      
      const { data, error } = await window.supabase
        .from('popup_views')
        .upsert({
          ip_address: userIP,
          user_agent: userAgent,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'ip_address'
        })
        .select();

      if (error) {
        console.error('Popup görüntüleme kaydı oluşturulurken hata:', error);
      }
    } catch (error) {
      console.error('Popup görüntüleme kaydı oluşturulurken hata:', error);
    }
  }

  // Popup ayarlarını yükle ve göster
  async function loadAndShowPopup() {
    try {
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        return;
      }

      // Popup ayarlarını al (en son güncellenen kaydı al)
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

      if (!data) {
        return;
      }

      if (!data || !data.is_active) {
        return;
      }

      // Popup görüntüleme geçmişini kontrol et
      try {
        const hasViewed = await checkPopupViewHistory();
        
        if (data.show_once) {
          // Sadece bir kez göster
          if (hasViewed) {
            return;
          }
        } else {
          // 3 saatte bir göster
          if (hasViewed) {
            return;
          }
        }
      } catch (error) {
        // Hata durumunda popup göster
      }

      // Popup'ı göster
      showPopup(data);

      // Popup ayarlarını kaydet
      window.popupShowOnce = data.show_once;

    } catch (error) {
      console.error('Popup yüklenirken hata:', error);
    }
  }

  // Popup'ı göster
  function showPopup(popupData) {
    // Mevcut popup varsa kaldır
    const existingPopup = document.getElementById('sitePopup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Popup gösterildi olarak işaretle
    window.popupShown = true;

    // Link URL'sini düzelt
    let linkUrl = popupData.link_url;
    if (linkUrl && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://') && !linkUrl.startsWith('mailto:') && !linkUrl.startsWith('tel:')) {
      linkUrl = 'https://' + linkUrl;
    }

    // Popup HTML'i oluştur
    const popupHtml = `
      <div id="sitePopup" class="popup-overlay">
        <div class="popup-container">
          <button class="popup-close" onclick="closeSitePopup()" aria-label="Popup'ı kapat">&times;</button>
          <div class="popup-content-wrapper">
            ${popupData.image_url ? `<img src="${popupData.image_url}" alt="Popup görseli" class="popup-image">` : ''}
            ${popupData.title ? `<h3 class="popup-title">${popupData.title}</h3>` : ''}
            ${popupData.content ? `<p class="popup-content">${popupData.content}</p>` : ''}
            ${linkUrl ? `<a href="${linkUrl}" target="_blank" class="popup-link">${popupData.link_text || 'Detay'}</a>` : ''}
          </div>
        </div>
      </div>
    `;

    // Popup'ı sayfaya ekle
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeSitePopup();
      }
    });

    // Overlay'e tıklayınca kapatma
    document.getElementById('sitePopup').addEventListener('click', function(e) {
      if (e.target === this) {
        closeSitePopup();
      }
    });

  }

  // Popup'ı kapat
  async function closeSitePopup() {
    const popup = document.getElementById('sitePopup');
    if (popup) {
      popup.style.animation = 'popupFadeOut 0.3s ease-out';
      setTimeout(async () => {
        popup.remove();
        window.popupShown = false;
        
        // Popup kapatıldığında görüntüleme kaydını oluştur
        await recordPopupView();
      }, 300);
    }
  }

  // Popup fade out animasyonu için CSS ekle
  const popupFadeOutCSS = `
    @keyframes popupFadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;

  // CSS'i head'e ekle
  const style = document.createElement('style');
  style.textContent = popupFadeOutCSS;
  document.head.appendChild(style);

  // Sayfa yüklendiğinde popup'ı kontrol et
  document.addEventListener('DOMContentLoaded', function() {
    // Kısa bir gecikme ile popup'ı göster (sayfa tamamen yüklendikten sonra)
    setTimeout(() => {
      loadAndShowPopup();
    }, 1000);
  });

  // Popup fonksiyonlarını global olarak erişilebilir yap
  window.closeSitePopup = closeSitePopup;
  

})();
