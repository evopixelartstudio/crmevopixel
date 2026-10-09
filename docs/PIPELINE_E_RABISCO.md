# Ajustes do pipeline e Rabisco

## Rabisco

O Rabisco lê e salva exclusivamente no Supabase, através de `/api/rabisco`. Não existe fallback local nem leitura de backups do navegador. Se o banco não estiver configurado, a tela informa o problema e não confirma o salvamento.

Para habilitar o quadro compartilhado, execute todo o arquivo `supabase/migrations/20261009_crm_cloud_only.sql` no SQL Editor. Configure `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor do CRM e recrie o container. O Rabisco abre diretamente e carrega o quadro do Supabase pelo backend, seguindo o acesso aberto atual do CRM; não é necessário liberar a tabela para usuários anônimos.

Backups locais antigos não foram apagados, importados nem usados automaticamente. Se houver trabalho nesses backups, preserve uma exportação antes de removê-los manualmente.

## Pipeline

- **Sem resposta** é uma etapa após Follow-up 2, disponível para arrastar cards e nos seletores de etapa.
- Uma bolinha amarela ao lado de editar indica mais de 48 horas na mesma etapa. Ela pulsa suavemente, mostra a explicação ao passar o mouse e fica estática quando o dispositivo solicita movimento reduzido. Não aparece para oportunidades encerradas, perdidas ou projetos em andamento.
- Seleção por checkboxes e exclusão em massa foram removidas. A exclusão individual continua disponível.
- Os controles de status e probabilidade e o percentual nos cards foram removidos. O status interno é preservado para continuar suportando oportunidades perdidas e restauração; editar um contato não reabre uma oportunidade perdida.

O SQL consolidado registra a entrada em cada etapa no banco. O trigger cobre movimentações feitas no CRM e por outras integrações. Editar valor, contato ou título não muda esse horário.

Sem a migração, o pipeline solicita a atualização do banco; não simula a contagem no navegador. Como o banco antigo não registrava a entrada na etapa, o tempo anterior não pode ser reconstruído com precisão; a migração inicia a contagem dos registros existentes quando é executada.

Os caches locais do serviço CRM, os metadados locais de perda/pagamento, as configurações locais de Supabase/IA/marca e a preferência local de tema também foram retirados. Configuração de conexão persistente vem do ambiente do servidor. Tema, marca e configurações de IA aplicadas na tela ficam apenas na memória da sessão atual. As despesas mensais, antes mantidas no navegador, passam a usar `monthly_expenses`, com acesso autenticado do Supabase como nas tabelas protegidas existentes do CRM.
