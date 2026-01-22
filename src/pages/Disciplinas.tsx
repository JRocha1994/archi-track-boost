import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImportacaoGenerica } from '@/components/ImportacaoGenerica';
import type { Disciplina } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Disciplina | null>(null);
  const [nome, setNome] = useState('');
  const [prazo, setPrazo] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDisciplinas();
  }, []);

  const loadDisciplinas = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setDisciplinas([]);
        return;
      }

      const { data, error } = await supabase
        .from('disciplinas')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: Disciplina[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        prazoMedioAnalise: (item as any).prazo_medio_analise || 5,
        createdAt: item.created_at,
      }));

      setDisciplinas(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar disciplinas:', error);
      toast({
        title: 'Erro ao carregar disciplinas',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      if (editingItem) {
        const { data, error } = await supabase
          .from('disciplinas')
          .update({
            nome,
            prazo_medio_analise: prazo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .select('*')
          .single();

        if (error) throw error;

        const updated: Disciplina = {
          id: data.id,
          nome: data.nome,
          prazoMedioAnalise: (data as any).prazo_medio_analise || 5,
          createdAt: data.created_at,
        };

        setDisciplinas(disciplinas.map(item =>
          item.id === updated.id ? updated : item
        ));
        toast({ title: 'Disciplina atualizada com sucesso' });
      } else {
        const { data, error } = await supabase
          .from('disciplinas')
          .insert({
            nome,
            prazo_medio_analise: prazo,
            user_id: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;

        const newItem: Disciplina = {
          id: data.id,
          nome: data.nome,
          prazoMedioAnalise: (data as any).prazo_medio_analise || 5,
          createdAt: data.created_at,
        };

        setDisciplinas([...disciplinas, newItem]);
        toast({ title: 'Disciplina criada com sucesso' });
      }
    } catch (error: any) {
      console.error('Erro ao salvar disciplina:', error);
      toast({
        title: 'Erro ao salvar disciplina',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }

    setNome('');
    setPrazo(5);
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Disciplina) => {
    setEditingItem(item);
    setNome(item.nome);
    setPrazo(item.prazoMedioAnalise || 5);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('disciplinas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDisciplinas(disciplinas.filter(item => item.id !== id));
      toast({ title: 'Disciplina excluída' });
    } catch (error: any) {
      console.error('Erro ao excluir disciplina:', error);
      toast({
        title: 'Erro ao excluir disciplina',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (items: Array<{ nome: string }>) => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      const payload = items.map(item => ({
        nome: item.nome,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('disciplinas')
        .insert(payload)
        .select('*');

      if (error) throw error;

      const newItems: Disciplina[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        prazoMedioAnalise: 5,
        createdAt: item.created_at,
      }));

      setDisciplinas([...disciplinas, ...newItems]);
      toast({ title: `${newItems.length} disciplina(s) importada(s) com sucesso` });
    } catch (error: any) {
      console.error('Erro ao importar disciplinas:', error);
      toast({
        title: 'Erro ao importar disciplinas',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Disciplinas</CardTitle>
            <CardDescription>Gerencie as disciplinas de projeto</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingItem(null); setNome(''); setPrazo(5); }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Disciplina' : 'Nova Disciplina'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Disciplina</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Arquitetura, Estrutura, Hidráulica"
                  />
                </div>
                <div>
                  <Label htmlFor="prazo">Prazo Médio de Análise (dias)</Label>
                  <Input
                    id="prazo"
                    type="number"
                    value={prazo}
                    onChange={(e) => setPrazo(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingItem ? 'Atualizar' : 'Criar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lista" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="importar">Importar XLSX</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            {disciplinas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma disciplina cadastrada ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prazo Médio</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disciplinas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.prazoMedioAnalise} dias</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="importar" className="mt-4">
            <ImportacaoGenerica<Disciplina>
              tipo="disciplina"
              onImport={handleImport}
              existingData={disciplinas}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
