const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// PGlite fica fora das dependências de produção. Exemplo de execução no guia.
const pgliteModule = process.env.PGLITE_MODULE;
test('PostgreSQL: registro histórico e bloqueio de leads pelo telefone', {
  skip: !pgliteModule && 'Defina PGLITE_MODULE para executar o teste PostgreSQL de integração.',
}, async t => {
  const { PGlite } = require(pgliteModule);
  const db = new PGlite();
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261016_lead_phone_deduplication.sql'), 'utf8');
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const insert = (table, n, phone, whatsapp = null) => db.query(
    `INSERT INTO public.${table} (id, name, company_name, phone, whatsapp) VALUES ($1, $2, $3, $4, $5)`,
    [id(n), `Pessoa ${n}`, `Empresa ${n}`, phone, whatsapp]);
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const duplicate = async (operation, entityType, entityId) => {
    await assert.rejects(operation, error => {
      assert.equal(error.code, '23505');
      assert.equal(error.message, 'LEAD_PHONE_DUPLICATE');
      const matches = JSON.parse(error.detail).matches;
      assert.ok(matches.some(row => row.entity_type === entityType && row.entity_id === id(entityId)));
      return true;
    });
  };
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.leads (id uuid PRIMARY KEY, name text, company_name text, phone text, whatsapp text, status text DEFAULT 'novo', notes text);
      CREATE TABLE public.clients (id uuid PRIMARY KEY, name text, company_name text, phone text, whatsapp text);
      CREATE TABLE public.opportunities (id uuid PRIMARY KEY, lead_id uuid REFERENCES public.leads(id), status text);
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads, public.clients TO authenticated;`);
    await insert('leads', 1, '(34) 99832-7904');
    await insert('clients', 2, '+55 (68) 99999-1234');
    await insert('leads', 3, '(11) 98765-1234');
    await db.query('INSERT INTO public.opportunities VALUES ($1, $2, $3)', [id(30), id(3), 'perdido']);
    // Duplicados anteriores são preservados e continuam editáveis.
    await insert('leads', 4, '553498327904');
    await insert('leads', 20, '55699935476', '55699935476');
    await db.query('UPDATE public.leads SET notes = $1 WHERE id = $2', [
      'Importação antiga\nDados originais da planilha:\nWhatsApp / telefone: https://wa.me/5569993547674?text=123', id(20),
    ]);
    await db.exec(migration);

    await t.test('migração pode ser reaplicada e inclui clientes, pipeline perdido e duplicados antigos', async () => {
      await db.exec(migration);
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry'), 5);
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.leads'), 4);
    });

    await t.test('normalização SQL corresponde à identidade WhatsApp, inclusive links e números estrangeiros', async () => {
      const filename = require.resolve('../lib/utils/whatsapp.ts');
      const compiled = new Module(filename, module);
      compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText, filename);
      const samples = ['(34) 99832-7904', '553498327904', '3498327904', '551133334444', '5511933334444',
        '+44 207 946 0958', '120255501234', 'wa.me/5534998327904?text=123',
        'https://www.wa.me/5534998327904/anything',
        'https://api.whatsapp.com/send?text=123&phone=%2B55%2034%20998327904',
        'https://api.whatsapp.com/send&phone=5534998327904',
        'https://api.whatsapp.com/send?text=123#fragment&phone=5534998327904',
        'web.whatsapp.com/send?phone=5534998327904&text=567', '', '123', '1234567890123456'];
      for (const sample of samples) {
        const digits = compiled.exports.cleanPhoneNumber(sample);
        const expected = /^\d{10,15}$/.test(digits) ? compiled.exports.whatsAppPhoneKey(sample) : null;
        assert.equal(await scalar('SELECT public.crm_dedup_phone_key($1) AS value', [sample]), expected, sample);
      }
    });

    await t.test('extração SQL reconhece os mesmos telefones efetivos do parser de leads legados', async () => {
      const loaded = new Map();
      const loadTs = relative => {
        const filename = path.resolve(__dirname, relative);
        if (loaded.has(filename)) return loaded.get(filename).exports;
        const compiled = new Module(filename, module);
        loaded.set(filename, compiled);
        compiled.require = name => {
          if (name === './client') return { isSupabaseConfigured: () => false, getSupabase: () => { throw Error('No external database'); } };
          if (name === '@/lib/ai/qualification') return { qualifyLeadWithAI: () => { throw Error('Qualification is outside this parser test'); } };
          if (name.startsWith('@/lib/')) return loadTs(`../lib/${name.slice('@/lib/'.length)}.ts`);
          return module.require(name);
        };
        compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText, filename);
        return compiled.exports;
      };
      const { parseLeadFromSupabase } = loadTs('../lib/supabase/db-service.ts');
      const { getLeadPhoneKeys } = loadTs('../lib/services/lead-deduplication.ts');
      const original = value => `Dados originais da planilha:\n${value}`;
      const cases = [
        { phone: '55699935476', whatsapp: '55699935476', notes: original('WhatsApp / telefone: https://wa.me/5569993547674?text=123') },
        { phone: '', whatsapp: '', notes: original('Celular: +55 (67) 99876-5432') },
        { phone: '', whatsapp: '11987651234', notes: original('Phone: 67998765432') },
        { phone: '11987651234', whatsapp: '', notes: original('Phone: 67998765432') },
        { phone: '11987651234', whatsapp: '21988887777', notes: original('Phone: 67998765432') },
        { notes: 'WhatsApp / telefone: 5569993547674\nAnotações: cliente disse 5567998765432' },
        { notes: original('Observações: cliente disse 5569993547674') },
        { notes: original('WhatsApp: \nTelefone: 5569993547674') },
        { notes: original('WhatsApp: Não informado\nTelefone: 5569993547674') },
        { notes: 'dados originais da planilha:\nTelefone: 5569993547674' },
        { notes: original('Teléfône / WhatsÁpp: 5569993547674') },
        { notes: original('WhatsApp: https://api.whatsapp.com/send?text=123&phone=%2B55%2069%20993547674') },
        { notes: `<!--METADATA:${JSON.stringify({ text: original('Telefone: 5569993547674') })}-->` },
        { notes: `<!--METADATA:null-->\n${original('Telefone: 5569993547674')}` },
        ...['WhatsApp / telefone', 'Telefone / WhatsApp', 'WhatsApp', 'Telefone', 'phone', 'phone number', 'celular']
          .map(header => ({ notes: original(`${header}: https://wa.me/5569993547674?text=1234567890`) })),
      ];
      for (const record of cases) {
        const expected = getLeadPhoneKeys(parseLeadFromSupabase(record)).sort();
        assert.deepEqual(getLeadPhoneKeys(record).sort(), expected, `Helper de pré-verificação: ${JSON.stringify(record)}`);
        const actual = await scalar('SELECT public.crm_record_phone_keys($1::jsonb) AS value', [JSON.stringify(record)]);
        assert.deepEqual(actual, expected, JSON.stringify(record));
      }
    });

    await t.test('backfill e gatilhos protegem número legado completo sem reservar artefato truncado', async () => {
      await duplicate(insert('leads', 120, '5569993547674'), 'lead', 20);
      assert.equal(await scalar('SELECT phone AS value FROM public.leads WHERE id = $1', [id(20)]), '55699935476');
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE phone_key = public.crm_dedup_phone_key($1)', ['55699935476']), 0);
      await insert('leads', 21, null);
      await duplicate(db.query('UPDATE public.leads SET notes = $1 WHERE id = $2', [
        'Dados originais da planilha:\nWhatsApp / telefone: https://wa.me/5569993547674?text=987', id(21),
      ]), 'lead', 20);
      await db.query('INSERT INTO public.leads(id, name, notes) VALUES($1, $2, $3)', [id(22), 'Legado sem telefone', 'Dados originais da planilha:\nCelular: 5567998765432']);
      await duplicate(insert('leads', 122, '67998765432'), 'lead', 22);
    });

    await t.test('novo lead é bloqueado por lead, cliente ou oportunidade na lixeira', async () => {
      await duplicate(insert('leads', 101, '55 (34) 9832-7904'), 'lead', 1);
      await duplicate(insert('leads', 102, '68999991234'), 'client', 2);
      await duplicate(insert('leads', 103, null, '11987651234'), 'lead', 3);
    });

    await t.test('ambos os campos são considerados e edição que mantém o telefone funciona', async () => {
      await db.query('UPDATE public.leads SET name = $1, phone = $2 WHERE id = $3', ['Nome atualizado', '553498327904', id(1)]);
      await duplicate(db.query('UPDATE public.leads SET phone = $1 WHERE id = $2', ['68999991234', id(1)]), 'client', 2);
      await duplicate(db.query('UPDATE public.leads SET whatsapp = $1 WHERE id = $2', ['11987651234', id(1)]), 'lead', 3);
      await insert('leads', 5, '21988887777', '31977776666');
      await duplicate(insert('leads', 105, '31977776666'), 'lead', 5);
    });

    await t.test('conversão em cliente aceita o telefone e não impede editar o lead original', async () => {
      await insert('clients', 6, '34998327904');
      await db.query('UPDATE public.leads SET name = $1 WHERE id = $2', ['Nome após conversão', id(1)]);
      await duplicate(insert('leads', 106, '34998327904'), 'client', 6);
    });

    await t.test('upsert por ID mantém lead convertido editável e verifica qualquer telefone acrescentado', async () => {
      const upsert = (n, phone, whatsapp = null) => db.query(
        `INSERT INTO public.leads(id, name, phone, whatsapp, status, notes) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(id) DO UPDATE SET phone = EXCLUDED.phone, whatsapp = EXCLUDED.whatsapp,
          status = EXCLUDED.status, notes = EXCLUDED.notes`,
        [id(n), 'Integração', phone, whatsapp, 'qualificado', 'Atualizado pela integração']);
      await upsert(1, '(34) 99832-7904');
      assert.equal(await scalar('SELECT status AS value FROM public.leads WHERE id = $1', [id(1)]), 'qualificado');
      assert.equal(await scalar('SELECT notes AS value FROM public.leads WHERE id = $1', [id(1)]), 'Atualizado pela integração');
      await duplicate(upsert(1, '68999991234'), 'client', 2);
      await duplicate(upsert(1, '34998327904', '11987651234'), 'lead', 3);
      await duplicate(upsert(118, '34998327904'), 'client', 6);
      assert.equal(await scalar('SELECT phone AS value FROM public.leads WHERE id = $1', [id(1)]), '(34) 99832-7904');
    });

    await t.test('alterar ou apagar telefone mantém os números antigos protegidos', async () => {
      await db.query('UPDATE public.leads SET phone = $1, whatsapp = NULL WHERE id = $2', ['41966665555', id(5)]);
      await duplicate(insert('leads', 107, '21988887777'), 'lead', 5);
      await duplicate(insert('leads', 108, '31977776666'), 'lead', 5);
      await db.query('UPDATE public.leads SET phone = NULL WHERE id = $1', [id(5)]);
      await duplicate(insert('leads', 109, '41966665555'), 'lead', 5);
    });

    await t.test('exclusão física do lead marca todos os números históricos sem liberá-los', async () => {
      await db.query('DELETE FROM public.leads WHERE id = $1', [id(5)]);
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE entity_id = $1 AND deleted_at IS NOT NULL', [id(5)]), 3);
      await duplicate(insert('leads', 110, '21988887777'), 'lead', 5);
    });

    await t.test('exclusão física do cliente e troca de telefone também preservam o histórico', async () => {
      await db.query('UPDATE public.clients SET phone = $1 WHERE id = $2', ['61988885555', id(2)]);
      await db.query('DELETE FROM public.clients WHERE id = $1', [id(2)]);
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE entity_id = $1 AND deleted_at IS NOT NULL', [id(2)]), 2);
      await duplicate(insert('leads', 111, '68999991234'), 'client', 2);
      await duplicate(insert('leads', 112, '61988885555'), 'client', 2);
    });

    await t.test('conflito ignorado e rollback não deixam telefones de cadastros inexistentes', async () => {
      await db.query('INSERT INTO public.leads(id, name, phone) VALUES ($1, $2, $3) ON CONFLICT(id) DO NOTHING', [id(1), 'Ignorado', '71999990000']);
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE phone_key = public.crm_dedup_phone_key($1)', ['71999990000']), 0);
      await db.exec('BEGIN');
      await insert('leads', 7, '85988884444');
      await db.exec('ROLLBACK');
      await insert('leads', 8, '85988884444');
    });

    await t.test('números incompletos não criam colisões falsas', async () => {
      await insert('leads', 9, '123');
      await insert('leads', 10, '123');
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE entity_id IN ($1,$2)', [id(9), id(10)]), 0);
    });

    await t.test('snapshot REPEATABLE READ falha de forma segura em vez de ignorar duplicados concorrentes', async () => {
      await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
      await assert.rejects(insert('leads', 16, '86999993333'), error => {
        assert.equal(error.code, '25000');
        assert.equal(error.message, 'CRM_PHONE_DEDUP_REQUIRES_READ_COMMITTED_OR_SERIALIZABLE');
        return true;
      });
      await db.exec('ROLLBACK');
      assert.equal(await scalar('SELECT count(*)::int AS value FROM public.crm_phone_registry WHERE entity_id = $1', [id(16)]), 0);
      await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
      await db.query('UPDATE public.leads SET name = $1 WHERE id = $2', ['Nome em RR', id(1)]);
      await insert('clients', 17, '86999993333');
      await db.exec('COMMIT');
    });

    await t.test('usuário autenticado usa gatilhos sem conseguir acessar ou alterar o registro', async () => {
      assert.equal(await scalar("SELECT has_table_privilege('authenticated', 'public.crm_phone_registry', 'SELECT') AS value"), false);
      assert.equal(await scalar("SELECT has_table_privilege('anon', 'public.crm_phone_registry', 'INSERT') AS value"), false);
      assert.equal(await scalar("SELECT has_function_privilege('authenticated', 'public.crm_track_record_phones()', 'EXECUTE') AS value"), false);
      assert.equal(await scalar("SELECT relrowsecurity AS value FROM pg_class WHERE oid = 'public.crm_phone_registry'::regclass"), true);
      await db.exec('SET ROLE authenticated');
      try {
        await insert('leads', 11, '81999992222');
        await duplicate(insert('leads', 12, '81999992222'), 'lead', 11);
        await assert.rejects(db.query('SELECT * FROM public.crm_phone_registry'), error => error.code === '42501');
      } finally { await db.exec('RESET ROLE'); }
    });

    await t.test('colunas opcionais ausentes são suportadas e a migração preserva o histórico ao reaplicar', async () => {
      await db.exec('ALTER TABLE public.clients DROP COLUMN whatsapp; ALTER TABLE public.leads DROP COLUMN phone;');
      await db.query('INSERT INTO public.clients(id,name,phone) VALUES($1,$2,$3)', [id(13), 'Cliente', '48999991111']);
      await db.query('INSERT INTO public.leads(id,name,whatsapp) VALUES($1,$2,$3)', [id(14), 'Lead', '47999991111']);
      await db.exec(migration);
      await duplicate(db.query('INSERT INTO public.leads(id,name,whatsapp) VALUES($1,$2,$3)', [id(15), 'Outro', '21988887777']), 'lead', 5);
    });
  } finally { await db.close(); }
});
