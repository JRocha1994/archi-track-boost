import { useEffect, useState, useMemo } from 'react';
import type { Empreendimento, Obra, Disciplina, Projetista, Revisao } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { calcularStatusEntrega, calcularStatusAnalise, calcularDataPrevistaAnalise } from '@/lib/statusCalculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, FileText, Layers, Users, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, Target, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IndicadoresPPR } from '@/components/indicadores/IndicadoresPPR';
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { MultiSelect, DatePickerWithRange, ActiveFilters } from "@/components/indicadores/Filters";

const COLORS = {
  'no-prazo': '#22c55e',
  'atrasado': '#ef4444',
  'pendente': '#f59e0b',
};

const STATUS_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export default function Indicadores() {
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [projetistas, setProjetistas] = useState<Projetista[]>([]);
  const [activeTab, setActiveTab] = useState("geral");

  // Estados dos Filtros
  const [selectedEmpreendimentos, setSelectedEmpreendimentos] = useState<string[]>([]);
  const [selectedProjetistas, setSelectedProjetistas] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const empreendimentoOptions = useMemo(() => empreendimentos.map(e => ({ label: e.nome, value: e.id })), [empreendimentos]);
  const projetistaOptions = useMemo(() => projetistas.map(e => ({ label: e.nome, value: e.id })), [projetistas]);

  const statusOptions = [
    { label: 'No Prazo', value: 'no-prazo' },
    { label: 'Pendente', value: 'pendente' },
    { label: 'Atrasado', value: 'atrasado' },
  ];

  const filteredRevisoes = useMemo(() => {
    return revisoes.filter(rev => {
      // Filtro Empreendimento
      if (selectedEmpreendimentos.length > 0 && !selectedEmpreendimentos.includes(rev.empreendimentoId)) return false;

      // Filtro Projetista
      if (selectedProjetistas.length > 0 && !selectedProjetistas.includes(rev.projetistaId)) return false;

      // Filtro Status
      if (selectedStatus.length > 0 && !selectedStatus.includes(rev.statusEntrega)) return false;

      // Filtro Período
      if (dateRange?.from) {
        const dateStr = rev.dataPrevistaEntrega || rev.createdAt;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        if (date < start || date > end) return false;
      }

      return true;
    });
  }, [revisoes, selectedEmpreendimentos, selectedProjetistas, selectedStatus, dateRange]);

  useEffect(() => {
    const fetchAll = async (table: string) => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
      return { data: allData, error: null };
    };

    const loadAll = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = session?.user;
        if (!user) {
          setEmpreendimentos([]);
          setObras([]);
          setDisciplinas([]);
          setProjetistas([]);
          setRevisoes([]);
          return;
        }

        const [empRes, obrasRes, discRes, projRes, revRes] = await Promise.all([
          fetchAll('empreendimentos'),
          fetchAll('obras'),
          fetchAll('disciplinas'),
          fetchAll('projetistas'),
          fetchAll('revisoes'),
        ]);

        if (empRes.error) throw empRes.error;
        if (obrasRes.error) throw obrasRes.error;
        if (discRes.error) throw discRes.error;
        if (projRes.error) throw projRes.error;
        if (revRes.error) throw revRes.error;

        const mappedEmp: Empreendimento[] = (empRes.data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          createdAt: item.created_at,
        }));

        const mappedObras: Obra[] = (obrasRes.data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          empreendimentoId: item.empreendimento_id,
          createdAt: item.created_at,
        }));

        const mappedDisc: Disciplina[] = (discRes.data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          createdAt: item.created_at,
        }));

        const mappedProj: Projetista[] = (projRes.data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          email: item.email || undefined,
          telefone: item.telefone || undefined,
          createdAt: item.created_at,
        }));

        const mappedRev: Revisao[] = (revRes.data || []).map((item: any) => {
          const dataPrevistaAnalise = item.data_prevista_analise || calcularDataPrevistaAnalise(item.data_entrega);

          return {
            id: item.id,
            empreendimentoId: item.empreendimento_id,
            obraId: item.obra_id,
            disciplinaId: item.disciplina_id,
            projetistaId: item.projetista_id,
            numeroRevisao: item.numero_revisao,
            dataPrevistaEntrega: item.data_prevista_entrega,
            dataEntrega: item.data_entrega || undefined,
            dataPrevistaAnalise: dataPrevistaAnalise || undefined,
            dataAnalise: item.data_analise || undefined,
            justificativa: item.justificativa,
            justificativaRevisao: item.justificativa_revisao,
            statusEntrega: calcularStatusEntrega(item.data_prevista_entrega, item.data_entrega),
            statusAnalise: calcularStatusAnalise(dataPrevistaAnalise, item.data_analise),
            createdAt: item.created_at,
          };
        });

        setEmpreendimentos(mappedEmp);
        setObras(mappedObras);
        setDisciplinas(mappedDisc);
        setProjetistas(mappedProj);
        setRevisoes(mappedRev);
      } catch (err) {
        console.error('Erro ao carregar dados dos indicadores:', err);
      }
    };

    loadAll();
  }, []);

  // Qtd de revisões por Empreendimento, Obra e Disciplina
  const revisoesPorEmpreendimento = empreendimentos.map(emp => ({
    nome: emp.nome,
    quantidade: filteredRevisoes.filter(r => r.empreendimentoId === emp.id).length,
  })).filter(item => item.quantidade > 0);

  const revisoesPorObra = obras.map(obra => ({
    nome: obra.nome,
    quantidade: filteredRevisoes.filter(r => r.obraId === obra.id).length,
  })).filter(item => item.quantidade > 0);

  const revisoesPorDisciplina = disciplinas.map(disc => ({
    nome: disc.nome,
    quantidade: filteredRevisoes.filter(r => r.disciplinaId === disc.id).length,
  })).filter(item => item.quantidade > 0);

  // Qtd de revisões por Projetista
  const revisoesPorProjetista = projetistas.map(proj => ({
    nome: proj.nome,
    quantidade: filteredRevisoes.filter(r => r.projetistaId === proj.id).length,
  })).filter(item => item.quantidade > 0);

  // Status de Entrega
  const statusEntrega = [
    { name: 'No Prazo', value: filteredRevisoes.filter(r => r.statusEntrega === 'no-prazo').length },
    { name: 'Atrasado', value: filteredRevisoes.filter(r => r.statusEntrega === 'atrasado').length },
    { name: 'Pendente', value: filteredRevisoes.filter(r => r.statusEntrega === 'pendente').length },
  ].filter(item => item.value > 0);

  // Status de Análise
  const statusAnalise = [
    { name: 'No Prazo', value: filteredRevisoes.filter(r => r.statusAnalise === 'no-prazo').length },
    { name: 'Atrasado', value: filteredRevisoes.filter(r => r.statusAnalise === 'atrasado').length },
    { name: 'Pendente', value: filteredRevisoes.filter(r => r.statusAnalise === 'pendente').length },
  ].filter(item => item.value > 0);

  // Revisões por Justificativa
  const justificativasCount = filteredRevisoes.reduce((acc, rev) => {
    const just = rev.justificativa || 'Sem justificativa';
    acc[just] = (acc[just] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const revisoesPorJustificativa = Object.entries(justificativasCount)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10); // Top 10 justificativas

  // Cards de resumo
  const totalRevisoes = filteredRevisoes.length;
  const entregasNoPrazo = filteredRevisoes.filter(r => r.statusEntrega === 'no-prazo').length;
  const analisesNoPrazo = filteredRevisoes.filter(r => r.statusAnalise === 'no-prazo').length;
  const percentualEntregaNoPrazo = totalRevisoes > 0 ? ((entregasNoPrazo / totalRevisoes) * 100).toFixed(1) : '0';
  const percentualAnaliseNoPrazo = totalRevisoes > 0 ? ((analisesNoPrazo / totalRevisoes) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Indicadores</h1>
        <p className="text-muted-foreground">
          Análise e métricas dos registros de revisões
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="geral" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="ppr" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                PPR 2025
              </TabsTrigger>
            </TabsList>

            {activeTab === 'geral' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <MultiSelect
                  title="Empreendimentos"
                  options={empreendimentoOptions}
                  selected={selectedEmpreendimentos}
                  onChange={setSelectedEmpreendimentos}
                />
                <MultiSelect
                  title="Projetistas"
                  options={projetistaOptions}
                  selected={selectedProjetistas}
                  onChange={setSelectedProjetistas}
                />
                <MultiSelect
                  title="Status de Entrega"
                  options={statusOptions}
                  selected={selectedStatus}
                  onChange={setSelectedStatus}
                />
                <DatePickerWithRange
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>
            )}
          </div>

          {activeTab === 'geral' && (
            <ActiveFilters
              filters={{
                empreendimentos: selectedEmpreendimentos,
                projetistas: selectedProjetistas,
                status: selectedStatus,
                periodo: dateRange
              }}
              options={{
                empreendimentos: empreendimentoOptions,
                projetistas: projetistaOptions,
                status: statusOptions
              }}
              onRemove={(type, value) => {
                if (type === 'empreendimentos' && value) {
                  setSelectedEmpreendimentos(prev => prev.filter(id => id !== value));
                } else if (type === 'projetistas' && value) {
                  setSelectedProjetistas(prev => prev.filter(id => id !== value));
                } else if (type === 'status' && value) {
                  setSelectedStatus(prev => prev.filter(id => id !== value));
                } else if (type === 'periodo') {
                  setDateRange(undefined);
                }
              }}
              onClearAll={() => {
                setSelectedEmpreendimentos([]);
                setSelectedProjetistas([]);
                setSelectedStatus([]);
                setDateRange(undefined);
              }}
            />
          )}
        </div>

        {/* Aba Geral - Indicadores existentes */}
        <TabsContent value="geral" className="space-y-6">

          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Revisões</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRevisoes}</div>
                <p className="text-xs text-muted-foreground">Registros no sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregas no Prazo</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{percentualEntregaNoPrazo}%</div>
                <p className="text-xs text-muted-foreground">{entregasNoPrazo} de {totalRevisoes} revisões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Análises no Prazo</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{percentualAnaliseNoPrazo}%</div>
                <p className="text-xs text-muted-foreground">{analisesNoPrazo} de {totalRevisoes} revisões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projetistas Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{revisoesPorProjetista.length}</div>
                <p className="text-xs text-muted-foreground">Com revisões registradas</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status de Entrega</CardTitle>
                <CardDescription>Distribuição das entregas por status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusEntrega}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusEntrega.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status de Análise</CardTitle>
                <CardDescription>Distribuição das análises por status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusAnalise}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusAnalise.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revisões por Empreendimento */}
          {revisoesPorEmpreendimento.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Revisões por Empreendimento
                </CardTitle>
                <CardDescription>Quantidade de revisões registradas por empreendimento</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revisoesPorEmpreendimento}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#3b82f6" name="Revisões" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revisões por Obra */}
          {revisoesPorObra.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Revisões por Obra
                </CardTitle>
                <CardDescription>Quantidade de revisões registradas por obra</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revisoesPorObra}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#8b5cf6" name="Revisões" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revisões por Disciplina */}
          {revisoesPorDisciplina.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Revisões por Disciplina
                </CardTitle>
                <CardDescription>Quantidade de revisões registradas por disciplina</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revisoesPorDisciplina}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#10b981" name="Revisões" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revisões por Projetista */}
          {revisoesPorProjetista.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Revisões por Projetista
                </CardTitle>
                <CardDescription>Quantidade de revisões registradas por projetista</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revisoesPorProjetista}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#f59e0b" name="Revisões" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revisões por Justificativa */}
          {revisoesPorJustificativa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top 10 Justificativas
                </CardTitle>
                <CardDescription>Justificativas mais frequentes nas revisões</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revisoesPorJustificativa} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nome" type="category" width={200} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#ec4899" name="Revisões" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba PPR - Indicador de Metas */}
        <TabsContent value="ppr">
          <IndicadoresPPR />
        </TabsContent>
      </Tabs>
    </div>
  );
}
