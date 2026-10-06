// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    let remoteBoard = null;
    let failSave = false;
    await context.addInitScript(() => {
      localStorage.setItem('evocrm_supabase_url', 'https://rabisco-test.supabase.co');
      localStorage.setItem('evocrm_supabase_anon_key', 'test-anon-key');
    });
    await context.route('https://rabisco-test.supabase.co/rest/v1/rabisco_boards*', async route => {
      if (route.request().method() === 'POST') {
        if (failSave) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Save unavailable' }) });
          return;
        }
        remoteBoard = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'principal' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remoteBoard ? [remoteBoard] : []) });
      }
    });
    const page = await context.newPage();
    const saved = () => page.getByText('Salvo no Supabase', { exact: true }).waitFor();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.BOARD_URL || 'http://localhost:3100/mensagens');
    const titles = page.getByLabel('Título do rabisco');
    await titles.first().waitFor();
    assert.equal(await page.getByRole('link', { name: 'Rabisco', exact: true }).count(), 1);
    const canvas = page.getByTestId('rabisco-canvas');
    const bounds = await canvas.boundingBox();
    assert.equal(Math.round(bounds.y + bounds.height), 900);
    assert.equal(await page.locator('main').evaluate(el => el.scrollHeight > el.clientHeight), false);
    await titles.first().fill('Título salvo no Rabisco');
    await page.getByLabel('Texto do rabisco').first().fill('Escrita de teste\nSegunda linha com acentos: ação.');
    await saved();
    await page.reload();
    await titles.first().waitFor();
    assert.equal(await titles.first().inputValue(), 'Título salvo no Rabisco');
    assert.match(await page.getByLabel('Texto do rabisco').first().inputValue(), /Segunda linha/);
    const initialCount = await titles.count();
    await page.getByRole('button', { name: '+ Novo Card', exact: true }).click();
    assert.equal(await titles.count(), initialCount + 1);
    await titles.last().fill('Card novo');
    const card = titles.last().locator('../..');
    await card.getByTitle('Duplicar Card', { exact: true }).click();
    assert.equal(await titles.count(), initialCount + 2);
    const duplicate = titles.last().locator('../..');
    await duplicate.getByTitle('Excluir Card', { exact: true }).click();
    assert.equal(await titles.count(), initialCount + 1);
    const newCard = titles.last().locator('../..');
    const originalPosition = structuredClone(remoteBoard.cards.at(-1));
    const before = await newCard.boundingBox();
    await page.mouse.move(before.x + 20, before.y + before.height - 10);
    await page.mouse.down();
    await page.mouse.move(before.x + 100, before.y + before.height + 40, { steps: 10 });
    await page.mouse.up();
    await saved();
    const savedPosition = structuredClone(remoteBoard.cards.at(-1));
    assert.notEqual(savedPosition.x, originalPosition.x);
    await saved();
    await page.reload();
    await titles.first().waitFor();
    assert.deepEqual(structuredClone(remoteBoard.cards.at(-1)), savedPosition);
    await page.getByTitle('Rabiscar / Desenhar Livremente no Quadro', { exact: true }).click();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width - 100, box.y + box.height - 150);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 30, box.y + box.height - 80, { steps: 10 });
    await page.mouse.up();
    await saved();
    assert.equal(remoteBoard.strokes.length, 1);
    await saved();
    await page.reload();
    await titles.first().waitFor();
    assert.equal(remoteBoard.strokes.length, 1);
    await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20);
    const transformBefore = await canvas.locator(':scope > div').getAttribute('style');
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(100);
    assert.notEqual(await canvas.locator(':scope > div').getAttribute('style'), transformBefore);
    await page.getByTitle('Aumentar Zoom', { exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await page.getByTitle('Exportar backup do quadro (JSON)', { exact: true }).click();
    const download = await downloadEvent;
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.cards.length, initialCount + 1);
    assert.equal(backup.strokes.length, 1);
    await page.getByTitle('Ajustar 100%', { exact: true }).click();
    const connectionCount = remoteBoard.connections.length;
    await titles.first().locator('../..').getByTitle('Conectar a outro card', { exact: true }).click();
    await titles.nth(1).locator('../..').getByTitle('Conectar a outro card', { exact: true }).click();
    await saved();
    assert.equal(remoteBoard.connections.length, connectionCount + 1);
    assert.equal(await page.getByText('Card de origem selecionado. Clique no card de destino!', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(os.tmpdir(), 'rabisco-desktop.png') });
    await page.setViewportSize({ width: 768, height: 900 });
    assert.equal(Math.round((await canvas.boundingBox()).y + (await canvas.boundingBox()).height), 900);
    await page.screenshot({ path: path.join(os.tmpdir(), 'rabisco-tablet.png') });
    page.on('dialog', dialog => dialog.accept());
    await page.getByTitle('Limpar Todo o Quadro', { exact: true }).click();
    await saved();
    await page.reload();
    await page.getByRole('heading', { name: /Rabisco/ }).waitFor();
    assert.equal(await titles.count(), 0);
    await page.getByTitle('Restaurar modelo inicial de exemplo', { exact: true }).click();
    assert.equal(await titles.count(), initialCount);
    await saved();
    failSave = true;
    await titles.first().fill('Retry persistence');
    await page.getByRole('button', { name: 'Tentar salvar novamente' }).waitFor();
    assert.notEqual(remoteBoard.cards[0].title, 'Retry persistence');
    failSave = false;
    await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
    await saved();
    assert.equal(remoteBoard.cards[0].title, 'Retry persistence');
    assert.equal(await page.evaluate(() => localStorage.getItem('evocrm_board_cards_v1')), null);
    assert.deepEqual(errors, []);
    remoteBoard = null;
    await page.evaluate(() => {
      localStorage.setItem('evocrm_board_cards_v1', JSON.stringify([{ id: 'legacy', x: 50, y: 50, width: 210, height: 130, title: 'Legacy migrated', content: 'Old content', color: '#FF9F5A' }]));
      localStorage.setItem('evocrm_board_connections_v1', '[]');
      localStorage.setItem('evocrm_board_strokes_v1', '[]');
    });
    await page.reload();
    await saved();
    assert.equal(remoteBoard.cards[0].title, 'Legacy migrated');
    assert.equal(await page.evaluate(() => localStorage.getItem('evocrm_board_cards_v1')), null);
    console.log('PASS: layout, rename, writing, reload, add, duplicate, delete, drag persistence, drawing, pan, zoom, JSON export and tablet layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
