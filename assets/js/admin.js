/*
 * Admin paneli (admin.html). Önceden admin.js + admin.html içindeki iki satır içi
 * script'e dağılmış olan kodun tek yerde toplanmış hali.
 *
 * Veri formatları bilerek değiştirilmedi (site_content anahtarları, "ad|url" satırları,
 * transport_orgs.description v2 JSON'u, tourDetails JSON satırları); mevcut kayıtlarla uyumludur.
 *
 * admin.html'deki onclick="..." öznitelikleri buradaki global fonksiyonları çağırır,
 * bu yüzden o fonksiyonların adları korunmuştur.
 */
(function () {
  'use strict';

  var C = window.OrionCommon;
  var esc = C.escapeHtml;
  var withCacheBuster = C.withCacheBuster;
  var normalizeTourId = C.normalizeTourId;
  var backend = function () { return window.backendManager; };

  var PLACEHOLDER_CONTACT_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='100' viewBox='0 0 80 100'%3E%3Crect width='80' height='100' fill='%23e5e7eb' rx='8'/%3E%3Ccircle cx='40' cy='35' r='18' fill='%239ca3af'/%3E%3Cellipse cx='40' cy='80' rx='28' ry='22' fill='%239ca3af'/%3E%3C/svg%3E";

  function $(id) { return document.getElementById(id); }
  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function fileExt(file) { return file.name.split('.').pop(); }

  /** Kurum logosu dosya adı (storage'daki mevcut orgs/*.png adlarıyla uyumlu). */
  function orgSlug(name) {
    return String(name || '').toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  function cleanStoredImageUrl(url) {
    var value = String(url || '').trim();
    if (!value || value.indexOf('data:image/svg') === 0) return '';
    return C.stripCacheBuster(value);
  }

  // =================================================================
  // Basit listeler: Hizmet Verdiğimiz Kurumlar / Yetkili Kurumlar / Partnerler
  // =================================================================
  var NAME_URL_LISTS = {
    serviceOrgs: { list: 'serviceOrgsList', name: 'service-org-name', url: 'service-org-url', namePh: 'Kurum Adı', urlPh: 'www.kurum.com (https:// otomatik eklenir)', remove: 'removeServiceOrg(this)', key: 'serviceOrganizations' },
    institutions: { list: 'institutionsList', name: 'institution-name', url: 'institution-url', namePh: 'Kurum Adı', urlPh: 'www.kurum.com (https:// otomatik eklenir)', remove: 'removeInstitution(this)', key: 'authorizedInstitutions' },
    partners: { list: 'partnersList', name: 'partner-name', url: 'partner-url', namePh: 'Partner Adı', urlPh: 'www.partner.com (https:// otomatik eklenir)', remove: 'removePartner(this)', key: 'partnerList' }
  };

  /** fromBackend: kayıtlı veriden yüklenen satır (eski koddaki görünümle aynı). */
  function addNameUrlItem(cfg, name, url, fromBackend) {
    var container = $(cfg.list);
    if (!container) return;
    var item = document.createElement('div');
    item.className = 'list-item';
    if (fromBackend) item.style.gridTemplateColumns = '2fr 1fr 60px';
    item.innerHTML =
      '<input type="text" placeholder="' + esc(cfg.namePh) + '" class="' + cfg.name + '" value="' + esc(name) + '" />' +
      '<input type="url" placeholder="' + esc(fromBackend ? cfg.namePh.replace('Adı', 'URL') : cfg.urlPh) + '" class="' + cfg.url + '" value="' + esc(url) + '" />' +
      '<button type="button" class="btn btn-ghost btn-sm remove-item" onclick="' + (fromBackend ? 'this.parentElement.remove()' : cfg.remove) + '">🗑️</button>';
    container.appendChild(item);
  }

  function loadNameUrlList(cfg, text) {
    var container = $(cfg.list);
    if (!container) return;
    container.innerHTML = '';
    String(text || '').split('\n').filter(function (l) { return l.trim(); }).forEach(function (line) {
      var parts = line.split('|');
      if (parts[0] && parts[1]) addNameUrlItem(cfg, parts[0], parts[1], true);
    });
  }

  function getNameUrlListData(cfg) {
    var lines = [];
    document.querySelectorAll('#' + cfg.list + ' .list-item').forEach(function (item) {
      var name = item.querySelector('.' + cfg.name).value.trim();
      var url = item.querySelector('.' + cfg.url).value.trim();
      if (name && url) lines.push(name + '|' + C.ensureProtocol(url));
    });
    return lines.join('\n');
  }

  function removeKeepingOne(button, listId) {
    var container = $(listId);
    if (container.children.length > 1) button.closest('.list-item').remove();
  }

  window.addServiceOrg = function () { addNameUrlItem(NAME_URL_LISTS.serviceOrgs, '', '', false); };
  window.removeServiceOrg = function (button) { button.parentElement.remove(); };
  window.addInstitution = function () { addNameUrlItem(NAME_URL_LISTS.institutions, '', '', false); };
  window.removeInstitution = function (button) { removeKeepingOne(button, 'institutionsList'); };
  window.addPartner = function () { addNameUrlItem(NAME_URL_LISTS.partners, '', '', false); };
  window.removePartner = function (button) { removeKeepingOne(button, 'partnersList'); };

  // =================================================================
  // Taşımacılık hizmet kartları
  // =================================================================
  window.addTransportService = function (data) {
    var container = $('transportServicesList');
    if (!container) return;
    var item = document.createElement('div');
    item.className = 'list-item';
    item.style.cssText = 'display:grid; grid-template-columns: 1fr 2fr auto; gap:10px; align-items:start;';
    item.innerHTML =
      '<input type="text" placeholder="Hizmet Başlığı (örn: Öğrenci Servisi)" class="transport-service-title" style="font-weight:600;" value="' + esc(data && data.title) + '" />' +
      '<textarea placeholder="Hizmet Açıklaması..." class="transport-service-desc" rows="2" style="resize:vertical;">' + esc(data && data.desc) + '</textarea>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="this.closest(\'.list-item\').remove()" title="Kaldır" style="margin-top:4px;">🗑️</button>';
    container.appendChild(item);
  };

  function addDefaultTransportServicesIfEmpty() {
    var container = $('transportServicesList');
    if (container && container.children.length === 0) {
      window.addTransportService({ title: 'Öğrenci Servisi', desc: 'Güvenli, konforlu ve zamanında ulaşım.' });
      window.addTransportService({ title: 'Personel Servisi', desc: 'Fabrika ve kurumlar için servis hizmeti.' });
    }
  }

  function getTransportServicesData() {
    var result = [];
    document.querySelectorAll('#transportServicesList .list-item').forEach(function (item) {
      var title = (item.querySelector('.transport-service-title') || {}).value || '';
      var desc = (item.querySelector('.transport-service-desc') || {}).value || '';
      if (title.trim()) result.push({ title: title.trim(), desc: desc.trim() });
    });
    return result;
  }

  // =================================================================
  // Kurum açıklamaları (dropdown + metin kutusu, bellekte tutulur)
  // =================================================================
  window.orgDescriptionsStore = {};

  window.saveCurrentOrgDescription = function () {
    var select = $('orgDescDropdown');
    var textarea = $('orgDescTextarea');
    if (select && textarea && select.value) window.orgDescriptionsStore[select.value] = textarea.value;
  };

  window.loadOrgDescriptionForDropdown = function () {
    var select = $('orgDescDropdown');
    var wrapper = $('orgDescEditorWrapper');
    var label = $('orgDescLabel');
    var textarea = $('orgDescTextarea');
    if (!select || !wrapper || !label || !textarea) return;
    if (!select.value) { wrapper.style.display = 'none'; return; }
    label.textContent = select.value + ' — Açıklama:';
    textarea.value = window.orgDescriptionsStore[select.value] || '';
    wrapper.style.display = 'block';
    textarea.focus();
  };

  window.refreshOrgDescDropdown = function () {
    var select = $('orgDescDropdown');
    if (!select) return;
    var current = select.value;
    window.saveCurrentOrgDescription();
    select.innerHTML = '<option value="">-- Kurum Seçin --</option>';
    var found = false;
    document.querySelectorAll('#transportOrgsList .list-item').forEach(function (item) {
      var input = item.querySelector('.org-name');
      var name = input && input.value.trim();
      if (!name) return;
      var option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (name === current) { option.selected = true; found = true; }
      select.appendChild(option);
    });
    if (!found) select.value = '';
    window.loadOrgDescriptionForDropdown();
  };

  window.syncOrgDescriptions = function (options) {
    window.saveCurrentOrgDescription();
    window.refreshOrgDescDropdown();
    if (!(options && options.silent)) {
      var select = $('orgDescDropdown');
      var count = select ? select.options.length - 1 : 0;
      if (count > 0) alert(count + " kurum dropdown'a senkronize edildi!");
    }
  };

  function addOrgDescriptionOption(name, description) {
    if (!name) return;
    window.orgDescriptionsStore[name] = description || '';
    var select = $('orgDescDropdown');
    if (select && !Array.prototype.some.call(select.options, function (o) { return o.value === name; })) {
      var option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
  }

  // =================================================================
  // Taşımacılık kurumları (katlanabilir kartlar)
  // =================================================================
  window.toggleOrgCard = function (card) { card.classList.toggle('open'); };

  window.syncOrgCardHeader = function (card) {
    var name = (card.querySelector('.org-name') || {}).value || 'Yeni Kurum';
    var count = card.querySelectorAll('.org-btn-row').length;
    var nameDisplay = card.querySelector('.org-name-display');
    var badge = card.querySelector('.org-btn-badge');
    if (nameDisplay) nameDisplay.textContent = name || 'Yeni Kurum';
    if (badge) badge.textContent = '🔗 ' + count + ' buton';
  };
  window.updateOrgBtnCount = window.syncOrgCardHeader;

  window.addOrgButton = function (editor, data) {
    var list = editor.querySelector('.org-buttons-list');
    var row = document.createElement('div');
    row.className = 'org-btn-row';
    row.style.cssText = 'display:grid; grid-template-columns:2fr 3fr 100px 36px; gap:6px; align-items:center; margin-bottom:6px;';
    var primary = data && data.style === 'primary';
    row.innerHTML =
      '<input type="text" placeholder="📄 Sözleşme İndir" class="org-btn-label" value="' + esc(data && data.label) + '" />' +
      '<input type="url"  placeholder="https://..." class="org-btn-url" value="' + esc(data && data.url) + '" />' +
      '<select class="org-btn-style">' +
        '<option value="outline"' + (primary ? '' : ' selected') + '>Çerçeveli</option>' +
        '<option value="primary"' + (primary ? ' selected' : '') + '>Dolu (mor)</option>' +
      '</select>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="var c=this.closest(\'.org-card\'); this.closest(\'.org-btn-row\').remove(); syncOrgCardHeader(c)" title="Kaldır">🗑️</button>';
    list.appendChild(row);
    var card = editor.closest('.org-card');
    if (card) window.syncOrgCardHeader(card);
  };

  window.addOrgContact = function (editor, data) {
    var list = editor.querySelector('.org-contacts-list');
    if (!list) return;
    if (list.querySelectorAll('.org-contact-card').length >= 2) {
      alert('En fazla 2 yetkili kişi eklenebilir.');
      return;
    }
    var card = document.createElement('div');
    card.className = 'org-contact-card';
    card.style.cssText = '\n          display:flex; flex-direction:column; align-items:center; gap:8px;\n          background:#fff; border:1.5px solid #bbf7d0; border-radius:12px;\n          padding:12px 10px; width:160px; position:relative;\n        ';
    card.innerHTML =
      '<button type="button" onclick="this.closest(\'.org-contact-card\').remove()" style="position:absolute;top:6px;right:6px;background:none;border:none;cursor:pointer;font-size:14px;line-height:1;color:#9ca3af;" title="Kaldır">✕</button>' +
      '<div class="contact-photo-area" style="position:relative;cursor:pointer;" onclick="this.querySelector(\'.contact-photo-upload\').click()">' +
        '<img class="contact-photo-preview" src="' + PLACEHOLDER_CONTACT_PHOTO + '" style="width:80px;height:100px;object-fit:cover;border-radius:8px;border:2px solid #d1fae5;display:block;" />' +
        '<div style="position:absolute;bottom:4px;right:4px;background:#16a34a;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;">📷</div>' +
        '<input type="file" class="contact-photo-upload" accept="image/*" style="position:absolute;opacity:0;width:0;height:0;" />' +
      '</div>' +
      '<input type="text" class="contact-name" placeholder="Ad Soyad" style="width:100%;padding:5px 8px;border:1.5px solid #d1fae5;border-radius:6px;font-size:12px;font-weight:600;text-align:center;font-family:inherit;" />' +
      '<input type="text" class="contact-title" placeholder="Görev / Unvan" style="width:100%;padding:5px 8px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;text-align:center;font-family:inherit;color:#6b7280;" />' +
      '<input type="tel" class="contact-phone" placeholder="📞 Telefon" style="width:100%;padding:5px 8px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;text-align:center;font-family:inherit;" />' +
      '<input type="email" class="contact-email" placeholder="✉️ E-posta" style="width:100%;padding:5px 8px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;text-align:center;font-family:inherit;" />';
    list.appendChild(card);
    setupContactPhotoUpload(card);

    if (data) {
      if (data.photo) card.querySelector('.contact-photo-preview').src = data.photo;
      if (data.name) card.querySelector('.contact-name').value = data.name;
      if (data.title) card.querySelector('.contact-title').value = data.title;
      if (data.phone) card.querySelector('.contact-phone').value = data.phone;
      if (data.email) card.querySelector('.contact-email').value = data.email;
    }
  };

  function setupContactPhotoUpload(card) {
    var input = card.querySelector('.contact-photo-upload');
    var preview = card.querySelector('.contact-photo-preview');
    if (!input || !preview) return;
    input.addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var previous = preview.src;
      var previousUrl = preview.dataset.url;
      preview.src = await readFileAsDataUrl(file);
      try {
        var url = await backend().uploadRawFile('transport-images', 'contacts/contact-' + Date.now() + '.' + fileExt(file), file, true, C.IMAGE_MAX_EDGE.contact);
        preview.src = url;
        preview.dataset.url = url;
      } catch (err) {
        // Yüklenemeyen fotoğrafın base64 hali veritabanına yazılmasın
        console.warn('Kişi fotoğrafı yüklenemedi:', err);
        preview.src = previous;
        if (previousUrl) preview.dataset.url = previousUrl; else delete preview.dataset.url;
        alert('Fotoğraf yüklenemedi: ' + (err.message || err));
      }
    });
  }

  function setupOrgLogoUpload(item) {
    var upload = item.querySelector('.org-logo-upload');
    var preview = item.querySelector('.org-logo-preview');
    if (!upload || !preview) return;
    upload.addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var dataUrl = await readFileAsDataUrl(file);
      var mini = item.querySelector('.org-mini-logo');
      preview.src = dataUrl;
      preview.style.display = 'block';
      if (mini) { mini.src = dataUrl; mini.style.display = 'block'; }
      try {
        var url = await backend().uploadTransportOrgLogo(dataUrl, orgSlug(item.querySelector('.org-name').value || 'temp'));
        preview.src = withCacheBuster(url);
        preview.dataset.url = url;
        if (mini) { mini.src = withCacheBuster(url); mini.style.display = 'block'; }
        if (window.adminPanel) window.adminPanel.showSuccessMessage();
      } catch (error) {
        console.error('Kurum logosu kaydetme hatası:', error);
        alert('Kurum logosu yüklenemedi: ' + (error.message || error));
      }
    });
  }

  window.addTransportOrg = function (data) {
    var container = $('transportOrgsList');
    if (!container) return;
    var item = document.createElement('div');
    item.className = 'list-item org-card';
    item.dataset.orgId = data && data.id ? String(data.id) : '';
    item.dataset.originalName = data && data.name ? String(data.name) : '';
    item.dataset.orgDescription = data && data.text ? String(data.text) : '';

    item.innerHTML =
      '<div class="org-card-header">' +
        '<div class="org-card-header-toggle" onclick="toggleOrgCard(this.closest(\'.org-card\'))" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;">' +
          '<img class="org-mini-logo" alt="" />' +
          '<span class="org-name-display">Yeni Kurum</span>' +
          '<span class="org-btn-badge">🔗 0 buton</span>' +
          '<span class="org-card-chevron">▼</span>' +
        '</div>' +
        '<select class="org-type" onchange="syncOrgCardHeader(this.closest(\'.org-card\'))" onclick="event.stopPropagation()" style="padding:4px 8px;border:1.5px solid var(--brand-100,#e0d4ff);border-radius:20px;font-family:inherit;font-size:12px;font-weight:600;color:var(--brand);background:var(--brand-50,#f5f0ff);cursor:pointer;flex-shrink:0;">' +
          '<option value="school">🏫 Okul</option>' +
          '<option value="factory">🏭 Fabrika</option>' +
        '</select>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); this.closest(\'.org-card\').remove()" title="Kurumu Sil" style="margin-left:4px;flex-shrink:0;">🗑️</button>' +
      '</div>' +
      '<div class="org-card-body">' +
        '<div class="org-card-fields"><div>' +
          '<label style="font-size:12px;font-weight:600;color:var(--brand);display:block;margin-bottom:4px;">Kurum Adı</label>' +
          '<input type="text" placeholder="Kurum Adı" class="org-name" oninput="syncOrgCardHeader(this.closest(\'.org-card\'))" style="width:100%;padding:8px 10px;border:1.5px solid #e6d9eb;border-radius:8px;font-family:inherit;font-size:13px;" />' +
        '</div></div>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="font-size:12px;font-weight:600;color:var(--brand);display:block;margin-bottom:4px;">Logo</label>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div class="file-upload" style="margin:0;font-size:12px;padding:6px 12px;"><input type="file" class="org-logo-upload" accept="image/*" />📁 Logo Yükle</div>' +
            '<img class="org-logo-preview" style="width:60px;height:38px;object-fit:contain;border:1px solid #ddd;border-radius:6px;display:none;" />' +
          '</div>' +
        '</div>' +
        '<div class="org-buttons-editor" style="background:var(--brand-50,#f5f0ff); border:1px solid var(--brand-100,#e0d4ff); border-radius:10px; padding:12px; margin-bottom:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
            '<span style="font-weight:600; font-size:13px; color:var(--brand);">🔗 Kurum Sayfası Butonları</span>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="addOrgButton(this.closest(\'.org-buttons-editor\'))">➕ Buton Ekle</button>' +
          '</div>' +
          '<div style="display:grid; grid-template-columns:2fr 3fr 100px 36px; gap:6px; font-size:11px; font-weight:600; color:var(--brand); margin-bottom:6px; padding:0 4px;">' +
            '<div>Etiket (ikon + metin)</div><div>URL</div><div>Stil</div><div></div>' +
          '</div>' +
          '<div class="org-buttons-list"></div>' +
        '</div>' +
        '<div class="org-contacts-editor" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
            '<span style="font-weight:600; font-size:13px; color:#166534;">👤 Yetkili Kişiler <small style="font-weight:400;color:#6b7280;">(en fazla 2)</small></span>' +
            '<button type="button" class="btn btn-sm" onclick="addOrgContact(this.closest(\'.org-contacts-editor\'))" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600;">➕ Kişi Ekle</button>' +
          '</div>' +
          '<div class="org-contacts-list" style="display:flex;flex-wrap:wrap;gap:12px;"></div>' +
        '</div>' +
      '</div>';

    container.appendChild(item);
    setupOrgLogoUpload(item);
    if (!data) return;

    item.querySelector('.org-name').value = data.name || '';
    item.querySelector('.org-type').value = data.type || 'school';
    if (data.name && data.text) window.orgDescriptionsStore[data.name] = data.text;
    if (data.logo) {
      var preview = item.querySelector('.org-logo-preview');
      preview.src = withCacheBuster(data.logo);
      preview.dataset.url = data.logo;
      preview.style.display = 'block';
      var mini = item.querySelector('.org-mini-logo');
      mini.src = withCacheBuster(data.logo);
      mini.style.display = 'block';
    }
    var editor = item.querySelector('.org-buttons-editor');
    (data.buttons && data.buttons.length ? data.buttons : C.legacyOrgButtons({})).forEach(function (btn) { window.addOrgButton(editor, btn); });
    var contactsEditor = item.querySelector('.org-contacts-editor');
    (data.contacts || []).forEach(function (c) { window.addOrgContact(contactsEditor, c); });
    window.syncOrgCardHeader(item);
  };

  function loadTransportOrgs(orgs) {
    var container = $('transportOrgsList');
    if (!container) return;
    container.innerHTML = '';
    orgs.forEach(function (org) {
      var parsed = C.parseOrgDescription(org.description);
      var buttons = parsed.buttons;
      if (!buttons.length && !parsed.structured) buttons = C.legacyOrgButtons(org);
      if (org.name && parsed.text) window.orgDescriptionsStore[org.name] = parsed.text;
      window.addTransportOrg({ id: org.id, name: org.name, type: org.type, logo: org.logo_url, buttons: buttons, contacts: parsed.contacts, text: parsed.text });
    });
    window.refreshOrgDescDropdown();
  }

  function getTransportOrgsData() {
    var container = $('transportOrgsList');
    if (!container) return [];
    return Array.prototype.map.call(container.querySelectorAll(':scope > .list-item'), function (item) {
      var name = (item.querySelector('.org-name') || {}).value;
      name = (name || '').trim();
      if (!name) return null;
      var originalName = item.dataset.originalName || '';

      var buttons = [];
      item.querySelectorAll('.org-btn-row').forEach(function (row) {
        var label = row.querySelector('.org-btn-label').value.trim();
        var url = row.querySelector('.org-btn-url').value.trim();
        var style = row.querySelector('.org-btn-style').value || 'outline';
        if (label || url) buttons.push({ label: label, url: url, style: style });
      });

      var logoPreview = item.querySelector('.org-logo-preview');
      var logo = cleanStoredImageUrl((logoPreview && (logoPreview.dataset.url || logoPreview.src)) || '');

      // Kurum adı değiştiyse açıklamayı yeni ada taşı
      var store = window.orgDescriptionsStore;
      var text = (store[name] || '').trim();
      if (!text && originalName && originalName !== name) {
        text = (store[originalName] || item.dataset.orgDescription || '').trim();
        if (text) store[name] = text;
      }

      var contacts = [];
      item.querySelectorAll('.org-contact-card').forEach(function (card) {
        var preview = card.querySelector('.contact-photo-preview');
        var photo = (preview && (preview.dataset.url || preview.src)) || '';
        var contact = {
          photo: photo.indexOf('data:image/svg') === 0 ? '' : photo,
          name: card.querySelector('.contact-name').value.trim(),
          title: card.querySelector('.contact-title').value.trim(),
          phone: card.querySelector('.contact-phone').value.trim(),
          email: card.querySelector('.contact-email').value.trim()
        };
        if (contact.name || contact.phone) contacts.push(contact);
      });

      return { id: item.dataset.orgId || '', name: name, type: item.querySelector('.org-type').value || 'school', buttons: buttons, logo: logo, text: text, contacts: contacts };
    }).filter(Boolean);
  }

  function normalizeOrg(org) {
    var parsed = C.parseOrgDescription(org.description || '');
    var buttons = Array.isArray(org.buttons) ? org.buttons : parsed.buttons;
    var contacts = Array.isArray(org.contacts) ? org.contacts : parsed.contacts;
    var text = typeof org.text === 'string' ? org.text : parsed.text;
    var str = function (v) { return String(v || '').trim(); };
    return {
      name: str(org.name),
      type: str(org.type) || 'school',
      logo: cleanStoredImageUrl(org.logo || org.logo_url || ''),
      text: str(text),
      buttons: buttons.map(function (b) { return { label: str(b.label), url: str(b.url), style: str(b.style) || 'outline' }; })
        .filter(function (b) { return b.label || b.url; }),
      contacts: contacts.map(function (c) {
        return { photo: cleanStoredImageUrl(c.photo), name: str(c.name), title: str(c.title), phone: str(c.phone), email: str(c.email) };
      }).filter(function (c) { return c.name || c.phone || c.email || c.title || c.photo; })
    };
  }

  // =================================================================
  // Hazır turlar
  // =================================================================
  var TOUR_ROW_TEMPLATE = function (tour) {
    var image = tour ? tour.image : '';
    return '<input type="text" placeholder="Tur Adı" class="tour-name"' + (tour ? ' value="' + esc(tour.name) + '"' : '') + ' />' +
      '<input type="text" placeholder="Tur Açıklaması" class="tour-description"' + (tour ? ' value="' + esc(tour.description) + '"' : '') + ' />' +
      '<div style="display: flex; flex-direction: column; gap: 8px;">' +
        '<div class="file-upload" style="margin: 0;"><input type="file" class="tour-image-upload" accept="image/*" />📁 Tur Görseli Yükle</div>' +
        '<img class="tour-image-preview" style="width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ' + (image ? 'display: block;' : 'display: none;') + '"' + (tour ? ' src="' + esc(image) + '"' : '') + ' />' +
        '<button type="button" class="btn btn-ghost btn-sm remove-tour-image" style="font-size: 11px;">🗑️ Görseli Sil</button>' +
      '</div>' +
      '<input type="text" placeholder="Tur Detay Linki (örn: kapadokya)" class="tour-link"' + (tour ? ' value="' + esc(tour.link) + '"' : '') + ' />' +
      '<button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTour(this)">🗑️</button>';
  };

  function setupTourImageUpload(item) {
    var upload = item.querySelector('.tour-image-upload');
    var preview = item.querySelector('.tour-image-preview');
    var removeBtn = item.querySelector('.remove-tour-image');
    if (upload && preview) {
      upload.addEventListener('change', async function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var dataUrl = await readFileAsDataUrl(file);
        preview.src = dataUrl;
        preview.style.display = 'block';
        var name = item.querySelector('.tour-name').value;
        var link = item.querySelector('.tour-link').value;
        if (!name || !link) { alert('Lütfen önce tur adı ve detay linkini girin!'); return; }
        if (!normalizeTourId(link)) { alert('Geçersiz tur linki. Lütfen link alanını kontrol edin.'); return; }
        try {
          var url = await backend().uploadTourImage(dataUrl, normalizeTourId(link), 'main');
          setTimeout(function () { preview.src = withCacheBuster(url); }, 500);
          // Mevcut davranış: görsel yüklenince tüm değişiklikler kaydedilir
          await window.adminPanel.saveChanges();
        } catch (error) {
          console.error('Tur görsel yükleme hatası:', error);
          alert('Tur görseli yüklenirken hata oluştu: ' + error.message);
        }
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        var link = item.querySelector('.tour-link').value.trim();
        if (link) backend().deleteImage('tour-images', 'tours/' + normalizeTourId(link) + '/main.png');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
      });
    }
  }

  window.addTour = function () {
    var container = $('toursList');
    var item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = TOUR_ROW_TEMPLATE(null);
    container.appendChild(item);
    setupTourImageUpload(item);
    refreshTourDetailLinkDropdowns();
  };

  window.removeTour = function (button) {
    var container = $('toursList');
    if (container.children.length > 1) {
      button.parentElement.remove();
      refreshTourDetailLinkDropdowns();
    }
  };

  function loadTours(tours) {
    var container = $('toursList');
    if (!container) return;
    container.innerHTML = '';
    tours.forEach(function (tour) {
      var item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = TOUR_ROW_TEMPLATE({
        name: tour.name,
        description: tour.description,
        link: tour.link,
        image: backend().getImageUrl('tour-images', 'tours/' + normalizeTourId(tour.link || tour.id) + '/main.png') + '?v=' + Date.now()
      });
      container.appendChild(item);
      setupTourImageUpload(item);
    });
    refreshTourDetailLinkDropdowns();
  }

  function getToursData() {
    var lines = [];
    document.querySelectorAll('#toursList .list-item').forEach(function (item) {
      var name = item.querySelector('.tour-name').value.trim();
      var description = item.querySelector('.tour-description').value.trim();
      var link = item.querySelector('.tour-link').value.trim();
      // Görsel storage'da (tours/<id>/main.png) tutulur; satırdaki görsel alanı boş kalır.
      if (name && description && link) lines.push(name + '|' + description + '||' + link);
    });
    return lines.join('\n');
  }

  // =================================================================
  // Tur detayları (akordeon)
  // =================================================================
  function getReadyTourLinks() {
    var links = [];
    document.querySelectorAll('#toursList .tour-link').forEach(function (input) {
      var link = (input.value || '').trim();
      if (link && links.indexOf(link) === -1) links.push(link);
    });
    return links;
  }

  function tourDetailLinkOptions(selectedValue) {
    var links = getReadyTourLinks();
    var selected = String(selectedValue || '').trim();
    var options = ['<option value="">Tur seçin</option>'];
    links.forEach(function (link) {
      options.push('<option value="' + esc(link) + '" ' + (link === selected ? 'selected' : '') + '>' + esc(link) + '</option>');
    });
    if (selected && links.indexOf(selected) === -1) {
      options.push('<option value="' + esc(selected) + '" selected>' + esc(selected) + ' (Arşiv)</option>');
    }
    if (!links.length && !selected) options.push('<option value="" disabled>Önce "Hazır Turlar" bölümüne tur ekleyin</option>');
    return options.join('');
  }

  function updateTourDetailHeader(item) {
    if (!item) return;
    var select = item.querySelector('.tour-detail-link');
    var label = item.querySelector('.tour-detail-toggle-label');
    var titleInput = item.querySelector('.tour-detail-title');
    if (!label) return;
    var title = titleInput && titleInput.value.trim();
    var selectedText = (select && select.selectedOptions && select.selectedOptions[0] && select.selectedOptions[0].textContent.trim()) ||
      (select && select.value.trim()) || '';
    label.textContent = title || selectedText || 'Yeni Tur Detayı';
  }

  function refreshTourDetailLinkDropdowns() {
    document.querySelectorAll('#tourDetailsList .tour-detail-link').forEach(function (select) {
      select.innerHTML = tourDetailLinkOptions((select.value || '').trim());
    });
    document.querySelectorAll('#tourDetailsList .tour-details-item').forEach(updateTourDetailHeader);
  }

  function openTourDetailAccordion(item) {
    document.querySelectorAll('#tourDetailsList .tour-details-item').forEach(function (el) {
      if (el !== item) el.classList.add('collapsed');
    });
    if (item) item.classList.remove('collapsed');
  }

  function initTourDetailAccordion(item, open) {
    var toggle = item.querySelector('.tour-detail-toggle');
    var titleInput = item.querySelector('.tour-detail-title');
    var linkSelect = item.querySelector('.tour-detail-link');
    item.classList.add('collapsed');
    if (open) openTourDetailAccordion(item);
    toggle.addEventListener('click', function () {
      if (item.classList.contains('collapsed')) openTourDetailAccordion(item);
      else item.classList.add('collapsed');
    });
    if (titleInput) titleInput.addEventListener('input', function () { updateTourDetailHeader(item); });
    if (linkSelect) linkSelect.addEventListener('change', function () { updateTourDetailHeader(item); openTourDetailAccordion(item); });
    updateTourDetailHeader(item);
  }

  function tourDetailTemplate(detail, headerLabel) {
    var d = detail || {};
    var lines = function (v) { return Array.isArray(v) ? v.join('\n') : (v || ''); };
    var val = function (v) { return detail ? ' value="' + esc(v) + '"' : ''; };
    return '<div class="tour-detail-accordion-header">' +
        '<button type="button" class="btn btn-outline btn-sm tour-detail-toggle"><span class="tour-detail-toggle-label">' + headerLabel + '</span><span class="tour-detail-toggle-icon">▾</span></button>' +
      '</div>' +
      '<div class="tour-detail-body">' +
        '<div class="tour-details-grid">' +
          '<div class="edit-group"><label>Hazır Tur Seçimi:</label><select class="tour-detail-link">' + tourDetailLinkOptions(d.link || '') + '</select></div>' +
          '<div class="edit-group"><label>Tur Başlığı:</label><input type="text" placeholder="Kapadokya Kaşifi" class="tour-detail-title"' + val(d.title) + ' /></div>' +
          '<div class="edit-group"><label>Tur Alt Başlığı:</label><input type="text" placeholder="Uçhisar, Göreme ve vadilerin büyüleyici dünyası" class="tour-detail-subtitle"' + val(d.subtitle) + ' /></div>' +
        '</div>' +
        '<div class="tour-details-grid">' +
          '<div class="edit-group"><label>Gezi Afişi Görseli:</label>' +
            '<div class="file-upload" style="margin-bottom: 8px;"><input type="file" class="tour-detail-mapimage-upload" accept="image/*" />📁 Gezi Afişi Görseli Yükle</div>' +
            '<img class="tour-detail-mapimage-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: none;" />' +
          '</div>' +
          '<div class="edit-group"><label>Gezi Afişi Başlığı:</label><input type="text" placeholder="Kapadokya Gezi Afişi" class="tour-detail-maptitle"' + val(d.mapTitle) + ' /></div>' +
          '<div class="edit-group"><label>Gezi Afişi Açıklaması:</label><input type="text" placeholder="Tur güzergahı ve önemli noktalar" class="tour-detail-mapdesc"' + val(d.mapDescription) + ' /></div>' +
        '</div>' +
        '<div class="tour-details-grid tour-details-full-width"><div class="edit-group"><label>Tur Görselleri:</label>' +
          '<div class="tour-detail-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;"></div>' +
          '<button type="button" class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="window.addTourDetailImage && window.addTourDetailImage(this)">➕ Görsel Ekle</button>' +
        '</div></div>' +
        '<div class="tour-details-grid tour-details-full-width">' +
          '<div class="edit-group"><label>Gezi Noktaları (Her satıra bir madde):</label><textarea placeholder="Gelibolu&#10;Çanakkale Şehitler Abidesi&#10;Truva Antik Kenti" class="tour-detail-description" rows="4">' + esc(d.description) + '</textarea></div>' +
          '<div class="edit-group"><label>Turun Öne Çıkan Özellikleri (Her satıra bir özellik):</label><textarea placeholder="🏛️ Tarihi ve kültürel mekanları ziyaret&#10;🍽️ Yerel lezzetleri tatma fırsatı&#10;📸 Profesyonel fotoğraf çekimi&#10;🎁 Anı eşyaları satın alma imkanı" class="tour-detail-highlights" rows="4">' + esc(lines(d.highlights)) + '</textarea></div>' +
        '</div>' +
        '<div class="tour-details-grid tour-details-full-width">' +
          '<div class="edit-group"><label>Tur Programı (Her satıra bir madde):</label><textarea placeholder="Uçhisar - Göreme Açık Hava Müzesi&#10;Vadiler - Avanos seramik atölyesi&#10;Serbest zaman ve dönüş" class="tour-detail-itinerary" rows="4">' + esc(lines(d.itinerary)) + '</textarea></div>' +
        '</div>' +
        '<div class="tour-details-actions"><button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeTourDetail(this)">🗑️ Bu Tur Detayını Sil</button></div>' +
      '</div>';
  }

  function createTourDetailImageSlot(container, index, imgSrc) {
    var slot = document.createElement('div');
    slot.className = 'tour-detail-image-item';
    slot.setAttribute('data-index', index);
    slot.innerHTML =
      '<div class="file-upload" style="margin-bottom: 8px;"><input type="file" class="tour-detail-image-upload" data-index="' + index + '" accept="image/*" />📁 Değiştir</div>' +
      '<img class="tour-detail-image-preview" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; ' + (imgSrc ? 'display:block;' : 'display:none;') + '" src="' + esc(imgSrc || '') + '" />' +
      '<button type="button" class="btn btn-ghost btn-sm remove-tour-detail-image" style="margin-top: 4px; font-size: 11px;">🗑️ Sil</button>';
    container.appendChild(slot);
    var img = slot.querySelector('.tour-detail-image-preview');
    if (imgSrc && imgSrc.indexOf('data:') !== 0 && imgSrc.indexOf('blob:') !== 0) img.dataset.publicUrl = imgSrc;
  }

  async function loadTourDetailImages(item, link, savedImages) {
    var container = item.querySelector('.tour-detail-images');
    if (!container) return;
    var storageUrls = link ? await C.getTourStorageImageUrls(link) : [];
    var urls = C.mergeTourImageUrls(Array.isArray(savedImages) ? savedImages : [], storageUrls);
    container.innerHTML = '';
    if (!urls.length) createTourDetailImageSlot(container, 1);
    else urls.forEach(function (url, i) { createTourDetailImageSlot(container, i + 1, withCacheBuster(url)); });
  }

  function showMapPreview(preview, url) {
    if (!url) { preview.removeAttribute('src'); delete preview.dataset.publicUrl; preview.style.display = 'none'; return; }
    preview.onerror = function () { delete preview.dataset.publicUrl; preview.style.display = 'none'; };
    preview.onload = function () { preview.dataset.publicUrl = url; preview.style.display = 'block'; };
    preview.src = /^https?:\/\//i.test(url) || url.charAt(0) === '/' ? withCacheBuster(url) : url;
  }

  async function uploadTourDetailImage(event, preview, imageType) {
    var file = event.target.files[0];
    if (!file) return;
    var dataUrl = await readFileAsDataUrl(file);
    preview.src = dataUrl;
    preview.style.display = 'block';
    var link = event.target.closest('.tour-details-item').querySelector('.tour-detail-link').value;
    if (!link) { alert('Lütfen önce tur seçin!'); return; }
    try {
      var url = await backend().uploadTourImage(dataUrl, normalizeTourId(link), imageType);
      var clean = url.split('?')[0];
      preview.dataset.publicUrl = clean;
      preview.src = withCacheBuster(clean);
    } catch (error) {
      console.error('Tur detay görsel yükleme hatası:', error);
      alert('Tur detay görseli yüklenirken hata oluştu: ' + error.message);
    }
  }

  function setupTourDetailUploads(item, detail) {
    var linkSelect = item.querySelector('.tour-detail-link');
    var activeLink = (linkSelect && linkSelect.value.trim()) || '';
    var mapUpload = item.querySelector('.tour-detail-mapimage-upload');
    var mapPreview = item.querySelector('.tour-detail-mapimage-preview');

    var previewMapFromStorage = function (link) {
      if (!link) return;
      C.getTourStorageMapImageUrl(link).then(function (url) { showMapPreview(mapPreview, url); });
    };

    mapUpload.addEventListener('change', function (e) { uploadTourDetailImage(e, mapPreview, 'mapImage'); });
    if (detail && detail.mapImage) {
      C.resolveTourMapImageUrl(activeLink, detail.mapImage).then(function (url) { showMapPreview(mapPreview, url); });
    } else {
      previewMapFromStorage(activeLink);
    }

    var images = item.querySelector('.tour-detail-images');
    if (!images.children.length) createTourDetailImageSlot(images, 1);
    images.addEventListener('change', function (e) {
      if (!e.target.classList.contains('tour-detail-image-upload')) return;
      var idx = parseInt(e.target.getAttribute('data-index'), 10) || 1;
      var preview = e.target.closest('.tour-detail-image-item').querySelector('.tour-detail-image-preview');
      if (preview) uploadTourDetailImage(e, preview, 'image' + idx);
    });
    images.addEventListener('click', function (e) {
      if (!e.target.classList.contains('remove-tour-detail-image') || images.children.length <= 1) return;
      var slot = e.target.closest('.tour-detail-image-item');
      var img = slot.querySelector('.tour-detail-image-preview');
      var info = img && img.getAttribute('src') && img.src.indexOf('data:') !== 0 ? C.parseStorageUrl(img.src) : null;
      if (info) backend().deleteImage(info.bucket, info.path);
      slot.remove();
    });
    if (activeLink) loadTourDetailImages(item, activeLink, detail && detail.images);

    linkSelect.addEventListener('change', function () {
      var link = linkSelect.value.trim();
      if (link === activeLink) return;
      activeLink = link;
      loadTourDetailImages(item, link);
      updateTourDetailHeader(item);
      showMapPreview(mapPreview, '');
      previewMapFromStorage(link);
    });
  }

  function appendTourDetail(detail, open) {
    var container = $('tourDetailsList');
    var item = document.createElement('div');
    item.className = 'tour-details-item';
    item.innerHTML = tourDetailTemplate(detail, detail ? 'Tur Detayı' : 'Yeni Tur Detayı');
    container.appendChild(item);
    setupTourDetailUploads(item, detail);
    initTourDetailAccordion(item, open);
    return item;
  }

  window.addTourDetail = function () { appendTourDetail(null, true); };
  window.removeTourDetail = function (button) { button.closest('.tour-details-item').remove(); };
  window.addTourDetailImage = function (button) {
    var container = button.closest('.tour-details-item').querySelector('.tour-detail-images');
    var indices = Array.prototype.map.call(container.querySelectorAll('.tour-detail-image-item'), function (el) {
      return parseInt(el.getAttribute('data-index'), 10) || 0;
    });
    createTourDetailImageSlot(container, indices.length ? Math.max.apply(null, indices) + 1 : 1);
  };

  function loadTourDetails(details) {
    var container = $('tourDetailsList');
    if (!container) return;
    container.innerHTML = '';
    details.forEach(function (detail, i) { appendTourDetail(detail, i === 0); });
  }

  function getTourDetailsData() {
    var rows = [];
    document.querySelectorAll('#tourDetailsList .tour-details-item').forEach(function (item) {
      var value = function (cls) { var el = item.querySelector(cls); return el ? el.value.trim() : ''; };
      var link = value('.tour-detail-link');
      if (!link) return;
      var images = [];
      item.querySelectorAll('.tour-detail-image-item img.tour-detail-image-preview').forEach(function (img) {
        var src = (img.dataset.publicUrl || img.src || '').split('?')[0].trim();
        if (src && src.indexOf('data:') !== 0 && src.indexOf('blob:') !== 0) images.push(src);
      });
      var mapEl = item.querySelector('.tour-detail-mapimage-preview');
      var mapImage = ((mapEl && mapEl.dataset.publicUrl) || '').split('?')[0].trim();
      var highlights = value('.tour-detail-highlights');
      var itinerary = value('.tour-detail-itinerary');
      rows.push(JSON.stringify({
        link: link,
        title: value('.tour-detail-title') || 'Tur Detayı',
        subtitle: value('.tour-detail-subtitle') || 'Örnek program ve görseller aşağıdadır.',
        mapImage: mapImage && mapImage.indexOf('data:') !== 0 && mapImage.indexOf('blob:') !== 0 ? mapImage : '',
        mapTitle: value('.tour-detail-maptitle') || 'Gezi Afişi',
        mapDescription: value('.tour-detail-mapdesc') || 'Detaylı rota ve duraklar',
        images: images,
        description: value('.tour-detail-description'),
        highlights: highlights ? highlights.split('\n').filter(function (l) { return l.trim(); }) : [],
        itinerary: itinerary ? itinerary.split('\n').filter(function (l) { return l.trim(); }) : []
      }));
    });
    return rows.join('\n');
  }

  // =================================================================
  // Form alanları (sürükle-bırak ile sıralanır)
  // =================================================================
  var FIELD_TYPES = [['text', 'Metin'], ['email', 'E-posta'], ['tel', 'Telefon'], ['number', 'Sayı'], ['date', 'Tarih'], ['select', 'Seçim Listesi'], ['textarea', 'Uzun Metin']];
  var FIELD_TARGETS = [['both', 'Her İkisi'], ['turlar', 'Sadece Hazır Rotalar'], ['custom', 'Sadece Özel Rota']];

  function formFieldTemplate(field) {
    var f = field || {};
    var opt = function (list, current) {
      return list.map(function (o) { return '<option value="' + o[0] + '"' + (field && current === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    };
    var val = function (v) { return field ? ' value="' + esc(v) + '"' : ''; };
    return '<div class="drag-handle" title="Sürükleyerek sırala">⋮⋮</div>' +
      '<input type="text" placeholder="Alan Adı" class="field-label"' + val(f.label) + ' />' +
      '<input type="text" placeholder="Placeholder Metni" class="field-placeholder"' + val(f.placeholder) + ' />' +
      '<select class="field-type" onchange="toggleOptionsField(this)">' + opt(FIELD_TYPES, f.type) + '</select>' +
      '<input type="text" placeholder="Seçenekler (virgülle ayırın)" class="field-options" style="display:' + (f.type === 'select' ? 'block' : 'none') + ';"' + val(f.options) + ' />' +
      '<select class="field-target">' + opt(FIELD_TARGETS, f.target) + '</select>' +
      '<label style="display:flex;align-items:center;gap:4px;margin:0; justify-content:center;"><input type="checkbox" class="field-required"' + (f.required ? ' checked' : '') + ' /><span style="font-size: 12px;">Evet</span></label>' +
      '<button type="button" class="btn btn-ghost btn-sm remove-item" onclick="removeFormField(this)" title="Bu alanı sil">🗑️</button>';
  }

  function appendFormField(field) {
    var item = document.createElement('div');
    item.className = 'list-item';
    item.draggable = true;
    item.innerHTML = formFieldTemplate(field);
    $('formFieldsList').appendChild(item);
    setupDragAndDrop(item);
  }

  window.addFormField = function () { appendFormField(null); };
  window.removeFormField = function (button) {
    if ($('formFieldsList').children.length > 1) button.parentElement.remove();
  };
  window.toggleOptionsField = function (select) {
    select.parentElement.querySelector('.field-options').style.display = select.value === 'select' ? 'block' : 'none';
  };

  function loadFormFields(fields) {
    var container = $('formFieldsList');
    if (!container) return;
    container.innerHTML = '';
    fields.forEach(function (f) {
      appendFormField({ label: f.label, placeholder: f.placeholder, type: f.type, options: f.options, target: f.target, required: f.required });
    });
  }

  function readFormFields() {
    var fields = [];
    document.querySelectorAll('#formFieldsList .list-item').forEach(function (item, index) {
      var label = item.querySelector('.field-label').value.trim();
      var placeholder = item.querySelector('.field-placeholder').value.trim();
      var type = item.querySelector('.field-type').value;
      if (!label || !placeholder) return;
      fields.push({
        label: label,
        placeholder: placeholder,
        type: type,
        required: item.querySelector('.field-required').checked,
        target: item.querySelector('.field-target').value || 'both',
        options: type === 'select' ? item.querySelector('.field-options').value.trim() : '',
        order_index: index
      });
    });
    return fields;
  }

  /** site_content.formFields: her satır bir JSON (anahtar sırası eski kayıtlarla aynı). */
  function getFormFieldsData() {
    return readFormFields().map(function (f) {
      return JSON.stringify({ label: f.label, placeholder: f.placeholder, type: f.type, required: f.required, target: f.target, options: f.options });
    }).join('\n');
  }

  function setupDragAndDrop(item) {
    item.addEventListener('dragstart', function (e) {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });
    item.addEventListener('dragend', function () {
      item.classList.remove('dragging');
      document.querySelectorAll('.list-item').forEach(function (el) { el.classList.remove('drag-over'); });
    });
    item.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    item.addEventListener('dragenter', function (e) { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', function () { item.classList.remove('drag-over'); });
    item.addEventListener('drop', function (e) {
      e.preventDefault();
      item.classList.remove('drag-over');
      var dragged = document.querySelector('.dragging');
      if (!dragged || dragged === item) return;
      var container = $('formFieldsList');
      var after = Array.prototype.reduce.call(container.querySelectorAll('.list-item:not(.dragging)'), function (closest, child) {
        var box = child.getBoundingClientRect();
        var offset = e.clientY - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset ? { offset: offset, element: child } : closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
      if (after) container.insertBefore(dragged, after); else container.appendChild(dragged);
    });
  }

  // =================================================================
  // Popup yönetimi
  // =================================================================
  window.togglePopupActive = function () {
    var active = $('popupActive').checked;
    ['popupTitle', 'popupContent', 'popupLinkUrl', 'popupLinkText', 'popupImage', 'popupShowOnce'].forEach(function (id) {
      $(id).disabled = !active;
    });
  };

  function showPopupImagePreview(url) {
    var preview = $('popupImagePreview');
    preview.innerHTML = '';
    var img = document.createElement('img');
    img.src = url;
    img.alt = 'Popup görseli';
    img.style.cssText = 'max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid var(--brand-50);';
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-outline btn-sm';
    remove.style.marginLeft = '10px';
    remove.textContent = 'Görseli Kaldır';
    remove.addEventListener('click', window.removePopupImage);
    preview.append(img, remove);
    $('popupImageText').textContent = 'Görsel Değiştir';
    $('popupImage').dataset.uploadedUrl = url;
  }

  async function loadPopupSettings() {
    var result = await window.supabase.from('popup_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) { console.error('Popup ayarları yüklenirken hata:', result.error); return; }
    var row = result.data;
    if (row) {
      $('popupActive').checked = row.is_active;
      $('popupTitle').value = row.title || '';
      $('popupContent').value = row.content || '';
      $('popupLinkUrl').value = row.link_url || '';
      $('popupLinkText').value = row.link_text || 'Detay';
      $('popupShowOnce').checked = row.show_once;
      if (row.image_url) showPopupImagePreview(row.image_url);
    }
    window.togglePopupActive();
  }

  window.handlePopupImageUpload = async function (input) {
    var file = input.files[0];
    if (!file) return;
    try {
      showPopupImagePreview(await backend().uploadRawFile('site-images', 'popups/popup-' + Date.now() + '.' + fileExt(file), file, false, C.IMAGE_MAX_EDGE.popup));
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      alert('Görsel yüklenirken hata oluştu!');
    }
  };

  window.removePopupImage = function () {
    $('popupImagePreview').innerHTML = '';
    $('popupImageText').textContent = 'Görsel Seç';
    $('popupImage').value = '';
    $('popupImage').dataset.uploadedUrl = '';
  };

  window.savePopupSettings = async function (options) {
    var silent = options && options.silent === true;
    var throwOnError = options && options.throwOnError === true;
    var fail = function (message, error) {
      console.error(message, error || '');
      if (!silent) alert(message);
      if (throwOnError) throw (error instanceof Error ? error : new Error(message));
      return false;
    };
    try {
      var previewImg = document.querySelector('#popupImagePreview img');
      var popup = {
        is_active: $('popupActive').checked,
        title: $('popupTitle').value.trim(),
        content: $('popupContent').value.trim(),
        image_url: $('popupImage').dataset.uploadedUrl || (previewImg && previewImg.src) || '',
        link_url: $('popupLinkUrl').value.trim(),
        link_text: $('popupLinkText').value.trim(),
        show_once: $('popupShowOnce').checked
      };
      var existing = await window.supabase.from('popup_settings').select('id').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (existing.error) {
        console.error('Popup mevcut kayıt kontrolü hatası:', existing.error);
        if (throwOnError) throw existing.error;
        return false;
      }
      var result = existing.data
        ? await window.supabase.from('popup_settings').update(popup).eq('id', existing.data.id).select()
        : await window.supabase.from('popup_settings').insert([popup]).select();
      if (result.error) return fail('Popup ayarları kaydedilirken hata oluştu: ' + result.error.message, result.error);
      if (!result.data || !result.data.length) {
        return fail('Popup ayarları kaydedilemedi. Supabase izin politikası (RLS) güncellemeyi engelliyor olabilir.');
      }
      if (!silent) alert('Popup ayarları başarıyla kaydedildi!');
      return true;
    } catch (error) {
      if (throwOnError) throw error;
      console.error('Popup ayarları kaydedilirken hata:', error);
      if (!silent) alert('Popup ayarları kaydedilirken hata oluştu!');
      return false;
    }
  };

  window.previewPopup = function () {
    var title = $('popupTitle').value.trim();
    var content = $('popupContent').value.trim();
    var linkText = $('popupLinkText').value.trim();
    var imageUrl = $('popupImage').dataset.uploadedUrl || '';
    if (!title && !content && !imageUrl) { alert('Lütfen en az bir içerik ekleyin!'); return; }

    var make = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var overlay = make('div', 'popup-overlay');
    overlay.id = 'popupPreview';
    var box = make('div', 'popup-container');
    var close = make('button', 'popup-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Popup\'ı kapat');
    close.addEventListener('click', function () { overlay.remove(); });
    var wrapper = make('div', 'popup-content-wrapper');
    if (imageUrl) { var img = make('img', 'popup-image'); img.src = imageUrl; img.alt = 'Popup görseli'; wrapper.appendChild(img); }
    if (title) wrapper.appendChild(make('h3', 'popup-title', title));
    if (content) wrapper.appendChild(make('p', 'popup-content', content));
    var url = C.ensureProtocol($('popupLinkUrl').value, true);
    if (url) { var a = make('a', 'popup-link', linkText); a.href = url; a.target = '_blank'; a.rel = 'noopener'; wrapper.appendChild(a); }
    box.append(close, wrapper);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  };
  window.closePopupPreview = function () { var p = $('popupPreview'); if (p) p.remove(); };

  // =================================================================
  // Admin paneli (oturum, yükleme, kaydetme)
  // =================================================================
  class AdminPanel {
    constructor() {
      this.bindEvents();
      this.loadSavedContent();
      this.checkAuth();
      loadPopupSettings();
    }

    bindEvents() {
      var self = this;
      $('loginForm').addEventListener('submit', function (e) { e.preventDefault(); self.handleLogin(); });
      document.querySelectorAll('.category-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { self.switchCategory(btn.getAttribute('data-category')); });
      });
      $('logoutBtn').addEventListener('click', function () { self.logout(); });
      $('saveChanges').addEventListener('click', function () { self.saveChanges(); });
      $('changePassword').addEventListener('click', function () { self.changePassword(); });
      bindPasswordToggle('toggleLoginPassword', 'adminPassword');
      bindPasswordToggle('toggleNewPassword', 'newPassword');

      $('headerLogoUpload').addEventListener('change', function (e) { self.uploadSiteImage(e, 'currentHeaderLogo', function (d) { return backend().uploadLogo(d, 'header'); }, 'Logo'); });
      $('contentLogoUpload').addEventListener('change', function (e) { self.uploadSiteImage(e, 'currentContentLogo', function (d) { return backend().uploadLogo(d, 'content'); }, 'Logo'); });
      $('resetHeaderLogo').addEventListener('click', function () { self.resetLogo('currentHeaderLogo'); });
      $('resetContentLogo').addEventListener('click', function () { self.resetLogo('currentContentLogo'); });
      $('aboutImageUpload').addEventListener('change', function (e) { self.uploadSiteImage(e, 'aboutImage', function (d) { return backend().uploadAboutImage(d); }, 'Hakkımızda görseli'); });
      $('studentServiceImageUpload').addEventListener('change', function (e) { self.uploadSiteImage(e, 'studentServiceImage', function (d) { return backend().uploadTransportImage(d, 'studentService'); }, 'Taşımacılık görseli'); });
      $('staffServiceImageUpload').addEventListener('change', function (e) { self.uploadSiteImage(e, 'staffServiceImage', function (d) { return backend().uploadTransportImage(d, 'staffService'); }, 'Taşımacılık görseli'); });
      var optimizeBtn = $('optimizeImages');
      if (optimizeBtn) optimizeBtn.addEventListener('click', function () { self.optimizeStoredImages(); });
      $('carouselImages').addEventListener('change', function (e) {
        if (e.target.classList.contains('carousel-upload')) self.handleCarouselUpload(e);
      });

      var toursList = $('toursList');
      var refresh = function (e) { if (e.target.classList.contains('tour-link')) refreshTourDetailLinkDropdowns(); };
      toursList.addEventListener('input', refresh);
      toursList.addEventListener('change', refresh);
      toursList.querySelectorAll('.list-item').forEach(setupTourImageUpload);
      document.querySelectorAll('#formFieldsList .list-item').forEach(setupDragAndDrop);
      refreshTourDetailLinkDropdowns();
    }

    async handleLogin() {
      var email = $('adminEmail').value || 'admin@orion.com';
      var passwordInput = $('adminPassword');
      var loginError = $('loginError');
      try {
        var user = await backend().signInWithEmail(email, passwordInput.value);
        if (user) {
          this.showPanel(true);
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
      await backend().signOut();
      this.showPanel(false);
      $('adminPassword').value = '';
    }

    showPanel(loggedIn) {
      $('loginSection').style.display = loggedIn ? 'none' : 'flex';
      $('adminPanel').style.display = loggedIn ? 'block' : 'none';
    }

    async checkAuth() {
      this.showPanel(await backend().isAuthenticated());
    }

    async changePassword() {
      var input = $('newPassword');
      var button = $('changePassword');
      var newPassword = input.value.trim();
      if (!newPassword) { alert('Lütfen yeni şifrenizi girin!'); return; }
      if (newPassword.length < 6) { alert('Şifre en az 6 karakter olmalıdır!'); return; }
      if (!confirm('🔐 ŞİFRE DEĞİŞTİRME\n\nAdmin şifrenizi değiştirmek istediğinizden emin misiniz?\n\n⚠️ Yeni şifreyi unutmayın!')) return;

      button.disabled = true;
      button.textContent = '⏳ Değiştiriliyor...';
      try {
        if (await backend().updateAuthPassword(newPassword)) {
          alert('✅ Şifre başarıyla değiştirildi!\n\n🔑 Yeni şifrenizi unutmayın!');
          input.value = '';
        } else {
          alert('Şifre değiştirilemedi. Lütfen tekrar deneyin.');
        }
      } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        alert('Bir hata oluştu. Console\'u kontrol edin.');
      } finally {
        button.disabled = false;
        button.textContent = '🔐 Şifre Değiştir';
      }
    }

    switchCategory(category) {
      document.querySelectorAll('.category-content').forEach(function (el) { el.style.display = 'none'; });
      document.querySelectorAll('.category-btn').forEach(function (btn) {
        var active = btn.getAttribute('data-category') === category;
        btn.classList.toggle('active', active);
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-outline', !active);
      });
      var target = $(category + '-category');
      if (target) target.style.display = 'block';
    }

    showSuccessMessage() {
      var message = $('successMessage');
      if (!message) return;
      message.style.cssText += 'display:block;background:#d4edda;color:#155724;border:1px solid #c3e6cb;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-weight:600;';
      message.textContent = 'Değişiklikler başarıyla kaydedildi! ✅';
      message.scrollIntoView({ behavior: 'smooth', block: 'start' });
      clearTimeout(this.successTimer);
      this.successTimer = setTimeout(function () { message.style.display = 'none'; }, 5000);
    }

    // ---------------- Görseller ----------------
    async uploadSiteImage(event, previewId, upload, label) {
      var file = event.target.files[0];
      if (!file) return;
      var preview = $(previewId);
      var dataUrl = await readFileAsDataUrl(file);
      preview.src = dataUrl;
      try {
        preview.src = (await upload(dataUrl)) + '?v=' + Date.now();
        this.showSuccessMessage();
      } catch (error) {
        console.error(label + ' yükleme hatası:', error);
        alert(label + ' yüklenirken hata oluştu: ' + error.message);
      }
    }

    resetLogo(previewId) {
      // Sadece önizleme sıfırlanır (storage'daki dosya silinmez)
      $(previewId).src = '';
      this.showSuccessMessage();
    }

    async handleCarouselUpload(event) {
      var file = event.target.files[0];
      if (!file) return;
      var index = event.target.getAttribute('data-index');
      var preview = document.querySelector('.carousel-image-item[data-index="' + index + '"] img');
      var dataUrl = await readFileAsDataUrl(file);
      if (preview) preview.src = dataUrl;
      try {
        var url = await backend().uploadCarouselImage(dataUrl, parseInt(index, 10));
        if (preview) preview.src = url + '?v=' + Date.now();
        this.showSuccessMessage();
      } catch (error) {
        console.error('Carousel görsel yükleme hatası (' + index + '):', error);
        alert('Carousel görseli yüklenirken hata oluştu: ' + error.message);
      }
    }

    createCarouselImageItem(index, imgSrc) {
      var placeholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22%3E%3Crect fill=%22%23eee%22 width=%22120%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 font-size=%2212%22 text-anchor=%22middle%22 dy=%22.3em%22%3E' + (index + 1) + '. Görsel%3C/text%3E%3C/svg%3E';
      var item = document.createElement('div');
      item.className = 'carousel-image-item';
      item.setAttribute('data-index', index);
      item.innerHTML =
        '<img src="' + esc(imgSrc || placeholder) + '" style="width: 120px; height: 80px; object-fit: cover; border-radius: 6px;" />' +
        '<div class="file-upload" style="margin-top: 8px;"><input type="file" class="carousel-upload" data-index="' + index + '" accept="image/*" />📁 Değiştir</div>\n' +
        '<button type="button" class="btn btn-ghost btn-sm" style="margin-top: 4px; font-size: 11px;" onclick="window.adminPanel && window.adminPanel.removeCarouselImage(this)">🗑️ Sil</button>';
      return item;
    }

    addCarouselImage() {
      var container = $('carouselImages');
      var indices = Array.prototype.map.call(container.querySelectorAll('.carousel-image-item'), function (el) {
        return parseInt(el.getAttribute('data-index'), 10) || 0;
      });
      container.appendChild(this.createCarouselImageItem(indices.length ? Math.max.apply(null, indices) + 1 : 0));
    }

    removeCarouselImage(button) {
      var container = $('carouselImages');
      var item = button.closest('.carousel-image-item');
      if (!item || container.children.length <= 1) return;
      var img = item.querySelector('img');
      var info = img && img.src && img.src.indexOf('data:') !== 0 ? C.parseStorageUrl(img.src) : null;
      if (info) backend().deleteImage(info.bucket, info.path);
      item.remove();
      // Karusel listesi hemen kaydedilir (Kaydet butonu beklenmez)
      backend().saveSiteContent({ carouselImages: JSON.stringify(this.getCarouselImagesData()) });
    }

    getCarouselImagesData() {
      var urls = [];
      document.querySelectorAll('#carouselImages .carousel-image-item img').forEach(function (img) {
        var src = (img.src || '').trim();
        if (!src || src.indexOf('data:') === 0 || src.indexOf('blob:') === 0 || src.indexOf('unsplash.com') !== -1) return;
        var base = src.split('?')[0];
        if (base) urls.push(base);
      });
      return urls;
    }

    async loadImagesFromStorage() {
      var setIfExists = async function (previewId, bucket, path) {
        var img = $(previewId);
        if (!img) return;
        var url = backend().getImageUrl(bucket, path);
        try {
          var response = await fetch(url, { method: 'HEAD' });
          if (response.ok) img.src = url + '?v=' + Date.now();
        } catch (e) { /* görsel yoksa önizleme boş kalır */ }
      };
      await setIfExists('currentHeaderLogo', 'site-images', 'logos/header.png');
      await setIfExists('currentContentLogo', 'site-images', 'logos/content.png');

      var container = $('carouselImages');
      var urls = [];
      try { urls = JSON.parse(this.content.carouselImages || '[]'); } catch (e) { urls = []; }
      if (!urls.length) {
        var files = await backend().listImages('site-images', 'carousel');
        urls = files.map(function (f) { return (f && f.name) || ''; })
          .filter(function (n) { return /^slide-\d+\.png$/i.test(n); })
          .sort(function (a, b) { return parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10); })
          .map(function (n) { return backend().getImageUrl('site-images', 'carousel/' + n); });
      }
      container.innerHTML = '';
      var self = this;
      if (!urls.length) container.appendChild(this.createCarouselImageItem(0));
      else urls.forEach(function (url, i) { container.appendChild(self.createCarouselImageItem(i, url + '?v=' + Date.now())); });

      await setIfExists('aboutImage', 'site-images', 'about/main.png');
      await setIfExists('studentServiceImage', 'site-images', 'transport/studentService.png');
      await setIfExists('staffServiceImage', 'site-images', 'transport/staffService.png');
    }

    /**
     * Daha önce küçültülmeden yüklenmiş görselleri küçültür.
     * Orijinaller silinmez: aynı bucket'ta _originals/ klasörüne taşınır,
     * küçültülmüş hali aynı adla yerine yüklenir (sitedeki adresler değişmez).
     */
    async optimizeStoredImages() {
      var button = $('optimizeImages');
      var status = $('optimizeImagesStatus');
      var MIN_BYTES = 300 * 1024; // bundan küçükler zaten hafif
      var BACKUP = '_originals';
      if (!confirm('🖼️ GÖRSEL OPTİMİZASYONU\n\nSitedeki büyük görseller küçültülüp yeniden kaydedilecek. ' +
        'Orijinaller silinmez, her bucket\'ta "' + BACKUP + '" klasörüne taşınır.\n\n' +
        'İşlem görsel sayısına göre birkaç dakika sürebilir; bitene kadar bu sayfayı kapatmayın.\n\nBaşlatılsın mı?')) return;

      var say = function (text) { status.textContent = text; };
      button.disabled = true;
      var stats = { done: 0, skipped: 0, failed: 0, before: 0, after: 0 };
      var failures = [];
      try {
        var jobs = [];
        for (var bucket of ['site-images', 'tour-images', 'transport-images']) {
          say('Görseller listeleniyor: ' + bucket + '…');
          var files = await backend().listAllFiles(bucket, '', [BACKUP]);
          files.forEach(function (f) {
            if (f.size >= MIN_BYTES && /^image\/(png|jpe?g|webp)$/i.test(f.mimetype || 'image/png')) jobs.push({ bucket: bucket, path: f.path, size: f.size });
          });
        }
        for (var i = 0; i < jobs.length; i++) {
          var job = jobs[i];
          say((i + 1) + ' / ' + jobs.length + ' işleniyor: ' + job.path);
          try {
            var response = await fetch(backend().getImageUrl(job.bucket, job.path), { cache: 'no-store' });
            if (!response.ok) throw new Error('indirilemedi (' + response.status + ')');
            var original = await response.blob();
            var name = job.path.split('/').pop();
            var small = await C.compressImage(original, C.maxEdgeForPath(job.path), name);
            if (small === original || small.size > original.size * 0.9) { stats.skipped++; continue; }

            await backend().moveFile(job.bucket, job.path, BACKUP + '/' + job.path);
            try {
              var up = await backend().supabase.storage.from(job.bucket).upload(job.path, small, { cacheControl: '3600', upsert: true });
              if (up.error) throw up.error;
            } catch (uploadError) {
              await backend().moveFile(job.bucket, BACKUP + '/' + job.path, job.path); // geri al
              throw uploadError;
            }
            stats.done++;
            stats.before += original.size;
            stats.after += small.size;
          } catch (error) {
            stats.failed++;
            failures.push(job.path + ': ' + (error.message || error));
            console.warn('Optimize edilemedi:', job.bucket, job.path, error);
          }
        }
        var mb = function (b) { return (b / 1024 / 1024).toFixed(1) + ' MB'; };
        say('✅ Bitti: ' + stats.done + ' görsel küçültüldü (' + mb(stats.before) + ' → ' + mb(stats.after) + '), ' +
          stats.skipped + ' görsel zaten uygundu' + (stats.failed ? ', ' + stats.failed + ' görselde hata oluştu.' : '.'));
        if (failures.length) alert('Bazı görseller optimize edilemedi:\n\n' + failures.slice(0, 10).join('\n'));
      } catch (error) {
        console.error('Görsel optimizasyonu hatası:', error);
        say('❌ İşlem yarıda kaldı: ' + (error.message || error));
      } finally {
        button.disabled = false;
      }
    }

    // ---------------- Yükleme ----------------
    async loadSavedContent() {
      try {
        var content = await backend().getSiteContent();
        if (!content) { console.warn('Site içerikleri yüklenemedi.'); return; }
        this.content = content;

        Object.keys(content).forEach(function (key) {
          var el = $(key);
          if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && typeof content[key] === 'string') el.value = content[key];
        });

        var orgs = await backend().getTransportOrgs();
        if (orgs.length) loadTransportOrgs(orgs);
        var fields = await backend().getFormFields();
        if (fields.length) loadFormFields(fields);
        var descriptions = await backend().getOrgDescriptions();
        Object.keys(descriptions).forEach(function (name) { addOrgDescriptionOption(name, descriptions[name]); });

        if (content.authorizedInstitutions) loadNameUrlList(NAME_URL_LISTS.institutions, content.authorizedInstitutions);
        if (content.partnerList) loadNameUrlList(NAME_URL_LISTS.partners, content.partnerList);
        if (content.serviceOrganizations) loadNameUrlList(NAME_URL_LISTS.serviceOrgs, content.serviceOrganizations);

        var services = null;
        try { services = JSON.parse(content.transportServicesList || 'null'); } catch (e) { services = null; }
        if (Array.isArray(services)) {
          $('transportServicesList').innerHTML = '';
          services.forEach(function (s) { window.addTransportService({ title: s.title || '', desc: s.desc || '' }); });
        } else {
          addDefaultTransportServicesIfEmpty();
        }

        var tours = await backend().getTours();
        if (tours.length) loadTours(tours);
        var details = String(content.tourDetails || '').split('\n').filter(function (l) { return l.trim(); })
          .map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
        if (details.length) loadTourDetails(details);

        await this.loadImagesFromStorage();
      } catch (error) {
        console.error('Admin verileri yüklenemedi:', error);
      } finally {
        revealPage();
      }
    }

    // ---------------- Kaydetme ----------------
    async saveChanges() {
      try {
        window.syncOrgDescriptions({ silent: true });
        var field = function (id) { var el = $(id); return el ? el.value || '' : ''; };
        var content = {
          siteTitle: field('siteTitle'),
          readyRoutesTitle: field('readyRoutesTitle'),
          readyRoutesDesc: field('readyRoutesDesc'),
          customRouteTitle: field('customRouteTitle'),
          customRouteDesc: field('customRouteDesc'),
          aboutText: field('aboutText'),
          contactDescription: field('contactDescription'),
          phoneNumber: field('phoneNumber'),
          emailAddress: field('emailAddress'),
          address: field('address'),
          agencyName: field('agencyName'),
          tursabDocumentNo: field('tursabDocumentNo'),
          instagramLink: field('instagramLink'),
          transportServicesList: JSON.stringify(getTransportServicesData()),
          serviceOrganizations: getNameUrlListData(NAME_URL_LISTS.serviceOrgs),
          authorizedInstitutions: getNameUrlListData(NAME_URL_LISTS.institutions),
          partnerList: getNameUrlListData(NAME_URL_LISTS.partners),
          toursList: getToursData(),
          tourDetails: getTourDetailsData(),
          formFields: getFormFieldsData(),
          carouselImages: JSON.stringify(this.getCarouselImagesData())
        };

        var saveError = null;
        try {
          if (!(await backend().saveSiteContent(content))) throw new Error('Site içerikleri kaydedilemedi');
          await this.verifySiteContentSaved(content);
          window.saveCurrentOrgDescription();
          await this.syncTransportOrgs();
          await this.syncFormFields();
        } catch (error) {
          console.warn('Backend kaydetme hatası:', error);
          saveError = error;
        }
        try {
          await window.savePopupSettings({ silent: true, throwOnError: true });
        } catch (popupError) {
          console.warn('Popup kaydetme hatası:', popupError);
          saveError = saveError || popupError;
        }
        if (saveError) throw saveError;
        this.showSuccessMessage();
      } catch (error) {
        console.error('Kaydetme hatası:', error);
        alert('Kaydetme sırasında bir hata oluştu: ' + error.message);
      }
    }

    async verifySiteContentSaved(expected) {
      var saved = await backend().getSiteContent();
      if (!saved) throw new Error('Site içerikleri kaydedildi gibi görünüyor ama backend doğrulaması boş döndü');
      var mismatched = Object.keys(expected).filter(function (key) { return String(saved[key] == null ? '' : saved[key]) !== String(expected[key] == null ? '' : expected[key]); });
      if (mismatched.length) {
        throw new Error('Kaydetme doğrulaması başarısız: ' + mismatched.slice(0, 3).join(', ') + " alanları backend'de beklenen değerle eşleşmedi");
      }
    }

    async syncTransportOrgs() {
      var orgs = getTransportOrgsData();
      var names = orgs.map(function (o) { return o.name; });
      if (new Set(names).size !== names.length) throw new Error('Taşımacılık kurumlarında aynı isim birden fazla kez kullanılamaz');
      await backend().saveTransportOrgs(orgs);

      var saved = await backend().getTransportOrgs();
      var expected = orgs.map(function (o) { return Object.assign(normalizeOrg(o), { id: o.id }); });
      var actual = saved.map(function (o) { return Object.assign(normalizeOrg(o), { id: String(o.id || '') }); });
      if (expected.length !== actual.length) {
        throw new Error('Taşımacılık kurumları doğrulanamadı: ' + expected.length + ' kayıt beklenirken ' + actual.length + ' kayıt bulundu');
      }
      expected.forEach(function (exp) {
        var act = (exp.id && actual.find(function (a) { return a.id === exp.id; })) || actual.find(function (a) { return a.name === exp.name; });
        if (!act) throw new Error('Taşımacılık kurumu kaydı bulunamadı: ' + exp.name);
        if (JSON.stringify(Object.assign({}, exp, { id: '' })) !== JSON.stringify(Object.assign({}, act, { id: '' }))) {
          throw new Error('Taşımacılık kurumu kaydedildi ama doğrulama eşleşmedi: ' + exp.name);
        }
      });
    }

    async syncFormFields() {
      var fields = readFormFields();
      var labels = fields.map(function (f) { return f.label; });
      if (new Set(labels).size !== labels.length) throw new Error('Form alanlarında aynı ad birden fazla kez kullanılamaz');
      await backend().saveFormFields(fields);

      var norm = function (f, i) {
        return {
          label: String(f.label || '').trim(), placeholder: String(f.placeholder || '').trim(), type: String(f.type || 'text').trim(),
          options: String(f.options || '').trim(), target: String(f.target || 'both').trim(), required: Boolean(f.required),
          order_index: Number(f.order_index != null ? f.order_index : i) || 0
        };
      };
      var saved = await backend().getFormFields();
      if (JSON.stringify(fields.map(norm)) !== JSON.stringify(saved.map(norm))) {
        throw new Error('Form alanları kaydedildi ama backend doğrulaması eşleşmedi');
      }
    }
  }

  function bindPasswordToggle(buttonId, inputId) {
    var button = $(buttonId);
    var input = $(inputId);
    if (!button || !input) return;
    button.addEventListener('click', function () {
      var hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      button.textContent = hidden ? '🙈' : '👁️';
    });
  }

  var revealed = false;
  function revealPage() {
    if (revealed) return;
    revealed = true;
    var loading = $('loadingScreen');
    var content = $('pageContent');
    if (loading && content) { loading.classList.add('hidden'); content.classList.add('loaded'); }
  }

  function init() {
    if (!window.backendManager) {
      revealPage();
      alert('Backend bağlantısı yok. Lütfen sayfayı yenileyin.');
      return;
    }
    setTimeout(revealPage, 2200);
    window.adminPanel = new AdminPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
