-- Migration: Adicionar colunas prazo_medio_analise e justificativa_revisao
-- 1. Adiciona prazo_medio_analise na tabela disciplinas
-- 2. Adiciona prazo_medio_analise na tabela revisoes
-- 3. Adiciona justificativa_revisao na tabela revisoes

-- Adicionar prazo_medio_analise em disciplinas (prazo médio em dias para análise da disciplina)
ALTER TABLE public.disciplinas
ADD COLUMN IF NOT EXISTS prazo_medio_analise INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.disciplinas.prazo_medio_analise IS 'Prazo médio em dias para análise de revisões desta disciplina';

-- Adicionar prazo_medio_analise em revisoes (armazena o prazo vigente no momento da criação)
ALTER TABLE public.revisoes
ADD COLUMN IF NOT EXISTS prazo_medio_analise INTEGER;

COMMENT ON COLUMN public.revisoes.prazo_medio_analise IS 'Prazo médio em dias para análise, herdado da disciplina no momento da criação';

-- Adicionar justificativa_revisao em revisoes (motivo da revisão em si)
ALTER TABLE public.revisoes
ADD COLUMN IF NOT EXISTS justificativa_revisao TEXT;

COMMENT ON COLUMN public.revisoes.justificativa_revisao IS 'Justificativa/motivo da revisão do projeto';
