// Run against a local production build: CRM_TEST_BASE_URL=http://localhost:3101 node tests/security-http.cjs
// Read-only HTTP checks. Never logs response bodies, records, credentials or tokens.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const base = process.env.CRM_TEST_BASE_URL || 'http://localhost:3101';
  const manifest = JSON.parse(fs.readFileSync('.next/app-build-manifest.json', 'utf8'));
  const framework = JSON.parse(fs.readFileSync('.next/build-manifest.json', 'utf8'));
  const publicFiles = new Set([
    ...manifest.pages['/layout'], ...manifest.pages['/login/page'],
    ...manifest.pages['/_not-found/page'], ...framework.polyfillFiles, ...framework.rootMainFiles,
  ]);
  const privateFiles = new Set(Object.values(manifest.pages).flat().filter(file => file.endsWith('.js') && !publicFiles.has(file)));
  const request = (pathname, options = {}) => fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
  const fingerprints = ['Não conceder desconto à vista superior a 10%', '8 novos clientes fechados', 'Sócio-fundador, Diretor Comercial'];
  let pages = 0, apis = 0;
  for (const file of fs.readdirSync('app/(dashboard)', { recursive: true }).filter(file => file.endsWith('page.tsx'))) {
    const route = path.dirname(file).replaceAll('\\', '/').replaceAll('[id]', '11111111-1111-4111-8111-111111111111');
    const response = await request(route === '.' ? '/' : `/${route}`);
    assert.equal(response.status, 307, `Private page must redirect: ${route}`);
    assert.ok(response.headers.get('location')?.endsWith('/login'));
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    const html = await response.text();
    assert.ok(!html.includes('self.__next_f.push'), `No private hydration: ${route}`);
    assert.ok(!html.includes('Buscar leads, propostas, clientes'), `No private shell: ${route}`);
    for (const fingerprint of fingerprints) assert.ok(!html.includes(fingerprint));
    pages++;
  }
  const publicApis = ['auth/login/route.ts', 'auth/github/route.ts', 'auth/callback/route.ts', 'whatsapp/webhook/route.ts'];
  for (const file of fs.readdirSync('app/api', { recursive: true }).filter(file => file.endsWith('route.ts'))) {
    if (publicApis.includes(file.replaceAll('\\', '/'))) continue;
    const route = `/api/${path.dirname(file).replaceAll('\\', '/')}`;
    const response = await request(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, `Private API must reject anonymous callers: ${route}`);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    apis++;
  }
  for (const file of privateFiles) {
    assert.equal((await request(`/_next/${file}`)).status, 401, 'Private JavaScript must require authentication');
  }
  for (const file of publicFiles) {
    const response = await request(`/_next/${file}`);
    assert.equal(response.status, 200, 'Login dependencies must remain accessible');
    const code = await response.text();
    for (const fingerprint of fingerprints) assert.ok(!code.includes(fingerprint), 'Public assets must not contain internal business data');
  }
  for (const headers of [{ RSC: '1' }, { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' }]) {
    assert.equal((await request('/financeiro', { headers })).status, 307);
    assert.equal((await request('/api/monthly-clients', { headers })).status, 401);
  }
  const login = await request('/login');
  assert.equal(login.status, 200);
  assert.match(await login.text(), /<meta name="robots" content="noindex, nofollow"/);
  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.doesNotMatch(await sitemap.text(), /<loc>/);
  const invalidWebhook = await request('/api/whatsapp/webhook', { method: 'POST', body: JSON.stringify({ instanceToken: 'invalid-audit-token' }) });
  assert.equal(invalidWebhook.status, 401);
  console.log(JSON.stringify({ passed: true, pages, apis, protectedBundles: privateFiles.size, publicLoginAssets: publicFiles.size, privateHtmlAndHydrationBlocked: true, sitemapEmpty: true, webhookAuthenticated: true }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
