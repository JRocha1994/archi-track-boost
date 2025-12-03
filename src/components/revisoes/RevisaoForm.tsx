import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise, calcularDataPrevistaAnalise } from '@/lib/statusCalculator';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface RevisaoFormProps {
  revisoes: Revisao[];
  setRevisoes: (revisoes: Revisao[]) => void;
  empreendimentos: Empreendimento[];
  obras: Obra[];
  disciplinas: Disciplina[];
  projetistas: Projetista[];
}

export function RevisaoForm({
  revisoes,
  setRevisoes,
  empreendimentos,
  obras,
  disciplinas,
  projetistas,
}: RevisaoFormProps) {
  const [formData, setFormData] = useState({
    empreendimentoId: '',
    obraId: '',
    disciplinaId: '',
    projetistaId: '',
    numeroRevisao: '',
    dataPrevistaEntrega: '',
    dataEntrega: '',
    dataPrevistaAnalise: '',
    dataAnalise: '',
    justificativa: '',
  });
  const { toast } = useToast();

  const obrasFiltered = obras.filter(o => o.empreendimentoId === formData.empreendimentoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== INÍCIO handleSubmit ===');
    console.log('formData:', formData);

    if (!formData.empreendimentoId || !formData.obraId || !formData.disciplinaId || 
        !formData.projetistaId || !formData.numeroRevisao || !formData.dataPrevistaEntrega || !formData.justificativa) {
      console.log('Campos obrigatórios faltando');
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const numeroRevisaoInt = parseInt(formData.numeroRevisao);
    if (isNaN(numeroRevisaoInt)) {
      toast({ title: 'Número da revisão deve ser um número inteiro válido', variant: 'destructive' });
      return;
    }

    const dataPrevistaAnalise = calcularDataPrevistaAnalise(formData.dataEntrega || undefined);
    const statusEntrega = calcularStatusEntrega(formData.dataPrevistaEntrega, formData.dataEntrega || undefined);
    const statusAnalise = calcularStatusAnalise(dataPrevistaAnalise, formData.dataAnalise || undefined);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Erro ao buscar sessão:', sessionError);
        throw sessionError;
      }
      const user = session?.user;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      console.log('Tentando inserir revisão com user_id:', user.id);
      console.log('Dados da revisão:', {
        empreendimento_id: formData.empreendimentoId,
        obra_id: formData.obraId,
        disciplina_id: formData.disciplinaId,
        projetista_id: formData.projetistaId,
        numero_revisao: numeroRevisaoInt,
        data_prevista_entrega: formData.dataPrevistaEntrega,
        data_entrega: formData.dataEntrega || null,
        data_prevista_analise: dataPrevistaAnalise || null,
        data_analise: formData.dataAnalise || null,
        justificativa: formData.justificativa,
        status_entrega: statusEntrega,
        status_analise: statusAnalise,
        user_id: user.id,
      });

      const { data, error } = await supabase
        .from('revisoes')
        .insert({
          empreendimento_id: formData.empreendimentoId,
          obra_id: formData.obraId,
          disciplina_id: formData.disciplinaId,
          projetista_id: formData.projetistaId,
          numero_revisao: numeroRevisaoInt,
          data_prevista_entrega: formData.dataPrevistaEntrega,
          data_entrega: formData.dataEntrega || null,
          data_prevista_analise: dataPrevistaAnalise || null,
          data_analise: formData.dataAnalise || null,
          justificativa: formData.justificativa,
          status_entrega: statusEntrega,
          status_analise: statusAnalise,
          user_id: user.id,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Erro do Supabase ao inserir revisão:', error);
        throw error;
      }

      console.log('Revisão inserida com sucesso:', data);

      const newRevisao: Revisao = {
        id: data.id,
        empreendimentoId: data.empreendimento_id,
        obraId: data.obra_id,
        disciplinaId: data.disciplina_id,
        projetistaId: data.projetista_id,
        numeroRevisao: data.numero_revisao,
        dataPrevistaEntrega: data.data_prevista_entrega,
        dataEntrega: data.data_entrega || undefined,
        dataPrevistaAnalise: data.data_prevista_analise || undefined,
        dataAnalise: data.data_analise || undefined,
        justificativa: data.justificativa,
        statusEntrega: data.status_entrega,
        statusAnalise: data.status_analise,
        createdAt: data.created_at,
      };

      setRevisoes([...revisoes, newRevisao]);
      toast({ title: 'Revisão registrada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao salvar revisão:', error);
      toast({
        title: 'Erro ao salvar revisão',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }
    
    setFormData({
      empreendimentoId: formData.empreendimentoId,
      obraId: formData.obraId,
      disciplinaId: formData.disciplinaId,
      projetistaId: formData.projetistaId,
      numeroRevisao: '',
      dataPrevistaEntrega: '',
      dataEntrega: '',
      dataPrevistaAnalise: '',
      dataAnalise: '',
      justificativa: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="empreendimento">Empreendimento *</Label>
          <Select
            value={formData.empreendimentoId}
            onValueChange={(value) => setFormData({ ...formData, empreendimentoId: value, obraId: '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {empreendimentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="obra">Obra *</Label>
          <Select
            value={formData.obraId}
            onValueChange={(value) => setFormData({ ...formData, obraId: value })}
            disabled={!formData.empreendimentoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {obrasFiltered.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="disciplina">Disciplina *</Label>
          <Select
            value={formData.disciplinaId}
            onValueChange={(value) => setFormData({ ...formData, disciplinaId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {disciplinas.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="projetista">Projetista *</Label>
          <Select
            value={formData.projetistaId}
            onValueChange={(value) => setFormData({ ...formData, projetistaId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {projetistas.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="numeroRevisao">Número da Revisão *</Label>
          <Input
            id="numeroRevisao"
            type="number"
            value={formData.numeroRevisao}
            onChange={(e) => setFormData({ ...formData, numeroRevisao: e.target.value })}
            placeholder="Ex: 1, 2, 3"
            min="0"
            step="1"
          />
        </div>

        <div>
          <Label htmlFor="dataPrevistaEntrega">Dt. Prevista Entrega *</Label>
          <Input
            id="dataPrevistaEntrega"
            type="date"
            value={formData.dataPrevistaEntrega}
            onChange={(e) => setFormData({ ...formData, dataPrevistaEntrega: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="dataEntrega">Dt. de Entrega</Label>
          <Input
            id="dataEntrega"
            type="date"
            value={formData.dataEntrega}
            onChange={(e) => {
              const dataPrevistaAnalise = calcularDataPrevistaAnalise(e.target.value);
              setFormData({ ...formData, dataEntrega: e.target.value, dataPrevistaAnalise: dataPrevistaAnalise || '' });
            }}
          />
        </div>

        <div>
          <Label htmlFor="dataPrevistaAnalise">Dt. Prevista p/Análise</Label>
          <Input
            id="dataPrevistaAnalise"
            type="date"
            value={formData.dataPrevistaAnalise}
            disabled
            title="Calculado automaticamente como Data de Entrega + 5 dias"
          />
        </div>

        <div>
          <Label htmlFor="dataAnalise">Data de Análise</Label>
          <Input
            id="dataAnalise"
            type="date"
            value={formData.dataAnalise}
            onChange={(e) => setFormData({ ...formData, dataAnalise: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="justificativa">Justificativa *</Label>
        <Textarea
          id="justificativa"
          value={formData.justificativa}
          onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
          placeholder="Descreva a justificativa da revisão"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">Registrar Revisão</Button>
    </form>
  );
}
