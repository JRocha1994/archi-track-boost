import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Trash2, Save, Copy, Edit, X, Maximize2, Minimize2, FilterX, Download, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise, calcularDataPrevistaAnalise } from '@/lib/statusCalculator';
import { ColumnFilter } from './ColumnFilter';
import { StatusMultiSelect } from './StatusMultiSelect';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista, StatusEntrega, StatusAnalise } from '@/types';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  // Estados de filtros
  const [filters, setFilters] = useState<{
    empreendimento: string[];
    obra: string[];
    disciplina: string[];
    projetista: string[];
    numeroRevisao: string[];
    statusEntrega: StatusEntrega[];
    statusAnalise: StatusAnalise[];
    dataPrevistaEntrega: { start?: string; end?: string };
    dataEntrega: { start?: string; end?: string };
    dataPrevistaAnalise: { start?: string; end?: string };
    dataAnalise: { start?: string; end?: string };
  }>({
    empreendimento: [],
    obra: [],
    disciplina: [],
    projetista: [],
    numeroRevisao: [],
    statusEntrega: [],
    statusAnalise: [],
    dataPrevistaEntrega: {},
    dataEntrega: {},
    dataPrevistaAnalise: {},
    dataAnalise: {},
  });

  const getNome = (id: string, list: any[]) => list.find(item => item.id === id)?.nome || '';

  // Valores únicos para filtros
  const uniqueValues = useMemo(() => ({
    empreendimento: [...new Set(revisoes.map(r => getNome(r.empreendimentoId, empreendimentos)))].filter(Boolean),
    obra: [...new Set(revisoes.map(r => getNome(r.obraId, obras)))].filter(Boolean),
    disciplina: [...new Set(revisoes.map(r => getNome(r.disciplinaId, disciplinas)))].filter(Boolean),
    projetista: [...new Set(revisoes.map(r => getNome(r.projetistaId, projetistas)))].filter(Boolean),
    numeroRevisao: [...new Set(revisoes.map(r => String(r.numeroRevisao)))].sort((a, b) => Number(a) - Number(b)),
  }), [revisoes, empreendimentos, obras, disciplinas, projetistas]);

  // Aplicar filtros
  const filteredRevisoes = useMemo(() => {
    return revisoes.filter(revisao => {
      // Filtro de empreendimento
      if (filters.empreendimento.length > 0 && !filters.empreendimento.includes(getNome(revisao.empreendimentoId, empreendimentos))) {
        return false;
      }

      // Filtro de obra
      if (filters.obra.length > 0 && !filters.obra.includes(getNome(revisao.obraId, obras))) {
        return false;
      }

      // Filtro de disciplina
      if (filters.disciplina.length > 0 && !filters.disciplina.includes(getNome(revisao.disciplinaId, disciplinas))) {
        return false;
      }

      // Filtro de projetista
      if (filters.projetista.length > 0 && !filters.projetista.includes(getNome(revisao.projetistaId, projetistas))) {
        return false;
      }

      // Filtro de número de revisão
      if (filters.numeroRevisao.length > 0 && !filters.numeroRevisao.includes(String(revisao.numeroRevisao))) {
        return false;
      }

      // Filtro de status entrega
      if (filters.statusEntrega.length > 0 && !filters.statusEntrega.includes(revisao.statusEntrega)) {
        return false;
      }

      // Filtro de status análise
      if (filters.statusAnalise.length > 0 && !filters.statusAnalise.includes(revisao.statusAnalise)) {
        return false;
      }

      // Filtro de data prevista entrega
      if (filters.dataPrevistaEntrega.start && revisao.dataPrevistaEntrega < filters.dataPrevistaEntrega.start) {
        return false;
      }
      if (filters.dataPrevistaEntrega.end && revisao.dataPrevistaEntrega > filters.dataPrevistaEntrega.end) {
        return false;
      }

      // Filtro de data entrega
      if (filters.dataEntrega.start && revisao.dataEntrega && revisao.dataEntrega < filters.dataEntrega.start) {
        return false;
      }
      if (filters.dataEntrega.end && revisao.dataEntrega && revisao.dataEntrega > filters.dataEntrega.end) {
        return false;
      }

      // Filtro de data prevista análise
      if (filters.dataPrevistaAnalise.start && revisao.dataPrevistaAnalise && revisao.dataPrevistaAnalise < filters.dataPrevistaAnalise.start) {
        return false;
      }
      if (filters.dataPrevistaAnalise.end && revisao.dataPrevistaAnalise && revisao.dataPrevistaAnalise > filters.dataPrevistaAnalise.end) {
        return false;
      }

      // Filtro de data análise
      if (filters.dataAnalise.start && revisao.dataAnalise && revisao.dataAnalise < filters.dataAnalise.start) {
        return false;
      }
      if (filters.dataAnalise.end && revisao.dataAnalise && revisao.dataAnalise > filters.dataAnalise.end) {
        return false;
      }

      return true;
    });
  }, [revisoes, filters, empreendimentos, obras, disciplinas, projetistas]);

  const hasActiveFilters = useMemo(() => {
    return filters.empreendimento.length > 0 ||
      filters.obra.length > 0 ||
      filters.disciplina.length > 0 ||
      filters.projetista.length > 0 ||
      filters.numeroRevisao.length > 0 ||
      filters.statusEntrega.length > 0 ||
      filters.statusAnalise.length > 0 ||
      !!filters.dataPrevistaEntrega.start || !!filters.dataPrevistaEntrega.end ||
      !!filters.dataEntrega.start || !!filters.dataEntrega.end ||
      !!filters.dataPrevistaAnalise.start || !!filters.dataPrevistaAnalise.end ||
      !!filters.dataAnalise.start || !!filters.dataAnalise.end;
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({
      empreendimento: [],
      obra: [],
      disciplina: [],
      projetista: [],
      numeroRevisao: [],
      statusEntrega: [],
      statusAnalise: [],
      dataPrevistaEntrega: {},
      dataEntrega: {},
      dataPrevistaAnalise: {},
      dataAnalise: {},
    });
    toast({ title: 'Filtros limpos' });
  };

  const handleAddRow = () => {
    setNewRow({
      empreendimentoId: '',
      obraId: '',
      disciplinaId: '',
      projetistaId: '',
      numeroRevisao: 0,
      dataPrevistaEntrega: '',
      dataEntrega: '',
      dataPrevistaAnalise: '',
      dataAnalise: '',
      justificativa: '',
    });
  };

  const handleSaveNew = async () => {
    if (!newRow?.empreendimentoId || !newRow?.obraId || !newRow?.disciplinaId || 
        !newRow?.projetistaId || newRow?.numeroRevisao === undefined || newRow?.numeroRevisao === null || 
        !newRow?.dataPrevistaEntrega || !newRow?.justificativa) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const dataPrevistaAnalise = calcularDataPrevistaAnalise(newRow.dataEntrega);
    const statusEntrega = calcularStatusEntrega(newRow.dataPrevistaEntrega!, newRow.dataEntrega);
    const statusAnalise = calcularStatusAnalise(dataPrevistaAnalise, newRow.dataAnalise);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('revisoes')
        .insert({
          empreendimento_id: newRow.empreendimentoId!,
          obra_id: newRow.obraId!,
          disciplina_id: newRow.disciplinaId!,
          projetista_id: newRow.projetistaId!,
          numero_revisao: Number(newRow.numeroRevisao!),
          data_prevista_entrega: newRow.dataPrevistaEntrega!,
          data_entrega: newRow.dataEntrega || null,
          data_prevista_analise: dataPrevistaAnalise || null,
          data_analise: newRow.dataAnalise || null,
          justificativa: newRow.justificativa!,
          status_entrega: statusEntrega,
          status_analise: statusAnalise,
          user_id: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      const revisao: Revisao = {
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

      setRevisoes([...revisoes, revisao]);
      setNewRow(null);
      toast({ title: 'Revisão adicionada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao salvar revisão:', error);
      toast({
        title: 'Erro ao salvar revisão',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('revisoes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRevisoes(revisoes.filter(r => r.id !== id));
      toast({ title: 'Revisão excluída' });
    } catch (error: any) {
      console.error('Erro ao excluir revisão:', error);
      toast({
        title: 'Erro ao excluir revisão',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (revisao: Revisao) => {
    setEditingRows({
      ...editingRows,
      [revisao.id]: { ...revisao }
    });
  };

  const handleCancelEdit = (id: string) => {
    const newEditingRows = { ...editingRows };
    delete newEditingRows[id];
    setEditingRows(newEditingRows);
  };

  const handleSaveEdit = async (id: string) => {
    const editedRevisao = editingRows[id];
    if (!editedRevisao) return;

    const dataPrevistaAnalise = calcularDataPrevistaAnalise(editedRevisao.dataEntrega);
    const statusEntrega = calcularStatusEntrega(
      editedRevisao.dataPrevistaEntrega!,
      editedRevisao.dataEntrega
    );
    const statusAnalise = calcularStatusAnalise(
      dataPrevistaAnalise,
      editedRevisao.dataAnalise
    );

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('revisoes')
        .update({
          empreendimento_id: editedRevisao.empreendimentoId!,
          obra_id: editedRevisao.obraId!,
          disciplina_id: editedRevisao.disciplinaId!,
          projetista_id: editedRevisao.projetistaId!,
          numero_revisao: Number(editedRevisao.numeroRevisao),
          data_prevista_entrega: editedRevisao.dataPrevistaEntrega!,
          data_entrega: editedRevisao.dataEntrega || null,
          data_prevista_analise: dataPrevistaAnalise || null,
          data_analise: editedRevisao.dataAnalise || null,
          justificativa: editedRevisao.justificativa!,
          status_entrega: statusEntrega,
          status_analise: statusAnalise,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedRevisao: Revisao = {
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

      const updatedRevisoes = revisoes.map(r => r.id === id ? updatedRevisao : r);
      setRevisoes(updatedRevisoes);
      handleCancelEdit(id);
      toast({ title: 'Revisão atualizada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao atualizar revisão:', error);
      toast({
        title: 'Erro ao atualizar revisão',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = (revisao: Revisao) => {
    // Encontrar todas as revisões do mesmo projeto/obra/disciplina/projetista
    const revisoesRelacionadas = revisoes.filter(
      r => r.empreendimentoId === revisao.empreendimentoId &&
           r.obraId === revisao.obraId &&
           r.disciplinaId === revisao.disciplinaId &&
           r.projetistaId === revisao.projetistaId
    );

    // Extrair números das revisões e encontrar o maior
    const numerosRevisao = revisoesRelacionadas.map(r => r.numeroRevisao);
    const maiorNumero = Math.max(...numerosRevisao, 0);
    const novoNumero = maiorNumero + 1;

    setNewRow({
      empreendimentoId: revisao.empreendimentoId,
      obraId: revisao.obraId,
      disciplinaId: revisao.disciplinaId,
      projetistaId: revisao.projetistaId,
      numeroRevisao: novoNumero,
      dataPrevistaEntrega: '',
      dataEntrega: '',
      dataPrevistaAnalise: '',
      dataAnalise: '',
      justificativa: '',
    });

    toast({ title: 'Nova revisão criada a partir da anterior' });
  };

  const obrasFiltered = (empId: string) => obras.filter(o => o.empreendimentoId === empId);

  const handleExportXLSX = () => {
    const rows = filteredRevisoes.map((r) => ({
      Empreendimento: getNome(r.empreendimentoId, empreendimentos),
      Obra: getNome(r.obraId, obras),
      Disciplina: getNome(r.disciplinaId, disciplinas),
      Projetista: getNome(r.projetistaId, projetistas),
      'Número da Revisão': r.numeroRevisao,
      'Dt. Prevista Entrega': r.dataPrevistaEntrega,
      'Dt. de Entrega': r.dataEntrega || '',
      'Data de Análise': r.dataAnalise || '',
      Justificativa: r.justificativa,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revisoes');
    XLSX.writeFile(wb, 'revisoes_export.xlsx');
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-6 overflow-auto" : "space-y-4"}>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredRevisoes.length} de {revisoes.length} revisão(ões)
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportXLSX} 
            size="sm" 
            variant="outline"
            title="Exportar registros para XLSX"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
          <Button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            size="sm" 
            variant="outline"
            title={isFullscreen ? "Sair da tela cheia" : "Expandir tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
            {isFullscreen ? "Minimizar" : "Tela Cheia"}
          </Button>
          <Button onClick={handleAddRow} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Linha
          </Button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap items-center">
          {/* Filtro rápido de Empreendimentos */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Empreendimentos:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Selecionar
                  {filters.empreendimento.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {filters.empreendimento.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Filtrar por Empreendimento</h4>
                  <div className="max-h-52 overflow-auto space-y-2 pr-1">
                    {uniqueValues.empreendimento.map((nome) => {
                      const checked = filters.empreendimento.includes(nome);
                      return (
                        <div key={nome} className="flex items-center space-x-2">
                          <Checkbox
                            id={`emp-${nome}`}
                            checked={checked}
                            onCheckedChange={() => {
                              setFilters({
                                ...filters,
                                empreendimento: checked
                                  ? filters.empreendimento.filter((n) => n !== nome)
                                  : [...filters.empreendimento, nome],
                              });
                            }}
                          />
                          <Label htmlFor={`emp-${nome}`} className="text-sm font-normal cursor-pointer flex-1">
                            {nome}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {filters.empreendimento.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {filters.empreendimento.map((nome) => (
                  <div key={nome} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                    <span>{nome}</span>
                    <button
                      onClick={() => setFilters({
                        ...filters,
                        empreendimento: filters.empreendimento.filter(n => n !== nome)
                      })}
                      className="ml-1 hover:bg-muted rounded-sm p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <StatusMultiSelect
            label="Status Entrega"
            type="entrega"
            selectedValues={filters.statusEntrega}
            onSelectionChange={(values) => setFilters({ ...filters, statusEntrega: values as StatusEntrega[] })}
          />
          <StatusMultiSelect
            label="Status Análise"
            type="analise"
            selectedValues={filters.statusAnalise}
            onSelectionChange={(values) => setFilters({ ...filters, statusAnalise: values as StatusAnalise[] })}
          />
        </div>
        <Button 
          onClick={clearAllFilters} 
          size="sm" 
          variant="outline"
          disabled={!hasActiveFilters}
        >
          <FilterX className="mr-2 h-4 w-4" />
          Limpar Filtros
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">
                <div className="flex items-center gap-1">
                  Empreendimento
                  <ColumnFilter
                    column="Empreendimento"
                    values={uniqueValues.empreendimento}
                    selectedValues={filters.empreendimento}
                    onFilterChange={(values) => setFilters({ ...filters, empreendimento: values })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <div className="flex items-center gap-1">
                  Obra
                  <ColumnFilter
                    column="Obra"
                    values={uniqueValues.obra}
                    selectedValues={filters.obra}
                    onFilterChange={(values) => setFilters({ ...filters, obra: values })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <div className="flex items-center gap-1">
                  Disciplina
                  <ColumnFilter
                    column="Disciplina"
                    values={uniqueValues.disciplina}
                    selectedValues={filters.disciplina}
                    onFilterChange={(values) => setFilters({ ...filters, disciplina: values })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <div className="flex items-center gap-1">
                  Projetista
                  <ColumnFilter
                    column="Projetista"
                    values={uniqueValues.projetista}
                    selectedValues={filters.projetista}
                    onFilterChange={(values) => setFilters({ ...filters, projetista: values })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[100px]">
                <div className="flex items-center gap-1">
                  Revisão
                  <ColumnFilter
                    column="Revisão"
                    values={uniqueValues.numeroRevisao}
                    selectedValues={filters.numeroRevisao}
                    onFilterChange={(values) => setFilters({ ...filters, numeroRevisao: values })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[150px]">
                <div className="flex items-center gap-1">
                  Dt. Prevista Entrega
                  <ColumnFilter
                    column="Dt. Prevista Entrega"
                    values={[]}
                    selectedValues={[]}
                    onFilterChange={() => {}}
                    type="date"
                    dateRange={filters.dataPrevistaEntrega}
                    onDateRangeChange={(range) => setFilters({ ...filters, dataPrevistaEntrega: range })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[130px]">
                <div className="flex items-center gap-1">
                  Dt. de Entrega
                  <ColumnFilter
                    column="Dt. de Entrega"
                    values={[]}
                    selectedValues={[]}
                    onFilterChange={() => {}}
                    type="date"
                    dateRange={filters.dataEntrega}
                    onDateRangeChange={(range) => setFilters({ ...filters, dataEntrega: range })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[160px]">
                <div className="flex items-center gap-1">
                  Dt. Prevista p/Análise
                  <ColumnFilter
                    column="Dt. Prevista p/Análise"
                    values={[]}
                    selectedValues={[]}
                    onFilterChange={() => {}}
                    type="date"
                    dateRange={filters.dataPrevistaAnalise}
                    onDateRangeChange={(range) => setFilters({ ...filters, dataPrevistaAnalise: range })}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-[130px]">
                <div className="flex items-center gap-1">
                  Data Análise
                  <ColumnFilter
                    column="Data Análise"
                    values={[]}
                    selectedValues={[]}
                    onFilterChange={() => {}}
                    type="date"
                    dateRange={filters.dataAnalise}
                    onDateRangeChange={(range) => setFilters({ ...filters, dataAnalise: range })}
                  />
                </div>
              </TableHead>
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
                    type="number"
                    className="h-8"
                    value={newRow.numeroRevisao ?? ''}
                    onChange={(e) => setNewRow({ ...newRow, numeroRevisao: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    min="0"
                    step="1"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataPrevistaEntrega || ''}
                    onChange={(e) => setNewRow({ ...newRow, dataPrevistaEntrega: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataEntrega || ''}
                    onChange={(e) => {
                      const dataPrevistaAnalise = calcularDataPrevistaAnalise(e.target.value);
                      setNewRow({ ...newRow, dataEntrega: e.target.value, dataPrevistaAnalise });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8"
                    value={newRow.dataPrevistaAnalise || ''}
                    disabled
                    title="Calculado automaticamente como Data de Entrega + 5 dias"
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
            
            {filteredRevisoes.map((revisao) => {
              const isEditing = editingRows[revisao.id];
              const editData = isEditing || revisao;

              return (
                <TableRow key={revisao.id}>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editData.empreendimentoId}
                        onValueChange={(value) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, empreendimentoId: value, obraId: '' }
                        })}
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
                    ) : (
                      getNome(revisao.empreendimentoId, empreendimentos)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editData.obraId}
                        onValueChange={(value) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, obraId: value }
                        })}
                        disabled={!editData.empreendimentoId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {obrasFiltered(editData.empreendimentoId || '').map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      getNome(revisao.obraId, obras)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editData.disciplinaId}
                        onValueChange={(value) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, disciplinaId: value }
                        })}
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
                    ) : (
                      getNome(revisao.disciplinaId, disciplinas)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editData.projetistaId}
                        onValueChange={(value) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, projetistaId: value }
                        })}
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
                    ) : (
                      getNome(revisao.projetistaId, projetistas)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-8"
                        value={editData.numeroRevisao ?? ''}
                        onChange={(e) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, numeroRevisao: e.target.value === '' ? 0 : parseInt(e.target.value) }
                        })}
                        min="0"
                        step="1"
                      />
                    ) : (
                      revisao.numeroRevisao
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        className="h-8"
                        value={editData.dataPrevistaEntrega || ''}
                        onChange={(e) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, dataPrevistaEntrega: e.target.value }
                        })}
                      />
                    ) : (
                      new Date(revisao.dataPrevistaEntrega).toLocaleDateString('pt-BR')
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        className="h-8"
                        value={editData.dataEntrega || ''}
                        onChange={(e) => {
                          const dataPrevistaAnalise = calcularDataPrevistaAnalise(e.target.value);
                          setEditingRows({
                            ...editingRows,
                            [revisao.id]: { ...editData, dataEntrega: e.target.value, dataPrevistaAnalise }
                          });
                        }}
                      />
                    ) : (
                      <Input
                        type="date"
                        className="h-8"
                        value={revisao.dataEntrega || ''}
                        onChange={(e) => {
                          const dataPrevistaAnalise = calcularDataPrevistaAnalise(e.target.value);
                          const statusEntrega = calcularStatusEntrega(revisao.dataPrevistaEntrega, e.target.value);
                          const statusAnalise = calcularStatusAnalise(dataPrevistaAnalise, revisao.dataAnalise);
                          const updatedRevisoes = revisoes.map(r => 
                            r.id === revisao.id 
                              ? { ...r, dataEntrega: e.target.value, dataPrevistaAnalise, statusEntrega, statusAnalise } 
                              : r
                          );
                          setRevisoes(updatedRevisoes);
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="h-8"
                      value={isEditing ? editData.dataPrevistaAnalise || '' : revisao.dataPrevistaAnalise || ''}
                      disabled
                      title="Calculado automaticamente como Data de Entrega + 5 dias"
                    />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        className="h-8"
                        value={editData.dataAnalise || ''}
                        onChange={(e) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, dataAnalise: e.target.value }
                        })}
                      />
                    ) : (
                      <Input
                        type="date"
                        className="h-8"
                        value={revisao.dataAnalise || ''}
                        onChange={(e) => {
                          const statusAnalise = calcularStatusAnalise(revisao.dataPrevistaAnalise, e.target.value);
                          const updatedRevisoes = revisoes.map(r => 
                            r.id === revisao.id 
                              ? { ...r, dataAnalise: e.target.value, statusAnalise } 
                              : r
                          );
                          setRevisoes(updatedRevisoes);
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={revisao.statusEntrega} type="entrega" /></TableCell>
                  <TableCell><StatusBadge status={revisao.statusAnalise} type="analise" /></TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-8"
                        value={editData.justificativa || ''}
                        onChange={(e) => setEditingRows({
                          ...editingRows,
                          [revisao.id]: { ...editData, justificativa: e.target.value }
                        })}
                      />
                    ) : (
                      <span className="max-w-xs truncate block">{revisao.justificativa}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8" 
                            onClick={() => handleSaveEdit(revisao.id)}
                            title="Salvar edição"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8" 
                            onClick={() => handleCancelEdit(revisao.id)}
                            title="Cancelar edição"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8" 
                            onClick={() => handleEdit(revisao)}
                            title="Editar revisão"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8" 
                            onClick={() => handleDuplicate(revisao)}
                            title="Duplicar revisão"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8" 
                            onClick={() => handleDelete(revisao.id)}
                            title="Excluir revisão"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
