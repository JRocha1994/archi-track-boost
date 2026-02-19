-- Migration: Adicionar novo valor ao enum status_entrega
-- Adiciona o valor 'entregue-depois-do-prazo' para representar entregas realizadas após o prazo previsto

ALTER TYPE public.status_entrega ADD VALUE IF NOT EXISTS 'entregue-depois-do-prazo';
