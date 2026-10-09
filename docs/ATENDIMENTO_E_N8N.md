# Base de contatos e atendimento

O CRM funciona sem n8n. Esta preparação não instala workflows nem envia mensagens pelo agente.

## SQL Editor

Execute os arquivos completos no Supabase conectado ao CRM:

1. `supabase/migrations/20261009_monthly_clients_fix.sql`: corrige a compatibilidade das mensalidades. Preserva `monthly_fee`, `name`, `service_description` e `status` antigos, acrescenta os campos do CRM e copia os valores antigos uma vez. O CRM usa `monthly_value` e `subscription_status` como campos atuais.
2. `supabase/migrations/20261009_contact_foundation.sql`: cria identidade, vínculos, controle de atendimento e histórico. Depende das tabelas `leads`, `clients` e `whatsapp_messages` já existentes.

Nenhum desses arquivos é aplicado automaticamente pelo CRM. Depois de executar, publique o código e recrie o container na VPS. As variáveis existentes do Supabase são suficientes.

## Usar no CRM

Abra uma conversa no WhatsApp e expanda **Classificação e atendimento**:

- **Origem**: não informada, prospecção ativa ou lead receptivo. Não muda só porque chegou uma mensagem.
- **Canal de aquisição**: WhatsApp, Instagram, indicação, site ou outro. É separado da origem.
- **Relacionamento**: lead, cliente ou ex-cliente. Cadastros existentes em Clientes são associados como clientes; uma classificação manual confirmada é preservada.
- **Responsável humano**: nome informado pelo operador. Não substitui autenticação nem comprova a identidade de quem clicou.
- **Assumir atendimento**: salva `attendance_owner=human` e desliga a automação desse contato.
- **Devolver à IA**: salva `attendance_owner=ai` e prepara esse contato. A chave geral permanece desligada, portanto nenhuma resposta automática é liberada nesta entrega.

As gravações aguardam confirmação do Supabase. Se outra sessão alterar o contato, a atualização é recusada até recarregar os dados. O painel consulta os dados a cada 10 segundos. A origem e o relacionamento não são alterados por envio/recebimento de mensagens ou mudanças de etapa.

## Identidade central

`crm_contacts.id` é a identidade compartilhada. `phone_key` normaliza o telefone, incluindo a equivalência do nono dígito em celulares brasileiros. `crm_contact_links` associa os IDs de Leads e Clientes à identidade. Leads e clientes com o mesmo telefone compartilham o atendimento; não há associação por nome. Contatos sem telefone válido continuam nos cadastros, mas precisam de um telefone para associação.

O SQL preenche os vínculos existentes e instala triggers para novos cadastros/alterações/exclusões. Apagar um lead ou cliente remove o vínculo, preservando a identidade e o histórico. Mensagens existentes e futuras recebem `whatsapp_messages.contact_id`. Telefones antigos permanecem nas mensagens, sem reescrever o conteúdo.

A etapa permanece em `opportunities.stage_slug`. Para consultar oportunidades de um contato, busque `crm_contact_links` com `record_type=lead` e use `record_id` para filtrar `opportunities.lead_id`. Múltiplas oportunidades continuam independentes.

## Contrato para o futuro workflow

Use credenciais de servidor no n8n para consultar `crm_agent_context` e `crm_contact_links`. Nenhuma chave de servidor vai para o navegador. As tabelas novas são privadas, com RLS e sem permissões para `anon`/`authenticated`.

`crm_agent_context.can_auto_reply` somente será verdadeiro quando:

1. A chave geral `crm_automation_settings.enabled` estiver ligada.
2. O contato tiver `automation_enabled=true`.
3. O atendimento estiver com `attendance_owner=ai`.

A chave geral nasce `false` e não há botão de ativação geral nesta versão. Ative-a somente quando decidir implementar e validar o workflow. Não mude os padrões para IA em uma importação.

Antes de **cada envio**, consulte novamente o contexto: se `can_auto_reply=false`, interrompa a resposta. Compare também `revision` com a versão usada ao preparar a mensagem; se mudou, descarte a resposta pendente e reavalie. Consultar apenas no começo do fluxo é insuficiente. Ainda existe uma janela entre a consulta e o envio externo: a implantação futura deve serializar os envios por contato e tratar cancelamento de trabalhos pendentes. Esta preparação não promete cancelar uma mensagem já entregue à API.

Use `instance,message_id` para deduplicar eventos e uma fila por contato para evitar duas respostas simultâneas. Teste com uma instância/número de testes isolado. Não faça disparos automáticos para clientes reais nesta preparação.

`crm_attendance_history` registra mudanças de dono e habilitação, horário e `changed_by` (`crm` nesta versão). `assigned_to` é responsabilidade operacional declarada, e não o autor autenticado da alteração. Quando houver login por usuário, substitua essa identificação compartilhada pela identidade autenticada no servidor.

## Verificação após deploy

Cadastre uma mensalidade, recarregue, edite o valor e confirme que continua salvo. Marque como paga e confira novamente após recarregar. Na conversa, altere a origem, envie/receba uma mensagem e confira que ela permanece igual. Assuma e devolva o atendimento em duas sessões; verifique a recusa de uma gravação desatualizada e o histórico. Mesmo devolvendo à IA, `can_auto_reply` deve continuar falso enquanto a chave geral estiver desligada.
