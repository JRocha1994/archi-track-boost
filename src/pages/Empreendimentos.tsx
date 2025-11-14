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
import type { Empreendimento } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function Empreendimentos() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Empreendimento | null>(null);
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmpreendimentos();
  }, []);

  const loadEmpreendimentos = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setEmpreendimentos([]);
        return;
      }

      const { data, error } = await supabase
        .from('empreendimentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: Empreendimento[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        createdAt: item.created_at,
      }));

      setEmpreendimentos(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar empreendimentos:', error);
      toast({
        title: 'Erro ao carregar empreendimentos',
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
          .from('empreendimentos')
          .update({
            nome,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (error) throw error;

        const updated: Empreendimento = {
          id: data.id,
          nome: data.nome,
          createdAt: data.created_at,
        };

        setEmpreendimentos(empreendimentos.map(item => 
          item.id === updated.id ? updated : item
        ));
        toast({ title: 'Empreendimento atualizado com sucesso' });
      } else {
        const { data, error } = await supabase
          .from('empreendimentos')
          .insert({
            nome,
            user_id: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;

        const newItem: Empreendimento = {
          id: data.id,
          nome: data.nome,
          createdAt: data.created_at,
        };

        setEmpreendimentos([...empreendimentos, newItem]);
        toast({ title: 'Empreendimento criado com sucesso' });
      }
    } catch (error: any) {
      console.error('Erro ao salvar empreendimento:', error);
      toast({
        title: 'Erro ao salvar empreendimento',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }

    setNome('');
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Empreendimento) => {
    setEditingItem(item);
    setNome(item.nome);
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
        .from('empreendimentos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEmpreendimentos(empreendimentos.filter(item => item.id !== id));
      toast({ title: 'Empreendimento excluído' });
    } catch (error: any) {
      console.error('Erro ao excluir empreendimento:', error);
      toast({
        title: 'Erro ao excluir empreendimento',
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
        .from('empreendimentos')
        .insert(payload)
        .select('*');

      if (error) throw error;

      const newItems: Empreendimento[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        createdAt: item.created_at,
      }));

      setEmpreendimentos([...empreendimentos, ...newItems]);
      toast({ title: `${newItems.length} empreendimento(s) importado(s) com sucesso` });
    } catch (error: any) {
      console.error('Erro ao importar empreendimentos:', error);
      toast({
        title: 'Erro ao importar empreendimentos',
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
            <CardTitle>Empreendimentos</CardTitle>
            <CardDescription>Gerencie os empreendimentos do seu portfólio</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingItem(null); setNome(''); }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Empreendimento' : 'Novo Empreendimento'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Empreendimento</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Residencial Jardim Paulista"
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
            {empreendimentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum empreendimento cadastrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empreendimentos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
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
            <ImportacaoGenerica<Empreendimento>
              tipo="empreendimento"
              onImport={handleImport}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
