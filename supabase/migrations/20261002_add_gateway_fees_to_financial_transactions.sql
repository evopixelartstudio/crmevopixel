-- ==============================================================================
-- Migration: Controle de taxas de gateway (Mercado Pago, Pix, Cartão)
-- Adiciona campos: payment_method, gross_amount, fee_amount e net_amount
-- ==============================================================================

-- 1. Garantir que as colunas existam na tabela financial_transactions
ALTER TABLE public.financial_transactions 
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2);

-- 2. Constraint para validar os métodos de pagamento permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_financial_transactions_payment_method'
    ) THEN
        ALTER TABLE public.financial_transactions
            ADD CONSTRAINT chk_financial_transactions_payment_method
            CHECK (payment_method IS NULL OR payment_method IN (
                'pix',
                'mercado_pago_credito_vista',
                'mercado_pago_parcelado',
                'mercado_pago_boleto',
                'transferencia',
                'dinheiro'
            ));
    END IF;
END $$;

-- 3. Preenchimento retroativo para manter consistência em registros já existentes
UPDATE public.financial_transactions
SET 
    gross_amount = COALESCE(gross_amount, amount_contracted, 0.00),
    fee_amount = COALESCE(fee_amount, 0.00),
    net_amount = COALESCE(net_amount, amount_contracted, 0.00) - COALESCE(fee_amount, 0.00)
WHERE gross_amount IS NULL OR net_amount IS NULL;

-- 4. Índice para consultas rápidas por método de pagamento
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment_method 
    ON public.financial_transactions(payment_method);
