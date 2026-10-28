/*
 * Google yorumları (ana sayfa). 4+ yıldızlı, metin içeren en fazla 5 yorumu gösterir.
 * Google Maps JS API anahtarı tarayıcıda görünür; Google Cloud Console'da
 * yalnızca sakaryaorionturizm.com alan adına ve Places API'ye kısıtlanmalıdır.
 */
(function () {
  'use strict';

  var GOOGLE_API_KEY = 'AIzaSyBevPK4xCzOBYGSD9qA30pgO66iuWP0MoA';
  var PLACE_ID = 'ChIJvWf3BwCzzBQR_-5n57A9DNs';
  var MAPS_FALLBACK_URL = 'https://www.google.com/maps/place/Sakarya+Orion+Turizm/@40.7746235,30.3618203,17z';
  var CARD_GAP = 24;

  function container() { return document.getElementById('googleReviewsContainer'); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function cardsPerView() {
    return window.innerWidth < 768 ? 1 : (window.innerWidth < 1024 ? 2 : 3);
  }

  function showFallback() {
    var box = container();
    if (!box) return;
    box.innerHTML = '';
    var p = el('p', 'muted', 'Google yorumlarımızı görmek için ');
    var a = el('a', null, 'Google Maps profilimizi ziyaret edin');
    a.href = MAPS_FALLBACK_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.cssText = 'color: var(--brand); text-decoration: underline;';
    p.appendChild(a);
    box.appendChild(p);
  }

  function renderReviews(reviews) {
    var box = container();
    if (!box) return;
    var list = reviews.slice()
      .sort(function (a, b) { return b.rating - a.rating; })
      .filter(function (r) { return r.rating >= 4 && r.text && r.text.trim().length > 0; })
      .slice(0, 5);

    box.innerHTML = '';
    if (!list.length) { box.appendChild(el('p', 'muted', 'Henüz yorum yok.')); return; }

    var carousel = el('div', 'reviews-carousel');
    var prev = el('button', 'reviews-prev', '❮');
    prev.setAttribute('aria-label', 'Önceki');
    var next = el('button', 'reviews-next', '❯');
    next.setAttribute('aria-label', 'Sonraki');
    var track = el('div', 'reviews-track');

    list.forEach(function (review) {
      var card = el('div', 'review-card');
      var header = el('div', 'review-header');
      var avatar = el('img', 'review-avatar');
      avatar.src = review.profile_photo_url ||
        'https://ui-avatars.com/api/?name=' + encodeURIComponent(review.author_name) + '&background=7a1c86&color=fff&size=128';
      avatar.alt = review.author_name;
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      var info = el('div', 'review-info');
      info.appendChild(el('h4', 'review-author', review.author_name));
      info.appendChild(el('div', 'review-stars', '⭐'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))));
      info.appendChild(el('p', 'review-date', formatDate(review.time)));
      header.append(avatar, info);
      card.append(header, el('p', 'review-text', review.text || 'Harika bir deneyim!'));
      track.appendChild(card);
    });

    carousel.append(prev, track, next);
    var dots = el('div', 'reviews-dots');
    var cta = el('div', 'reviews-cta');
    cta.style.cssText = 'text-align:center; margin-top: 16px;';
    var ctaLink = el('a', 'btn btn-outline', 'Google\'da tüm yorumları gör →');
    ctaLink.href = 'https://www.google.com/maps/place/?q=place_id:' + PLACE_ID;
    ctaLink.target = '_blank';
    ctaLink.rel = 'noopener';
    ctaLink.style.cssText = 'display:inline-block; padding:10px 16px; border-radius:10px; border:1px solid var(--brand);';
    cta.appendChild(ctaLink);
    box.append(carousel, dots, cta);

    setupCarousel(track, prev, next, dots, list.length);
  }

  function setupCarousel(track, prev, next, dots, total) {
    var index = 0;
    var perView = cardsPerView();
    var maxIndex = 0;

    var buildDots = function () {
      maxIndex = Math.max(0, total - perView);
      dots.innerHTML = '';
      for (var i = 0; i <= maxIndex; i++) {
        var dot = el('span', 'review-dot');
        dot.addEventListener('click', goTo.bind(null, i));
        dots.appendChild(dot);
      }
    };
    var update = function () {
      var card = track.querySelector('.review-card');
      var offset = index * ((card ? card.offsetWidth : 0) + CARD_GAP);
      track.style.transform = 'translateX(-' + offset + 'px)';
      Array.prototype.forEach.call(dots.children, function (dot, i) { dot.classList.toggle('active', i === index); });
      prev.disabled = index === 0;
      next.disabled = index >= maxIndex;
    };
    function goTo(i) {
      index = Math.max(0, Math.min(i, maxIndex));
      update();
    }

    prev.addEventListener('click', function () { goTo(index - 1); });
    next.addEventListener('click', function () { goTo(index + 1); });
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var nextPerView = cardsPerView();
        if (nextPerView !== perView) { perView = nextPerView; buildDots(); }
        goTo(index);
      }, 150);
    });
    buildDots();
    update();
  }

  // Google Maps JS API callback'i
  window.initGoogleReviews = async function () {
    try {
      var lib = await google.maps.importLibrary('places');
      var place = new lib.Place({ id: PLACE_ID });
      await place.fetchFields({ fields: ['reviews', 'rating', 'userRatingCount'] });
      if (!place.reviews || !place.reviews.length) { showFallback(); return; }
      renderReviews(place.reviews.map(function (r) {
        return {
          rating: r.rating,
          text: r.text,
          author_name: (r.authorAttribution && r.authorAttribution.displayName) || 'Anonim',
          profile_photo_url: (r.authorAttribution && r.authorAttribution.photoURI) || '',
          time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : Date.now() / 1000
        };
      }));
    } catch (error) {
      console.error('Google Places API hatası:', error);
      showFallback();
    }
  };

  var started = false;
  function start() {
    if (started) return;
    started = true;
    var script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_API_KEY + '&libraries=places&loading=async&callback=initGoogleReviews';
    script.async = true;
    script.onerror = showFallback;
    document.head.appendChild(script);
  }

  // Yorumlar bölümüne yaklaşınca (veya en geç 6 sn sonra) yükle
  function init() {
    var box = container();
    if (!box) return;
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { observer.disconnect(); start(); }
      }, { rootMargin: '350px 0px' });
      observer.observe(box);
      setTimeout(start, 6000);
    } else {
      setTimeout(start, 2500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
