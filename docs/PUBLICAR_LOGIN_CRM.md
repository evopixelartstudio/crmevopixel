# Publicar a primeira camada de proteção

O caminho mais curto usa o Supabase Auth já integrado, login por e-mail/senha e uma lista de administradores configurada no servidor. Não exige GitHub, tabela de membros ou novas funções SQL para autenticar o aplicativo. Sessão persistente, renovação, logout, validação no servidor das páginas/APIs e bloqueio de indexação já estão implementados.

Na verificação de 10/10/2026, `http://crmevopixel.cloud:3000/leads` respondeu HTTP 200 publicamente. A correção de bind está no compose local e só terá efeito depois de recriar o serviço na VPS. Nenhuma implantação ou SQL foi executada neste trabalho.

## O limite da publicação sem SQL

Na nova verificação, a chave pública retornou HTTP 200 e um registro em consultas anônimas de `leads` e `clients`. Nenhum conteúdo dos registros foi impresso. Portanto, publicar apenas o login protege as páginas e APIs da VPS, mas **os dados continuam acessíveis diretamente pelo REST do Supabase**. Fechar a porta 3000 e adicionar noindex não resolve esse caminho.

A menor contenção desse problema é `supabase/block_anonymous_crm.sql`: revoga acesso de `anon` e `PUBLIC` às tabelas conhecidas do CRM e à view privada. Não cria tabelas, altera colunas, apaga dados ou muda políticas de usuários autenticados; preserva privilégios de `service_role`. Execute manualmente somente depois de conferir que n8n/Evolution e demais integrações usam credenciais de servidor para acessar o banco.

Essa contenção **não fecha políticas permissivas para qualquer usuário autenticado**, nem audita automaticamente todas as views/RPCs eventualmente criadas fora do projeto. A lista `CRM_ADMIN_EMAILS` é aplicada no aplicativo, não na API direta do Supabase. Desabilitar cadastro público reduz novas contas, mas não corrige permissões de contas existentes. Para privacidade completa do banco, use a migração RLS completa já preparada e a auditoria de catálogo; ela continua sendo a recomendação para concluir a segurança. Não é correto declarar os dados totalmente privados com apenas a primeira camada.

## Procedimento mínimo na Hostinger

1. **Criar o login.** No projeto Supabase correspondente ao CRM, em Authentication → Users, prepare a conta `evopixelart@gmail.com` com e-mail confirmado e senha. Não basta o acesso ao painel Supabase. Não é necessário configurar GitHub. Nas configurações do provedor de e-mail, desabilite novos cadastros públicos se o projeto for exclusivo do CRM; confira antes se outra aplicação depende dessa opção. O aplicativo não possui cadastro público.

2. **Atualizar os arquivos.** Publique o código corrigido pelo processo já usado no VPS. Inclua todos os arquivos novos. Preserve o `.env` existente; não envie `.env`, `.next` ou `node_modules` da máquina local. No Terminal/Web Console da Hostinger, entre na pasta real do CRM, onde está `docker-compose.yml`:

   ```bash
   cd /CAMINHO/REAL/DO/CRMEVOPIXEL
   nano .env
   ```

   Acrescente/confira:

   ```dotenv
   CRM_ORIGIN=https://crmevopixel.cloud
   CRM_ADMIN_EMAILS=evopixelart@gmail.com
   ```

   Preserve URL/chave pública Supabase, `SUPABASE_SERVICE_ROLE_KEY`, Evolution, Google Agenda e demais segredos. Não prefixe segredos com `NEXT_PUBLIC_`. A lista é somente do servidor; aceita e-mails separados por vírgula, todos como administradores. Só aceita identidades verificadas pelo Supabase Auth com e-mail confirmado. Uma lista vazia bloqueia todos. Para esta primeira camada não execute `authorize_evopixel_admin.sql` nem dependa de `crm_members`.

3. **Preparar a imagem.** Execute:

   ```bash
   bash scripts/apply-security-hostinger.sh build
   ```

   Pare se houver erro. Esse comando não reinicia a aplicação nem executa SQL.

4. **Fechar o acesso anônimo ao banco, se aplicar a contenção agora.** Confira primeiro as credenciais de integração e faça backup pelo procedimento da equipe. No Supabase SQL Editor, execute todo `supabase/block_anonymous_crm.sql`. Essa etapa é necessária para bloquear o acesso anônimo direto já comprovado. Se optar por adiar qualquer SQL, publique a camada do aplicativo, ciente de que o banco continua exposto. A aplicação antiga pode perder temporariamente consultas anônimas após a revogação; ative imediatamente a imagem preparada.

5. **Ativar somente o CRM.** Execute:

   ```bash
   bash scripts/apply-security-hostinger.sh activate
   docker compose ps crmevopixel
   docker port crmevopixel 3000
   ```

   A porta publicada deve aparecer como **127.0.0.1:3000** (ou outra porta configurada em `PORT`). O compose corrigido remove a publicação em todas as interfaces. Traefik continua acessando o serviço pela rede Docker na porta interna 3000; Nginx no mesmo host pode usar `127.0.0.1:3000`. Se seu proxy estiver em outra máquina ou container sem rede compartilhada, ajuste o encaminhamento antes de ativar. Não reinicie n8n, Evolution ou o site institucional. Não sirva `/_next/static` diretamente pelo proxy: precisa passar pelo middleware do Next.js.

6. **Validar.** Acesse `https://crmevopixel.cloud/login`, entre com e-mail/senha, recarregue e confira que a sessão persiste. Use Sair e verifique que as páginas e APIs privadas passam a negar acesso. Em janela anônima, `/leads` deve redirecionar ao login e `/api/monthly-clients` deve retornar 401. Na máquina local, execute:

   ```bash
   node scripts/check-crm-privacy.mjs
   ```

   De outra rede, o endereço `http://IP-PUBLICO-DA-VPS:3000` deve falhar. Confira no VPS com `docker port` que não há `0.0.0.0:3000` nem `[::]:3000`. A ausência de resposta externa isoladamente não prova o bind correto. Se outro processo publicar essa porta, investigue com `sudo ss -ltnp 'sport = :3000'` antes de alterar o firewall. Teste domínio, funções usuais, n8n, WhatsApp e agenda com as credenciais existentes. Não use `docker compose down` nem remova volumes.

## Auditoria do banco após a contenção

Execute `supabase/audit_crm_security.sql` no SQL Editor: é somente leitura. O script lista permissões, políticas, views e funções, inclusive objetos que precisam da proteção completa. Se não aplicou a migração completa, a tabela/RPC de membros não será usada pelo login simplificado.

A confirmação final exige: chave pública sem JWT de usuário não consegue consultar tabelas privadas; usuários autenticados não autorizados também não conseguem consultá-las; integrações continuam funcionando com suas credenciais próprias. A contenção mínima cobre o primeiro ponto para as tabelas listadas; o segundo depende de corrigir a RLS. Não publique chaves/segredos ou resultados com dados pessoais ao compartilhar a auditoria.
