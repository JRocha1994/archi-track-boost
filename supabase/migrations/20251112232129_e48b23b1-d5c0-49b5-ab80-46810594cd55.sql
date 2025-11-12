-- Criar tabela de empreendimentos
CREATE TABLE public.empreendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empreendimentos
CREATE POLICY "Usuários podem ver seus próprios empreendimentos"
ON public.empreendimentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios empreendimentos"
ON public.empreendimentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios empreendimentos"
ON public.empreendimentos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios empreendimentos"
ON public.empreendimentos FOR DELETE
USING (auth.uid() = user_id);

-- Criar tabela de obras
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para obras
CREATE POLICY "Usuários podem ver suas próprias obras"
ON public.obras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias obras"
ON public.obras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias obras"
ON public.obras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias obras"
ON public.obras FOR DELETE
USING (auth.uid() = user_id);

-- Criar tabela de disciplinas
CREATE TABLE public.disciplinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para disciplinas
CREATE POLICY "Usuários podem ver suas próprias disciplinas"
ON public.disciplinas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias disciplinas"
ON public.disciplinas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias disciplinas"
ON public.disciplinas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias disciplinas"
ON public.disciplinas FOR DELETE
USING (auth.uid() = user_id);

-- Criar tabela de projetistas
CREATE TABLE public.projetistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.projetistas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para projetistas
CREATE POLICY "Usuários podem ver seus próprios projetistas"
ON public.projetistas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios projetistas"
ON public.projetistas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios projetistas"
ON public.projetistas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios projetistas"
ON public.projetistas FOR DELETE
USING (auth.uid() = user_id);

-- Criar tipo de enum para status
CREATE TYPE public.status_entrega AS ENUM ('no-prazo', 'atrasado', 'pendente');
CREATE TYPE public.status_analise AS ENUM ('no-prazo', 'atrasado', 'pendente');

-- Criar tabela de revisões
CREATE TABLE public.revisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empreendimento_id UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  projetista_id UUID NOT NULL REFERENCES public.projetistas(id) ON DELETE CASCADE,
  numero_revisao TEXT NOT NULL,
  data_entrega DATE NOT NULL,
  data_envio DATE,
  data_analise DATE,
  justificativa TEXT NOT NULL,
  status_entrega status_entrega NOT NULL DEFAULT 'pendente',
  status_analise status_analise NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.revisoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para revisões
CREATE POLICY "Usuários podem ver suas próprias revisões"
ON public.revisoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias revisões"
ON public.revisoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias revisões"
ON public.revisoes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias revisões"
ON public.revisoes FOR DELETE
USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_empreendimentos_updated_at
BEFORE UPDATE ON public.empreendimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disciplinas_updated_at
BEFORE UPDATE ON public.disciplinas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projetistas_updated_at
BEFORE UPDATE ON public.projetistas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revisoes_updated_at
BEFORE UPDATE ON public.revisoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_obras_empreendimento_id ON public.obras(empreendimento_id);
CREATE INDEX idx_revisoes_empreendimento_id ON public.revisoes(empreendimento_id);
CREATE INDEX idx_revisoes_obra_id ON public.revisoes(obra_id);
CREATE INDEX idx_revisoes_disciplina_id ON public.revisoes(disciplina_id);
CREATE INDEX idx_revisoes_projetista_id ON public.revisoes(projetista_id);
CREATE INDEX idx_revisoes_user_id ON public.revisoes(user_id);