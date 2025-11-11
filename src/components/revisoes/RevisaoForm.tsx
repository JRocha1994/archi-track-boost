import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise } from '@/lib/statusCalculator';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';

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
    dataEntrega: '',
    dataEnvio: '',
    dataAnalise: '',
    justificativa: '',
  });
  const { toast } = useToast();

  const obrasFiltered = obras.filter(o => o.empreendimentoId === formData.empreendimentoId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.empreendimentoId || !formData.obraId || !formData.disciplinaId || 
        !formData.projetistaId || !formData.numeroRevisao || !formData.dataEntrega || !formData.justificativa) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const statusEntrega = calcularStatusEntrega(formData.dataEntrega, formData.dataEnvio || undefined);
    const statusAnalise = calcularStatusAnalise(formData.dataEnvio || undefined, formData.dataAnalise || undefined);

    const newRevisao: Revisao = {
      id: crypto.randomUUID(),
      ...formData,
      dataEnvio: formData.dataEnvio || undefined,
      dataAnalise: formData.dataAnalise || undefined,
      statusEntrega,
      statusAnalise,
      createdAt: new Date().toISOString(),
    };

    setRevisoes([...revisoes, newRevisao]);
    toast({ title: 'Revisão registrada com sucesso' });
    
    setFormData({
      empreendimentoId: formData.empreendimentoId,
      obraId: formData.obraId,
      disciplinaId: formData.disciplinaId,
      projetistaId: formData.projetistaId,
      numeroRevisao: '',
      dataEntrega: '',
      dataEnvio: '',
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
            value={formData.numeroRevisao}
            onChange={(e) => setFormData({ ...formData, numeroRevisao: e.target.value })}
            placeholder="Ex: R01, R02"
          />
        </div>

        <div>
          <Label htmlFor="dataEntrega">Data de Entrega *</Label>
          <Input
            id="dataEntrega"
            type="date"
            value={formData.dataEntrega}
            onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="dataEnvio">Data de Envio</Label>
          <Input
            id="dataEnvio"
            type="date"
            value={formData.dataEnvio}
            onChange={(e) => setFormData({ ...formData, dataEnvio: e.target.value })}
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
