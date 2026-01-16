import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ImportacaoGenericaProps<T> {
  tipo: 'empreendimento' | 'obra' | 'disciplina' | 'projetista';
  onImport: (items: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]) => void;
  empreendimentos?: Array<{ id: string; nome: string }>;
}

export function ImportacaoGenerica<T>({ tipo, onImport, empreendimentos }: ImportacaoGenericaProps<T>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getTemplateConfig = () => {
    switch (tipo) {
      case 'empreendimento':
        return {
          colunas: ['Nome'],
          exemplo: [{ Nome: 'Empreendimento Exemplo' }],
          nomeArquivo: 'template_empreendimentos.xlsx',
        };
      case 'obra':
        return {
          colunas: ['Nome', 'Empreendimento'],
          exemplo: [{ Nome: 'Obra Exemplo', Empreendimento: 'Nome do Empreendimento' }],
          nomeArquivo: 'template_obras.xlsx',
        };
      case 'disciplina':
        return {
          colunas: ['Nome'],
          exemplo: [{ Nome: 'Arquitetura' }],
          nomeArquivo: 'template_disciplinas.xlsx',
        };
      case 'projetista':
        return {
          colunas: ['Nome'],
          exemplo: [{ Nome: 'João Silva' }],
          nomeArquivo: 'template_projetistas.xlsx',
        };
    }
  };

  const handleDownloadTemplate = () => {
    const config = getTemplateConfig();
    const ws = XLSX.utils.json_to_sheet(config.exemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, config.nomeArquivo);

    toast({ title: 'Template baixado com sucesso' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const items: any[] = [];
      const errors: string[] = [];

      // Função auxiliar para formatar datas
      const formatarData = (valor: any) => {
        if (valor === null || valor === undefined) return null;

        // Se for número (serial do Excel)
        if (typeof valor === 'number') {
          // Ajuste de timezone: +12h para garantir o dia correto
          const data = new Date(Math.round((valor - 25569) * 86400 * 1000) + (12 * 3600 * 1000));
          return !isNaN(data.getTime()) ? data.toISOString().split('T')[0] : null;
        }

        // Se for string DD/MM/YYYY
        if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          const [dia, mes, ano] = valor.split('/');
          return `${ano}-${mes}-${dia}`;
        }

        return valor;
      };

      jsonData.forEach((rawRow: any, index: number) => {
        // 1. Processar a linha para aplicar as correções (Datas e Zeros)
        const row: any = {};

        Object.keys(rawRow).forEach((key) => {
          const valor = rawRow[key];

          // Preservar o Zero (0) para não ser tratado como falso/null
          if (valor === 0) {
            row[key] = 0;
            return;
          }

          // HOTFIX: Garantir que Número da Revisão seja tratado corretamente
          if (key === 'Número da Revisão') {
            // Tenta converter para número (ex: "0" string -> 0 number)
            const num = Number(valor);
            row[key] = !isNaN(num) ? num : valor;
            return;
          }

          // Heurística para identificar colunas de data
          const keyLower = key.toLowerCase();
          const pareceData =
            keyLower.includes('data') ||
            keyLower.includes('dt.') ||
            keyLower.includes('date') ||
            keyLower.includes('criacao') ||
            keyLower.includes('prevista') ||
            keyLower.includes('vencimento') ||
            keyLower.includes('prazo');

          if (pareceData) {
            const dataFormatada = formatarData(valor);
            row[key] = dataFormatada || valor;
          } else {
            row[key] = valor;
          }
        });

        // 2. Validação Específica HOTFIX: Número da Revisão
        // Se o campo estiver presente, validar estritamente aceitando 0
        if ('Número da Revisão' in row) {
          const rev = row['Número da Revisão'];
          // Aceita 0. Rejeita apenas null, undefined ou vazio.
          if (rev === null || rev === undefined || rev === '') {
            errors.push(`Linha ${index + 2}: Número da Revisão é inválido ou ausente`);
            return;
          }
        }

        // 2. Validar nome obrigatório SOMENTE se a coluna existir
        if (
          'Nome' in row &&
          (!row.Nome || (typeof row.Nome === 'string' && row.Nome.trim() === ''))
        ) {
          errors.push(`Linha ${index + 2}: Nome é obrigatório`);
          return;
        }

        const item: any = {
          ...row, // Inclui todos os campos processados
          nome: String(row.Nome).trim(),
        };

        // 3. Para obras, validar e buscar empreendimento
        if (tipo === 'obra') {
          if (!row.Empreendimento || (typeof row.Empreendimento === 'string' && row.Empreendimento.trim() === '')) {
            errors.push(`Linha ${index + 2}: Empreendimento é obrigatório`);
            return;
          }

          const empreendimento = empreendimentos?.find(
            e => e.nome.toLowerCase() === String(row.Empreendimento).trim().toLowerCase()
          );

          if (!empreendimento) {
            errors.push(`Linha ${index + 2}: Empreendimento "${row.Empreendimento}" não encontrado`);
            return;
          }

          item.empreendimentoId = empreendimento.id;
        }

        items.push(item);
      });

      if (items.length > 0) {
        onImport(items);
        toast({
          title: `${items.length} ${getTipoPlural()} importado(s) com sucesso`,
          description: errors.length > 0 ? `${errors.length} linha(s) com erro` : undefined,
        });
      }

      if (errors.length > 0) {
        console.error('Erros na importação:', errors);

        const primeiroErro = errors[0];
        toast({
          title: `${errors.length} erro(s) encontrado(s)`,
          description: primeiroErro,
          variant: 'destructive',
        });
      }

      if (items.length === 0 && errors.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'O arquivo está vazio ou no formato incorreto',
          variant: 'destructive',
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

  const getTipoSingular = () => {
    switch (tipo) {
      case 'empreendimento': return 'empreendimento';
      case 'obra': return 'obra';
      case 'disciplina': return 'disciplina';
      case 'projetista': return 'projetista';
    }
  };

  const getTipoPlural = () => {
    switch (tipo) {
      case 'empreendimento': return 'empreendimentos';
      case 'obra': return 'obras';
      case 'disciplina': return 'disciplinas';
      case 'projetista': return 'projetistas';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="font-semibold">Importar {getTipoPlural()} em Lote</h3>
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

      <div className="mt-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium">Instruções:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Baixe o template Excel clicando no botão acima</li>
          <li>Preencha a coluna "Nome" com os dados</li>
          {tipo === 'obra' && (
            <li>Preencha a coluna "Empreendimento" com o nome exato de um empreendimento cadastrado</li>
          )}
          <li>Salve e faça o upload do arquivo preenchido</li>
        </ol>
      </div>

      {tipo === 'obra' && empreendimentos && empreendimentos.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="font-semibold text-sm mb-2">Empreendimentos Cadastrados ({empreendimentos.length}):</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground max-h-32 overflow-y-auto">
            {empreendimentos.map(e => (
              <li key={e.id}>{e.nome}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
