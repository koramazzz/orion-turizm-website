/*
 * Ortak yardımcılar (site + admin). window.OrionCommon altında toplanır.
 * Bu dosya supabase-config.js'ten ÖNCE yüklenmelidir.
 */
(function () {
  'use strict';

  var TR_CHARS = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' };

  /** HTML içine yazılacak metni kaçırır. */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Tur linkini storage klasör adına çevirir ("GAP 4" -> "gap-4").
   * DİKKAT: Storage'daki mevcut klasörler bu algoritmayla oluşturuldu
   * (ör. "İznik" -> "i-znik"). Değiştirilirse eski görseller bulunamaz.
   */
  function normalizeTourId(rawValue) {
    return String(rawValue || '')
      .toLowerCase()
      .trim()
      .replace(/[ığüşöç]/g, function (ch) { return TR_CHARS[ch]; })
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** "a|b|c" satırlarını nesnelere çevirir; değerler kırpılır, eksikler boş string olur. */
  function parsePipeLines(text, keys) {
    return String(text || '')
      .split('\n')
      .filter(function (line) { return line.trim(); })
      .map(function (line) {
        var parts = line.split('|');
        var item = {};
        keys.forEach(function (key, i) { item[key] = (parts[i] || '').trim(); });
        return item;
      });
  }

  /** "ad|url" satırları -> [{name, url}] (ikisi de dolu olanlar). */
  function parseNameUrlLines(text) {
    return parsePipeLines(text, ['name', 'url']).filter(function (item) { return item.name && item.url; });
  }

  /**
   * transport_orgs.description alanını çözer. Üç format desteklenir:
   *  - v2 JSON: {"v":2, "buttons":[...], "text":"...", "contacts":[...]}
   *  - eski buton dizisi: [...]
   *  - eski düz metin açıklama
   */
  function parseOrgDescription(description) {
    var result = { buttons: [], text: '', contacts: [], structured: false };
    var trimmed = String(description || '').trim();
    if (!trimmed) return result;

    if (trimmed.charAt(0) === '{') {
      try {
        var parsed = JSON.parse(trimmed);
        result.structured = Boolean(parsed && (parsed.v === 2 || Array.isArray(parsed.buttons) ||
          Object.prototype.hasOwnProperty.call(parsed, 'text') || Array.isArray(parsed.contacts)));
        result.buttons = Array.isArray(parsed.buttons) ? parsed.buttons : [];
        result.text = typeof parsed.text === 'string' ? parsed.text : '';
        result.contacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];
      } catch (e) { /* bozuk JSON: boş kabul et */ }
      return result;
    }
    if (trimmed.charAt(0) === '[') {
      try {
        var buttons = JSON.parse(trimmed);
        result.buttons = Array.isArray(buttons) ? buttons : [];
      } catch (e) { /* yok say */ }
      return result;
    }
    result.text = trimmed;
    return result;
  }

  /** Eski URL sütunlarından (contract_url vb.) buton listesi üretir. */
  function legacyOrgButtons(org) {
    return [
      { label: '📄 Sözleşme İndir', url: org.contract_url || '', style: 'outline' },
      { label: '🌐 Vita Web Paneli', url: org.vita_web_url || '', style: 'outline' },
      { label: '📱 Vita Uygulaması', url: org.vita_app_url || '', style: 'outline' },
      { label: '💳 Ödeme Yap', url: org.payment_url || '', style: 'primary' }
    ];
  }

  /** http(s)/mailto/tel ile başlamayan adreslere https:// ekler. */
  function ensureProtocol(url, allowMailTel) {
    var value = String(url || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (allowMailTel && /^(mailto|tel):/i.test(value)) return value;
    return 'https://' + value;
  }

  /** ?v=123 gibi önbellek kırıcıları temizler. */
  function stripCacheBuster(url) {
    return String(url || '').trim().replace(/[?&]v=\d+$/, '').split('?v=')[0];
  }

  /** Admin önizlemelerinde tarayıcı önbelleğini atlamak için ?v=zaman ekler. */
  function withCacheBuster(url) {
    var clean = String(url || '').trim();
    if (!clean) return '';
    if (clean.indexOf('data:') === 0 || clean.indexOf('blob:') === 0) return clean.split('?')[0];
    return clean + (clean.indexOf('?') !== -1 ? '&' : '?') + 'v=' + Date.now();
  }

  /** <img> kaynağını ayarlar; yüklenemezse görseli gizler. */
  function setImageSource(img, url, options) {
    if (!img || !url) return;
    options = options || {};
    if (options.loading) img.loading = options.loading;
    if (options.fetchPriority) img.fetchPriority = options.fetchPriority;
    img.decoding = 'async';
    img.hidden = false;
    img.onerror = function () { img.hidden = true; };
    img.src = url;
  }

  function setBackgroundImage(element, url) {
    if (element && url) element.style.setProperty('--bg', 'url("' + url + '")');
  }

  /** Public storage URL'inden bucket ve yol çıkarır. */
  function parseStorageUrl(url) {
    var match = String(url || '').split('?')[0].match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
  }

  // -----------------------------------------------------------------
  // Tur görselleri (storage: tour-images/tours/<tourId>/...)
  // -----------------------------------------------------------------
  function imageIndex(url) {
    var match = String(url || '').match(/\/image(\d+)\.png$/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  }

  function sortByImageIndex(urls) {
    return urls.slice().sort(function (a, b) { return imageIndex(a) - imageIndex(b); });
  }

  /** Kayıtlı + storage'daki görselleri tekilleştirip imageN sırasına dizer. */
  function mergeTourImageUrls(savedUrls, storageUrls) {
    var seen = [];
    (savedUrls || []).concat(storageUrls || []).forEach(function (url) {
      var clean = String(url || '').trim();
      if (clean && seen.indexOf(clean) === -1) seen.push(clean);
    });
    return sortByImageIndex(seen);
  }

  function listTourFolder(link) {
    var backend = window.backendManager;
    if (!backend || !link) return Promise.resolve({ tourId: '', names: [] });
    var tourId = normalizeTourId(link);
    return backend.listImages('tour-images', 'tours/' + tourId).then(function (files) {
      return { tourId: tourId, names: (files || []).map(function (f) { return (f && f.name) || ''; }) };
    });
  }

  function getTourStorageImageUrls(link) {
    return listTourFolder(link).then(function (folder) {
      var names = folder.names.filter(function (name) { return /^image\d+\.png$/i.test(name); });
      return sortByImageIndex(names.map(function (name) {
        return window.backendManager.getImageUrl('tour-images', 'tours/' + folder.tourId + '/' + name);
      }));
    });
  }

  /**
   * Gezi afişi dosyasını storage'da bulur. Eski yüklemeler "mapImage.png",
   * yenileri "mapimage.png" adıyla kaydedilmiş; storage büyük/küçük harf
   * duyarlı olduğu için gerçek dosya adı listeden alınır.
   */
  function getTourStorageMapImageUrl(link, preferredName) {
    return listTourFolder(link).then(function (folder) {
      var candidates = folder.names.filter(function (name) { return /^mapimage\.png$/i.test(name); });
      if (!candidates.length) return '';
      var name = candidates.indexOf(preferredName) !== -1 ? preferredName
        : (candidates.indexOf('mapimage.png') !== -1 ? 'mapimage.png' : candidates[0]);
      return window.backendManager.getImageUrl('tour-images', 'tours/' + folder.tourId + '/' + name);
    });
  }

  function imageUrlLoads(url) {
    if (!url) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var probe = new Image();
      var timer = setTimeout(function () { probe.onload = probe.onerror = null; resolve(false); }, 5000);
      probe.onload = function () { clearTimeout(timer); resolve(true); };
      probe.onerror = function () { clearTimeout(timer); resolve(false); };
      probe.src = url;
    });
  }

  /** Tur detayındaki kayıtlı afiş adresini doğrular, gerekirse storage'dan bulur. */
  function resolveTourMapImageUrl(link, savedUrl) {
    var saved = String(savedUrl || '').trim();
    var info = parseStorageUrl(saved);
    var expected = 'tours/' + normalizeTourId(link) + '/mapimage.png';
    if (info && info.bucket === 'tour-images' && info.path.toLowerCase() === expected) {
      return getTourStorageMapImageUrl(link, info.path.split('/').pop());
    }
    if (!saved) return getTourStorageMapImageUrl(link);
    return imageUrlLoads(saved).then(function (ok) { return ok ? saved : getTourStorageMapImageUrl(link); });
  }

  window.OrionCommon = {
    escapeHtml: escapeHtml,
    normalizeTourId: normalizeTourId,
    parsePipeLines: parsePipeLines,
    parseNameUrlLines: parseNameUrlLines,
    parseOrgDescription: parseOrgDescription,
    legacyOrgButtons: legacyOrgButtons,
    ensureProtocol: ensureProtocol,
    stripCacheBuster: stripCacheBuster,
    withCacheBuster: withCacheBuster,
    setImageSource: setImageSource,
    setBackgroundImage: setBackgroundImage,
    parseStorageUrl: parseStorageUrl,
    mergeTourImageUrls: mergeTourImageUrls,
    getTourStorageImageUrls: getTourStorageImageUrls,
    getTourStorageMapImageUrl: getTourStorageMapImageUrl,
    resolveTourMapImageUrl: resolveTourMapImageUrl
  };

  // Geriye dönük uyumluluk (eski satır içi kodlar bu adları kullanıyordu)
  window.normalizeTourId = normalizeTourId;
})();
