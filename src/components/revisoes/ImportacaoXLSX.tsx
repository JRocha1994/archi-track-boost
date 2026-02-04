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
        'Dt. Prevista Entrega': '15/01/2025',
        'Dt. de Entrega': '14/01/2025',
        'Data de Análise': '20/01/2025',
        Justificativa: 'Ajustes solicitados pelo cliente',
        'Justificativa da Revisão': 'Motivo detalhado da alteração',
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

  const findDisciplinaByName = (name: string): Disciplina | undefined => {
    return disciplinas.find(d => d.nome.toLowerCase() === name.toLowerCase());
  };

  /**
   * Busca uma obra pelo nome E valida se ela pertence ao empreendimento especificado
   * Retorna { id, found, belongsToEmpreendimento } para permitir mensagens de erro específicas
   */
  const findObraByNameAndEmpreendimento = (
    obraNome: string,
    empreendimentoId: string
  ): { id: string | undefined; found: boolean; belongsToEmpreendimento: boolean } => {
    // Primeiro, busca qualquer obra com esse nome
    const obraEncontrada = obras.find(o => o.nome.toLowerCase() === obraNome.toLowerCase());

    if (!obraEncontrada) {
      return { id: undefined, found: false, belongsToEmpreendimento: false };
    }

    // Agora busca a obra com esse nome que pertence ao empreendimento correto
    const obraCorreta = obras.find(
      o => o.nome.toLowerCase() === obraNome.toLowerCase() &&
        o.empreendimentoId === empreendimentoId
    );

    if (obraCorreta) {
      return { id: obraCorreta.id, found: true, belongsToEmpreendimento: true };
    }

    // Obra existe mas não pertence ao empreendimento
    return { id: undefined, found: true, belongsToEmpreendimento: false };
  };

  /**
   * Converte um valor de data para o formato yyyy-MM-dd esperado pelos inputs type="date"
   * Lida com: números seriais do Excel, strings em diversos formatos, objetos Date
   */
  function formatDateForInput(value: any): string {
    if (!value) return '';

    let result = '';

    // Se já for uma string no formato yyyy-MM-dd
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      result = value;
    }
    // Se for um número (serial do Excel)
    else if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
      const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + numericValue * 24 * 60 * 60 * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      result = `${year}-${month}-${day}`;
    }
    // Se for uma string no formato dd/mm/yyyy
    else if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      result = `${year}-${month}-${day}`;
    }
    // Se for um objeto Date
    else if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      result = `${year}-${month}-${day}`;
    }
    // Tenta fallback
    else {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        result = parsed.toISOString().split('T')[0];
      }
    }

    // Validação rigorosa: A data existe no calendário?
    if (result) {
      const [y, m, d] = result.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      // Verifica se o JS não fez rollover (ex: 30/02 -> 02/03)
      if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
        return result;
      }
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

      // Ordenar as linhas por grupo (Empreendimento + Obra + Disciplina + Projetista) e número de revisão
      // Isso permite que revisões fora de ordem na planilha sejam processadas corretamente
      const sortedData = [...jsonData].map((row: any, originalIndex: number) => ({
        ...row,
        _originalLineNumber: originalIndex + 2, // Linha original no Excel (2 = primeira linha de dados)
        _sortKey: `${(row.Empreendimento || '').toLowerCase()}_${(row.Obra || '').toLowerCase()}_${(row.Disciplina || '').toLowerCase()}_${(row.Projetista || '').toLowerCase()}`,
        _numeroRevisao: typeof row['Número da Revisão'] === 'number'
          ? Math.floor(row['Número da Revisão'])
          : (typeof row['Número da Revisão'] === 'string'
            ? Math.floor(parseFloat(row['Número da Revisão'].trim()) || 0)
            : 0)
      })).sort((a, b) => {
        // Primeiro ordena pelo grupo (Empreendimento + Obra + Disciplina + Projetista)
        const groupCompare = a._sortKey.localeCompare(b._sortKey);
        if (groupCompare !== 0) return groupCompare;
        // Depois ordena pelo número da revisão dentro do grupo
        return a._numeroRevisao - b._numeroRevisao;
      });

      // DEBUG: Mostrar primeiras 10 linhas ordenadas
      console.log('DEBUG sortedData (primeiras 10):', sortedData.slice(0, 10).map(r => ({
        linha: r._originalLineNumber,
        emp: r.Empreendimento,
        obra: r.Obra,
        disc: r.Disciplina,
        proj: r.Projetista,
        rev: r._numeroRevisao,
        sortKey: r._sortKey
      })));

      const newRevisoes: Revisao[] = [];
      const errors: string[] = [];

      sortedData.forEach((row: any) => {
        // Usa o número da linha original do Excel para mensagens de erro
        const lineNumber = row._originalLineNumber;
        const empreendimentoId = findIdByName(row.Empreendimento, empreendimentos);

        // Validar empreendimento primeiro (necessário para validar a obra)
        if (!empreendimentoId) {
          errors.push(`Linha ${lineNumber}: Empreendimento "${row.Empreendimento}" não encontrado`);
          return;
        }

        // Buscar obra validando se pertence ao empreendimento
        const obraResult = findObraByNameAndEmpreendimento(row.Obra, empreendimentoId);
        const obraId = obraResult.id;

        // Validar obra com mensagem específica
        if (!obraResult.found) {
          errors.push(`Linha ${lineNumber}: Obra "${row.Obra}" não encontrada no sistema`);
          return;
        }
        if (!obraResult.belongsToEmpreendimento) {
          errors.push(`Linha ${lineNumber}: Obra "${row.Obra}" não pertence ao empreendimento "${row.Empreendimento}". Cadastre a obra para este empreendimento.`);
          return;
        }

        const disciplinaObj = findDisciplinaByName(row.Disciplina);
        const disciplinaId = disciplinaObj?.id;
        const prazo = disciplinaObj?.prazoMedioAnalise || 5;
        const projetistaId = findIdByName(row.Projetista, projetistas);
        if (!disciplinaId) {
          errors.push(`Linha ${lineNumber}: Disciplina "${row.Disciplina}" não encontrada`);
          return;
        }
        if (!projetistaId) {
          errors.push(`Linha ${lineNumber}: Projetista "${row.Projetista}" não encontrado`);
          return;
        }

        // Validação de campos obrigatórios feita mais abaixo após formatação das datas

        // Parser robusto para número da revisão (trata decimais do Excel como 1.0, 2.0)
        const numeroRevisaoRaw = row['Número da Revisão'];
        let numeroRevisao: number;

        if (typeof numeroRevisaoRaw === 'number') {
          // Se já for número, trunca decimais (1.0 -> 1, 2.5 -> 2)
          numeroRevisao = Math.floor(numeroRevisaoRaw);
        } else if (typeof numeroRevisaoRaw === 'string') {
          // Remove espaços e tenta converter
          const parsed = parseFloat(numeroRevisaoRaw.trim());
          numeroRevisao = isNaN(parsed) ? NaN : Math.floor(parsed);
        } else {
          numeroRevisao = NaN;
        }

        if (isNaN(numeroRevisao) || numeroRevisao < 0) {
          errors.push(`Linha ${lineNumber}: Número da revisão deve ser um inteiro válido >= 0`);
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
          errors.push(`Linha ${lineNumber}: Revisão R${numeroRevisao} já existe no sistema para este conjunto.`);
          return;
        }

        if (duplicadaNoArquivo) {
          errors.push(`Linha ${lineNumber}: Revisão R${numeroRevisao} duplicada dentro do próprio arquivo.`);
          return;
        }

        // Validação de Sequência de Revisão
        // Buscar todas as revisões do mesmo grupo (banco + arquivo atual)
        const revisoesDoGrupoNoBanco = revisoes.filter(r =>
          r.empreendimentoId === empreendimentoId &&
          r.obraId === obraId &&
          r.disciplinaId === disciplinaId &&
          r.projetistaId === projetistaId
        );

        const revisoesDoGrupoNoArquivo = newRevisoes.filter(r =>
          r.empreendimentoId === empreendimentoId &&
          r.obraId === obraId &&
          r.disciplinaId === disciplinaId &&
          r.projetistaId === projetistaId
        );

        // Combinar números de revisão do banco e do arquivo
        const numerosBanco = revisoesDoGrupoNoBanco.map(r => r.numeroRevisao);
        const numerosArquivo = revisoesDoGrupoNoArquivo.map(r => r.numeroRevisao);
        const todosNumeros = [...numerosBanco, ...numerosArquivo];

        // Encontrar o maior número de revisão existente
        // Quando não há revisões no grupo, a primeira válida é 0
        const maiorRevisaoExistente = todosNumeros.length > 0 ? Math.max(...todosNumeros) : -1;
        const proximoEsperado = maiorRevisaoExistente + 1;

        // A revisão deve ser exatamente o próximo número na sequência
        if (numeroRevisao !== proximoEsperado) {
          errors.push(`Linha ${lineNumber}: Revisão R${numeroRevisao} não segue a sequência. A próxima revisão válida é R${proximoEsperado}.`);
          return;
        }

        const dtPrevistaEntrega = formatDateForInput(row['Dt. Prevista Entrega']);
        const dtEntrega = formatDateForInput(row['Dt. de Entrega']);
        const dtAnalise = formatDateForInput(row['Data de Análise']);

        // Validações de datas inválidas (ex: 30 de Fevereiro)
        if (row['Dt. Prevista Entrega'] && !dtPrevistaEntrega) {
          errors.push(`Linha ${lineNumber}: Data Prevista Entrega inválida ou inexistente ("${row['Dt. Prevista Entrega']}")`);
          return;
        }
        if (row['Dt. de Entrega'] && !dtEntrega) {
          errors.push(`Linha ${lineNumber}: Data de Entrega inválida ou inexistente ("${row['Dt. de Entrega']}")`);
          return;
        }
        if (row['Data de Análise'] && !dtAnalise) {
          errors.push(`Linha ${lineNumber}: Data de Análise inválida ou inexistente ("${row['Data de Análise']}")`);
          return;
        }

        // Validação de campos obrigatórios (numeroRevisao pode ser 0, então usa typeof)
        if (typeof numeroRevisao !== 'number' || isNaN(numeroRevisao) || !dtPrevistaEntrega) {
          errors.push(`Linha ${lineNumber}: Campos obrigatórios faltando (Nro Revisão ou Dt Prevista Entrega)`);
          return;
        }

        const dataPrevistaAnalise = calcularDataPrevistaAnalise(dtEntrega, prazo);
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
          justificativa: row.Justificativa || '',
          justificativaRevisao: row['Justificativa da Revisão'] || '',
          statusEntrega,
          statusAnalise,
          prazoMedioAnalise: prazo,
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
          justificativa_revisao: r.justificativaRevisao || null,
          status_entrega: r.statusEntrega,
          status_analise: r.statusAnalise,
          prazo_medio_analise: r.prazoMedioAnalise,
          user_id: session.user.id,
        }));

        // Inserir no Supabase e retornar dados inseridos
        const { data, error: insertError } = await supabase
          .from('revisoes')
          .insert(dbInserts as any)
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
          justificativaRevisao: item.justificativa_revisao,
          statusEntrega: calcularStatusEntrega(item.data_prevista_entrega, item.data_entrega || undefined),
          statusAnalise: item.status_analise,
          prazoMedioAnalise: item.prazo_medio_analise || 5,
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
            <li>As datas devem estar no formato DD/MM/AAAA (ex: 15/01/2025)</li>
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
