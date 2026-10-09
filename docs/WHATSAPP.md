# WhatsApp no CRM

A rota `/whatsapp` suporta a **Evolution GO** instalada na VPS. O Swagger de `https://evolution-go-nk3u.srv1956040.hstgr.cloud/swagger/index.html` foi consultado para confirmar as rotas. A instância é identificada pelo token enviado no header `apikey`, não pelo nome na URL.

## Configuração

1. Copie o conteúdo inteiro de `supabase/migrations/20261009_crm_cloud_only.sql` e execute no **SQL Editor** do projeto Supabase conectado ao CRM. Ele cria `rabisco_boards`, `whatsapp_messages` e `monthly_expenses`, além de configurar o horário de entrada nas etapas do pipeline e os campos de proposta/perda.
2. No Manager da Evolution GO, crie ou escolha uma instância dedicada ao CRM. Copie o **token da instância**. Não use a `GLOBAL_API_KEY` nesta integração.
3. Configure no ambiente do servidor do CRM:

```dotenv
EVOLUTION_PROVIDER=go
EVOLUTION_API_URL=https://evolution-go-nk3u.srv1956040.hstgr.cloud
EVOLUTION_API_KEY=token-da-instancia-evolution-go
EVOLUTION_INSTANCE=evocrm
EVOLUTION_WEBHOOK_URL=https://crmevopixel.cloud/api/whatsapp/webhook
SUPABASE_SERVICE_ROLE_KEY=chave-service-role-do-supabase
```

4. Mantenha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas. Recrie o container do CRM após atualizar o `.env`. As variáveis da integração são repassadas pelo Docker Compose.
5. Abra **WhatsApp**. O CRM verifica automaticamente a conexão. Clique em **Configurar recebimento** quando conectado, ou **Conectar / renovar QR Code** quando desconectado. O CRM configura o webhook da instância e assina `MESSAGE`, `SEND_MESSAGE` e `CONNECTION`. Se ela já estiver conectada, a configuração do recebimento é atualizada sem pedir QR Code. Recomenda-se uma instância dedicada: esta operação substitui a configuração de eventos/webhook daquela instância.
6. Quando houver QR Code, abra no celular **Aparelhos conectados → Conectar aparelho**. Se o QR ainda não estiver pronto, aguarde alguns segundos e tente novamente.
7. A lista mostra contatos do CRM e números que enviaram mensagens, mesmo sem cadastro. As conversas com mensagens aparecem primeiro, ordenadas pela última mensagem, com prévia e contador de não lidas. A lista se atualiza a cada 5 segundos mesmo sem conversa selecionada. Selecione uma conversa para ver as últimas 100 mensagens. Números desconhecidos têm um link para cadastrar o lead.

Ao carregar uma conversa com a página visível, o CRM marca as mensagens recebidas até aquele momento como lidas no Supabase. Esse estado é compartilhado, como o acesso atual do CRM. Não há armazenamento local nem confirmação de leitura enviada ao WhatsApp. Reenvios do mesmo evento pelo webhook não recriam mensagens nem alteram a leitura já registrada. O histórico no Supabase pode ser consultado mesmo se o aparelho estiver desconectado; o envio exige conexão.

`EVOLUTION_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ficam somente no servidor; nunca use o prefixo `NEXT_PUBLIC` nelas. WhatsApp e Rabisco abrem diretamente, sem pedir uma chave adicional. Seus endpoints seguem o acesso aberto atual do CRM. O webhook continua validando `instanceToken` contra o token configurado e persiste a mensagem antes de confirmar o recebimento. As tabelas de conversas e Rabisco não são abertas à chave pública anônima do Supabase.

## Se aparecer “Configure a integração na VPS”

Esse aviso significa que o processo do CRM não recebeu uma ou mais variáveis obrigatórias. Editar este documento não configura o servidor. O `.env` é ignorado pelo Git: um `git pull` não leva o arquivo local até a VPS.

1. Na VPS, coloque o `.env` preenchido na mesma pasta de `docker-compose.yml`. Use o exemplo acima com os seus valores reais e mantenha as variáveis do Supabase existentes.
2. Naquela pasta, com o código atualizado, recrie o serviço:

```bash
docker compose --env-file .env up -d --build --force-recreate crmevopixel
```

3. Confira se o container recebeu as variáveis, sem mostrar os valores:

```bash
docker compose exec crmevopixel node -e 'for (const key of ["EVOLUTION_PROVIDER","EVOLUTION_API_URL","EVOLUTION_API_KEY","EVOLUTION_INSTANCE","EVOLUTION_WEBHOOK_URL","SUPABASE_SERVICE_ROLE_KEY"]) console.log(key + ": " + (process.env[key]?.trim() ? "configurada" : "AUSENTE"))'
```

4. Reabra WhatsApp e clique em **Configurar recebimento** após aparecer **Conectado**.

Se usa um painel de deploy em vez deste Compose, cadastre essas mesmas variáveis no ambiente do serviço CRM e recrie o container pelo painel. Se usa PM2, configure o `.env` na pasta da aplicação e reinicie o processo com o ambiente atualizado.

## Conversas e pipeline

O envio desta versão é de texto. Áudios, vídeos, imagens e documentos são indicados no histórico; não há reprodução ou download de anexos. Na Evolution GO o histórico do CRM fica em `whatsapp_messages` no Supabase, com deduplicação por instância e ID da mensagem. São registrados os eventos recebidos após configurar o webhook. Esta versão não importa conversas antigas por HistorySync. Grupos, listas de transmissão e identificadores LID sem telefone resolvido não são associados a clientes.

O CRM grava o registro de saída no Supabase antes do envio. Se o serviço não confirmar o envio, o registro fica `unconfirmed`: confira o WhatsApp antes de repetir. Isso evita perder silenciosamente o registro de uma mensagem que possa ter sido entregue durante um timeout.

Contatos com o mesmo número são agrupados. Oportunidades são vinculadas pelo ID dos leads com aquele número; não há associação automática por nome. Quando existe oportunidade vinculada, é possível selecionar a etapa na conversa. Quando há mais de uma, selecione a oportunidade antes de mudar a etapa. A confirmação só aparece após o Supabase aceitar a gravação; os efeitos comerciais existentes do CRM continuam sendo executados. Contatos sem oportunidade devem ser cadastrados no pipeline pelo link exibido na conversa.

## Validação com a instância real

- Conectar pelo QR Code e aguardar o estado **Conectado**.
- Receber uma mensagem de um contato cadastrado e verificar sua exibição.
- Enviar um texto e verificar a chegada no celular do destinatário.
- Alterar a etapa de uma oportunidade vinculada e conferir no pipeline após recarregar.
- Testar token inválido no webhook e indisponibilidade da Evolution/Supabase.

O Swagger e `/server/ok` foram acessados sem credenciais. A conexão real, o webhook e o envio precisam ser validados após configurar os tokens e aplicar o SQL. Nenhuma mensagem de teste foi enviada a clientes.

Não envie testes automaticamente para clientes. A integração não oficial por aparelhos vinculados depende da compatibilidade da Evolution/Baileys com o WhatsApp e pode sofrer desconexões ou restrições da plataforma.

Referências: https://evolution-go-nk3u.srv1956040.hstgr.cloud/swagger/index.html e https://github.com/evolution-foundation/evolution-go

Para manter a integração anterior com Evolution API v2, use `EVOLUTION_PROVIDER=v2`; as rotas com nome da instância continuam disponíveis.
