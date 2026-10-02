-- ==============================================================================
-- Migration: Fluxo de descarte e arquivamento de oportunidades no Pipeline
-- Adiciona/atualiza campos: status, loss_reason, loss_notes e closed_at
-- ==============================================================================

-- 1. Garantir que as colunas existam na tabela opportunities
ALTER TABLE public.opportunities 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aberto',
    ADD COLUMN IF NOT EXISTS loss_reason TEXT,
    ADD COLUMN IF NOT EXISTS loss_notes TEXT,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Migrar status legados caso existam ('identificada', 'aberta' -> 'aberto'; 'perdida' -> 'perdido'; 'ganha' -> 'ganho')
UPDATE public.opportunities 
SET status = 'aberto' 
WHERE status IS NULL 
   OR status IN ('identificada', 'aberta', 'em_abordagem', 'em_conversa', 'diagnostico', 'proposta', 'negociacao');

UPDATE public.opportunities 
SET status = 'perdido' 
WHERE status = 'perdida';

UPDATE public.opportunities 
SET status = 'ganho' 
WHERE status = 'ganha';

-- 3. Definir valor padrão 'aberto' para a coluna status
ALTER TABLE public.opportunities 
    ALTER COLUMN status SET DEFAULT 'aberto';

-- 4. Índices para performance em consultas filtradas por status e data de encerramento
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_closed_at ON public.opportunities(closed_at);
