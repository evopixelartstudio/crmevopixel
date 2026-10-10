# Aplicar as correções do EVOCRM

> **Procedimento simplificado atual:** siga [PUBLICAR_LOGIN_CRM.md](PUBLICAR_LOGIN_CRM.md). O login por e-mail pode ser publicado sem a migração completa, usando `CRM_ADMIN_EMAILS` no servidor. As etapas abaixo descrevem a alternativa completa com `crm_members`; para adotá-la, remova `CRM_ADMIN_EMAILS` do ambiente **e do docker-compose.yml**. A lista de e-mails não substitui RLS no banco.

As correções estão no projeto local. O domínio publicado continua exposto até atualizar a aplicação **e** executar a migração de segurança. Nada foi executado no banco de produção. A migração cria a tabela de autorização `crm_members`, funções e políticas; não exclui registros nem altera colunas das tabelas de negócio.

## 1. Preparar o acesso e as integrações

Abra o projeto Supabase usado pelo CRM. Confira o identificador do projeto contra `NEXT_PUBLIC_SUPABASE_URL` do servidor. Faça um backup pelo procedimento já usado pela equipe antes de alterar permissões.

Em Authentication → Users, prepare a identidade **evopixelart@gmail.com**. Para login por senha, crie/convide esse usuário pelo painel e conclua a confirmação de identidade e definição de senha. Não publique a senha no repositório. O login da conta administrativa do painel Supabase via GitHub não cria essa identidade no aplicativo.

GitHub estava desabilitado no Supabase Auth consultado. Caso prefira esse provedor, configure uma OAuth App conforme a [documentação oficial](https://supabase.com/docs/guides/auth/social-login/auth-github). Sua callback GitHub é `https://SEU-PROJECT-REF.supabase.co/auth/v1/callback`. Em Authentication → URL Configuration, use Site URL `https://crmevopixel.cloud` e permita exatamente `https://crmevopixel.cloud/api/auth/callback`. [Configuração de retornos](https://supabase.com/docs/guides/auth/redirect-urls). O primeiro login GitHub pode criar a identidade; o CRM recusará acesso até a etapa 4 autorizar o usuário confirmado.

Confira as credenciais Supabase das integrações n8n e demais processos de servidor: precisam usar `service_role`, guardada no servidor, se consultarem tabelas privadas. Troque eventuais credenciais `anon` dessas integrações **antes** de aplicar a RLS. Preserve os tokens existentes do webhook WhatsApp e as credenciais de Google Agenda.

## 2. Colocar o código corrigido na Hostinger e preparar o build

Este projeto contém uma implantação Docker de VPS. No hPanel, abra o VPS correspondente e seu Terminal/Web Console; não é necessário configurar SSH local. A Hostinger documenta esse acesso no [guia do terminal do navegador](https://support.hostinger.com/pt/articles/7978544-como-usar-o-terminal-do-navegador). Se sua implantação real usa outro mecanismo, publique pelo mecanismo existente e preserve as mesmas variáveis e proteções abaixo.

Envie as alterações deste repositório pelo processo habitual: commit/push e atualização do checkout do VPS, ou transferência dos arquivos fonte. Não transfira `.env`, `.env.local`, `node_modules` ou `.next` da máquina local. Preserve o `.env` que já existe no servidor. Os arquivos novos, inclusive scripts, migration, middleware e componentes de login, precisam acompanhar a atualização.

No terminal do VPS, entre na pasta real que contém o `docker-compose.yml` do CRM:

```bash
cd /CAMINHO/REAL/DO/CRMEVOPIXEL
nano .env
```

Confira ou acrescente `CRM_ORIGIN=https://crmevopixel.cloud`. Preserve `NEXT_PUBLIC_SUPABASE_URL`, a chave pública `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Esta última nunca pode ter prefixo `NEXT_PUBLIC_`. Configure `GEMINI_API_KEY` e/ou `ANTHROPIC_API_KEY` somente nesse arquivo caso use essas integrações. Preserve as demais variáveis existentes. Não substitua seu `.env` pelo exemplo.

Prepare a imagem sem reiniciar a aplicação ainda:

```bash
bash scripts/apply-security-hostinger.sh build
```

Se houver erro de build, corrija antes de continuar. O script atua somente no serviço `crmevopixel`; não executa SQL, atualizações do sistema, remoção de volumes ou reinicialização dos outros serviços. Não use os scripts antigos de instalação geral para aplicar esta atualização.

Todo o tráfego do domínio, **inclusive `/_next/static`**, deve passar pelo Next.js. Não configure Nginx/CDN para servir a pasta `.next/static` diretamente: os bundles internos também exigem autorização. Limpe eventual cache antigo do domínio CRM quando ativar o build. Não altere o proxy, sitemap ou SEO do domínio institucional.

## 3. Aplicar a segurança do banco e ativar o build

Combine uma janela curta de manutenção: a aplicação antiga usa acesso anônimo e pode deixar de consultar dados assim que a nova RLS for aplicada. A imagem corrigida já deve estar pronta pela etapa anterior.

No Supabase → SQL Editor → nova consulta, cole **todo** o conteúdo de `supabase/migrations/20261010_crm_security.sql` e execute. Essa é a migração nova de segurança; não é necessário reexecutar a migração de contatos aberta no IDE. As migrações existentes de negócio precisam já ter sido aplicadas. A transação é reexecutável e não limpa dados.

Logo após o sucesso da SQL, no terminal Hostinger:

```bash
bash scripts/apply-security-hostinger.sh activate
docker compose ps crmevopixel
```

A aplicação agora exige uma sessão válida e autorização no banco. Não restaure permissões públicas para contornar problemas de configuração. Se o container falhar, confira seu estado e configuração sem compartilhar logs contendo credenciais.

## 4. Autorizar o primeiro administrador

No Supabase → SQL Editor, execute o conteúdo de `supabase/authorize_evopixel_admin.sql`. Ele autoriza somente o UUID do usuário com e-mail **evopixelart@gmail.com confirmado**, como administrador. Se informar que o usuário não existe ou não está confirmado, conclua a etapa 1 e execute novamente. Não remova essa verificação.

Para GitHub, entre uma vez pelo botão na página `/login`, confira a identidade em Authentication → Users e então execute o script. A recusa inicial de acesso é esperada antes da autorização. Depois, faça login novamente.

Outros usuários precisam de autorização explícita. Use o UUID conferido no painel:

```sql
INSERT INTO public.crm_members(user_id, role, enabled)
VALUES ('UUID-CONFERIDO'::uuid, 'member', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'member', enabled = true;
```

Para revogar acesso, altere apenas a autorização: `UPDATE public.crm_members SET enabled=false WHERE user_id='UUID-CONFERIDO'::uuid;`.

## 5. Validar o domínio e o banco

No SQL Editor, execute `supabase/audit_crm_security.sql`. É somente leitura e lista RLS, políticas, privilégios, funções e views para conferir a aplicação. As tabelas privadas não devem conceder acesso anônimo; políticas antigas permissivas não podem ultrapassar a política restritiva de associação ao CRM.

Na máquina local com Node.js 20+ (ou no VPS com Node.js disponível), execute a verificação anônima do domínio, sem necessidade de credenciais:

```bash
node scripts/check-crm-privacy.mjs
```

Ela exige redirecionamento das páginas ao login, APIs 401, HTML anônimo sem hidratação privada, login com noindex, cabeçalho X-Robots-Tag, sitemap vazio e webhook recusando requisição sem segredo. Não imprime dados consultados. Esse teste não autentica nem envia mensagens.

Em janela anônima, confira `/leads`, `/clientes`, `/financeiro` e uma API diretamente: não devem retornar dados privados. Em janela normal, faça login com o administrador autorizado e confira leads, pipeline, clientes, projetos, financeiro e configurações. Teste conta sem associação e conta desativada: ambas precisam perder acesso. Valide CRUD com um registro de teste aprovado pela equipe, além de agenda e integrações, pelo fluxo habitual; não use dados reais para testes destrutivos.

Os 60 testes e a verificação do build local passaram; o teste completo local cobriu 28 páginas, 11 APIs e 54 bundles internos. O login autorizado e as integrações no ambiente publicado ainda precisam dessa validação após a aplicação manual.

Se resultados do CRM já estiverem no Google, solicite remoção no Search Console do domínio do CRM após aplicar as proteções. `noindex` e robots.txt não substituem a autenticação. Há alertas de dependências ainda pendentes, detalhados em `AUDITORIA_SEGURANCA_CRM.md`.
