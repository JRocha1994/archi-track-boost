import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise } from '@/lib/statusCalculator';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';

interface RevisoesTableProps {
  revisoes: Revisao[];
  setRevisoes: (revisoes: Revisao[]) => void;
  empreendimentos: Empreendimento[];
  obras: Obra[];
  disciplinas: Disciplina[];
  projetistas: Projetista[];
}

export function RevisoesTable({
  revisoes,
  setRevisoes,
  empreendimentos,
  obras,
  disciplinas,
  projetistas,
}: RevisoesTableProps) {
  const [editingRows, setEditingRows] = useState<Record<string, Partial<Revisao>>>({});
  const [newRow, setNewRow] = useState<Partial<Revisao> | null>(null);
  const { toast } = useToast();

  const getNome = (id: string, list: any[]) => list.find(item => item.id === id)?.nome || '';

  const handleAddRow = () => {
    setNewRow({
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
  };

  const handleSaveNew = () => {
    if (!newRow?.empreendimentoId || !newRow?.obraId || !newRow?.disciplinaId || 
        !newRow?.projetistaId || !newRow?.numeroRevisao || !newRow?.dataEntrega || !newRow?.justificativa) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const statusEntrega = calcularStatusEntrega(newRow.dataEntrega!, newRow.dataEnvio);
    const statusAnalise = calcularStatusAnalise(newRow.dataEnvio, newRow.dataAnalise);

    const revisao: Revisao = {
      id: crypto.randomUUID(),
      empreendimentoId: newRow.empreendimentoId!,
      obraId: newRow.obraId!,
      disciplinaId: newRow.disciplinaId!,
      projetistaId: newRow.projetistaId!,
      numeroRevisao: newRow.numeroRevisao!,
      dataEntrega: newRow.dataEntrega!,
      dataEnvio: newRow.dataEnvio,
      dataAnalise: newRow.dataAnalise,
      justificativa: newRow.justificativa!,
      statusEntrega,
      statusAnalise,
      createdAt: new Date().toISOString(),
    };

    setRevisoes([...revisoes, revisao]);
    setNewRow(null);
    toast({ title: 'Revisão adicionada com sucesso' });
  };

  const handleDelete = (id: string) => {
    setRevisoes(revisoes.filter(r => r.id !== id));
    toast({ title: 'Revisão excluída' });
  };

  const obrasFiltered = (empId: string) => obras.filter(o => o.empreendimentoId === empId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {revisoes.length} revisão(ões) registrada(s)
        </p>
        <Button onClick={handleAddRow} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Linha
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Empreendimento</TableHead>
              <TableHead className="min-w-[120px]">Obra</TableHead>
              <TableHead className="min-w-[120px]">Disciplina</TableHead>
              <TableHead className="min-w-[120px]">Projetista</TableHead>
              <TableHead className="min-w-[100px]">Revisão</TableHead>
              <TableHead className="min-w-[130px]">Data Entrega</TableHead>
              <TableHead className="min-w-[130px]">Data Envio</TableHead>
              <TableHead className="min-w-[130px]">Data Análise</TableHead>
              <TableHead className="min-w-[150px]">Status Entrega</TableHead>
              <TableHead className="min-w-[150px]">Status Análise</TableHead>
              <TableHead className="min-w-[200px]">Justificativa</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newRow && (
              <TableRow>
                <TableCell>
                  <Select
                    value={newRow.empreendimentoId}
                    onValueChange={(value) => setNewRow({ ...newRow, empreendimentoId: value, obraId: '' })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {empreendimentos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={newRow.obraId}
                    onValueChange={(value) => setNewRow({ ...newRow, obraId: value })}
                    disabled={!newRow.empreendimentoId}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {obrasFiltered(newRow.empreendimentoId || '').map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={newRow.disciplinaId}
                    onValueChange={(value) => setNewRow({ ...newRow, disciplinaId: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinas.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={newRow.projetistaId}
                    onValueChange={(value) => setNewRow({ ...newRow, projetistaId: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projetistas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8"
                    value={newRow.numeroRevisao || ''}
                    onChange={(e) => setNewRow({ ...newRow, numeroRevisao: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataEntrega || ''}
                    onChange={(e) => setNewRow({ ...newRow, dataEntrega: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataEnvio || ''}
                    onChange={(e) => setNewRow({ ...newRow, dataEnvio: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataAnalise || ''}
                    onChange={(e) => setNewRow({ ...newRow, dataAnalise: e.target.value })}
                  />
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Input
                    className="h-8"
                    value={newRow.justificativa || ''}
                    onChange={(e) => setNewRow({ ...newRow, justificativa: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveNew}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setNewRow(null)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {revisoes.map((revisao) => (
              <TableRow key={revisao.id}>
                <TableCell>{getNome(revisao.empreendimentoId, empreendimentos)}</TableCell>
                <TableCell>{getNome(revisao.obraId, obras)}</TableCell>
                <TableCell>{getNome(revisao.disciplinaId, disciplinas)}</TableCell>
                <TableCell>{getNome(revisao.projetistaId, projetistas)}</TableCell>
                <TableCell>{revisao.numeroRevisao}</TableCell>
                <TableCell>{new Date(revisao.dataEntrega).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{revisao.dataEnvio ? new Date(revisao.dataEnvio).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell>{revisao.dataAnalise ? new Date(revisao.dataAnalise).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell><StatusBadge status={revisao.statusEntrega} type="entrega" /></TableCell>
                <TableCell><StatusBadge status={revisao.statusAnalise} type="analise" /></TableCell>
                <TableCell className="max-w-xs truncate">{revisao.justificativa}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(revisao.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
