import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevisoesTable } from '@/components/revisoes/RevisoesTable';
import { RevisaoForm } from '@/components/revisoes/RevisaoForm';
import { ImportacaoXLSX } from '@/components/revisoes/ImportacaoXLSX';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise } from '@/lib/statusCalculator';

export default function Index() {
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [projetistas, setProjetistas] = useState<Projetista[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = session?.user;
      if (!user) {
        setRevisoes([]);
        setEmpreendimentos([]);
        setObras([]);
        setDisciplinas([]);
        setProjetistas([]);
        return;
      }

      const [empRes, obrasRes, discRes, projRes] = await Promise.all([
        supabase
          .from('empreendimentos')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('obras')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('disciplinas')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('projetistas')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);

      // Busca paginada para revisões (superar limite de 1000 registros)
      let allRevisoes: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('revisoes')
          .select('*')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }) // Ordenação secundária para paginação estável
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data) {
          allRevisoes = [...allRevisoes, ...data];
          if (data.length < pageSize) break;
          from += pageSize;
        } else {
          break;
        }
      }

      const revRes = { data: allRevisoes, error: null };

      if (empRes.error) throw empRes.error;
      if (obrasRes.error) throw obrasRes.error;
      if (discRes.error) throw discRes.error;
      if (projRes.error) throw projRes.error;
      if (revRes.error) throw revRes.error;

      const empreendimentosMapped: Empreendimento[] = (empRes.data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        createdAt: item.created_at,
      }));

      const obrasMapped: Obra[] = (obrasRes.data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        empreendimentoId: item.empreendimento_id,
        createdAt: item.created_at,
      }));

      const disciplinasMapped: Disciplina[] = (discRes.data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        prazoMedioAnalise: (item as any).prazo_medio_analise || 5,
        createdAt: item.created_at,
      }));

      const projetistasMapped: Projetista[] = (projRes.data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        email: item.email || undefined,
        telefone: item.telefone || undefined,
        createdAt: item.created_at,
      }));

      const revisoesMapped: Revisao[] = (revRes.data || []).map((item) => ({
        id: item.id,
        empreendimentoId: item.empreendimento_id,
        obraId: item.obra_id,
        disciplinaId: item.disciplina_id,
        projetistaId: item.projetista_id,
        numeroRevisao: item.numero_revisao,
        dataPrevistaEntrega: item.data_prevista_entrega,
        dataEntrega: item.data_entrega || undefined,
        dataPrevistaAnalise: item.data_prevista_analise || undefined,
        dataAnalise: item.data_analise || undefined,
        justificativa: item.justificativa,
        justificativaRevisao: item.justificativa_revisao || undefined,
        statusEntrega: calcularStatusEntrega(item.data_prevista_entrega, item.data_entrega || undefined),
        statusAnalise: (() => {
          const se = calcularStatusEntrega(item.data_prevista_entrega, item.data_entrega || undefined);
          return calcularStatusAnalise(item.data_prevista_analise || undefined, item.data_analise || undefined, se);
        })(),
        prazoMedioAnalise: item.prazo_medio_analise || undefined,
        createdAt: item.created_at,
      }));

      setEmpreendimentos(empreendimentosMapped);
      setObras(obrasMapped);
      setDisciplinas(disciplinasMapped);
      setProjetistas(projetistasMapped);
      setRevisoes(revisoesMapped);
    } catch (error: any) {
      console.error('Erro ao carregar dados das revisões:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisões de Projeto</h1>
        <p className="text-muted-foreground">
          Gerencie prazos de entrega, envio e análise de cada revisão
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Revisões</CardTitle>
          <CardDescription>
            Escolha como deseja adicionar as revisões: formulário, importação ou tabela editável
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tabela" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tabela">Tabela Editável</TabsTrigger>
              <TabsTrigger value="formulario">Formulário</TabsTrigger>
              <TabsTrigger value="importacao">Importar XLSX</TabsTrigger>
            </TabsList>

            <TabsContent value="tabela" className="mt-6">
              <RevisoesTable
                revisoes={revisoes}
                setRevisoes={setRevisoes}
                empreendimentos={empreendimentos}
                obras={obras}
                disciplinas={disciplinas}
                projetistas={projetistas}
              />
            </TabsContent>

            <TabsContent value="formulario" className="mt-6">
              <RevisaoForm
                revisoes={revisoes}
                setRevisoes={setRevisoes}
                empreendimentos={empreendimentos}
                obras={obras}
                disciplinas={disciplinas}
                projetistas={projetistas}
              />
            </TabsContent>

            <TabsContent value="importacao" className="mt-6">
              <ImportacaoXLSX
                revisoes={revisoes}
                setRevisoes={setRevisoes}
                empreendimentos={empreendimentos}
                obras={obras}
                disciplinas={disciplinas}
                projetistas={projetistas}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
