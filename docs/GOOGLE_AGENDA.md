# Google Agenda no CRM

A aba **Agenda** permite visualizar a semana, selecionar uma agenda da conta Google, criar reuniões e editar compromissos existentes. A visão no computador tem sete dias; no celular os dias aparecem em sequência. Eventos são consultados diretamente no Google, com atualização a cada minuto enquanto a aba do navegador está visível e um botão para atualizar na hora.

## 1. Supabase

Abra `supabase/migrations/20261009_google_calendar.sql`, copie o conteúdo completo e execute no **SQL Editor** do Supabase. Não substitua o SQL anterior do CRM; este arquivo cria apenas `google_calendar_connections`.

A tabela armazena a identificação da conta e os tokens criptografados. RLS fica ativada e somente a credencial `service_role` do servidor acessa a tabela. Os eventos ficam no Google Agenda, sem cópia no Supabase ou armazenamento local no navegador.

## 2. Credenciais do Google

1. Abra o [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto e habilite a **Google Calendar API**.
2. Configure a tela de consentimento no **Google Auth Platform**: nome do aplicativo, contato e público. Para uma conta Gmail pessoal, use público externo. Durante os testes, adicione seu endereço Google como usuário de teste.
3. Em **Clients / Clientes**, crie um cliente OAuth do tipo **Aplicativo Web**.
4. Cadastre exatamente esta **URI de redirecionamento autorizada**:

```text
https://crmevopixel.cloud/api/agenda/callback
```

5. Copie o **Client ID** e o **Client Secret** para as variáveis abaixo. São credenciais novas do Google: as chaves da Evolution ou do Supabase não substituem essas duas.

O fluxo solicita identidade/e-mail, acesso aos eventos e leitura da lista de agendas. A conta Google decide as permissões. Aplicativos externos em modo de teste podem precisar de nova autorização depois de sete dias; uso externo em produção pode exigir verificação pelo Google conforme os escopos solicitados.

## 3. Ambiente na Hostinger

No projeto Docker existente, expanda **Ambiente** e adicione as quatro variáveis. Mantenha as configurações anteriores do Supabase/WhatsApp.

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=client-id-do-google
GOOGLE_CALENDAR_CLIENT_SECRET=client-secret-do-google
GOOGLE_CALENDAR_REDIRECT_URI=https://crmevopixel.cloud/api/agenda/callback
GOOGLE_CALENDAR_ENCRYPTION_KEY=chave-base64-de-32-bytes
```

A chave de criptografia já foi gerada no `.env` local deste projeto: copie seu valor para o campo de mesmo nome na Hostinger. Para uma instalação nova, gere uma chave no terminal, uma vez:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copie o resultado para `GOOGLE_CALENDAR_ENCRYPTION_KEY`. Guarde essa chave no ambiente do servidor e mantenha o mesmo valor nas atualizações; mudar a chave impede a leitura das conexões existentes. Não use `NEXT_PUBLIC` nessas variáveis.

Mantenha também `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. O Docker Compose do projeto repassa as variáveis novas ao container. Publique o código atualizado e clique em **Salvar e implantar** na Hostinger. Se atualizar por terminal, execute na pasta do CRM:

```bash
docker compose up -d --build --force-recreate crmevopixel
```

## 4. Conectar e usar

Abra **Agenda → Conectar Google Agenda**. Escolha sua conta e autorize as permissões. Selecione qual agenda quer visualizar. **Nova reunião** abre o formulário; clicar num evento abre os detalhes e permite edição quando há permissão.

- O fuso utilizado é o da agenda selecionada e aparece acima da semana. Eventos de dia inteiro e compromissos que atravessam dias aparecem nos dias correspondentes.
- Criar Google Meet é opcional e só aparece quando a agenda oferece essa possibilidade. A geração do link pode levar alguns segundos; atualize para consultar o link.
- Editar uma reunião recorrente altera apenas a ocorrência selecionada. Campos fora do formulário, como participantes, lembretes e a recorrência, são preservados. Não há gestão de convidados nesta versão; faça isso no Google Agenda.
- O CRM usa `sendUpdates=none`: não solicita envio de atualizações aos convidados ao salvar. Use o Google Agenda se precisar enviar atualizações para participantes.
- A gravação só é confirmada depois que o Google aceita. Se outro usuário editar o evento antes de você salvar, o CRM pede para atualizar e abrir novamente o evento; não sobrescreve a edição silenciosamente.

Cada navegador autorizado acessa sua própria conexão. O acesso à Agenda exige essa autorização mesmo que o restante do CRM ainda tenha acesso aberto. Um cookie de sessão `HttpOnly` identifica a conexão, sem conter tokens Google ou eventos; não há `localStorage` ou `sessionStorage`. O cookie deixa de valer após sete dias ou quando a sessão do navegador termina (a restauração de sessão depende do navegador). Nesse caso, conecte novamente. As credenciais Google ficam criptografadas no Supabase e a renovação do token de acesso acontece no servidor.

**Desconectar** remove do Supabase a conexão usada por esta sessão e limpa o cookie. Não apaga reuniões e não revoga outras conexões autorizadas; para revogar o aplicativo na conta inteira, use as configurações de segurança da sua conta Google.

## Validação após configurar

1. Autorizar a conta e conferir a semana com os mesmos compromissos do Google Agenda.
2. Criar uma reunião de teste na própria agenda e verificar sua exibição no Google.
3. Editar título e horário e conferir as alterações nos dois lugares.
4. Testar um evento de dia inteiro e uma ocorrência recorrente.
5. Desconectar e confirmar que a agenda exige autorização novamente.

Nenhum evento real é criado automaticamente pelo CRM durante testes de desenvolvimento. A autorização real depende de configurar as credenciais Google e aplicar o SQL.

Referências: [OAuth no servidor](https://developers.google.com/identity/protocols/oauth2/web-server), [expiração da autorização em testes](https://developers.google.com/identity/protocols/oauth2#expiration), [listar eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [criar eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) e [editar eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/patch).
