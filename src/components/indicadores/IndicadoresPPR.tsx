import { useMemo } from 'react';
import type { Empreendimento, Revisao } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, Award } from 'lucide-react';

interface IndicadoresPPRProps {
    revisoes: Revisao[];
    empreendimentos: Empreendimento[];
}

const META_PPR = 95; // Meta de 95%
const TETO_PPR = 100; // Teto de 100%

// Cores para o gauge
const GAUGE_COLORS = {
    achieved: '#1e3a5f', // Azul escuro para valor atingido
    remaining: '#e5e7eb', // Cinza claro para restante
    meta: '#22c55e', // Verde para indicar meta
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
                <span className="text-4xl font-bold text-[#1e3a5f]">{value.toFixed(2)}%</span>
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

export function IndicadoresPPR({ revisoes, empreendimentos }: IndicadoresPPRProps) {
    // Filtrar revisões do ano de 2025
    const dadosPPR = useMemo(() => {
        const dataInicio = '2025-01-01';
        const dataFim = '2025-12-31';

        // Revisões com Data Prevista Entrega entre 01/01/2025 e 31/12/2025
        const revisoesPrevistoEm2025 = revisoes.filter(r => {
            if (!r.dataPrevistaEntrega) return false;
            return r.dataPrevistaEntrega >= dataInicio && r.dataPrevistaEntrega <= dataFim;
        });

        // Das revisões previstas em 2025, quantas foram entregues (têm Data de Entrega preenchida)
        const revisoesEntreguesEm2025 = revisoesPrevistoEm2025.filter(r => {
            return r.dataEntrega && r.dataEntrega.length > 0;
        });

        const totalPrevisto = revisoesPrevistoEm2025.length;
        const totalEntregue = revisoesEntreguesEm2025.length;
        const percentualGeral = totalPrevisto > 0 ? (totalEntregue / totalPrevisto) * 100 : 0;
        const cumprimentoMeta = (percentualGeral / META_PPR) * 100;

        // Dados por Empreendimento
        const porEmpreendimento = empreendimentos.map(emp => {
            // Revisões do empreendimento com previsão em 2025
            const previstosEmp = revisoesPrevistoEm2025.filter(r => r.empreendimentoId === emp.id);
            const totalPrevistosEmp = previstosEmp.length;

            // Das previstas, quantas foram entregues
            const entreguesEmp = previstosEmp.filter(r => r.dataEntrega && r.dataEntrega.length > 0).length;

            const percentual = totalPrevistosEmp > 0 ? (entreguesEmp / totalPrevistosEmp) * 100 : 0;

            return {
                nome: emp.nome,
                totalProjetos: totalPrevistosEmp,
                projetosEntregues: entreguesEmp,
                percentualEntregue: percentual,
            };
        }).filter(item => item.totalProjetos > 0); // Apenas empreendimentos com revisões previstas

        return {
            totalPrevisto,
            totalEntregue,
            percentualGeral,
            cumprimentoMeta,
            porEmpreendimento,
        };
    }, [revisoes, empreendimentos]);

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
                            <div className="text-5xl font-bold text-[#1e3a5f]">
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
                            <div className="text-5xl font-bold text-[#1e3a5f]">
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
