-- ==============================================================================
-- Migration: Adicionar Dados Técnicos e Briefing na tabela projects
-- Suporte à gestão de briefing, links de drive, acessos e paleta de cores
-- ==============================================================================

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS briefing_url TEXT,
    ADD COLUMN IF NOT EXISTS drive_folder_url TEXT,
    ADD COLUMN IF NOT EXISTS client_access_notes TEXT,
    ADD COLUMN IF NOT EXISTS color_palette TEXT,
    ADD COLUMN IF NOT EXISTS typography_fonts TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.projects.briefing_url IS 'Link para o briefing técnico ou documento no Notion/Google Docs/Typeform';
COMMENT ON COLUMN public.projects.drive_folder_url IS 'Link direto para a pasta de arquivos no Google Drive / Imagens';
COMMENT ON COLUMN public.projects.client_access_notes IS 'Acessos e credenciais do cliente (DNS, Hostinger, WordPress) com formatação segura';
COMMENT ON COLUMN public.projects.color_palette IS 'Paleta de cores do projeto (hexadecimais)';
COMMENT ON COLUMN public.projects.typography_fonts IS 'Fontes e tipografia do projeto';
