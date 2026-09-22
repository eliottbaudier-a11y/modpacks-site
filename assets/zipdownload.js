/* =========================================================================
   zipdownload.js — construit et telecharge un ZIP contenant tous les .jar
   d'un modpack, a partir des URLs Modrinth resolues et stockees dans
   data/mods/<id>.js (champs furl/fname). 100% cote client (JSZip + fetch,
   Modrinth CDN autorise le CORS). Utilise seulement pour les packs sans
   "download" statique (nouveau systeme) — le premier modpack garde son
   lien direct vers la Release GitHub.
   ========================================================================= */
window.buildAndDownloadZip = (function () {
  function safeName(s) {
    return String(s || 'modpack').replace(/[\\/:*?"<>|]+/g, '').trim() || 'modpack';
  }

  async function fetchWithLimit(items, limit, onEach) {
    var idx = 0;
    async function worker() {
      while (idx < items.length) {
        var i = idx++;
        await onEach(items[i], i);
      }
    }
    var workers = [];
    for (var w = 0; w < Math.min(limit, items.length); w++) workers.push(worker());
    await Promise.all(workers);
  }

  return async function buildAndDownloadZip(packName, mods, onProgress) {
    onProgress = onProgress || function () {};

    // 1) liste propre : fichier + mod associe + url, dedupliquee par nom de fichier
    var byFile = {};
    var order = [];
    var noFile = [];
    (mods || []).forEach(function (m) {
      if (!m.furl || !m.fname) { noFile.push(m.n || m.sl || '?'); return; }
      var key = m.fname.toLowerCase();
      if (byFile[key]) return; // doublon (ex: dependance partagee) -> ignore silencieusement
      byFile[key] = { name: m.n || m.fname, filename: m.fname, url: m.furl, size: m.fsize || 0 };
      order.push(key);
    });

    if (!order.length) {
      return { ok: false, error: "aucun fichier resolu pour ce modpack — ajoute des mods via l'admin d'abord." };
    }

    var zip = new JSZip();
    var done = 0, total = order.length;
    var failed = [];

    onProgress({ phase: 'download', done: 0, total: total });

    await fetchWithLimit(order, 5, async function (key) {
      var item = byFile[key];
      try {
        var r = await fetch(item.url);
        if (!r.ok) throw new Error('http_' + r.status);
        var buf = await r.arrayBuffer();
        zip.file(item.filename, buf);
      } catch (e) {
        failed.push(item.name + ' (' + item.filename + ')');
      } finally {
        done++;
        onProgress({ phase: 'download', done: done, total: total });
      }
    });

    if (noFile.length || failed.length) {
      var lines = [];
      if (failed.length) {
        lines.push('Fichiers qui ont echoue au telechargement :');
        failed.forEach(function (f) { lines.push('  - ' + f); });
        lines.push('');
      }
      if (noFile.length) {
        lines.push("Mods sans fichier Modrinth resolu (ajoute-les via l'admin) :");
        noFile.forEach(function (f) { lines.push('  - ' + f); });
      }
      zip.file('MANQUANTS.txt', lines.join('\n'));
    }

    var includedCount = order.length - failed.length;
    if (includedCount === 0) {
      return { ok: false, error: 'aucun fichier n\'a pu etre telecharge (' + failed.length + ' echecs).' };
    }

    onProgress({ phase: 'zip', done: 0, total: 1 });
    var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      function (meta) { onProgress({ phase: 'zip', percent: meta.percent }); });

    var filename = safeName(packName) + '-Mods.zip';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);

    return { ok: true, filename: filename, included: includedCount, failed: failed, skipped: noFile };
  };
})();
