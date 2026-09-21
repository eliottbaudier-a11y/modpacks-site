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

  const { action, packId, mod, slug } = req.body || {};

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

  let commitMsg;
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
    const clean = {
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
    };
    list.push(clean);
    commitMsg = `admin: ajoute ${clean.sl} a ${packId}`;
  } else {
    res.status(400).json({ error: 'action inconnue (add|remove attendu)' });
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

  res.status(200).json({ ok: true, count: list.length });
}
