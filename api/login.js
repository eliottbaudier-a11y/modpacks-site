/* Connexion admin — verifie identifiant/mot de passe et pose un cookie de
   session signe (HMAC-SHA256, cle = ADMIN_PASSWORD). Le middleware.js a la
   racine verifie ce cookie pour proteger /admin. */
import crypto from 'node:crypto';

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'methode non autorisee' });
    return;
  }

  const { username, password } = req.body || {};
  const expectedPass = String(process.env.ADMIN_PASSWORD || '').trim();
  const userOk = String(username || '').trim() === 'admin';
  const passOk = timingSafeEqual(String(password || '').trim(), expectedPass);

  if (!expectedPass || !userOk || !passOk) {
    res.status(401).json({ error: 'identifiant ou mot de passe incorrect' });
    return;
  }

  const exp = Math.floor(Date.now() / 1000) + SEVEN_DAYS;
  const sig = crypto.createHmac('sha256', expectedPass).update(String(exp)).digest('hex');
  const token = `${exp}.${sig}`;

  res.setHeader('Set-Cookie', `admin_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SEVEN_DAYS}`);
  res.status(200).json({ ok: true });
}
