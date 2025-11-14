-- Migration: Atualizar tabela de revisões
-- 1. Renomear colunas
-- 2. Adicionar coluna data_prevista_analise
-- 3. Alterar tipo da coluna numero_revisao para INTEGER

-- Renomear data_entrega para data_prevista_entrega
ALTER TABLE public.revisoes 
RENAME COLUMN data_entrega TO data_prevista_entrega;

-- Renomear data_envio para data_entrega
ALTER TABLE public.revisoes 
RENAME COLUMN data_envio TO data_entrega;

-- Adicionar nova coluna data_prevista_analise (calculada automaticamente)
ALTER TABLE public.revisoes 
ADD COLUMN data_prevista_analise DATE;

-- Criar função para calcular data prevista de análise automaticamente
CREATE OR REPLACE FUNCTION public.calcular_data_prevista_analise()
RETURNS TRIGGER AS $$
BEGIN
  -- Se data_entrega foi preenchida, calcula data_prevista_analise como +5 dias
  IF NEW.data_entrega IS NOT NULL THEN
    NEW.data_prevista_analise := NEW.data_entrega + INTERVAL '5 days';
  ELSE
    NEW.data_prevista_analise := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular data_prevista_analise automaticamente
CREATE TRIGGER trigger_calcular_data_prevista_analise
BEFORE INSERT OR UPDATE OF data_entrega ON public.revisoes
FOR EACH ROW
EXECUTE FUNCTION public.calcular_data_prevista_analise();

-- Atualizar registros existentes com data_prevista_analise
UPDATE public.revisoes 
SET data_prevista_analise = data_entrega + INTERVAL '5 days'
WHERE data_entrega IS NOT NULL;

-- Alterar numero_revisao para INTEGER
-- Primeiro, criar uma nova coluna temporária
ALTER TABLE public.revisoes 
ADD COLUMN numero_revisao_temp INTEGER;

-- Tentar extrair números da coluna texto (ex: "R01" -> 1, "R02" -> 2)
UPDATE public.revisoes 
SET numero_revisao_temp = CAST(regexp_replace(numero_revisao, '[^0-9]', '', 'g') AS INTEGER)
WHERE numero_revisao ~ '[0-9]+';

-- Remover coluna antiga e renomear a nova
ALTER TABLE public.revisoes 
DROP COLUMN numero_revisao;

ALTER TABLE public.revisoes 
RENAME COLUMN numero_revisao_temp TO numero_revisao;

-- Adicionar constraint NOT NULL
ALTER TABLE public.revisoes 
ALTER COLUMN numero_revisao SET NOT NULL;

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN public.revisoes.data_prevista_entrega IS 'Data prevista para entrega do projeto (antiga data_entrega)';
COMMENT ON COLUMN public.revisoes.data_entrega IS 'Data real de entrega/envio do projeto (antiga data_envio)';
COMMENT ON COLUMN public.revisoes.data_prevista_analise IS 'Data prevista para análise (calculada automaticamente como data_entrega + 5 dias)';
COMMENT ON COLUMN public.revisoes.numero_revisao IS 'Número da revisão (apenas valores numéricos inteiros)';
