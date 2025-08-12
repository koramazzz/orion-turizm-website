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
  ['routesModal','studentModal'].forEach(function(id){
    var m = document.getElementById(id); if(!m) return;
    m.querySelectorAll('[data-close]').forEach(function(x){ x.addEventListener('click', closeModal); });
  });
  var navRoutes = document.getElementById('navRoutes');
  if(navRoutes){ navRoutes.addEventListener('click', function(e){ e.preventDefault(); openModal('routesModal'); }); }
  var navStudent = document.getElementById('navStudent');
  if(navStudent){ navStudent.addEventListener('click', function(e){ e.preventDefault(); openModal('studentModal'); }); }
  var gotoStudent = document.getElementById('gotoStudent');
  if(gotoStudent){
    gotoStudent.addEventListener('click', function(){
      var s = document.getElementById('schoolSelect');
      var val = s && s.value ? s.value : '';
      window.location.href = 'ogrenci-servisi.html' + (val ? ('?school=' + encodeURIComponent(val)) : '');
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

  // Tour details page content by query param
  var tourMap = {
    kapadokya: {
      title:'Kapadokya Kaşifi',
      subtitle:'Uçhisar, Göreme ve vadiler.',
      images:[
        'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1516542076529-1ea3854896e1?q=80&w=800&auto=format&fit=crop'
      ],
      itinerary:['Gün 1: Uçhisar – Göreme Açık Hava Müzesi','Gün 2: Vadiler – Avanos seramik atölyesi','Gün 3: Serbest zaman ve dönüş']
    },
    ege: {
      title:'Ege Kıyıları', subtitle:'Çeşme, Alaçatı, Şirince ve Efes.', images:[
        'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=800&auto=format&fit=crop'
      ], itinerary:['Gün 1: Efes ve Şirince','Gün 2: Alaçatı – Çeşme','Gün 3: Plaj ve dönüş']
    },
    karadeniz: {
      title:'Yeşil Karadeniz', subtitle:'Ayder, Uzungöl, Fırtına Vadisi.', images:[
        'https://images.unsplash.com/photo-1523419409543-a5e549c9adff?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1530076886461-ce58ea8abe24?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1528183429752-a97d0e66b7d1?q=80&w=800&auto=format&fit=crop'
      ], itinerary:['Gün 1: Uzungöl','Gün 2: Ayder – Fırtına Vadisi','Gün 3: Çamlıhemşin ve dönüş']
    }
  };
  var params = new URLSearchParams(window.location.search);
  var tourKey = params.get('tour');
  var tour = tourMap[tourKey||''] || null;
  if(tour){
    var tTitle = document.getElementById('tourTitle'); if(tTitle) tTitle.textContent = tour.title;
    var tSub = document.getElementById('tourSubtitle'); if(tSub) tSub.textContent = tour.subtitle;
    var g = document.getElementById('tourGallery');
    if(g){ var imgs = g.querySelectorAll('img'); imgs.forEach(function(img, idx){ img.src = tour.images[idx] || tour.images[0]; }); }
    var itin = document.getElementById('itinerary');
    if(itin){ var ol = itin.querySelector('ol'); ol.innerHTML = ''; tour.itinerary.forEach(function(item){ var li=document.createElement('li'); li.textContent=item; ol.appendChild(li); }); }
  }
})();


