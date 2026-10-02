-- ==============================================================================
-- Migration: Adicionar Link de Pagamento e Prazo de Entrega nas Oportunidades
-- Suporte ao fluxo de fechamento de propostas via WhatsApp e Mercado Pago
-- ==============================================================================

-- 1. Adicionar colunas payment_link e delivery_days na tabela opportunities
ALTER TABLE public.opportunities 
    ADD COLUMN IF NOT EXISTS payment_link TEXT,
    ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 7;

-- 2. Atualizar registros existentes com prazo padrão se for nulo
UPDATE public.opportunities 
SET delivery_days = 7 
WHERE delivery_days IS NULL;

-- 3. Comentários explicativos para documentação da tabela
COMMENT ON COLUMN public.opportunities.payment_link IS 'URL do link de pagamento gerado pelo Mercado Pago ou gateway';
COMMENT ON COLUMN public.opportunities.delivery_days IS 'Prazo de entrega acordado em dias úteis/corridos para o projeto';

