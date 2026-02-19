-- Migration: Adicionar novo valor ao enum status_analise
-- Adiciona o valor 'sem-projeto' para representar revisões onde o projeto ainda não foi entregue,
-- portanto não há projeto disponível para análise (quando status_entrega é 'pendente' ou 'atrasado')

ALTER TYPE public.status_analise ADD VALUE IF NOT EXISTS 'sem-projeto';
