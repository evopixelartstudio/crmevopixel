# Proteção de leads duplicados por telefone

Antes de publicar o aplicativo atualizado, execute **todo** o arquivo
[`20261016_lead_phone_deduplication.sql`](../supabase/migrations/20261016_lead_phone_deduplication.sql)
no SQL Editor do projeto Supabase conectado ao CRM. A migração é reexecutável.
Ela precisa das tabelas `public.leads` e `public.clients` e dos papéis padrão do
Supabase (`anon`, `authenticated` e `service_role`).

O registro `public.crm_phone_registry` começa com os telefones e WhatsApps de todos
os leads e clientes, sem filtro de status. As oportunidades do pipeline e da
lixeira continuam relacionadas ao mesmo lead, portanto entram nessa verificação.
Se o backend não conseguir consultar esse registro, deve interromper o novo
cadastro ou importação para não cadastrar um possível duplicado sem verificar.

O telefone é comparado sem máscara, com equivalência do DDI brasileiro e do nono
dígito de celular. Por exemplo, `(34) 99832-7904`, `+55 34 99832-7904` e
`55 34 9832-7904` identificam o mesmo telefone. A regra do nono dígito só se aplica
a celulares brasileiros com prefixo móvel entre 6 e 9. Telefones fixos e números
estrangeiros mantêm sua identidade. Links `wa.me` e `api.whatsapp.com` também são
interpretados; os dígitos da mensagem do link não fazem parte do telefone.
Números incompletos, sem 10 a 15 dígitos, não identificam duplicados.

Cadastros antigos importados podem ter o telefone truncado em 11 dígitos e o
valor completo em `Dados originais da planilha:` nas observações. A proteção usa
o mesmo telefone recuperado que a ficha do CRM apresenta, sem alterar o cadastro
bruto. O número truncado incorreto não reserva um possível telefone de terceiros.
A recuperação considera apenas a primeira linha preenchida com um cabeçalho de
telefone reconhecido após esse marcador; números em observações comuns ou dentro
dos metadados JSON não viram telefones por conta própria.

Os gatilhos do banco bloqueiam `INSERT` de novo lead e edições que acrescentam um
telefone já associado a outro cadastro. A resposta é SQLSTATE `23505`, mensagem
`LEAD_PHONE_DUPLICATE` e detalhes JSON no formato `{ "matches": [...] }`.
Editar outros dados ou apenas mudar a máscara do telefone continua permitido,
inclusive para duplicados que já existiam antes da migração. Criar um cliente a
partir de um lead continua permitido e registra os dois vínculos com o telefone.

Trocar ou apagar um telefone não remove a identidade anterior. Excluir fisicamente
um lead ou cliente marca **todos** os seus números em `deleted_at` e mantém o
histórico para impedir uma nova prospecção por engano. Enquanto o cadastro existe,
um telefone antigo permanece vinculado ao mesmo cadastro, mesmo se o número atual
for diferente. O registro é acessado pelo backend com `service_role`; o navegador
não recebe permissão de leitura ou alteração direta dessa tabela.

A migração **não apaga, mescla ou modifica os duplicados existentes**. Telefones de
registros excluídos fisicamente **antes** da instalação não podem ser reconstruídos
quando não há mais um cadastro com esses dados no banco. Registros ainda presentes
na lixeira do pipeline são incluídos normalmente.

As verificações usam bloqueios de transação por telefone. Sob o isolamento padrão
`READ COMMITTED` do Supabase/PostgREST, duas inclusões concorrentes do mesmo número
são serializadas e a segunda recebe o aviso de duplicidade. `SERIALIZABLE` também
mantém a proteção e pode exigir repetição da transação em caso de disputa.
Um telefone novo em lead sob `REPEATABLE READ` é recusado com SQLSTATE `25000`, pois um snapshot antigo poderia
ocultar um cadastro concluído enquanto a operação esperava pelo bloqueio. Ver
[documentação de bloqueios do PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
e [isolamento de transações](https://www.postgresql.org/docs/current/transaction-iso.html).

## Identificar duplicados anteriores sem alterar cadastros

Após a migração, esta consulta de leitura no SQL Editor lista telefones associados
a mais de um lead, com os nomes e IDs para revisão. Um único lead e seu cliente
convertido não entram na lista, pois esse vínculo é esperado. A consulta também
considera números antigos e cadastros excluídos preservados no registro.

```sql
SELECT phone_key,
  count(*) FILTER (WHERE entity_type = 'lead') AS cadastros_lead,
  jsonb_agg(jsonb_build_object(
    'tipo', entity_type, 'id', entity_id, 'nome', name,
    'empresa', company_name, 'excluido_em', deleted_at
  ) ORDER BY entity_type, entity_id) AS cadastros
FROM public.crm_phone_registry
GROUP BY phone_key
HAVING count(*) FILTER (WHERE entity_type = 'lead') > 1
ORDER BY cadastros_lead DESC, phone_key;
```

## Verificação local da migração

O teste de integração executa o SQL em PostgreSQL via PGlite, fora das dependências
do aplicativo. No PowerShell, a partir da raiz do projeto:

```powershell
$sqlTestDirectory = Join-Path $env:TEMP 'evocrm-phone-sql-tests'
npm.cmd install --prefix $sqlTestDirectory --no-audit --no-fund @electric-sql/pglite
$env:PGLITE_MODULE = Join-Path $sqlTestDirectory 'node_modules/@electric-sql/pglite'
node --test tests/lead-phone-deduplication-sql.test.cjs
```

O teste cobre normalização em relação ao código do WhatsApp, migração reaplicável,
duplicados em leads/clientes/pipeline perdido, mudança de número, exclusões físicas,
conversão em cliente, upsert pelo mesmo ID, números legados recuperados das notas,
edição de duplicados antigos, rollback, permissões e esquemas
sem uma das colunas opcionais. PGlite usa uma conexão; o teste não simula duas
conexões independentes concorrentes. Sem `PGLITE_MODULE`, a suíte padrão sinaliza
esse teste específico como ignorado.
