/* =========================================================================
   nav.js — navigation partagée : menus déroulants « Notre monde » / « Outils »,
   menu mobile plein écran, header compact au scroll.
   Piloté par une seule config (GROUPS) : ajouter une page = ajouter une ligne
   ici, aucune autre modification nécessaire sur les pages du site.
   ========================================================================= */
(function () {
  var header = document.querySelector('header.top');
  var nav = header && header.querySelector('.nav');
  if (!header || !nav) return;

  var onPackPage = /^\/modpacks\//.test(location.pathname);
  var creerHref = onPackPage ? '#creer' : '/modpacks/minecraft-survival#creer';

  var GROUPS = [
    {
      id: 'monde', label: 'Notre monde',
      items: [
        { href: '/galerie', label: 'Galerie', desc: 'Nos captures et souvenirs' },
        { href: '/tableau', label: 'Tableau', desc: 'Nos idées et projets' },
        { href: '/personnages', label: 'Fondateurs', desc: 'Les personnes à l’origine du projet' }
      ]
    },
    {
      id: 'outils', label: 'Outils',
      items: [
        { href: creerHref, label: 'Créateur', desc: 'Construis ton propre modpack', dataV: onPackPage ? 'creer' : null }
      ]
    }
  ];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function isItemActive(it) {
    if (it.dataV === 'creer') return onPackPage && location.hash.replace('#', '') === 'creer';
    if (!it.href || it.href.charAt(0) !== '/') return false;
    return location.pathname === it.href;
  }

  /* ---------- menus déroulants desktop ---------- */
  var groupsWrap = document.createElement('div');
  groupsWrap.className = 'nav-groups';

  var triggers = [];
  GROUPS.forEach(function (g) {
    if (!g.items.length) return;

    var wrap = document.createElement('div');
    wrap.className = 'nav-item-wrap';

    var trig = document.createElement('button');
    trig.type = 'button';
    trig.className = 'nav-trig';
    trig.setAttribute('aria-haspopup', 'true');
    trig.setAttribute('aria-expanded', 'false');
    trig.innerHTML = esc(g.label) + '<span class="car">▾</span>';

    var panel = document.createElement('div');
    panel.className = 'nav-panel' + (g.items.length < 2 ? ' one-col' : '');
    panel.setAttribute('role', 'menu');

    var grid = document.createElement('div');
    grid.className = 'nav-panel-grid';
    g.items.forEach(function (it) {
      var a = document.createElement('a');
      a.className = 'nav-item' + (isItemActive(it) ? ' is-active' : '');
      a.href = it.href;
      a.setAttribute('role', 'menuitem');
      if (it.dataV) a.dataset.v = it.dataV;
      a.innerHTML = '<span class="ni-t">' + esc(it.label) + '</span><span class="ni-d">' + esc(it.desc) + '</span>';
      grid.appendChild(a);
    });
    panel.appendChild(grid);

    var groupActive = g.items.some(isItemActive) ||
      (g.id === 'monde' && ['/galerie', '/tableau', '/personnages'].indexOf(location.pathname) !== -1);
    if (groupActive) trig.classList.add('has-active');

    wrap.appendChild(trig);
    wrap.appendChild(panel);
    groupsWrap.appendChild(wrap);
    triggers.push({ trig: trig, panel: panel, wrap: wrap });
  });
  nav.appendChild(groupsWrap);

  function closeAll(except) {
    triggers.forEach(function (t) {
      if (t === except) return;
      t.trig.setAttribute('aria-expanded', 'false');
      t.panel.classList.remove('open');
    });
  }
  triggers.forEach(function (t) {
    t.trig.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = t.panel.classList.contains('open');
      closeAll();
      if (!open) { t.trig.setAttribute('aria-expanded', 'true'); t.panel.classList.add('open'); }
    });
    t.trig.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!t.panel.classList.contains('open')) t.trig.click();
        var first = t.panel.querySelector('.nav-item');
        if (first) first.focus();
      } else if (e.key === 'Escape') {
        closeAll(); t.trig.focus();
      }
    });
    t.panel.addEventListener('keydown', function (e) {
      var items = [].slice.call(t.panel.querySelectorAll('.nav-item'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1 + items.length) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape') { closeAll(); t.trig.focus(); }
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.nav-item-wrap')) closeAll();
  });
  addEventListener('hashchange', function () {
    document.querySelectorAll('.nav-item[data-v]').forEach(function (a) {
      a.classList.toggle('is-active', location.hash.replace('#', '') === a.dataset.v);
    });
    triggers.forEach(function (t) {
      t.trig.classList.toggle('has-active', !!t.panel.querySelector('.nav-item.is-active'));
    });
  });

  /* ---------- header compact au scroll ---------- */
  var lastScrolled = false, ticking = false;
  function onScroll() {
    var sc = scrollY > 8;
    if (sc !== lastScrolled) { header.classList.toggle('is-scrolled', sc); lastScrolled = sc; }
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- burger + menu mobile ---------- */
  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'burger';
  burger.setAttribute('aria-label', 'Ouvrir le menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';
  header.querySelector('.wrap').appendChild(burger);

  var overlay = document.createElement('div');
  overlay.className = 'mnav-overlay';
  overlay.hidden = true;

  var mnav = document.createElement('nav');
  mnav.className = 'mnav';
  mnav.setAttribute('aria-label', 'Navigation');
  mnav.hidden = true;

  var primaryLinks = [].slice.call(nav.querySelectorAll('a.nav-primary')).map(function (a) {
    return '<a href="' + esc(a.getAttribute('href')) + '"' + (a.dataset.v ? ' data-v="' + esc(a.dataset.v) + '"' : '') + '>' + a.innerHTML + '</a>';
  }).join('');

  var html = '<div class="mnav-head"><span class="word">Menu</span><button type="button" class="mnav-close" aria-label="Fermer le menu">✕</button></div>';
  html += '<div class="mnav-body">';
  if (primaryLinks) html += '<div class="mnav-primary">' + primaryLinks + '</div>';
  GROUPS.forEach(function (g) {
    if (!g.items.length) return;
    html += '<div class="mnav-acc"><button type="button" class="mnav-acc-btn" aria-expanded="false">' + esc(g.label) + '<span class="plus">+</span></button>' +
      '<div class="mnav-acc-panel">';
    g.items.forEach(function (it) {
      html += '<a href="' + esc(it.href) + '"' + (it.dataV ? ' data-v="' + esc(it.dataV) + '"' : '') +
        (isItemActive(it) ? ' aria-current="page"' : '') + '>' + esc(it.label) + '</a>';
    });
    html += '</div></div>';
  });
  html += '<div class="mnav-foot"><a href="#" class="dl-btn m-dl" hidden><span class="t">Tout télécharger</span></a>' +
    '<a href="/login" class="mini">Connexion</a></div>';
  html += '</div>';
  mnav.innerHTML = html;

  document.body.appendChild(overlay);
  document.body.appendChild(mnav);

  mnav.querySelectorAll('.mnav-acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.nextElementSibling;
      var open = btn.classList.contains('open');
      btn.setAttribute('aria-expanded', String(!open));
      btn.classList.toggle('open', !open);
      panel.classList.toggle('open', !open);
    });
  });

  var lastFocused = null;
  function syncFooter() {
    var liveDl = document.getElementById('dl');
    var mDl = mnav.querySelector('.m-dl');
    if (liveDl && mDl && getComputedStyle(liveDl).display !== 'none') {
      mDl.hidden = false;
    } else if (mDl) { mDl.hidden = true; }
  }
  /* le bouton mobile délègue au vrai bouton #dl (progression, garde anti-double-clic, etc.) */
  var mDlBtn = mnav.querySelector('.m-dl');
  if (mDlBtn) {
    mDlBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var liveDl = document.getElementById('dl');
      closeMobile();
      if (liveDl) setTimeout(function () { liveDl.click(); }, 260);
    });
  }
  function openMobile() {
    syncFooter();
    lastFocused = document.activeElement;
    overlay.hidden = false; mnav.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('open'); mnav.classList.add('open'); });
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var closeBtn = mnav.querySelector('.mnav-close');
    if (closeBtn) closeBtn.focus();
  }
  function closeMobile() {
    overlay.classList.remove('open'); mnav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () { overlay.hidden = true; mnav.hidden = true; }, 240);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  burger.addEventListener('click', openMobile);
  overlay.addEventListener('click', closeMobile);
  mnav.querySelector('.mnav-close').addEventListener('click', closeMobile);
  mnav.querySelectorAll('.mnav-primary a, .mnav-acc-panel a').forEach(function (a) {
    a.addEventListener('click', closeMobile);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mnav.hidden) closeMobile();
  });
  mnav.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var focusables = [].slice.call(mnav.querySelectorAll('a, button')).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

/* ---- apparition progressive au scroll (générique, sauf pages qui gèrent déjà la leur) ---- */
(function () {
  if (window.__revealHandled) return;
  window.__revealHandled = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revs = [].slice.call(document.querySelectorAll('.reveal'));
  if (!revs.length) return;
  if (reduce || !('IntersectionObserver' in window)) {
    revs.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  revs.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 60, 240) + 'ms'; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
  revs.forEach(function (el) { io.observe(el); });
})();

/* ---- petit easter egg discret : tape "diamant" n'importe où sur le site ---- */
(function () {
  if (sessionStorage.getItem('egg:diamant')) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var target = 'diamant', pos = 0;
  document.addEventListener('keydown', function (e) {
    var el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : '';
    if (!k) return;
    pos = (k === target[pos]) ? pos + 1 : (k === target[0] ? 1 : 0);
    if (pos === target.length) {
      pos = 0;
      try { sessionStorage.setItem('egg:diamant', '1'); } catch (_) { }
      if (window.toast) window.toast('💎 Flappeurd approuve. 100 000 diamants et toujours pas assez.');
      if (!reduce) {
        for (var i = 0; i < 10; i++) {
          (function (delay) {
            setTimeout(function () {
              var s = document.createElement('span');
              s.textContent = '💎';
              s.style.cssText = 'position:fixed;z-index:600;pointer-events:none;font-size:' + (14 + Math.random() * 10) + 'px;' +
                'left:' + (Math.random() * 100) + 'vw;bottom:-20px;opacity:.9;transition:transform 1.6s ease-out,opacity 1.6s ease-out';
              document.body.appendChild(s);
              requestAnimationFrame(function () {
                s.style.transform = 'translateY(-' + (60 + Math.random() * 30) + 'vh) rotate(' + (Math.random() * 160 - 80) + 'deg)';
                s.style.opacity = '0';
              });
              setTimeout(function () { s.remove(); }, 1700);
            }, delay);
          })(i * 70);
        }
      }
    }
  });
})();
