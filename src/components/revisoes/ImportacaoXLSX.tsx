import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusEntrega, calcularStatusAnalise } from '@/lib/statusCalculator';
import * as XLSX from 'xlsx';
import type { Revisao, Empreendimento, Obra, Disciplina, Projetista } from '@/types';

interface ImportacaoXLSXProps {
  setRevisoes: (fn: (prev: Revisao[]) => Revisao[]) => void;
  empreendimentos: Empreendimento[];
  obras: Obra[];
  disciplinas: Disciplina[];
  projetistas: Projetista[];
}

export function ImportacaoXLSX({
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
        'Número da Revisão': 'R01',
        'Data de Entrega': '2025-01-15',
        'Data de Envio': '2025-01-14',
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

        if (!empreendimentoId || !obraId || !disciplinaId || !projetistaId) {
          errors.push(`Linha ${index + 2}: Entidade não encontrada`);
          return;
        }

        if (!row['Número da Revisão'] || !row['Data de Entrega'] || !row.Justificativa) {
          errors.push(`Linha ${index + 2}: Campos obrigatórios faltando`);
          return;
        }

        const statusEntrega = calcularStatusEntrega(row['Data de Entrega'], row['Data de Envio']);
        const statusAnalise = calcularStatusAnalise(row['Data de Envio'], row['Data de Análise']);

        newRevisoes.push({
          id: crypto.randomUUID(),
          empreendimentoId,
          obraId,
          disciplinaId,
          projetistaId,
          numeroRevisao: row['Número da Revisão'],
          dataEntrega: row['Data de Entrega'],
          dataEnvio: row['Data de Envio'] || undefined,
          dataAnalise: row['Data de Análise'] || undefined,
          justificativa: row.Justificativa,
          statusEntrega,
          statusAnalise,
          createdAt: new Date().toISOString(),
        });
      });

      if (newRevisoes.length > 0) {
        setRevisoes((prev) => [...prev, ...newRevisoes]);
        toast({ 
          title: `${newRevisoes.length} revisão(ões) importada(s) com sucesso`,
          description: errors.length > 0 ? `${errors.length} linha(s) com erro` : undefined,
        });
      }

      if (errors.length > 0) {
        console.error('Erros na importação:', errors);
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
    </div>
  );
}
