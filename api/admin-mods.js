/* API de modération — ajoute/retire un mod dans data/mods/<packId>.js
   en committant directement sur GitHub. Protégée par mot de passe
   (ADMIN_PASSWORD) ; le token GitHub (GITHUB_TOKEN) et le repo
   (GITHUB_REPO, format "owner/repo") sont des variables d'env Vercel,
   jamais exposées au client. */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'methode non autorisee' });
    return;
  }

  const password = req.headers['x-admin-password'];
  const expected = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!password || String(password).trim() !== expected) {
    res.status(401).json({ error: 'mot de passe incorrect' });
    return;
  }

  const token = String(process.env.GITHUB_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPO || '').trim();
  if (!token || !repo) {
    res.status(500).json({ error: 'configuration serveur manquante (GITHUB_TOKEN / GITHUB_REPO)' });
    return;
  }

  const { action, packId, mod, mods, slug } = req.body || {};

  if (!packId || !/^[a-z0-9-]+$/.test(packId)) {
    res.status(400).json({ error: 'packId invalide' });
    return;
  }

  const path = `data/mods/${packId}.js`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'modpacks-site-admin',
  };

  const getRes = await fetch(`${apiUrl}?ref=main`, { headers: ghHeaders });
  if (!getRes.ok) {
    res.status(getRes.status).json({ error: `impossible de lire ${path} (${getRes.status})` });
    return;
  }
  const fileJson = await getRes.json();
  const sha = fileJson.sha;
  const raw = Buffer.from(fileJson.content, 'base64').toString('utf8');

  const marker = `window.MODS_BY_PACK[${JSON.stringify(packId)}] = `;
  const startIdx = raw.indexOf(marker);
  const arrEnd = raw.lastIndexOf('];');
  if (startIdx === -1 || arrEnd === -1 || arrEnd < startIdx) {
    res.status(500).json({ error: 'format de fichier inattendu' });
    return;
  }
  const arrStart = startIdx + marker.length;

  let list;
  try {
    list = JSON.parse(raw.slice(arrStart, arrEnd + 1));
  } catch (e) {
    res.status(500).json({ error: 'impossible de lire la liste existante des mods' });
    return;
  }

  function cleanMod(mod) {
    return {
      n: String(mod.n).slice(0, 200),
      c: String(mod.c || '').slice(0, 100),
      e: String(mod.e || '🧩').slice(0, 8),
      d: String(mod.d || '').slice(0, 600),
      v: String(mod.v || '').slice(0, 60),
      s: String(mod.s || '').slice(0, 60),
      st: String(mod.st || 'À tester').slice(0, 40),
      dep: String(mod.dep || '').slice(0, 200),
      u: String(mod.u || '').slice(0, 300),
      sl: String(mod.sl).slice(0, 200),
      t: String(mod.t || 'mod').slice(0, 40),
      i: mod.i ? String(mod.i).slice(0, 500) : null,
      // donnees resolues via l'API Modrinth (version compatible mc+loader) :
      mver: mod.mver ? String(mod.mver).slice(0, 80) : null,
      furl: mod.furl ? String(mod.furl).slice(0, 500) : null,
      fname: mod.fname ? String(mod.fname).slice(0, 200) : null,
      fsize: Number.isFinite(mod.fsize) ? mod.fsize : null,
      vid: mod.vid ? String(mod.vid).slice(0, 60) : null,
      mcv: mod.mcv ? String(mod.mcv).slice(0, 40) : null,
      ld: mod.ld ? String(mod.ld).slice(0, 40) : null,
      autoAdded: !!mod.autoAdded,
      reqBy: mod.reqBy ? String(mod.reqBy).slice(0, 200) : null,
    };
  }

  let commitMsg;
  let batchInfo = null;
  if (action === 'remove') {
    if (!slug) { res.status(400).json({ error: 'slug manquant' }); return; }
    const before = list.length;
    list = list.filter((m) => String(m.sl || '').toLowerCase() !== String(slug).toLowerCase());
    if (list.length === before) { res.status(404).json({ error: 'mod introuvable dans ce pack' }); return; }
    commitMsg = `admin: retire ${slug} de ${packId}`;
  } else if (action === 'add') {
    if (!mod || !mod.sl || !mod.n) { res.status(400).json({ error: 'mod invalide (nom/slug requis)' }); return; }
    if (list.some((m) => String(m.sl || '').toLowerCase() === String(mod.sl).toLowerCase())) {
      res.status(409).json({ error: 'ce mod est deja dans la liste' });
      return;
    }
    const clean = cleanMod(mod);
    list.push(clean);
    commitMsg = `admin: ajoute ${clean.sl} a ${packId}`;
  } else if (action === 'addBatch') {
    if (!Array.isArray(mods) || !mods.length) { res.status(400).json({ error: 'mods (tableau) requis' }); return; }
    const existing = new Set(list.map((m) => String(m.sl || '').toLowerCase()));
    const added = [];
    const skipped = [];
    for (const m of mods) {
      if (!m || !m.sl || !m.n) { skipped.push(m && m.sl); continue; }
      const key = String(m.sl).toLowerCase();
      if (existing.has(key)) { skipped.push(m.sl); continue; }
      existing.add(key);
      const clean = cleanMod(m);
      list.push(clean);
      added.push(clean.sl);
    }
    if (!added.length) { res.status(409).json({ error: 'tous les mods sont deja dans la liste', skipped }); return; }
    const label = added.length > 5 ? added.slice(0, 5).join(', ') + ` (+${added.length - 5})` : added.join(', ');
    commitMsg = `admin: ajoute ${label} a ${packId}`;
    batchInfo = { added, skipped };
  } else if (action === 'edit') {
    if (!slug || !mod) { res.status(400).json({ error: 'slug et mod requis' }); return; }
    const idx = list.findIndex((m) => String(m.sl || '').toLowerCase() === String(slug).toLowerCase());
    if (idx === -1) { res.status(404).json({ error: 'mod introuvable dans ce pack' }); return; }
    const existing = list[idx];
    const merged = {
      ...existing,
      n: mod.n != null ? String(mod.n).slice(0, 200) : existing.n,
      c: mod.c != null ? String(mod.c).slice(0, 100) : existing.c,
      d: mod.d != null ? String(mod.d).slice(0, 600) : existing.d,
      s: mod.s != null ? String(mod.s).slice(0, 60) : existing.s,
      st: mod.st != null ? String(mod.st).slice(0, 40) : existing.st,
      dep: mod.dep != null ? String(mod.dep).slice(0, 200) : existing.dep,
    };
    if (!merged.n) { res.status(400).json({ error: 'le nom ne peut pas etre vide' }); return; }
    list[idx] = merged;
    commitMsg = `admin: modifie ${slug} dans ${packId}`;
  } else {
    res.status(400).json({ error: 'action inconnue (add|addBatch|remove|edit attendu)' });
    return;
  }

  const newRaw = raw.slice(0, arrStart) + JSON.stringify(list, null, 1) + raw.slice(arrEnd + 1);
  const contentB64 = Buffer.from(newRaw, 'utf8').toString('base64');

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: commitMsg, content: contentB64, sha, branch: 'main' }),
  });
  if (!putRes.ok) {
    const detail = await putRes.text();
    res.status(502).json({ error: 'echec du commit GitHub', detail: detail.slice(0, 300) });
    return;
  }

  res.status(200).json({ ok: true, count: list.length, ...(batchInfo ? { batch: batchInfo } : {}) });
}
