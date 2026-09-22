/* =========================================================================
   modrinth.js — resolution des mods via l'API Modrinth (client-side).
   Trouve, pour un projet donne, la version compatible avec une config
   Minecraft + loader precise (pas juste "la derniere version"), recupere
   son fichier telechargeable, et resout recursivement les dependances
   obligatoires. Utilise par /admin (ajout + verification).
   ========================================================================= */
window.Modrinth = (function () {
  var API = 'https://api.modrinth.com/v2';

  function parseInput(raw) {
    raw = (raw || '').trim();
    if (!raw) return '';
    var m = raw.match(/modrinth\.com\/[a-z]+\/([^\/?#]+)/i);
    return (m ? m[1] : raw).replace(/^@/, '').trim();
  }

  function jarr(a) { return encodeURIComponent(JSON.stringify(a)); }

  async function getJSON(url) {
    var r;
    try {
      r = await fetch(url);
    } catch (e) {
      var neterr = new Error('network');
      neterr.network = true;
      throw neterr;
    }
    if (!r.ok) {
      var err = new Error('http_' + r.status);
      err.status = r.status;
      throw err;
    }
    return r.json();
  }

  function getProject(idOrSlug) {
    return getJSON(API + '/project/' + encodeURIComponent(idOrSlug));
  }

  function getVersionsFiltered(idOrSlug, mcVersion, loader) {
    var qs = '?loaders=' + jarr([loader]) + '&game_versions=' + jarr([mcVersion]);
    return getJSON(API + '/project/' + encodeURIComponent(idOrSlug) + '/version' + qs);
  }

  function getVersionsByLoader(idOrSlug, loader) {
    return getJSON(API + '/project/' + encodeURIComponent(idOrSlug) + '/version?loaders=' + jarr([loader]));
  }

  function getVersionsByMc(idOrSlug, mcVersion) {
    return getJSON(API + '/project/' + encodeURIComponent(idOrSlug) + '/version?game_versions=' + jarr([mcVersion]));
  }

  function getVersionById(id) {
    return getJSON(API + '/version/' + encodeURIComponent(id));
  }

  function pickBestVersion(list) {
    if (!list || !list.length) return null;
    var rank = { release: 0, beta: 1, alpha: 2 };
    var sorted = list.slice().sort(function (a, b) {
      var ra = rank[a.version_type] != null ? rank[a.version_type] : 3;
      var rb = rank[b.version_type] != null ? rank[b.version_type] : 3;
      if (ra !== rb) return ra - rb;
      return new Date(b.date_published) - new Date(a.date_published);
    });
    return sorted[0];
  }

  function primaryFile(version) {
    if (!version || !version.files || !version.files.length) return null;
    return version.files.find(function (f) { return f.primary; }) || version.files[0];
  }

  function sideLabel(cs, ss) {
    var c = cs && cs !== 'unsupported', s = ss && ss !== 'unsupported';
    if (c && s) return 'Client & serveur';
    if (s && !c) return 'Serveur';
    if (c && !s) return 'Client';
    return '';
  }

  /* diagnostic precis quand aucune version compatible n'est trouvee */
  async function diagnose(idOrSlug, mcVersion, loader) {
    try {
      var byLoader = await getVersionsByLoader(idOrSlug, loader);
      var byMc = await getVersionsByMc(idOrSlug, mcVersion);
      if (!byLoader.length) return 'aucune version pour le loader ' + loader;
      if (!byMc.length) return 'aucune version pour Minecraft ' + mcVersion;
      return "aucune version compatible avec Minecraft " + mcVersion + ' + ' + loader + " (existe pour l'un des deux, pas les deux ensemble)";
    } catch (e) {
      return 'Modrinth indisponible pour verifier';
    }
  }

  /* resout un seul projet -> {ok, project, version, file} ou {ok:false, error} */
  async function resolveOne(idOrSlug, mcVersion, loader) {
    var project;
    try {
      project = await getProject(idOrSlug);
    } catch (e) {
      if (e.network) return { ok: false, error: 'Modrinth indisponible (reseau)' };
      return { ok: false, error: e.status === 404 ? 'mod introuvable sur Modrinth' : 'erreur Modrinth (' + e.status + ')' };
    }

    var versions;
    try {
      versions = await getVersionsFiltered(idOrSlug, mcVersion, loader);
    } catch (e) {
      return { ok: false, project: project, error: 'Modrinth indisponible (reseau)' };
    }

    var best = pickBestVersion(versions);
    if (!best) {
      var reason = await diagnose(idOrSlug, mcVersion, loader);
      return { ok: false, project: project, error: reason };
    }
    var file = primaryFile(best);
    if (!file) {
      return { ok: false, project: project, version: best, error: 'version trouvee mais sans fichier telechargeable' };
    }
    return { ok: true, project: project, version: best, file: file };
  }

  /* resout un mod + ses dependances obligatoires (recursif, borne, dedupe) */
  async function resolveWithDeps(idOrSlug, mcVersion, loader, opts) {
    opts = opts || {};
    var existingSlugs = (opts.existingSlugs || []).map(function (s) { return String(s).toLowerCase(); });
    var maxDepth = opts.maxDepth == null ? 3 : opts.maxDepth;

    var seen = {};
    var results = [];

    async function resolveDepTarget(dep) {
      if (dep.project_id) return dep.project_id;
      if (dep.version_id) {
        try {
          var v = await getVersionById(dep.version_id);
          return v.project_id;
        } catch (e) { return null; }
      }
      return null;
    }

    async function visit(target, depth, requiredByName) {
      var key = String(target).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;

      var res = await resolveOne(target, mcVersion, loader);
      if (!res.ok) {
        results.push({ ok: false, target: target, requiredBy: requiredByName, error: res.error, project: res.project || null });
        return;
      }
      var slug = (res.project.slug || '').toLowerCase();
      seen[slug] = true;
      if (existingSlugs.indexOf(slug) !== -1) {
        return; // deja dans le pack, on ne duplique pas
      }
      results.push({ ok: true, project: res.project, version: res.version, file: res.file, requiredBy: requiredByName });

      if (depth >= maxDepth) return;
      var required = (res.version.dependencies || []).filter(function (d) { return d.dependency_type === 'required'; });
      for (var i = 0; i < required.length; i++) {
        var depTarget = await resolveDepTarget(required[i]);
        if (!depTarget) continue;
        await visit(depTarget, depth + 1, res.project.title);
      }
    }

    await visit(idOrSlug, 0, null);
    return results;
  }

  /* verifie une liste de mods deja dans un pack contre une config mc+loader */
  async function verifyPack(mods, mcVersion, loader, concurrency) {
    concurrency = concurrency || 4;
    var out = new Array(mods.length);
    var idx = 0;

    async function worker() {
      while (idx < mods.length) {
        var i = idx++;
        var m = mods[i];
        if (!m.sl) { out[i] = { slug: '', name: m.n, status: 'error', message: 'pas de slug Modrinth associe' }; continue; }
        try {
          var versions = await getVersionsFiltered(m.sl, mcVersion, loader);
          var best = pickBestVersion(versions);
          if (!best) {
            var reason = await diagnose(m.sl, mcVersion, loader);
            out[i] = { slug: m.sl, name: m.n, status: 'error', message: reason };
            continue;
          }
          var file = primaryFile(best);
          if (!file) {
            out[i] = { slug: m.sl, name: m.n, status: 'error', message: 'version trouvee mais sans fichier' };
            continue;
          }
          if (m.mver && m.mver !== best.version_number) {
            out[i] = { slug: m.sl, name: m.n, status: 'info', message: 'compatible — nouvelle version disponible : ' + best.version_number + ' (actuelle : ' + m.mver + ')' };
          } else {
            out[i] = { slug: m.sl, name: m.n, status: 'ok', message: 'compatible (' + best.version_number + ')' };
          }
        } catch (e) {
          out[i] = { slug: m.sl, name: m.n, status: 'error', message: e.network ? 'Modrinth indisponible' : 'erreur Modrinth' };
        }
      }
    }
    var workers = [];
    for (var w = 0; w < Math.min(concurrency, mods.length); w++) workers.push(worker());
    await Promise.all(workers);
    return out;
  }

  return {
    parseInput: parseInput,
    getProject: getProject,
    getVersionsFiltered: getVersionsFiltered,
    resolveOne: resolveOne,
    resolveWithDeps: resolveWithDeps,
    verifyPack: verifyPack,
    pickBestVersion: pickBestVersion,
    primaryFile: primaryFile,
    sideLabel: sideLabel,
  };
})();
