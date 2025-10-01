(function(){
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('open');
    });
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
  var carousel = document.querySelector('.carousel');
  if (carousel){
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
  }

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

  // Forms: simple demo handlers
  function handleForm(formId, statusId){
    var form = document.getElementById(formId);
    var status = document.getElementById(statusId);
    if(!form || !status) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      status.textContent = 'Gönderiliyor...';
      setTimeout(function(){
        status.textContent = 'Talebiniz alındı. En kısa sürede dönüş yapacağız.';
        form.reset();
      }, 800);
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
  
  // Admin panelinden tur detaylarını yükle
  function loadTourDetailsFromAdmin() {
    const savedContent = localStorage.getItem('siteContent');
    if (savedContent) {
      try {
        const content = JSON.parse(savedContent);
        if (content.tourDetails) {
          const tourDetails = content.tourDetails.split('\n').filter(line => line.trim());
          tourDetails.forEach(tourDetailJson => {
            try {
              const tourDetailData = JSON.parse(tourDetailJson);
              if (tourDetailData.link) {
                tourMap[tourDetailData.link] = {
                  title: tourDetailData.title || 'Tur Detayı',
                  subtitle: tourDetailData.subtitle || 'Örnek program ve görseller aşağıdadır.',
                  mapImage: tourDetailData.mapImage || '',
                  mapTitle: tourDetailData.mapTitle || 'Tur Güzergâhı',
                  mapDescription: tourDetailData.mapDescription || 'Detaylı rota ve duraklar',
                  images: tourDetailData.images || [],
                  description: tourDetailData.description || '',
                  highlights: tourDetailData.highlights || [],
                  itinerary: tourDetailData.itinerary || []
                };
              }
            } catch (e) {
              console.error('Tur detay yüklenirken hata:', e);
            }
          });
        }
      } catch (e) {
        console.error('Site içeriği yüklenirken hata:', e);
      }
    }
    
    // Eğer hiç tur detay yoksa varsayılan detayları ekle
    if (Object.keys(tourMap).length === 0) {
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
    
    // Harita bilgileri (seçili turun yüklenen görseli varsa onu kullan)
    var mapImage = document.getElementById('mapImage'); 
    if(mapImage){
      try {
        var tdi = JSON.parse(localStorage.getItem('tourDetailImages') || '{}');
        var lk = tourKey || '';
        var mapSrc = (tdi[lk] && tdi[lk].mapImage) ? tdi[lk].mapImage : (tour.mapImage || '');
        if (mapSrc) mapImage.style.setProperty('--bg', 'url(' + mapSrc + ')');
      } catch(e){ /* ignore */ }
    }
    
    // Galeri (yüklenen görselleri tercih et)
    var g = document.getElementById('tourGallery');
    if(g){ 
      var imgs = g.querySelectorAll('img'); 
      try {
        var tdi = JSON.parse(localStorage.getItem('tourDetailImages') || '{}');
        var lk = tourKey || '';
        var gallery = [];
        if (tdi[lk]) ['image1','image2','image3','image4'].forEach(function(k){ if (tdi[lk][k]) gallery.push(tdi[lk][k]); });
        var fallbacks = tour.images || [];
        imgs.forEach(function(img, idx){ 
          img.src = gallery[idx] || fallbacks[idx] || fallbacks[0] || gallery[0] || '';
          img.alt = tour.title + ' - Fotoğraf ' + (idx + 1);
        }); 
      } catch(e){ /* ignore */ }
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
})();