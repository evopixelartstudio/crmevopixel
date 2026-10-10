// Verificação anônima, sem cookies. Não imprime corpos de resposta ou registros.
import assert from 'node:assert/strict';
const base = process.env.CRM_TEST_BASE_URL || 'https://crmevopixel.cloud';
const request = (pathname, options = {}) => fetch(new URL(pathname, base), {
  redirect: 'manual', signal: AbortSignal.timeout(15000), ...options,
});
try {
  for (const pathname of ['/', '/dashboard', '/leads', '/pipeline', '/clientes', '/projetos', '/financeiro', '/configuracoes']) {
    const response = await request(pathname);
    assert.equal(response.status, 307, `${pathname}: precisa redirecionar`);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
    assert.ok(!(await response.text()).includes('self.__next_f.push'), `${pathname}: hidratação privada`);
  }
  for (const pathname of ['/api/monthly-clients', '/api/rabisco', '/api/contacts', '/api/supabase-status', '/api/agenda', '/api/whatsapp']) {
    const response = await request(pathname);
    assert.equal(response.status, 401, `${pathname}: precisa negar acesso`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  const login = await request('/login');
  assert.equal(login.status, 200);
  assert.match(await login.text(), /name="robots" content="noindex, nofollow"/);
  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.ok(!(await sitemap.text()).includes('<loc>'), 'Sitemap contém URLs');
  const webhook = await request('/api/whatsapp/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(webhook.status, 401, 'Webhook precisa exigir credencial');
  console.log('PASSOU: páginas, APIs, login, indexação, sitemap e webhook anônimos.');
} catch (error) {
  console.error(`FALHOU: ${error.message}`);
  process.exitCode = 1;
}
