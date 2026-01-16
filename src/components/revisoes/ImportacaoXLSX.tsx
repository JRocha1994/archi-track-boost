import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise, calcularDataPrevistaAnalise } from '@/lib/statusCalculator';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';

interface ImportacaoXLSXProps {
  revisoes: Revisao[];
  setRevisoes: (fn: (prev: Revisao[]) => Revisao[]) => void;
  empreendimentos: Empreendimento[];
  obras: Obra[];
  disciplinas: Disciplina[];
  projetistas: Projetista[];
}

export function ImportacaoXLSX({
  revisoes,
  setRevisoes,
  empreendimentos,
  obras,
  disciplinas,
  projetistas,
}: ImportacaoXLSXProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const template = [
      {
        Empreendimento: 'Nome do Empreendimento',
        Obra: 'Nome da Obra',
        Disciplina: 'Nome da Disciplina',
        Projetista: 'Nome do Projetista',
        'Número da Revisão': 1,
        'Dt. Prevista Entrega': '2025-01-15',
        'Dt. de Entrega': '2025-01-14',
        'Data de Análise': '2025-01-20',
        Justificativa: 'Ajustes solicitados pelo cliente',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_revisoes.xlsx');

    toast({ title: 'Template baixado com sucesso' });
  };

  const findIdByName = (name: string, list: any[]) => {
    const item = list.find(i => i.nome.toLowerCase() === name.toLowerCase());
    return item?.id;
  };

  /**
   * Converte um valor de data para o formato yyyy-MM-dd esperado pelos inputs type="date"
   * Lida com: números seriais do Excel, strings em diversos formatos, objetos Date
   */
  function formatDateForInput(value: any): string {
    if (!value) return '';

    // Se já for uma string no formato yyyy-MM-dd, retorna diretamente
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Se for um número (serial do Excel)
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
      const numericValue = typeof value === 'number' ? value : parseInt(value, 10);

      // Seriais do Excel começam em 1900-01-01 (serial = 1)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30/12/1899
      const date = new Date(excelEpoch.getTime() + numericValue * 24 * 60 * 60 * 1000);

      const year = date.getUTCFullYear();
      // O mês é base 0, então +1
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // Se for uma string no formato dd/mm/yyyy
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }

    // Se for um objeto Date
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Tenta fallback com Date parse normal
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return '';
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const newRevisoes: Revisao[] = [];
      const errors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        const empreendimentoId = findIdByName(row.Empreendimento, empreendimentos);
        const obraId = findIdByName(row.Obra, obras);
        const disciplinaId = findIdByName(row.Disciplina, disciplinas);
        const projetistaId = findIdByName(row.Projetista, projetistas);

        // Validar cada entidade individualmente
        if (!empreendimentoId) {
          errors.push(`Linha ${index + 2}: Empreendimento "${row.Empreendimento}" não encontrado`);
          return;
        }
        if (!obraId) {
          errors.push(`Linha ${index + 2}: Obra "${row.Obra}" não encontrada`);
          return;
        }
        if (!disciplinaId) {
          errors.push(`Linha ${index + 2}: Disciplina "${row.Disciplina}" não encontrada`);
          return;
        }
        if (!projetistaId) {
          errors.push(`Linha ${index + 2}: Projetista "${row.Projetista}" não encontrado`);
          return;
        }

        // Validação de campos obrigatórios feita mais abaixo após formatação das datas

        const numeroRevisao = parseInt(row['Número da Revisão']);
        if (isNaN(numeroRevisao)) {
          errors.push(`Linha ${index + 2}: Número da revisão deve ser um inteiro válido`);
          return;
        }

        // Validação de Duplicidade (Banco de Dados e Arquivo Atual)
        const existeNoBanco = revisoes.some(r =>
          r.empreendimentoId === empreendimentoId &&
          r.obraId === obraId &&
          r.disciplinaId === disciplinaId &&
          r.projetistaId === projetistaId &&
          r.numeroRevisao === numeroRevisao
        );

        const duplicadaNoArquivo = newRevisoes.some(r =>
          r.empreendimentoId === empreendimentoId &&
          r.obraId === obraId &&
          r.disciplinaId === disciplinaId &&
          r.projetistaId === projetistaId &&
          r.numeroRevisao === numeroRevisao
        );

        if (existeNoBanco) {
          errors.push(`Linha ${index + 2}: Revisão R${numeroRevisao} já existe no sistema para este conjunto.`);
          return;
        }

        if (duplicadaNoArquivo) {
          errors.push(`Linha ${index + 2}: Revisão R${numeroRevisao} duplicada dentro do próprio arquivo.`);
          return;
        }

        const dtPrevistaEntrega = formatDateForInput(row['Dt. Prevista Entrega']);
        const dtEntrega = formatDateForInput(row['Dt. de Entrega']);
        const dtAnalise = formatDateForInput(row['Data de Análise']);

        if (!numeroRevisao || !dtPrevistaEntrega || !row.Justificativa) {
          errors.push(`Linha ${index + 2}: Campos obrigatórios faltando (Nro Revisão, Dt Prevista Entrega ou Justificativa)`);
          return;
        }

        const dataPrevistaAnalise = calcularDataPrevistaAnalise(dtEntrega);
        const statusEntrega = calcularStatusEntrega(dtPrevistaEntrega, dtEntrega);
        const statusAnalise = calcularStatusAnalise(dataPrevistaAnalise, dtAnalise);

        newRevisoes.push({
          id: crypto.randomUUID(),
          empreendimentoId,
          obraId,
          disciplinaId,
          projetistaId,
          numeroRevisao,
          dataPrevistaEntrega: dtPrevistaEntrega,
          dataEntrega: dtEntrega || undefined,
          dataPrevistaAnalise,
          dataAnalise: dtAnalise || undefined,
          justificativa: row.Justificativa,
          statusEntrega,
          statusAnalise,
          createdAt: new Date().toISOString(),
        });
      });

      if (errors.length > 0) {
        console.error('Erros na importação:', errors);

        // Mostrar o primeiro erro como exemplo
        const primeiroErro = errors[0];
        toast({
          title: `Importação Falhou: ${errors.length} erro(s) detectado(s)`,
          description: `Nenhuma revisão foi importada. Ex: ${primeiroErro}. Corrija a planilha.`,
          variant: 'destructive',
        });
        return; // ABORTA: não salva nada se tiver erro
      }

      if (newRevisoes.length > 0) {
        // Verificar autenticação
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          toast({
            title: 'Sessão inválida',
            description: 'Por favor, faça login novamente para salvar os dados.',
            variant: 'destructive'
          });
          return;
        }

        // Mapear para formato do banco de dados (snake_case)
        const dbInserts = newRevisoes.map((r) => ({
          empreendimento_id: r.empreendimentoId,
          obra_id: r.obraId,
          disciplina_id: r.disciplinaId,
          projetista_id: r.projetistaId,
          numero_revisao: r.numeroRevisao,
          data_prevista_entrega: r.dataPrevistaEntrega,
          data_entrega: r.dataEntrega || null,
          data_prevista_analise: r.dataPrevistaAnalise || null,
          data_analise: r.dataAnalise || null,
          justificativa: r.justificativa,
          status_entrega: r.statusEntrega,
          status_analise: r.statusAnalise,
          user_id: session.user.id,
        }));

        // Inserir no Supabase e retornar dados inseridos
        const { data, error: insertError } = await supabase
          .from('revisoes')
          .insert(dbInserts)
          .select();

        if (insertError) {
          console.error('Erro ao inserir no Supabase:', insertError);
          throw new Error('Falha ao salvar registros no banco de dados.');
        }

        // Converter dados retornados para formato local
        const revisoesSalvas: Revisao[] = data.map((item: any) => ({
          id: item.id,
          empreendimentoId: item.empreendimento_id,
          obraId: item.obra_id,
          disciplinaId: item.disciplina_id,
          projetistaId: item.projetista_id,
          numeroRevisao: item.numero_revisao,
          dataPrevistaEntrega: item.data_prevista_entrega,
          dataEntrega: item.data_entrega,
          dataPrevistaAnalise: item.data_prevista_analise,
          dataAnalise: item.data_analise,
          justificativa: item.justificativa,
          statusEntrega: item.status_entrega,
          statusAnalise: item.status_analise,
          createdAt: item.created_at,
        }));

        setRevisoes((prev) => [...prev, ...revisoesSalvas]);

        toast({
          title: 'Importação realizada com sucesso!',
          description: `${revisoesSalvas.length} novas revisões foram salvas no sistema.`,
        });
      } else {
        toast({
          title: 'Arquivo vazio ou sem dados válidos',
          description: 'Nenhuma revisão encontrada para importar.',
        });
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao importar arquivo',
        description: 'Verifique se o formato está correto',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Importar Revisões em Lote</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Baixe o template, preencha com os dados e faça o upload
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Template
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Importar Arquivo'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Instruções:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Baixe o template Excel clicando no botão acima</li>
            <li>Preencha os dados seguindo o formato do exemplo</li>
            <li>Use os nomes exatos dos empreendimentos, obras, disciplinas e projetistas cadastrados</li>
            <li>As datas devem estar no formato AAAA-MM-DD (ex: 2025-01-15)</li>
            <li>Salve e faça o upload do arquivo preenchido</li>
          </ol>
        </div>

        <Card className="p-4 bg-muted/50">
          <p className="font-medium text-sm mb-3">Nomes Cadastrados Disponíveis:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold mb-1">Empreendimentos ({empreendimentos.length}):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto">
                {empreendimentos.length > 0 ? (
                  empreendimentos.map(e => <li key={e.id}>{e.nome}</li>)
                ) : (
                  <li className="text-red-500">Nenhum cadastrado</li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Obras ({obras.length}):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto">
                {obras.length > 0 ? (
                  obras.map(o => <li key={o.id}>{o.nome}</li>)
                ) : (
                  <li className="text-red-500">Nenhuma cadastrada</li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Disciplinas ({disciplinas.length}):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto">
                {disciplinas.length > 0 ? (
                  disciplinas.map(d => <li key={d.id}>{d.nome}</li>)
                ) : (
                  <li className="text-red-500">Nenhuma cadastrada</li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Projetistas ({projetistas.length}):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto">
                {projetistas.length > 0 ? (
                  projetistas.map(p => <li key={p.id}>{p.nome}</li>)
                ) : (
                  <li className="text-red-500">Nenhum cadastrado</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
