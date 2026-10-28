/*
 * Ziyaretçi sayfalarının (index, turlar, tur-detay, kurum, ozel-rota, hakkimizda) tüm davranışı.
 * Veriler Supabase'den sayfa başına BİR KEZ çekilir ve tüm bölümler aynı veriden çizilir.
 */
(function () {
  'use strict';

  var C = window.OrionCommon;
  var backend = window.backendManager || null;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var isPage = function (name) { return page === name || (name === 'index.html' && page === ''); };

  var ESSENTIAL_TIMEOUT_MS = 2200; // Yükleme ekranı en fazla bu kadar bekler
  var POPUP_DELAY_MS = 1000;
  var POPUP_COOKIE = 'orion_popup_viewed_at';
  var WEB3FORMS_KEY = 'fcb83578-e1c5-42e0-ad20-8cd799189176'; // Web3Forms public erişim anahtarı

  // -----------------------------------------------------------------
  // Veri (sayfa başına tek istek)
  // -----------------------------------------------------------------
  var cache = {};
  function once(key, loader) {
    if (!cache[key]) {
      cache[key] = backend ? loader().catch(function (error) { console.warn(key + ' yüklenemedi:', error); return null; })
        : Promise.resolve(null);
    }
    return cache[key];
  }
  var data = {
    siteContent: function () { return once('siteContent', function () { return backend.getSiteContent(); }); },
    transportOrgs: function () { return once('transportOrgs', function () { return backend.getTransportOrgs(); }); }
  };

  function storageUrl(bucket, path) {
    return backend ? backend.getImageUrl(bucket, path) : '';
  }

  // -----------------------------------------------------------------
  // Yükleme ekranı
  // -----------------------------------------------------------------
  function revealPageWhenReady() {
    var shown = false;
    var show = function () {
      if (shown) return;
      shown = true;
      var loadingScreen = document.getElementById('loadingScreen');
      var pageContent = document.getElementById('pageContent');
      if (loadingScreen && pageContent) {
        loadingScreen.classList.add('hidden');
        pageContent.classList.add('loaded');
      }
    };
    Promise.all([data.siteContent(), data.transportOrgs()]).then(show, show);
    setTimeout(show, ESSENTIAL_TIMEOUT_MS);
  }

  // -----------------------------------------------------------------
  // Genel arayüz: menü, header, modallar, scroll animasyonu
  // -----------------------------------------------------------------
  function bindChrome() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.site-nav');
    if (toggle && nav) toggle.addEventListener('click', function () { nav.classList.toggle('open'); });

    var header = document.querySelector('.site-header');
    if (header) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          header.classList.toggle('scrolled', window.scrollY > 100);
          ticking = false;
        });
      }, { passive: true });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    // Seçim modalları
    var openModal = function (id) { var m = document.getElementById(id); if (m) m.setAttribute('aria-hidden', 'false'); };
    ['routesModal', 'studentModal', 'factoryModal'].forEach(function (id) {
      var modal = document.getElementById(id);
      if (!modal) return;
      modal.querySelectorAll('[data-close]').forEach(function (el) {
        el.addEventListener('click', function () { modal.setAttribute('aria-hidden', 'true'); });
      });
    });
    [['navRoutes', 'routesModal'], ['navStudent', 'studentModal'], ['navFactory', 'factoryModal']].forEach(function (pair) {
      var trigger = document.getElementById(pair[0]);
      if (trigger) trigger.addEventListener('click', function (e) { e.preventDefault(); openModal(pair[1]); });
    });
    [['gotoStudent', 'schoolSelect', 'Lütfen bir okul seçin.'], ['gotoFactory', 'factorySelect', 'Lütfen bir fabrika seçin.']].forEach(function (cfg) {
      var button = document.getElementById(cfg[0]);
      if (!button) return;
      button.addEventListener('click', function () {
        var select = document.getElementById(cfg[1]);
        var value = select && select.value;
        if (value) location.href = 'kurum.html?org=' + encodeURIComponent(value);
        else alert(cfg[2]);
      });
    });

    // Bölümler ekrana girdikçe beliren animasyon
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else if (revealEls.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.15 });
      revealEls.forEach(function (el) { io.observe(el); });
    }

    bindRangeOutputs(document);

    // Gizli admin kısayolu: Ctrl+Shift+A
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') location.href = 'admin.html';
    });

    // Pencere boyutu değişince kayan yazı (marquee) ölçülerini yeniden hesapla
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { updatePillOverflow(document); }, 250);
    });
  }

  function bindRangeOutputs(root) {
    root.querySelectorAll('.range-wrap').forEach(function (wrap) {
      var range = wrap.querySelector('input[type="range"]');
      var output = wrap.querySelector('output');
      if (!range || !output) return;
      output.textContent = range.value;
      range.addEventListener('input', function () { output.textContent = range.value; });
    });
  }

  // -----------------------------------------------------------------
  // Görseller (sabit storage yolları)
  // -----------------------------------------------------------------
  function applyStorageImages() {
    if (!backend) return;
    document.querySelectorAll('.brand img').forEach(function (img) {
      C.setImageSource(img, storageUrl('site-images', 'logos/header.png'), { loading: 'eager', fetchPriority: 'high' });
    });
    document.querySelectorAll('[data-content-logo]').forEach(function (img) {
      C.setImageSource(img, storageUrl('site-images', 'logos/content.png'), { loading: 'lazy' });
    });
    document.querySelectorAll('.about-visual').forEach(function (el) {
      C.setBackgroundImage(el, storageUrl('site-images', 'about/main.png'));
    });
    C.setBackgroundImage(document.querySelector('[data-student-service-bg]'), storageUrl('site-images', 'transport/studentService.png'));
    C.setBackgroundImage(document.querySelector('[data-staff-service-bg]'), storageUrl('site-images', 'transport/staffService.png'));
  }

  // -----------------------------------------------------------------
  // İçerik
  // -----------------------------------------------------------------
  var FADE_SECTIONS = '.carousel, #turlar, #yetkili-kurumlar, #partnerler, #hakkimizda, #tasimacilik, .transport-card';

  function setFade(selector, visible) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.style.transition = 'opacity 0.3s ease-in-out';
      el.style.opacity = visible ? '1' : '0';
    });
  }

  function setText(el, value) {
    if (el && value) el.textContent = value;
  }

  function updateContactDetails(content) {
    var set = function (key, value) {
      var text = String(value || '').trim();
      if (!text) return;
      document.querySelectorAll('[data-contact="' + key + '"]').forEach(function (el) { el.textContent = text; });
    };
    set('phone', content.phoneNumber || content.contactPhone);
    set('email', content.emailAddress || content.contactEmail);
    set('address', content.address || content.contactAddress);
    set('agency-name', content.agencyName);
    set('tursab-document-no', content.tursabDocumentNo);

    var instagram = String(content.instagramLink || content.contactInstagram || '').trim();
    if (!instagram) return;
    var username = instagram.replace(/^@/, '');
    var href = instagram;
    if (instagram.indexOf('instagram.com/') !== -1) {
      username = instagram.split('instagram.com/')[1].split(/[/?#]/)[0];
    } else if (!/^https?:\/\//i.test(instagram)) {
      href = 'https://instagram.com/' + username;
    }
    document.querySelectorAll('[data-contact="instagram"]').forEach(function (el) {
      el.textContent = '@' + (username || 'orion_turizm');
      if (el.tagName === 'A') el.href = href;
    });
  }

  function updateCards(content) {
    var cards = [
      ['a[href="turlar.html"] .card-content', content.readyRoutesTitle, content.readyRoutesDesc],
      ['a[href="ozel-rota.html"] .card-content', content.customRouteTitle, content.customRouteDesc]
    ];
    cards.forEach(function (cfg) {
      var card = document.querySelector(cfg[0]);
      if (!card) return;
      setText(card.querySelector('h2'), cfg[1]);
      setText(card.querySelector('p'), cfg[2]);
    });

    var transportCards = document.querySelectorAll('.transport-card .card-content');
    if (!transportCards.length) return;
    var services = null;
    if (content.transportServicesList) {
      try { services = JSON.parse(content.transportServicesList); } catch (e) { services = null; }
    }
    if (content.transportServicesList) {
      (Array.isArray(services) ? services : []).forEach(function (service, i) {
        if (!transportCards[i]) return;
        setText(transportCards[i].querySelector('h3'), service.title);
        setText(transportCards[i].querySelector('p'), service.desc);
      });
    } else {
      // Eski alan adları
      setText(transportCards[0].querySelector('h3'), content.studentServiceTitle);
      setText(transportCards[0].querySelector('p'), content.studentServiceDesc);
      if (transportCards[1]) {
        setText(transportCards[1].querySelector('h3'), content.staffServiceTitle);
        setText(transportCards[1].querySelector('p'), content.staffServiceDesc);
      }
    }
  }

  // Kayan kurum/partner listeleri
  function renderPillScroller(container, items, scrollId, label) {
    container.innerHTML = '';
    var wrapper = document.createElement('div');
    wrapper.className = 'partners-container';
    var scroll = document.createElement('div');
    scroll.className = 'partners-scroll';
    scroll.id = scrollId;

    items.forEach(function (item) {
      var partner = document.createElement('div');
      partner.className = 'partner-item';
      partner.dataset.label = item.name;
      var link = document.createElement('a');
      link.className = 'logo-pill';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = item.name;
      var text = document.createElement('span');
      text.className = 'logo-pill-text';
      text.textContent = item.name;
      link.appendChild(text);
      partner.appendChild(link);
      scroll.appendChild(partner);
    });

    var buttons = document.createElement('div');
    buttons.className = 'scroll-buttons';
    var left = makeScrollButton(scrollId + 'Left', 'Önceki ' + label, '‹');
    var right = makeScrollButton(scrollId + 'Right', 'Sonraki ' + label, '›');
    buttons.append(left, right);
    wrapper.append(scroll, buttons);
    container.appendChild(wrapper);

    bindScrollButtons(scroll, left, right, function () { return 240; });
    requestAnimationFrame(function () { updatePillOverflow(wrapper); });
  }

  function makeScrollButton(id, ariaLabel, text) {
    var button = document.createElement('button');
    button.className = 'scroll-btn';
    button.id = id;
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.textContent = text;
    return button;
  }

  function bindScrollButtons(scroll, left, right, getAmount) {
    var update = function () {
      left.disabled = scroll.scrollLeft <= 0;
      right.disabled = scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 1;
    };
    left.addEventListener('click', function () { scroll.scrollBy({ left: -getAmount(), behavior: 'smooth' }); });
    right.addEventListener('click', function () { scroll.scrollBy({ left: getAmount(), behavior: 'smooth' }); });
    scroll.addEventListener('scroll', update);
    update();
  }

  function updatePillOverflow(root) {
    root.querySelectorAll('.partner-item').forEach(function (item) {
      var pill = item.querySelector('.logo-pill');
      var text = item.querySelector('.logo-pill-text');
      if (!pill || !text) return;
      var style = getComputedStyle(pill);
      var available = pill.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
      var overflow = Math.ceil(text.scrollWidth - available);
      var isOverflowing = overflow > 2;
      item.classList.toggle('is-overflowing', isOverflowing);
      if (isOverflowing) {
        var distance = overflow + 10;
        item.style.setProperty('--scroll-distance', distance + 'px');
        item.style.setProperty('--scroll-duration', Math.min(Math.max(distance / 22, 3), 8) + 's');
      } else {
        item.style.removeProperty('--scroll-distance');
        item.style.removeProperty('--scroll-duration');
      }
    });
  }

  function renderOrgLists(content) {
    var lists = [
      ['#tasimacilik-kurumlari .logo-grid', content.serviceOrganizations, 'serviceOrgsScroll', 'kurum'],
      ['#yetkili-kurumlar .logo-grid', content.authorizedInstitutions, 'institutionsScroll', 'yetkili kurum'],
      ['#partnerler .logo-grid', content.partnerList, 'partnersScroll', 'partner']
    ];
    lists.forEach(function (cfg) {
      var container = document.querySelector(cfg[0]);
      if (!container) return;
      if (cfg[0] !== '#tasimacilik-kurumlari .logo-grid') container.innerHTML = '';
      if (!cfg[1]) return;
      var items = C.parseNameUrlLines(cfg[1]);
      if (items.length) {
        renderPillScroller(container, items, cfg[2], cfg[3]);
      } else if (cfg[0] === '#tasimacilik-kurumlari .logo-grid') {
        container.innerHTML = '<p class="muted">Henüz hizmet verdiğimiz kurum eklenmemiş.</p>';
      }
    });
  }

  function renderToursGrid(content) {
    var grid = document.getElementById('toursGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!content.toursList) return;
    var tours = C.parsePipeLines(content.toursList, ['name', 'description', 'image', 'link'])
      .filter(function (t) { return t.name && t.description && t.link; });

    tours.forEach(function (tour) {
      var tourId = C.normalizeTourId(tour.link);
      var card = document.createElement('article');
      card.className = 'card tour-card';
      card.setAttribute('data-tour-id', tourId);
      card.style.transition = 'opacity 0.3s ease-in-out';
      card.innerHTML =
        '<img src="' + C.escapeHtml(backend ? storageUrl('tour-images', 'tours/' + tourId + '/main.png') : tour.image) + '" alt="' + C.escapeHtml(tour.name) + '" loading="lazy" decoding="async" />' +
        '<div class="card-content">' +
          '<h3>' + C.escapeHtml(tour.name) + '</h3>' +
          '<p>' + C.escapeHtml(tour.description) + '</p>' +
          '<div class="actions"><a class="btn btn-outline" href="tur-detay.html?tour=' + encodeURIComponent(tour.link) + '">Detay</a></div>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function fillOrgSelects(orgs) {
    if (!orgs || !orgs.length) return;
    [['schoolSelect', 'school'], ['factorySelect', 'factory']].forEach(function (cfg) {
      var select = document.getElementById(cfg[0]);
      if (!select) return;
      select.innerHTML = '<option value="">Seçiniz</option>';
      orgs.filter(function (o) { return String(o.type || '').toLowerCase() === cfg[1]; }).forEach(function (o) {
        var option = document.createElement('option');
        option.value = o.name;
        option.textContent = o.name;
        select.appendChild(option);
      });
    });
  }

  // -----------------------------------------------------------------
  // Dinamik formlar (admin panelindeki "Form Yönetimi")
  // -----------------------------------------------------------------
  function parseFieldOptions(options) {
    if (Array.isArray(options)) return options.map(String).map(function (o) { return o.trim(); }).filter(Boolean);
    var raw = String(options || '').trim();
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).map(function (o) { return o.trim(); }).filter(Boolean);
    } catch (e) { /* virgülle ayrılmış liste */ }
    return raw.split(',').map(function (o) { return o.trim(); }).filter(Boolean);
  }

  function createFormField(field) {
    var label = document.createElement('label');
    var text = String(field.label || '').trim();
    var type = field.type || 'text';
    var name = text.toLowerCase().replace(/\s+/g, '_');
    if (type === 'textarea') label.className = 'full';
    label.appendChild(document.createTextNode(text));

    var control;
    if (type === 'select') {
      control = document.createElement('select');
      parseFieldOptions(field.options).forEach(function (optionText) {
        var option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        control.appendChild(option);
      });
    } else if (type === 'textarea') {
      control = document.createElement('textarea');
      control.rows = 3;
      control.placeholder = field.placeholder || '';
    } else if (type === 'number' && text.indexOf('Lüksü') !== -1) {
      var wrap = document.createElement('div');
      wrap.className = 'range-wrap';
      var range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '10';
      range.step = '1';
      range.value = '5';
      range.name = name;
      var output = document.createElement('output');
      output.textContent = range.value;
      wrap.append(range, output);
      label.appendChild(wrap);
      return label;
    } else {
      control = document.createElement('input');
      control.type = type;
      control.placeholder = field.placeholder || '';
    }
    control.name = name;
    control.required = Boolean(field.required);
    label.appendChild(control);
    return label;
  }

  function renderDynamicForms(fields) {
    [['#toursForm', 'turlar'], ['#customRouteForm', 'custom']].forEach(function (cfg) {
      var form = document.querySelector(cfg[0]);
      var grid = form && form.querySelector('.form-grid');
      var own = fields.filter(function (f) { return f.target === cfg[1] || f.target === 'both'; });
      if (!grid || !own.length) return;
      grid.innerHTML = '';
      own.forEach(function (field) { grid.appendChild(createFormField(field)); });
      bindRangeOutputs(grid);
    });
  }

  function loadFormFields(content) {
    var fields = content.formFields ? String(content.formFields).split('\n').filter(function (l) { return l.trim(); }).map(function (line) {
      try { return JSON.parse(line); } catch (e) { console.error('Form alanı okunamadı:', line); return null; }
    }).filter(Boolean) : [];
    if (fields.length) return Promise.resolve(fields);
    return backend ? backend.getFormFields() : Promise.resolve([]);
  }

  function bindForm(formId, statusId, formType) {
    var form = document.getElementById(formId);
    var status = document.getElementById(statusId);
    if (!form || !status) return;
    var titles = {
      contactForm: '🔔 Orion Turizm — Yeni İletişim Formu',
      toursForm: '🎫 Orion Turizm — Yeni Tur Rezervasyon Talebi',
      customRouteForm: '🗺️ Orion Turizm — Yeni Özel Rota Talebi'
    };

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      status.textContent = 'Gönderiliyor...';
      var values = {};
      new FormData(form).forEach(function (value, key) { values[key] = value; });

      var saved = false;
      var mailed = false;
      if (backend) {
        saved = Boolean(await backend.saveFormSubmission(formType, values));
      }
      try {
        var lines = Object.keys(values).filter(function (k) { return values[k]; }).map(function (k) { return k + ': ' + values[k]; }).join('\n');
        var response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({
            access_key: WEB3FORMS_KEY,
            subject: titles[formType] || '📝 Orion Turizm — Yeni Form Gönderimi',
            from_name: 'Orion Turizm Website',
            message: lines + '\n\nGönderim: ' + new Date().toLocaleString('tr-TR')
          }, values))
        });
        if (!response.ok) throw new Error('Web3Forms HTTP ' + response.status);
        var result = await response.json();
        if (!result.success) throw new Error(result.message || 'Web3Forms mail gönderimini reddetti.');
        mailed = true;
      } catch (error) {
        console.error('Mail gönderim hatası:', error);
      }

      if (saved || mailed) {
        status.textContent = 'Talebiniz alındı. En kısa sürede dönüş yapacağız.';
        form.reset();
      } else {
        status.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      }
    });
  }

  // -----------------------------------------------------------------
  // Ana sayfa karuseli
  // -----------------------------------------------------------------
  var carouselTimer = null;

  function startCarousel(images) {
    var carousel = document.querySelector('.carousel');
    var img = carousel && carousel.querySelector('img');
    var dots = carousel && carousel.querySelector('.carousel-dots');
    if (!img || !dots || !images.length) return;
    carousel.setAttribute('data-images', JSON.stringify(images));

    images.slice(0, 2).forEach(function (url) { var pre = new Image(); pre.decoding = 'async'; pre.src = url; });
    img.style.transition = 'opacity 0.25s ease-in-out';
    var index = 0;

    var render = function () {
      img.style.opacity = '0';
      setTimeout(function () {
        img.onload = img.onerror = function () { img.style.opacity = '1'; };
        img.decoding = 'async';
        img.loading = 'eager';
        img.fetchPriority = index === 0 ? 'high' : 'auto';
        img.src = images[index];
        dots.innerHTML = '';
        images.forEach(function (_, i) {
          var dot = document.createElement('button');
          if (i === index) dot.classList.add('active');
          dot.addEventListener('click', function () { index = i; render(); });
          dots.appendChild(dot);
        });
      }, 80);
    };
    render();
    clearInterval(carouselTimer);
    carouselTimer = setInterval(function () { index = (index + 1) % images.length; render(); }, 4000);
  }

  function loadCarousel(content) {
    if (!document.querySelector('.carousel')) return;
    var images = [];
    try { images = JSON.parse(content.carouselImages || '[]'); } catch (e) { images = []; }
    if (Array.isArray(images) && images.length) return startCarousel(images);
    if (!backend) return;
    backend.listImages('site-images', 'carousel').then(function (files) {
      var slides = files.map(function (f) { return (f && f.name) || ''; })
        .filter(function (name) { return /^slide-\d+\.(png|jpe?g|webp|avif)$/i.test(name); })
        .sort(function (a, b) { return Number(a.match(/slide-(\d+)/i)[1]) - Number(b.match(/slide-(\d+)/i)[1]); })
        .map(function (name) { return storageUrl('site-images', 'carousel/' + name); });
      startCarousel(slides);
    });
  }

  // -----------------------------------------------------------------
  // Tur detay sayfası
  // -----------------------------------------------------------------
  var DETAIL_SECTIONS = '.tour-header, .map-section, .gallery-section, .tour-description, .itinerary';

  function fillList(el, items, padding, extraStyle) {
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (text, i) {
      var li = document.createElement('li');
      li.style.cssText = 'padding: ' + padding + ' 0; ' + (i < items.length - 1 ? 'border-bottom: 1px solid ' + (extraStyle ? '#f0f0f0' : '#eee') + ';' : '') + (extraStyle || '');
      li.textContent = text;
      el.appendChild(li);
    });
  }

  async function renderTourDetail(content) {
    setFade(DETAIL_SECTIONS, false);
    var link = new URLSearchParams(location.search).get('tour');
    try {
      var details = content && content.tourDetails ? content.tourDetails.split('\n').filter(function (l) { return l.trim(); })
        .map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean) : [];
      var detail = link ? details.find(function (d) { return d.link === link; }) : null;
      if (!detail) return;

      setText(document.getElementById('tourTitle'), detail.title || 'Tur Detayı');
      var subtitle = document.getElementById('tourSubtitle');
      if (subtitle) subtitle.textContent = detail.subtitle || '';

      var mapImageUrl = await C.resolveTourMapImageUrl(link, detail.mapImage);
      var mapEl = document.getElementById('mapImage');
      var mapSection = mapEl && mapEl.closest('.map-section');
      if (mapEl && mapImageUrl) {
        mapEl.style.setProperty('--bg', "url('" + mapImageUrl + "')");
        mapEl.dataset.mapImageUrl = mapImageUrl;
        if (mapSection) mapSection.style.display = '';
      } else if (mapEl) {
        mapEl.style.removeProperty('--bg');
        delete mapEl.dataset.mapImageUrl;
        if (mapSection) mapSection.style.display = 'none';
      }

      var gallery = document.getElementById('tourGallery');
      if (gallery) {
        gallery.innerHTML = '';
        var urls = C.mergeTourImageUrls(Array.isArray(detail.images) ? detail.images : [], await C.getTourStorageImageUrls(link));
        urls.forEach(function (url, i) {
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = 'Tur Fotoğrafı ' + (i + 1);
          img.addEventListener('error', function () { img.remove(); });
          img.src = url;
          gallery.appendChild(img);
        });
        var left = document.getElementById('tourGalleryScrollLeft');
        var right = document.getElementById('tourGalleryScrollRight');
        if (left && right) {
          bindScrollButtons(gallery, left, right, function () {
            var first = gallery.querySelector('img');
            return first ? first.clientWidth + 12 : 212;
          });
        }
      }

      if (detail.description) {
        fillList(document.getElementById('tourDescription'),
          String(detail.description).split('\n').map(function (l) { return l.trim(); }).filter(Boolean), '8px');
      }
      if (detail.highlights && detail.highlights.length) {
        fillList(document.getElementById('tourHighlights'), detail.highlights, '8px');
      }
      if (detail.itinerary && detail.itinerary.length) {
        fillList(document.getElementById('itineraryList'), detail.itinerary, '12px', ' font-size: 1.1rem; line-height: 1.6;');
      }
    } catch (error) {
      console.error('Tur detay yükleme hatası:', error);
    } finally {
      setTimeout(function () { setFade(DETAIL_SECTIONS, true); }, 50);
    }
  }

  // Fotoğraf büyütme modalı (galeri içinde oklarla gezinme)
  function bindImageModal() {
    var modal = document.getElementById('imageModal');
    var modalImage = document.getElementById('modalImage');
    if (!modal || !modalImage) return;
    var images = [];
    var current = -1;

    var showAt = function (index) {
      if (!images.length) return;
      current = (index + images.length) % images.length;
      modalImage.src = images[current];
    };
    var open = function (src, list, index) {
      images = list && list.length ? list : [src];
      current = typeof index === 'number' ? index : images.indexOf(src);
      showAt(current < 0 ? 0 : current);
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    var close = function () {
      modal.setAttribute('aria-hidden', 'true');
      modalImage.removeAttribute('src');
      document.body.style.overflow = '';
      images = [];
      current = -1;
    };
    window.openImageModal = open;

    document.addEventListener('click', function (e) {
      var target = e.target;
      if (target instanceof HTMLImageElement && target.closest('#tourGallery')) {
        var list = Array.prototype.map.call(document.querySelectorAll('#tourGallery img'), function (img) { return img.src; }).filter(Boolean);
        open(target.src, list, list.indexOf(target.src));
        return;
      }
      var mapEl = target.closest && target.closest('#mapImage');
      if (mapEl && mapEl.dataset.mapImageUrl) {
        open(mapEl.dataset.mapImageUrl, [mapEl.dataset.mapImageUrl], 0);
        return;
      }
      if (target.hasAttribute && target.hasAttribute('data-close') && target.closest('#imageModal')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (modal.getAttribute('aria-hidden') !== 'false') return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' && images.length > 1) { e.preventDefault(); showAt(current + 1); }
      else if (e.key === 'ArrowLeft' && images.length > 1) { e.preventDefault(); showAt(current - 1); }
    });
  }

  // -----------------------------------------------------------------
  // Kurum sayfası
  // -----------------------------------------------------------------
  var DEFAULT_CONTACT_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='100' viewBox='0 0 80 100'%3E%3Crect width='80' height='100' fill='%23e5e7eb' rx='8'/%3E%3Ccircle cx='40' cy='35' r='18' fill='%239ca3af'/%3E%3Cellipse cx='40' cy='80' rx='28' ry='22' fill='%239ca3af'/%3E%3C/svg%3E";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function renderOrgPage(siteContentPromise) {
    var orgName = new URLSearchParams(location.search).get('org');
    if (!orgName) { location.href = 'index.html#tasimacilik'; return; }

    var orgs = (await data.transportOrgs()) || [];
    var org = orgs.find(function (o) { return o.name === orgName; });
    if (!org) { location.href = 'index.html#tasimacilik'; return; }

    var parsed = C.parseOrgDescription(org.description);
    document.getElementById('orgName').textContent = org.name;
    await siteContentPromise; // site başlığı önce uygulansın, kurum başlığı onu ezsin
    document.title = org.name + ' - Sakarya Orion Turizm';

    var logo = document.getElementById('orgLogo');
    if (org.logo_url) { logo.src = org.logo_url; logo.style.display = 'block'; } else { logo.style.display = 'none'; }

    document.getElementById('orgDescription').textContent = parsed.text || (org.type === 'school'
      ? org.name + ' için güvenli, konforlu ve zamanında öğrenci taşımacılığı hizmeti sunuyoruz. Deneyimli şoförlerimiz ve modern araç filomuzla öğrencilerinizin güvenliğini ön planda tutuyoruz.'
      : org.name + ' için personel taşımacılığı hizmeti sunuyoruz. Fabrika çalışanlarınızın işe gidiş-geliş ihtiyaçlarını karşılamak için düzenli servis hizmeti sağlıyoruz.');

    // Butonlar
    var buttonsBox = document.getElementById('orgButtons');
    buttonsBox.innerHTML = '';
    var buttons = parsed.buttons.length ? parsed.buttons : C.legacyOrgButtons(org).filter(function (b) { return b.url; });
    buttons.forEach(function (info) {
      if (!info.url) return;
      var a = el('a', 'btn btn-' + (info.style === 'primary' ? 'primary' : 'outline'), info.label || 'Link');
      a.href = /^https?:\/\//.test(info.url) ? info.url : 'https://' + info.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      buttonsBox.appendChild(a);
    });
    if (!buttonsBox.children.length) {
      buttonsBox.innerHTML = '<p class="muted">Bu kurum için henüz hizmet linkleri eklenmemiş.</p>';
    }

    // Yetkili kişiler
    var section = document.getElementById('orgContactsSection');
    var list = document.getElementById('orgContactsList');
    var contacts = parsed.contacts.filter(function (c) { return c && (c.name || c.phone); });
    if (!section || !list) return;
    if (!contacts.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    list.innerHTML = '';
    contacts.forEach(function (c) {
      var card = el('div', 'org-contact-display-card');
      var photo = el('img', 'contact-display-photo');
      photo.alt = c.name || 'Yetkili';
      photo.src = c.photo || DEFAULT_CONTACT_PHOTO;
      photo.onerror = function () { photo.onerror = null; photo.src = DEFAULT_CONTACT_PHOTO; };
      var info = el('div', 'contact-display-info');
      if (c.name) info.appendChild(el('p', 'contact-display-name', c.name));
      if (c.title) info.appendChild(el('p', 'contact-display-title', c.title));
      if (c.phone) {
        var phone = el('a', 'contact-display-item', '📞 ' + c.phone);
        phone.href = 'tel:' + c.phone;
        info.appendChild(phone);
      }
      var email = String(c.email || '').trim();
      if (email) {
        var mail = el('a', 'contact-display-item', '✉️ ' + email);
        mail.href = 'https://mail.google.com/mail/?view=cm&to=' + encodeURIComponent(email);
        mail.target = '_blank';
        mail.rel = 'noopener noreferrer';
        mail.title = 'E-posta gönder';
        info.appendChild(mail);
      }
      card.append(photo, info);
      list.appendChild(card);
    });
  }

  // -----------------------------------------------------------------
  // Duyuru popup'ı
  // -----------------------------------------------------------------
  function getCookie(name) {
    var prefix = name + '=';
    var found = (document.cookie ? document.cookie.split('; ') : []).find(function (c) { return c.indexOf(prefix) === 0; });
    return found ? decodeURIComponent(found.slice(prefix.length)) : '';
  }

  function setCookie(name, value, maxAgeSeconds) {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=' + maxAgeSeconds + '; Path=/; SameSite=Lax' + secure;
  }

  function popupRecentlySeen(showOnce) {
    var viewedAt = Number(getCookie(POPUP_COOKIE));
    if (!viewedAt) return false;
    return showOnce ? true : Date.now() - viewedAt < 3 * 60 * 60 * 1000;
  }

  async function loadPopup() {
    if (!backend) return;
    var result = await backend.supabase.from('popup_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) { console.error('Popup ayarları yüklenirken hata:', result.error); return; }
    var popup = result.data;
    if (!popup || !popup.is_active || popupRecentlySeen(Boolean(popup.show_once))) return;
    showPopup(popup);
  }

  function showPopup(popup) {
    var existing = document.getElementById('sitePopup');
    if (existing) existing.remove();

    var overlay = el('div', 'popup-overlay');
    overlay.id = 'sitePopup';
    var box = el('div', 'popup-container');
    var closeBtn = el('button', 'popup-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Popup\'ı kapat');
    var wrapper = el('div', 'popup-content-wrapper');

    if (popup.image_url) {
      var image = el('img', 'popup-image');
      image.src = popup.image_url;
      image.alt = 'Popup görseli';
      wrapper.appendChild(image);
    }
    if (popup.title) wrapper.appendChild(el('h3', 'popup-title', popup.title));
    if (popup.content) wrapper.appendChild(el('p', 'popup-content', popup.content));
    var linkUrl = C.ensureProtocol(popup.link_url, true);
    if (linkUrl) {
      var link = el('a', 'popup-link', popup.link_text || 'Detay');
      link.href = linkUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      wrapper.appendChild(link);
    }
    box.append(closeBtn, wrapper);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var closed = false;
    var close = function () {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      overlay.style.animation = 'popupFadeOut 0.3s ease-out';
      setTimeout(function () {
        overlay.remove();
        setCookie(POPUP_COOKIE, String(Date.now()), popup.show_once ? 180 * 24 * 60 * 60 : 3 * 60 * 60);
      }, 300);
    };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    window.closeSitePopup = close;
  }

  // -----------------------------------------------------------------
  // Başlat
  // -----------------------------------------------------------------
  async function renderContent() {
    var content = await data.siteContent();
    if (!content) { setFade(FADE_SECTIONS, true); return null; }

    if (content.siteTitle) document.title = content.siteTitle;
    updateCards(content);
    var about = content.aboutText;
    if (about) {
      document.querySelectorAll('[data-content="about"]').forEach(function (node) { node.textContent = about; });
      setText(document.querySelector('#hakkimizda p'), about);
    }
    setText(document.querySelector('#iletisim p.muted'), content.contactDescription);
    updateContactDetails(content);
    renderOrgLists(content);
    renderToursGrid(content);
    loadCarousel(content);
    loadFormFields(content).then(function (fields) { if (fields && fields.length) renderDynamicForms(fields); });
    setTimeout(function () { setFade(FADE_SECTIONS, true); }, 50);
    return content;
  }

  function init() {
    bindChrome();
    bindForm('contactForm', 'contactStatus', 'contactForm');
    bindForm('customRouteForm', 'customRouteStatus', 'customRouteForm');
    bindForm('toursForm', 'toursFormStatus', 'toursForm');
    bindImageModal();
    setFade(FADE_SECTIONS, false);
    revealPageWhenReady();
    applyStorageImages();

    var contentPromise = renderContent();
    data.transportOrgs().then(fillOrgSelects);
    if (isPage('tur-detay.html')) contentPromise.then(renderTourDetail);
    if (isPage('kurum.html')) renderOrgPage(contentPromise);
    setTimeout(loadPopup, POPUP_DELAY_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
