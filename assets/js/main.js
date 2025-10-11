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
    console.log('🔍 Backend veri yükleme başlatılıyor...');
    
    if (!window.preloader || !window.preloader.isInitialized) {
      console.warn('⚠️ Preloader henüz hazır değil');
      return;
    }

    try {
      // Site içeriklerini al
      console.log('📥 Site içerikleri yükleniyor...');
      const siteContent = await window.preloader.getCachedData('siteContent');
      console.log('📊 Site içerikleri:', siteContent);
      
      if (siteContent) {
        console.log('✅ Site içerikleri bulundu, sayfa güncelleniyor...');
        updatePageWithSiteContent(siteContent);
      } else {
        console.warn('⚠️ Site içerikleri bulunamadı');
      }

      // Taşımacılık kurumlarını al
      console.log('🚌 Taşımacılık kurumları yükleniyor...');
      const transportOrgs = await window.preloader.getCachedData('transportOrgs');
      console.log('🏢 Taşımacılık kurumları:', transportOrgs);
      
      if (transportOrgs && transportOrgs.length > 0) {
        console.log('✅ Taşımacılık kurumları bulundu, güncelleniyor...');
        updateTransportOrgs(transportOrgs);
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
    console.log('🔄 Site içerikleri sayfaya uygulanıyor...');
    
    // Carousel görsellerini güncelle
    if (content.carouselImages) {
      console.log('🖼️ Carousel görselleri bulundu:', content.carouselImages);
      try {
        const images = JSON.parse(content.carouselImages);
        console.log('📸 Parse edilen görseller:', images);
        
        const carousel = document.querySelector('.carousel');
        if (carousel && images && images.length > 0) {
          console.log('✅ Carousel bulundu, görseller güncelleniyor...');
          carousel.setAttribute('data-images', JSON.stringify(images));
          // Carousel'i yeniden başlat
          if (window.initializeCarousel) {
            console.log('🔄 Carousel yeniden başlatılıyor...');
            window.initializeCarousel();
          }
        } else {
          console.warn('⚠️ Carousel bulunamadı veya görseller boş');
        }
      } catch (e) {
        console.error('❌ Carousel görselleri parse edilemedi:', e);
      }
    }

    // Logo güncellemeleri
    // Üst menü logosu (header)
    if (content.headerLogo) {
      const headerImgs = document.querySelectorAll('.brand img');
      headerImgs.forEach(img => {
        img.src = content.headerLogo;
        img.hidden = false;
      });
    }

    // Sayfa içi logo (iletişim bölümündeki logo)
    if (content.contentLogo) {
      const contentImgs = document.querySelectorAll('.contact-logo img');
      contentImgs.forEach(img => {
        img.src = content.contentLogo;
        img.hidden = false;
      });
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

  // Taşımacılık kurumlarını güncelle
  function updateTransportOrgs(orgs) {
    console.log('🔄 Taşımacılık kurumları güncelleniyor:', orgs);
    
    const container = document.querySelector('.transport-orgs-grid');
    if (!container) {
      console.warn('⚠️ .transport-orgs-grid container bulunamadı');
      return;
    }

    container.innerHTML = '';
    console.log('✅ Container temizlendi, kurumlar ekleniyor...');

    orgs.forEach(org => {
      console.log('🏢 Kurum ekleniyor:', org.name);
      const orgElement = document.createElement('div');
      orgElement.className = 'transport-org-card';
      
      let logoHtml = '';
      if (org.logo_url) {
        logoHtml = `<img src="${org.logo_url}" alt="${org.name}" class="org-logo">`;
      }

      // URL'leri düzelt - protokol yoksa https:// ekle
      const fixUrl = (url) => {
        if (url && !url.match(/^https?:\/\//)) {
          return 'https://' + url;
        }
        return url;
      };

      orgElement.innerHTML = `
        ${logoHtml}
        <h3>${org.name}</h3>
        ${org.description ? `<p class="muted">${org.description}</p>` : ''}
        <div class="org-links">
          ${org.contract_url ? `<a href="${fixUrl(org.contract_url)}" target="_blank" class="btn btn-outline btn-sm">Sözleşme</a>` : ''}
          ${org.vita_web_url ? `<a href="${fixUrl(org.vita_web_url)}" target="_blank" class="btn btn-outline btn-sm">Web</a>` : ''}
          ${org.vita_app_url ? `<a href="${fixUrl(org.vita_app_url)}" target="_blank" class="btn btn-outline btn-sm">App</a>` : ''}
          ${org.payment_url ? `<a href="${fixUrl(org.payment_url)}" target="_blank" class="btn btn-primary btn-sm">Ödeme</a>` : ''}
        </div>
      `;

      container.appendChild(orgElement);
    });
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

    // Responsive kaydırma sistemi - her zaman kullan
    container.innerHTML = serviceOrgData.map(org => `
      <a class="logo-pill" href="${org.url}" target="_blank" rel="noopener" title="${org.name}">
        ${org.name}
      </a>
    `).join('');
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
    console.log('⏳ Preloader durumu kontrol ediliyor...');
    console.log('🔍 window.preloader:', window.preloader);
    console.log('🔍 isInitialized:', window.preloader ? window.preloader.isInitialized : 'undefined');
    
    if (window.preloader && window.preloader.isInitialized) {
      console.log('✅ Preloader hazır, backend verileri yükleniyor...');
      loadBackendData();
      // İçerik sonrası header logosu yoksa yedeği dene
      ensureHeaderLogoFallback();
      ensureContentLogoFallback();
    } else {
      console.log('⏳ Preloader henüz hazır değil, 100ms bekleniyor...');
      setTimeout(waitForPreloader, 100);
    }
  }

  // Sayfa yüklendiğinde backend verilerini yükle
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM yüklendi, backend verileri yükleniyor...');
    console.log('🔍 Supabase durumu:', window.supabase);
    console.log('🔍 Preloader durumu:', window.preloader);
    
    waitForPreloader();
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
        
        // Admin'e mail gönder (Edge Function)
        try {
          const supabaseUrl = window.SUPABASE_URL || '';
          if (supabaseUrl) {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-form-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                formType: formType,
                data: data,
                submittedAt: new Date().toLocaleString('tr-TR')
              })
            });
            
            const emailResult = await emailResponse.json();
            
            if (emailResponse.ok) {
            } else {
              console.error('Mail gönderilemedi:', emailResponse.status, emailResult);
            }
          } else {
            console.warn('SUPABASE_URL tanımlı değil, mail gönderilemedi');
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
        description: 'Kapadokya\'nın eşsiz peri bacaları, yeraltı şehirleri ve tarihi kiliseleriyle dolu bu tur, sizi büyüleyici bir yolculuğa çıkarıyor.',
        highlights: [
          '🏛️ Göreme Açık Hava Müzesi ziyareti',
          '🏰 Uçhisar Kalesi manzara noktası',
          '🏺 Avanos seramik atölyesi deneyimi',
          '🎈 Balon turu opsiyonu (ek ücret)'
        ],
        itinerary:['Gün 1: Uçhisar – Göreme Açık Hava Müzesi','Gün 2: Vadiler – Avanos seramik atölyesi','Gün 3: Serbest zaman ve dönüş']
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
      description.textContent = tour.description;
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
        li.textContent=item; 
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px solid #f0f0f0';
        li.style.fontSize = '1.1rem';
        li.style.lineHeight = '1.6';
        itin.appendChild(li); 
      }); 
    }
  }

  // Fotoğraf modalı fonksiyonu
  window.openImageModal = function(imageSrc) {
    var modal = document.getElementById('imageModal');
    var modalImage = document.getElementById('modalImage');
    if(modal && modalImage) {
      modalImage.src = imageSrc;
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  // Modal kapatma fonksiyonu
  document.addEventListener('click', function(e) {
    if(e.target.hasAttribute('data-close')) {
      var modal = e.target.closest('.modal');
      if(modal) {
        modal.setAttribute('aria-hidden', 'true');
      }
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

  // Popup görüntüleme geçmişini kontrol et (3 saat aralıklarla)
  async function checkPopupViewHistory() {
    try {
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        console.warn('⚠️ Supabase bağlantısı yok, popup geçmişi kontrol edilemiyor');
        return false;
      }
      
      const userIP = await getUserIP();
      
      // IP adresini temizle ve doğrula
      if (!userIP || userIP === 'unknown') {
        return false;
      }
      
      const { data, error } = await window.supabase
        .from('popup_views')
        .select('viewed_at')
        .eq('ip_address', userIP)
        .limit(1);

      if (error) {
        console.error('Popup görüntüleme geçmişi kontrol edilirken hata:', error);
        return false;
      }

      // Eğer kayıt yoksa popup gösterilebilir
      if (!data || data.length === 0) {
        return false;
      }

      // Son görüntüleme tarihini kontrol et
      const lastViewed = new Date(data[0].viewed_at);
      const now = new Date();
      const hoursDiff = (now - lastViewed) / (1000 * 60 * 60); // Saat cinsinden fark

      // 3 saat geçmişse popup gösterilebilir
      if (hoursDiff >= 3) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      console.error('Popup görüntüleme geçmişi kontrol edilirken hata:', error);
      return false;
    }
  }

  // Popup görüntüleme kaydını oluştur/güncelle (3 saat aralıklarla)
  async function recordPopupView() {
    try {
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        console.warn('⚠️ Supabase bağlantısı yok, popup kaydı oluşturulamıyor');
        return;
      }
      
      const userIP = await getUserIP();
      
      // IP adresini doğrula
      if (!userIP || userIP === 'unknown') {
        return;
      }
      
      const userAgent = navigator.userAgent;
      
      // Mevcut kaydı kontrol et
      const { data: existingRecord } = await window.supabase
        .from('popup_views')
        .select('id')
        .eq('ip_address', userIP)
        .limit(1);

      if (existingRecord && existingRecord.length > 0) {
        // Mevcut kaydı güncelle
        const { error } = await window.supabase
          .from('popup_views')
          .update({
            viewed_at: new Date().toISOString(),
            user_agent: userAgent
          })
          .eq('ip_address', userIP);

        if (error) {
          console.error('Popup görüntüleme kaydı güncellenirken hata:', error);
        } else {
        }
      } else {
        // Yeni kayıt oluştur
        const { error } = await window.supabase
          .from('popup_views')
          .insert([{
            ip_address: userIP,
            user_agent: userAgent
          }]);

        if (error) {
          console.error('Popup görüntüleme kaydı oluşturulurken hata:', error);
        } else {
        }
      }
    } catch (error) {
      console.error('Popup görüntüleme kaydı oluşturulurken hata:', error);
    }
  }

  // Popup ayarlarını yükle ve göster
  async function loadAndShowPopup() {
    try {
      // Supabase bağlantısını kontrol et
      console.log('🔍 Supabase durumu kontrol ediliyor...');
      console.log('🔍 window.supabase:', window.supabase);
      
      if (!window.supabase || typeof window.supabase.from !== 'function') {
        console.warn('⚠️ Supabase bağlantısı yok veya geçersiz, popup atlanıyor');
        return;
      }
      
      console.log('✅ Supabase bağlantısı mevcut, popup ayarları yükleniyor...');

      // Popup ayarlarını al
      const { data, error } = await window.supabase
        .from('popup_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Popup ayarları yüklenirken hata:', error);
        return;
      }

      if (!data || !data.is_active) {
        return;
      }

      // Kullanıcıya sadece bir kez gösterilmesi gerekiyorsa kontrol et
      if (data.show_once) {
        const hasViewed = await checkPopupViewHistory();
        if (hasViewed) {
          console.log('Popup daha önce görüntülenmiş, gösterilmiyor');
          return;
        }
      }

      // Popup'ı göster
      console.log('📢 Popup gösteriliyor...');
      showPopup(data);

      // Popup gösterildi olarak işaretle
      if (data.show_once) {
        console.log('Popup görüntüleme kaydı oluşturuluyor...');
        await recordPopupView();
      }

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
  function closeSitePopup() {
    const popup = document.getElementById('sitePopup');
    if (popup) {
      popup.style.animation = 'popupFadeOut 0.3s ease-out';
      setTimeout(() => {
        popup.remove();
        // Popup kapatıldığında da kayıt oluştur
        console.log('Popup kapatıldı, kayıt oluşturuluyor...');
        recordPopupView();
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