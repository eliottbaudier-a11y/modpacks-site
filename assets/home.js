/* =========================================================================
   home.js — page d'accueil : affiche la grille des modpacks (data/modpacks.js)
   ========================================================================= */
(function () {
  var SITE = window.SITE || { name: 'Modpacks', tagline: '' };
  var PACKS = window.MODPACKS || [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  setText('brand', SITE.name);
  setText('lib-title', SITE.name + '.');
  setText('lib-lede', SITE.tagline || '');
  document.title = SITE.name;
  setText('hmeta', PACKS.length + ' modpack' + (PACKS.length > 1 ? 's' : ''));
  setText('seclabel', '// ' + PACKS.length + ' modpack' + (PACKS.length > 1 ? 's' : '') + ' disponible' + (PACKS.length > 1 ? 's' : ''));
  var foot = document.getElementById('foot');
  if (foot) foot.textContent = SITE.name + ' · ' + PACKS.length + ' modpack' + (PACKS.length > 1 ? 's' : '') + ' · page d\'accueil';

  var STATUS = {
    active:   { cls: 'ok',    label: 'actif' },
    dev:      { cls: 'warn',  label: 'en développement' },
    archived: { cls: 'other', label: 'archivé' }
  };

  function initials(name) {
    return String(name || '?').replace(/[\[\](){}]/g, '').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function cover(p) {
    if (p.cover) return '<img src="' + esc(p.cover) + '" alt="" loading="lazy">';
    return '<div class="gen"><span>' + esc(initials(p.name)) + '</span></div>';
  }

  function card(p) {
    var st = STATUS[p.status] || null;
    var badge = st ? '<span class="pstatus ' + st.cls + '">' + st.label + '</span>' : '';
    var metaBits = [];
    if (p.mcVersion) metaBits.push(esc(p.mcVersion));
    if (p.loader) metaBits.push(esc(p.loader));
    if (p.modsCount != null) metaBits.push('<b>' + p.modsCount + '</b> mods');
    var meta = metaBits.length ? '<div class="pmeta">' + metaBits.map(function (b) { return '<span>' + b + '</span>'; }).join('') + '</div>' : '';
    var desc = p.description ? '<p class="pdesc">' + esc(p.description) + '</p>' : '<p class="pdesc"></p>';
    return '<a class="pcard" href="/modpacks/' + encodeURIComponent(p.id) + '">' +
      '<div class="pcover">' + cover(p) + badge + '</div>' +
      '<div class="pbody"><h2 class="pname">' + esc(p.name) + '</h2>' + meta + desc +
      '<span class="pgo">Voir le modpack →</span></div></a>';
  }

  var wrap = document.getElementById('packs');
  if (!PACKS.length) {
    wrap.innerHTML = '<div class="empty" style="grid-column:1/-1">aucun modpack pour le moment — ajoute-en un dans data/modpacks.js.</div>';
  } else {
    wrap.innerHTML = PACKS.map(card).join('');
  }
})();
