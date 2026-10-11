# Salvamento confirmado de clientes

O cadastro, a edição e a exclusão em `public.clients` só alteram a lista do CRM após confirmação do Supabase. O aplicativo usa um UUID estável por tentativa de cadastro e o registro retornado pelo banco. Tentativas repetidas com o mesmo UUID não criam outra linha.

Uma falha mantém o formulário preenchido e mostra um erro. Falhas de sincronização automática de clientes vindos do pipeline ou de projetos aparecem na página Clientes, com a ação **Tentar novamente**. Essas gravações são feitas em sequência para evitar duas criações simultâneas. O carregamento respeita uma lista realmente vazia e não sobrescreve uma alteração confirmada durante uma consulta anterior.

O aplicativo preserva todos os campos enviados. Não tenta resolver erros descartando silenciosamente site, Instagram ou Google Meu Negócio.

## Compatibilidade do banco

O `supabase/schema.sql` foi atualizado com os campos usados pelo formulário. Em bancos existentes que ainda não tenham esses campos, confira o projeto correto e faça o backup habitual antes de executar **todo** `supabase/migrations/20261010_clients_persistence.sql` no SQL Editor. A migração adiciona somente campos ausentes; preserva registros, permissões e políticas existentes.

Depois de publicar o código, cadastre um cliente de teste e confirme o mesmo UUID em `clients`, recarregue a página, edite os links e recarregue novamente. Uma exclusão só remove o cadastro da tela quando o banco confirma a linha excluída.

A correção não recupera cadastros que falharam antes de chegar ao banco, nem altera a proteção de acesso do Supabase. Publicar o código e aplicar a migração são etapas separadas.
