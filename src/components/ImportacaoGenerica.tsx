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

      jsonData.forEach((row: any, index: number) => {
        // Validar nome obrigatório
        if (!row.Nome || row.Nome.trim() === '') {
          errors.push(`Linha ${index + 2}: Nome é obrigatório`);
          return;
        }

        const item: any = {
          nome: row.Nome.trim(),
        };

        // Para obras, validar e buscar empreendimento
        if (tipo === 'obra') {
          if (!row.Empreendimento || row.Empreendimento.trim() === '') {
            errors.push(`Linha ${index + 2}: Empreendimento é obrigatório`);
            return;
          }

          const empreendimento = empreendimentos?.find(
            e => e.nome.toLowerCase() === row.Empreendimento.trim().toLowerCase()
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
