/* =========================================================================
   app.js — logique de la PAGE D'UN MODPACK (modpack.html)
   Ne contient AUCUNE donnée : tout vient de data/modpacks.js + data/mods/<id>.js
   ========================================================================= */
(function () {
  var CATS = window.CATEGORIES || [];
  var CATC = window.CATEGORY_COLORS || {};
  var PACKS = window.MODPACKS || [];

  /* ---- quel modpack ? (URL propre /modpacks/<id> ou ?id=<id>) ---- */
  function currentId() {
    var m = location.pathname.match(/\/modpacks\/([^\/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    var p = new URLSearchParams(location.search).get('id');
    return p ? p : (PACKS[0] ? PACKS[0].id : '');
  }
  var ID = currentId();
  var PACK = PACKS.filter(function (p) { return p.id === ID; })[0];

  /* ---- modpack introuvable → message propre ---- */
  if (!PACK) {
    document.body.innerHTML =
      '<div class="wrap"><section class="hero"><h1>introuvable.</h1>' +
      '<p class="lede">Ce modpack n\'existe pas (ou plus). Retourne à la bibliothèque pour choisir un serveur.</p>' +
      '<p style="margin-top:22px"><a class="go" href="/">\u2190 Voir tous les modpacks</a></p></section></div>';
    return;
  }

  /* ---- charge les mods du pack, puis démarre ---- */
  function loadMods(cb) {
    var reg = window.MODS_BY_PACK || {};
    if (reg[ID]) return cb(reg[ID]);
    var s = document.createElement('script');
    s.src = '/data/mods/' + ID + '.js';
    s.onload = function () { cb((window.MODS_BY_PACK || {})[ID] || []); };
    s.onerror = function () { cb([]); };
    document.head.appendChild(s);
  }

  loadMods(function (MODS) { start(MODS); });

  /* ======================================================================= */
  function start(MODS) {
    /* ---- en-tête + hero remplis depuis les métadonnées du pack ---- */
    var siteName = (window.SITE && window.SITE.name) || 'Modpacks';
    setText('brand', siteName);
    setText('hero-title', PACK.name + '.');
    setText('hero-lede', PACK.description || '');
    document.title = PACK.name + ' — ' + siteName;

    var chips = [];
    if (PACK.loader || PACK.mcVersion) chips.push((PACK.loader ? PACK.loader + ' ' : '') + (PACK.mcVersion || ''));
    if (PACK.tagline) chips.push(PACK.tagline);
    var meta = document.getElementById('meta');
    if (meta) meta.innerHTML = chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');

    var dl = document.getElementById('dl');
    if (dl) {
      if (PACK.download) {
        dl.href = PACK.download; dl.style.display = '';
      } else if (MODS.some(function (m) { return m.furl && m.fname; })) {
        setupDynamicDownload(dl, MODS);
        dl.style.display = '';
      } else {
        dl.style.display = 'none';
      }
    }

    var grid = document.getElementById('grid'), q = document.getElementById('q');
    var countEl = document.getElementById('count');
    var activeCat = "Tous", activeSt = "Tous";

    setText('s-count', MODS.length);
    setText('s-cats', CATS.length);
    setText('s-keep', MODS.filter(function (m) { return /retenu/i.test(m.st || ''); }).length);
    var foot = document.getElementById('foot');
    if (foot) foot.textContent = (PACK.loader || '') + ' ' + (PACK.mcVersion || '') +
      ' · ' + MODS.length + ' mods · icônes officielles Modrinth · ' + siteName;

    /* ---- menus déroulants (catégorie + statut) ---- */
    var STATUSES = uniq(MODS.map(function (m) { return m.st; })
      .filter(function (s) { return s && !/tester/i.test(s); }));
    var catOpts = [{ v: "Tous", label: "toutes" }].concat(CATS.map(function (c) {
      return { v: c.name, label: c.name, color: CATC[c.name] };
    }));
    var stOpts = [{ v: "Tous", label: "tous" }].concat(STATUSES.map(function (s) {
      return { v: s, label: s.toLowerCase() };
    }));
    buildDD("dd-cat", catOpts, "Tous", function (v) { activeCat = v; render(); });
    buildDD("dd-st", stOpts, "Tous", function (v) { activeSt = v; render(); });
    q.addEventListener('input', render);

    function buildDD(id, opts, cur, onSel) {
      var dd = document.getElementById(id), btn = dd.querySelector('.dd-btn'),
        val = dd.querySelector('.v'), panel = dd.querySelector('.dd-panel');
      panel.innerHTML = opts.map(function (o) {
        return '<button class="opt" role="option" data-v="' + esc(o.v) + '" aria-selected="' + (o.v === cur) + '">' +
          (o.color ? '<span class="sw" style="background:' + o.color + '"></span>' : '') + esc(o.label) + '</button>';
      }).join('');
      btn.addEventListener('click', function (e) {
        e.stopPropagation(); var open = btn.getAttribute('aria-expanded') === 'true';
        closeAllDD(); if (!open) { btn.setAttribute('aria-expanded', 'true'); panel.hidden = false; }
      });
      panel.addEventListener('click', function (e) {
        var o = e.target.closest('.opt'); if (!o) return;
        panel.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-selected', x === o ? 'true' : 'false'); });
        val.textContent = o.textContent.trim(); closeAllDD(); onSel(o.dataset.v);
      });
    }
    function closeAllDD() {
      document.querySelectorAll('.dd-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      document.querySelectorAll('.dd-panel').forEach(function (p) { p.hidden = true; });
    }
    document.addEventListener('click', closeAllDD);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllDD(); });

    function statusCls(s) {
      if (/retenu/i.test(s)) return 'ok'; if (/incompat/i.test(s)) return 'bad';
      if (/tester/i.test(s)) return 'warn'; return 'other';
    }
    function card(m) {
      var col = CATC[m.c] || '#8b8f96';
      var emoji = m.e || '🧩';
      var icon = m.i ? '<img src="' + m.i + '" alt="" loading="lazy" data-col="' + col + '" data-emoji="' + emoji + '">'
        : phTile(col, emoji, m.sl);
      var type = (m.t && m.t !== 'mod') ? '<span class="dot">·</span><span>' + esc(m.t) + '</span>' : '';
      var side = m.s ? '<span class="dot">·</span><span>' + esc(m.s.toLowerCase()) + '</span>' : '';
      var dep = m.dep ? '<p class="cdep"><b>dépend</b> — ' + esc(m.dep) + '</p>' : '';
      var ver = m.mver ? '<p class="cdep" style="opacity:.75"><b>' + esc((m.ld || '') + ' ' + (m.mcv || '')) + '</b> — v' + esc(m.mver) + ' <span style="color:var(--ok)">✓ compatible</span></p>' : '';
      var st = (m.st && !/tester/i.test(m.st)) ? '<span class="status ' + statusCls(m.st) + '">' + esc(m.st) + '</span>' : '';
      return '<article class="card"><div class="ctop"><div class="icon">' + icon + '</div>' +
        '<div style="min-width:0;flex:1"><div class="cname">' + esc(m.n) + '</div>' +
        '<div class="cmeta"><span class="sw" style="background:' + col + '"></span><span>' + esc(m.c) + '</span>' + type + side + '</div>' +
        '</div>' + st + '</div><p class="cdesc">' + esc(m.d || '') + '</p>' + dep + ver +
        '<a class="go" href="' + esc(m.u) + '" target="_blank" rel="noopener">Voir sur Modrinth <span class="ar">↗</span></a></article>';
    }
    function render() {
      var t = q.value.trim().toLowerCase();
      var list = MODS.filter(function (m) {
        var okC = activeCat === "Tous" || m.c === activeCat;
        var okS = activeSt === "Tous" || m.st === activeSt;
        var okT = !t || ((m.n + " " + (m.d || '') + " " + m.c + " " + (m.st || '')).toLowerCase().indexOf(t) >= 0);
        return okC && okS && okT;
      });
      countEl.textContent = "// " + list.length + " mod" + (list.length > 1 ? "s" : "") + " affiché" + (list.length > 1 ? "s" : "");
      grid.innerHTML = list.length ? list.map(card).join('') :
        '<div class="empty">aucun mod ne correspond — essaie un autre mot-clé, une autre catégorie ou un autre statut.</div>';
      loadIcons();
    }
    render();

    /* ---- créateur de pack (perso, localStorage) ---- */
    initBuilder();

    /* ---- routing des vues (Le pack / Créateur) ---- */
    var views = { pack: document.getElementById('view-pack'), creer: document.getElementById('view-build') };
    function setView(v) {
      if (!views[v]) v = 'pack';
      for (var k in views) if (views[k]) views[k].hidden = (k !== v);
      document.querySelectorAll('.nav a[data-v]').forEach(function (a) {
        a.setAttribute('aria-current', a.dataset.v === v ? 'page' : 'false');
      });
      document.body.dataset.view = v; window.scrollTo({ top: 0 });
    }
    addEventListener('hashchange', function () { setView((location.hash || '').replace('#', '') || 'pack'); });
    setView((location.hash || '').replace('#', '') || 'pack');
  }

  /* ================= icônes (Modrinth + repli emoji) ================= */
  var inflight = 0; var queue = [];
  function loadIcons() {
    document.querySelectorAll('.ph[data-slug]').forEach(function (ph) {
      var slug = ph.dataset.slug; if (!slug || ph.dataset.q) return; ph.dataset.q = 1; queue.push({ ph: ph, slug: slug });
    }); pump();
  }
  function pump() {
    while (inflight < 6 && queue.length) {
      var it = queue.shift(); inflight++;
      (function (ph, slug) {
        getIcon(slug).then(function (url) {
          if (url && ph.isConnected) { var img = new Image(); img.onload = function () { ph.outerHTML = '<img src="' + url + '" alt="">'; }; img.src = url; }
        }).catch(function () { }).finally(function () { inflight--; pump(); });
      })(it.ph, it.slug);
    }
  }
  function getIcon(slug) {
    try { var c = localStorage.getItem('mr:' + slug); if (c) return Promise.resolve(c === '0' ? null : c); } catch (e) { }
    return fetch('https://api.modrinth.com/v2/project/' + encodeURIComponent(slug)).then(function (r) {
      if (!r.ok) throw 0; return r.json();
    }).then(function (j) { var url = j.icon_url || null; try { localStorage.setItem('mr:' + slug, url || '0'); } catch (e) { } return url; });
  }
  function phTile(col, emoji, slug) {
    return '<div class="ph" style="--pc:' + col + '"' + (slug ? ' data-slug="' + slug + '"' : '') + '><span>' + (emoji || '🧩') + '</span></div>';
  }
  function iconHTML(url, col, emoji, slug) {
    if (url) return '<img src="' + url + '" alt="" loading="lazy" data-col="' + col + '" data-emoji="' + (emoji || '🧩') + '">';
    return phTile(col, emoji, slug);
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentElement && t.parentElement.classList.contains('icon') && !t.dataset.fb) {
      t.dataset.fb = 1; t.outerHTML = phTile(t.dataset.col || '#8b8f96', t.dataset.emoji || '🧩', '');
    }
  }, true);

  /* ================= créateur de pack ================= */
  function initBuilder() {
    var MYKEY = 'mypack:v1';
    var myGrid = document.getElementById('my-grid');
    if (!myGrid) return;
    var myCount = document.getElementById('my-count');
    var myStat = document.getElementById('my-stat');
    var urlIn = document.getElementById('mk-url');
    var catSel = document.getElementById('mk-cat');
    var addBtn = document.getElementById('mk-add');
    var errEl = document.getElementById('mk-err');

    catSel.innerHTML = '<option value="">catégorie (optionnel)</option>' +
      CATS.map(function (c) { return '<option value="' + esc(c.name) + '">' + c.emoji + ' ' + esc(c.name) + '</option>'; }).join('');

    var myPack = [];
    try { myPack = JSON.parse(localStorage.getItem(MYKEY)) || []; } catch (e) { myPack = []; }
    function saveMy() { try { localStorage.setItem(MYKEY, JSON.stringify(myPack)); } catch (e) { } }

    function pretty(s) { return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
    function slugFrom(x) {
      x = (x || '').trim();
      var m = x.match(/modrinth\.com\/[a-z]+\/([^\/?#]+)/i);
      return (m ? m[1] : x).replace(/^@/, '').trim();
    }
    function sideLabel(cs, ss) {
      var c = cs && cs !== 'unsupported', s = ss && ss !== 'unsupported';
      if (c && s) return 'Client & serveur'; if (s && !c) return 'Serveur'; if (c && !s) return 'Client'; return '';
    }
    function myCardHTML(it, idx) {
      var col = CATC[it.cat] || '#8b8f96';
      var emoji = (CATS.filter(function (c) { return c.name === it.cat; })[0] || {}).emoji || '🧩';
      var icon = iconHTML(it.icon, col, emoji, it.slug);
      var type = (it.type && it.type !== 'mod') ? '<span class="dot">·</span><span>' + esc(it.type) + '</span>' : '';
      var side = it.side ? '<span class="dot">·</span><span>' + esc(it.side.toLowerCase()) + '</span>' : '';
      var catname = it.cat || 'non classé';
      return '<article class="card"><button class="rm" title="Retirer du pack" data-i="' + idx + '">✕</button>' +
        '<div class="ctop"><div class="icon">' + icon + '</div>' +
        '<div style="min-width:0;flex:1"><div class="cname">' + esc(it.name) + '</div>' +
        '<div class="cmeta"><span class="sw" style="background:' + col + '"></span><span>' + esc(catname) + '</span>' + type + side + '</div>' +
        '</div></div><p class="cdesc">' + esc(it.desc || '') + '</p>' +
        '<a class="go" href="' + esc(it.url) + '" target="_blank" rel="noopener">Voir sur Modrinth <span class="ar">↗</span></a></article>';
    }
    function renderMy() {
      myStat.textContent = myPack.length;
      myCount.textContent = "// " + myPack.length + " mod" + (myPack.length > 1 ? "s" : "") + " dans ton pack";
      myGrid.innerHTML = myPack.length ? myPack.map(myCardHTML).join('') :
        '<div class="empty">ton pack est vide — colle un lien Modrinth ci-dessus pour ajouter un premier mod.</div>';
      loadIcons();
    }
    myGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.rm'); if (!b) return;
      myPack.splice(+b.dataset.i, 1); saveMy(); renderMy();
    });

    function addOne(raw) {
      var slug = slugFrom(raw); if (!slug) return Promise.resolve(false);
      if (myPack.some(function (x) { return x.slug.toLowerCase() === slug.toLowerCase(); })) return Promise.resolve(true);
      var cat = catSel.value || '';
      var it = { slug: slug, name: pretty(slug), desc: '', type: 'mod', side: '', cat: cat, url: 'https://modrinth.com/mod/' + slug, icon: '' };
      return fetch('https://api.modrinth.com/v2/project/' + encodeURIComponent(slug)).then(function (r) {
        if (!r.ok) throw 0; return r.json();
      }).then(function (j) {
        it.name = j.title || it.name; it.desc = j.description || '';
        it.type = j.project_type || 'mod'; it.icon = j.icon_url || '';
        it.side = sideLabel(j.client_side, j.server_side);
        it.url = 'https://modrinth.com/' + (j.project_type || 'mod') + '/' + (j.slug || slug);
        myPack.push(it); saveMy(); renderMy(); return true;
      }).catch(function () { myPack.push(it); saveMy(); renderMy(); return false; });
    }
    function addFromInput() {
      var raw = urlIn.value.trim(); if (!raw) { urlIn.focus(); return; }
      var parts = raw.split(/[\s,]+/).filter(Boolean);
      addBtn.disabled = true; errEl.textContent = '';
      var chain = Promise.resolve(false);
      parts.forEach(function (p) { chain = chain.then(function (any) { return addOne(p).then(function (r) { return any || r; }); }); });
      chain.then(function (anyOk) {
        addBtn.disabled = false; urlIn.value = ''; urlIn.focus();
        if (!anyOk) errEl.textContent = "mods ajoutés depuis le lien, mais les infos Modrinth n'ont pas pu être chargées ici — sur le site en ligne, nom, icône et description se rempliront tout seuls.";
      });
    }
    addBtn.addEventListener('click', addFromInput);
    urlIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') addFromInput(); });

    function flash(id, msg) { var b = document.getElementById(id); var o = b.textContent; b.textContent = msg; setTimeout(function () { b.textContent = o; }, 1200); }
    document.getElementById('mk-clear').addEventListener('click', function () {
      if (!myPack.length) return; if (confirm('Vider tout le pack ?')) { myPack = []; saveMy(); renderMy(); }
    });
    document.getElementById('mk-copy').addEventListener('click', function () {
      if (!myPack.length) return;
      var txt = myPack.map(function (x) { return x.url; }).join('\n');
      navigator.clipboard.writeText(txt).then(function () { flash('mk-copy', 'copié !'); }).catch(function () {
        var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); flash('mk-copy', 'copié !'); } catch (_) { } ta.remove();
      });
    });
    document.getElementById('mk-export').addEventListener('click', function () {
      if (!myPack.length) return;
      var blob = new Blob([JSON.stringify(myPack, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mon-pack.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    });

    renderMy();
  }

  /* ================= telechargement dynamique (ZIP via Modrinth) ================= */
  function setupDynamicDownload(dl, MODS) {
    dl.removeAttribute('download');
    dl.setAttribute('href', '#');
    var label = dl.querySelector('.t');
    var orig = label ? label.textContent : 'Tout télécharger';
    var busy = false;
    dl.addEventListener('click', function (e) {
      e.preventDefault();
      if (busy) return;
      if (typeof JSZip === 'undefined' || typeof window.buildAndDownloadZip !== 'function') {
        alert("Le générateur de ZIP n'a pas pu se charger — vérifie ta connexion et réessaie.");
        return;
      }
      busy = true; dl.classList.add('loading');
      window.buildAndDownloadZip(PACK.name, MODS, function (p) {
        if (!label) return;
        if (p.phase === 'download') label.textContent = 'Téléchargement… ' + p.done + '/' + p.total;
        else if (p.phase === 'zip') label.textContent = 'Compression du ZIP…' + (p.percent ? ' ' + Math.round(p.percent) + '%' : '');
      }).then(function (res) {
        busy = false; dl.classList.remove('loading');
        if (label) label.textContent = orig;
        if (!res.ok) { alert('Échec : ' + res.error); return; }
        if (res.failed.length || res.skipped.length) {
          alert('ZIP téléchargé (' + res.included + ' mods). ' +
            (res.failed.length ? res.failed.length + ' fichier(s) ont échoué. ' : '') +
            (res.skipped.length ? res.skipped.length + ' mod(s) sans fichier résolu. ' : '') +
            'Détails dans MANQUANTS.txt, à l\'intérieur du ZIP.');
        }
      }).catch(function (err) {
        busy = false; dl.classList.remove('loading');
        if (label) label.textContent = orig;
        alert('Erreur inattendue pendant la préparation du ZIP : ' + (err && err.message || err));
      });
    });
  }

  /* ================= utilitaires ================= */
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ================= bouton retour-en-haut ================= */
  (function () {
    var tt = document.getElementById('totop'); if (!tt) return;
    addEventListener('scroll', function () { tt.classList.toggle('show', scrollY > 420); }, { passive: true });
    tt.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });
  })();
})();
