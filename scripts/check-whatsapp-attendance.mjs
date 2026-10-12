// Validação do controle de pausa com um telefone sintético (DDD 00, sem destinatário).
// Não envia mensagens e não altera contatos, workflows ou configurações gerais.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { randomInt } from 'node:crypto';
import assert from 'node:assert/strict';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
function compile(relative, mocks = {}) {
  const filename = require.resolve(relative), compiled = new Module(filename);
  compiled.require = name => mocks[name] || require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}
const utils = compile('../lib/utils/whatsapp.ts');
const { getWhatsAppAttendance, changeWhatsAppAttendance } = compile('../lib/server/whatsapp-attendance.ts', { '@/lib/utils/whatsapp': utils });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure o Supabase e a credencial de servidor.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const phone = '550000' + String(randomInt(10000000)).padStart(7, '0');
let ownsFixture = false;
try {
  const { data, error } = await db.from('bot_pausa').select('phone').eq('phone', phone);
  if (error || !Array.isArray(data) || data.length) throw new Error('Não foi possível reservar o telefone sintético.');
  ownsFixture = true;
  const initial = await getWhatsAppAttendance(db, phone);
  assert.equal(initial.owner, 'ai');
  const human = await changeWhatsAppAttendance(db, phone, 'human', initial.version);
  assert.equal(human.owner, 'human');
  assert.equal((await getWhatsAppAttendance(db, phone)).owner, 'human');
  const ai = await changeWhatsAppAttendance(db, phone, 'ai', human.version);
  assert.equal(ai.owner, 'ai');
  console.log('PASSOU: pausa e devolução confirmadas no Supabase com telefone sintético.');
} catch {
  console.error('FALHOU: não foi possível confirmar o controle de atendimento no Supabase.');
  process.exitCode = 1;
} finally {
  if (ownsFixture) {
    const { error } = await db.from('bot_pausa').delete().eq('phone', phone).eq('motivo', 'humano_assumiu_conversa');
    const remaining = await db.from('bot_pausa').select('phone').eq('phone', phone);
    if (error || remaining.error || !Array.isArray(remaining.data) || remaining.data.length) {
      console.error('FALHOU: confira a remoção da pausa sintética de validação.');
      process.exitCode = 1;
    } else console.log('CONFIRMADO: pausa sintética removida.');
  }
}
