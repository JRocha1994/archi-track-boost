import { useState } from 'react';
import { useRevisoes, useEmpreendimentos, useObras, useDisciplinas, useProjetistas } from '@/hooks/useData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevisoesTable } from '@/components/revisoes/RevisoesTable';
import { RevisaoForm } from '@/components/revisoes/RevisaoForm';
import { ImportacaoXLSX } from '@/components/revisoes/ImportacaoXLSX';

export default function Index() {
  const [revisoes, setRevisoes] = useRevisoes();
  const [empreendimentos] = useEmpreendimentos();
  const [obras] = useObras();
  const [disciplinas] = useDisciplinas();
  const [projetistas] = useProjetistas();

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
