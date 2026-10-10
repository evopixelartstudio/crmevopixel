# EVOCRM — Sistema Operacional Comercial & Operacional da EvoPixel

O **EVOCRM** é o sistema proprietário desenvolvido exclusivamente para a gestão de vendas, prospecção ativa inteligente, funil comercial multisserviço, projetos e faturamento histórico da **EvoPixel**.

---

## Conceito de Design: Dark Editorial Product

A interface foi projetada sob uma estética editorial profunda e sofisticada:
- **60% Superfícies & Fundos Profundos**: `#050706` (Preto Profundo), `#07100F` (Fundo Principal), `#0C1A19` (Superfície Primária).
- **25% Camadas Secundárias**: `#10201E` (Superfície Escura), `#163832` (Superfície Secundária).
- **10% Estrutura & Tipografia**: `#235347` (Verde Estrutural), `#8EB69B` (Verde Positivo / Suporte), `#E7ECE8` (Texto Principal), `#9BA6A0` (Texto Secundário).
- **5% Acento Principal (`#F1F9A1`)**: Usado com extrema moderação exclusivamente para sinalizar ações primárias, status críticos e destaques financeiros de alta prioridade.
- **Tipografia**: **Inter** para títulos e números; **DM Sans** para textos, formulários e tabelas.

---

## Módulos Principais

1. **Dashboard Executivo ("Olá, Oliveira")**:
   - Faturamento Acumulado oficial (R$ 147.850).
   - Recebido (R$ 139.450) vs A receber (R$ 8.400).
   - Central de Ação *"O que precisa da sua atenção"*.
2. **Leads**:
   - Tabela com Score IA, Nicho, Temperatura e serviços identificados.
   - Perfil modular do lead com controle da sequência de nicho.
3. **Pipeline Kanban**:
   - 8 estágios de funil (Novo Lead → Fechado / Perdido) com valores acumulados.
4. **Prospeção IA**:
   - Fluxo de 8 etapas para importação CSV/XLSX e qualificação.
   - **Banco de Mensagens por Nicho (18.1)**: Sequências estruturadas (Abertura → Follow-up 1 → Follow-up 2) reutilizáveis.
   - **Automação n8n (18.2)**: Disparos automáticos e réguas com controle de estado transparente.
5. **Evo Intelligence**:
   - Diferenciação visual rigorosa entre **[DADO]**, **[INFERÊNCIA]** e **[RECOMENDAÇÃO]**.
   - Motor de Abordagem consultivo com personalização por nicho.
6. **Minha História (Seção 31)**:
   - Narrativa visual da trajetória da EvoPixel desde o início.
   - Marcos históricos, anos 2023 a 2026 e evolução do ticket médio.
7. **Financeiro (Seção 32)**:
   - Separação estrita entre Contratado vs Recebido vs Pendente.
8. **Follow-ups & Tarefas**:
   - Central com abas Hoje, Atrasados, Próximos e Automáticos n8n.
   - Tarefas em Lista e Kanban.
9. **Relatórios**:
   - Funil de resposta por nicho e performance por etapa da sequência.
10. **Automações & WhatsApp**:
    - Inspector de eventos n8n e preparação para Evolution API.

---

## Banco de Dados

O schema completo para PostgreSQL / Supabase com mais de 30 tabelas estruturadas está disponível em:
`supabase/schema.sql`

## Execução

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build
```
## Segurança do CRM

Para a primeira camada com login por e-mail e fechamento da porta 3000, siga [PUBLICAR_LOGIN_CRM.md](docs/PUBLICAR_LOGIN_CRM.md). A autorização no servidor pode usar `CRM_ADMIN_EMAILS` sem criar tabelas; proteger o REST direto do Supabase continua exigindo corrigir os privilégios/RLS.

Siga o [passo a passo manual para Hostinger e Supabase](docs/APLICAR_SEGURANCA_CRM.md). Ele inclui preparação do build, migração de segurança, autorização de `evopixelart@gmail.com` e validação do domínio publicado.

Antes de publicar, aplique a migração de autorização e configure Supabase Auth. Consulte [a auditoria e as instruções de aplicação](docs/AUDITORIA_SEGURANCA_CRM.md). O CRM exige usuário autorizado em `crm_members`; o login GitHub do painel Supabase é independente do login deste aplicativo.
