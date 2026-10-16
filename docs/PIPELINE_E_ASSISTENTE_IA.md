# Cadastro compartilhado e consultas com IA

As alterações deste documento precisam ser publicadas no servidor para aparecerem no CRM em produção.

## Pipeline

“Nova Oportunidade” usa os mesmos campos de “Novo Lead”: contato, empresa, nicho, cidade, telefone/WhatsApp, e-mail, Instagram e Google Meu Negócio. É possível cadastrar um lead ou selecionar um existente. Ao selecionar um lead, os dados são preenchidos e as alterações atualizam esse cadastro compartilhado. Os campos comerciais da oportunidade continuam disponíveis abaixo.

Cada etapa ordena os cards pela última entrada naquela etapa, do mais recente para o mais antigo. No Kanban, o primeiro aparece à esquerda; na lista, no início. Alterar nome, título ou valor não muda a posição. Quando aparece um novo primeiro card, a faixa volta ao início para deixá-lo visível.

O horário é persistido pelo trigger da migração `20261009_crm_cloud_only.sql`, já existente. Registros sem horário válido usam a data de criação para ordenação. A migração continua necessária para registrar corretamente mudanças de etapa e a indicação de mais de 48 horas. A ordem histórica anterior à migração não pode ser reconstruída com precisão.

## Conectar a IA

1. Entre em **Configurações → Provedores de Inteligência Artificial**.
2. Selecione Gemini ou Claude, cole a chave no campo correspondente e informe um modelo disponível na sua conta.
3. Use **Testar conexão** para validar sem salvar, ou **Salvar configuração de IA** para validar e usar a chave.
4. Abra a busca na barra superior e selecione **Assistente**. Digite uma solicitação e pressione Enter ou o botão de envio.

Exemplos: `Encontre o lead pelo telefone (68) 99999-1234`, `Busque o lead pelo e-mail contato@empresa.com`, `Ache o lead pelo nome Maria` ou `Busque a empresa Clínica São José`. Os resultados mostram os dados reais e um link para abrir a ficha. Telefones são comparados com DDD, aceitando formatação, DDI brasileiro e a variação do nono dígito suportada pelo WhatsApp. Números incompletos pedem correção. A busca percorre o cadastro de leads, inclusive além da primeira página de mil registros, sem depender de uma chave de IA.

Perguntas gerais usam o provedor selecionado com dados do CRM e as últimas mensagens da conversa. O contexto tem limite de 100 registros por módulo, informado ao modelo; não constitui uma consulta completa de toda a base. A busca direta por telefone, nome, empresa ou e-mail não tem esse recorte de 100 registros. Falhas de conexão, chave, modelo e cota aparecem como erro, sem uma resposta simulada de sucesso.

O assistente também pode criar tarefas, confirmando a gravação no banco antes de responder. Pagamentos, exclusão de clientes e cancelamento de contratos orientam o uso do módulo responsável, pois essas operações ainda não possuem execução confirmada pelo assistente.

## Proteção e duração da chave

Chaves digitadas são enviadas à API autenticada do CRM, validadas no provedor e guardadas em cookies de sessão criptografados, HttpOnly e Secure em produção. São vinculadas ao usuário e ao provedor, expiram após 12 horas e são removidas ao sair da conta. Não são devolvidas à tela nem gravadas no localStorage. Provedor, modelo, temperatura e instrução personalizada são preferências locais sem a chave.

O servidor usa `SUPABASE_SERVICE_ROLE_KEY`, já utilizada pelas integrações, para proteger os cookies. Opcionalmente, configure um segredo próprio de pelo menos 32 caracteres em `AI_SESSION_ENCRYPTION_KEY`. A variável foi incluída no compose. A troca do segredo invalida as chaves de sessão existentes. `GEMINI_API_KEY` e `ANTHROPIC_API_KEY` no servidor continuam sendo alternativas quando não há chave válida nesta sessão.

Modelos e formato das chamadas foram conferidos nas documentações oficiais de [Gemini](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash), [orçamento de raciocínio Gemini](https://ai.google.dev/gemini-api/docs/generate-content/thinking) e [Claude](https://platform.claude.com/docs/en/models/sonnet-4-6/overview). O teste de conexão valida o acesso efetivo da conta ao modelo informado.
