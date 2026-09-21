/* Protege /admin : exige un cookie de session valide (pose par /api/login).
   Sans cookie valide -> redirection vers /login.html?next=<page demandee>. */
export const config = { matcher: ['/admin', '/admin.html'] };

function parseCookie(header, name) {
  if (!header) return '';
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

async function hmacHex(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function isValidToken(token, secret) {
  if (!token) return 'no-token';
  if (!secret) return 'no-secret';
  const dot = token.lastIndexOf('.');
  if (dot === -1) return 'malformed';
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expNum = Number(exp);
  if (!expNum) return 'bad-exp';
  if (Date.now() / 1000 > expNum) return 'expired';
  const expected = await hmacHex(exp, secret);
  return expected === sig ? 'ok' : 'bad-sig';
}

export default async function middleware(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, 'admin_auth');
  const secret = process.env.ADMIN_PASSWORD || '';

  let reason;
  try {
    reason = await isValidToken(token, secret);
  } catch (e) {
    reason = 'exception:' + (e && e.message ? e.message.slice(0, 40) : 'unknown');
  }
  if (reason === 'ok') return;

  const target = new URL(request.url);
  const loginUrl = new URL('/login.html', target);
  loginUrl.searchParams.set('next', target.pathname);
  loginUrl.searchParams.set('why', reason);
  return Response.redirect(loginUrl, 302);
}
