import { useState, useEffect } from 'react';
import type { Empreendimento } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const META_PPR = 95; // Meta de 95%
const TETO_PPR = 100; // Teto de 100%

// Cores para o gauge
const GAUGE_COLORS = {
    achieved: '#1e3a5f', // Azul escuro para valor atingido
    remaining: '#e5e7eb', // Cinza claro para restante
};

// Componente de Gauge Chart customizado
function GaugeChart({ value, meta, teto }: { value: number; meta: number; teto: number }) {
    const normalizedValue = Math.min(value, teto);
    const data = [
        { name: 'Atingido', value: normalizedValue },
        { name: 'Restante', value: teto - normalizedValue },
    ];

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="75%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={0}
                        dataKey="value"
                    >
                        <Cell fill={GAUGE_COLORS.achieved} />
                        <Cell fill={GAUGE_COLORS.remaining} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Valor central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '30%' }}>
                <span className="text-4xl font-bold">{value.toFixed(2)}%</span>
            </div>

            {/* Marcadores de escala */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-between px-8 text-xs text-muted-foreground">
                <span>0.00%</span>
                <span className="text-green-600 font-medium">{meta.toFixed(2)}%</span>
                <span>{teto.toFixed(2)}%</span>
            </div>
        </div>
    );
}

interface DadosPPR {
    totalPrevisto: number;
    totalEntregue: number;
    percentualGeral: number;
    cumprimentoMeta: number;
    porEmpreendimento: {
        nome: string;
        totalProjetos: number;
        projetosEntregues: number;
        percentualEntregue: number;
    }[];
}

// Função auxiliar para extrair apenas YYYY-MM-DD de uma data
const extrairData = (data: string | null | undefined): string | null => {
    if (!data) return null;
    // Pega apenas os primeiros 10 caracteres (YYYY-MM-DD)
    return data.substring(0, 10);
};

// Verificar se uma data está entre 01/01/2025 e 31/12/2025
const estaEm2025 = (data: string | null | undefined): boolean => {
    const dataFormatada = extrairData(data);
    if (!dataFormatada) return false;
    return dataFormatada >= '2025-01-01' && dataFormatada <= '2025-12-31';
};

export function IndicadoresPPR() {
    const [loading, setLoading] = useState(true);
    const [dadosPPR, setDadosPPR] = useState<DadosPPR>({
        totalPrevisto: 0,
        totalEntregue: 0,
        percentualGeral: 0,
        cumprimentoMeta: 0,
        porEmpreendimento: [],
    });

    useEffect(() => {
        const carregarDados = async () => {
            try {
                setLoading(true);

                // Carregar empreendimentos
                const { data: empreendimentosData, error: empError } = await supabase
                    .from('empreendimentos')
                    .select('id, nome');

                if (empError) throw empError;

                // Carregar TODAS as revisões com paginação (Supabase tem limite de 1000 por query)
                let todasRevisoes: any[] = [];
                let page = 0;
                const pageSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data: batch, error: revError } = await supabase
                        .from('revisoes')
                        .select('id, empreendimento_id, data_prevista_entrega, data_entrega')
                        .range(page * pageSize, (page + 1) * pageSize - 1);

                    if (revError) throw revError;

                    if (batch && batch.length > 0) {
                        todasRevisoes = [...todasRevisoes, ...batch];
                        page++;
                        hasMore = batch.length === pageSize;
                    } else {
                        hasMore = false;
                    }
                }

                console.log('=== DEBUG PPR ===');
                console.log('Total de empreendimentos:', empreendimentosData?.length);
                console.log('Total de revisões carregadas:', todasRevisoes.length);

                // Exemplo de formato de data vindo do banco
                if (todasRevisoes.length > 0) {
                    console.log('Exemplo de revisão:', todasRevisoes[0]);
                }

                // Filtrar apenas empreendimentos permitidos
                const EMPREENDIMENTOS_PERMITIDOS = [
                    'HAMOA SORRISO',
                    'HAMOA JATAI',
                    'HAMOA UBERLÂNDIA',
                    'AQUARELA DA MATA'
                ];

                const empreendimentosFiltrados = (empreendimentosData || []).filter(emp =>
                    EMPREENDIMENTOS_PERMITIDOS.includes(emp.nome.toUpperCase())
                );

                console.log('Empreendimentos filtrados:', empreendimentosFiltrados.map(e => e.nome));

                // IDs dos empreendimentos permitidos para filtrar as revisões
                const idsPermitidos = new Set(empreendimentosFiltrados.map(e => e.id));

                // Filtrar revisões apenas desses empreendimentos E com Data Prevista Entrega em 2025
                const revisoesPrevistas = (todasRevisoes || []).filter(r =>
                    idsPermitidos.has(r.empreendimento_id) &&
                    estaEm2025(r.data_prevista_entrega)
                );

                // Projetos Entregues = revisões filtradas com Data Prevista em 2025 E Data de Entrega em 2025
                const revisoesEntregues = revisoesPrevistas.filter(r => estaEm2025(r.data_entrega));

                console.log('Revisões com previsão em 2025 (Filtradas):', revisoesPrevistas.length);
                console.log('Revisões com previsão E entrega em 2025 (Filtradas):', revisoesEntregues.length);

                const totalPrevisto = revisoesPrevistas.length;
                const totalEntregue = revisoesEntregues.length;
                const percentualGeral = totalPrevisto > 0 ? (totalEntregue / totalPrevisto) * 100 : 0;
                const cumprimentoMeta = (percentualGeral / META_PPR) * 100;

                // Calcular por empreendimento (usando apenas os filtrados)
                const porEmpreendimento = empreendimentosFiltrados.map(emp => {
                    // Qtd de Projetos = revisões com Data Prevista em 2025
                    const previstosEmp = revisoesPrevistas.filter(r => r.empreendimento_id === emp.id);
                    const totalPrevistosEmp = previstosEmp.length;

                    // Qtd de Projetos Entregues = revisões com Data Prevista em 2025 E Data de Entrega em 2025
                    const entreguesEmp = previstosEmp.filter(r => estaEm2025(r.data_entrega)).length;

                    const percentual = totalPrevistosEmp > 0 ? (entreguesEmp / totalPrevistosEmp) * 100 : 0;

                    return {
                        nome: emp.nome,
                        totalProjetos: totalPrevistosEmp,
                        projetosEntregues: entreguesEmp,
                        percentualEntregue: percentual,
                    };
                }).filter(item => item.totalProjetos > 0);

                console.log('Dados por empreendimento:', porEmpreendimento);

                setDadosPPR({
                    totalPrevisto,
                    totalEntregue,
                    percentualGeral,
                    cumprimentoMeta,
                    porEmpreendimento,
                });

            } catch (error) {
                console.error('Erro ao carregar dados PPR:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarDados();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando dados do PPR...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <Target className="h-8 w-8 text-amber-500" />
                    <h2 className="text-3xl font-bold text-[#1e3a5f]">META DA ORGANIZAÇÃO</h2>
                </div>
                <h3 className="text-2xl font-bold text-[#1e3a5f]">PPR 2025</h3>
                <p className="text-muted-foreground">
                    Cumprir {META_PPR}% dos prazos, conforme cronograma para a execução de obra (físico)
                </p>
            </div>

            {/* Layout Principal: Gauge + Tabela | Cards Laterais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Esquerda: Gauge + Tabela */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-t-4 border-t-[#1e3a5f]">
                        <CardHeader className="bg-[#1e3a5f] text-white rounded-t-lg">
                            <CardTitle className="text-center text-sm">
                                Cumprir {META_PPR}% dos prazos, conforme cronograma para a execução de obra (físico)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <GaugeChart
                                value={dadosPPR.percentualGeral}
                                meta={META_PPR}
                                teto={TETO_PPR}
                            />
                        </CardContent>
                    </Card>

                    {/* Tabela por Empreendimento */}
                    <Card>
                        <CardHeader className="bg-[#1e3a5f] text-white">
                            <CardTitle className="text-sm">
                                Cumprir {META_PPR}% dos prazos, conforme cronograma para a execução de obra (físico)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Medida</TableHead>
                                        <TableHead className="text-center font-semibold">Qtd total de Projetos</TableHead>
                                        <TableHead className="text-center font-semibold">Qtd de Projetos Entregues</TableHead>
                                        <TableHead className="text-center font-semibold">% de Projetos Entregues</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dadosPPR.porEmpreendimento.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                Nenhum dado disponível para 2025
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dadosPPR.porEmpreendimento.map((item, index) => (
                                            <TableRow key={item.nome} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                                                <TableCell className="font-medium">{item.nome}</TableCell>
                                                <TableCell className="text-center">{item.totalProjetos}</TableCell>
                                                <TableCell className="text-center">{item.projetosEntregues}</TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {item.percentualEntregue.toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {/* Linha de Total */}
                                    <TableRow className="bg-[#1e3a5f] text-white font-bold">
                                        <TableCell>TOTAL</TableCell>
                                        <TableCell className="text-center">{dadosPPR.totalPrevisto}</TableCell>
                                        <TableCell className="text-center">{dadosPPR.totalEntregue}</TableCell>
                                        <TableCell className="text-center">{dadosPPR.percentualGeral.toFixed(2)}%</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita: Cards de Resultado */}
                <div className="space-y-4">
                    {/* Card: Cumprimento de Prazo Atingido */}
                    <Card className="border-t-4 border-t-amber-500">
                        <CardHeader className="bg-[#c9a227] text-white py-3">
                            <CardTitle className="text-sm text-center">Projetos Executivos</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center py-6">
                            <div className="text-5xl font-bold">
                                {dadosPPR.percentualGeral.toFixed(2)}%
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Cumprimento de Prazo Atingido</p>
                        </CardContent>
                    </Card>

                    {/* Card: Cumprimento em Relação a Meta */}
                    <Card className="border-t-4 border-t-amber-500">
                        <CardHeader className="bg-[#c9a227] text-white py-3">
                            <CardTitle className="text-sm text-center">Projetos Executivos</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center py-6">
                            <div className="text-5xl font-bold">
                                {dadosPPR.cumprimentoMeta.toFixed(2)}%
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Cumprimento de Prazo em Relação a Meta</p>
                        </CardContent>
                    </Card>

                    {/* Card: Resultado vs Meta */}
                    <Card className="border-t-4 border-t-amber-500">
                        <CardHeader className="bg-[#c9a227] text-white py-3">
                            <CardTitle className="text-sm text-center">Projetos Executivos</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center py-6">
                            <div className="flex items-center justify-center gap-2">
                                {dadosPPR.percentualGeral >= META_PPR ? (
                                    <Award className="h-8 w-8 text-green-500" />
                                ) : (
                                    <TrendingUp className="h-8 w-8 text-amber-500" />
                                )}
                                <span className={`text-3xl font-bold ${dadosPPR.percentualGeral >= META_PPR ? 'text-green-600' : 'text-amber-600'}`}>
                                    {dadosPPR.percentualGeral >= META_PPR ? 'Meta Atingida!' : 'Em Progresso'}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Cumprimento de {META_PPR}% dos prazos, conforme cronograma
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
