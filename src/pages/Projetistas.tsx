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
import type { Projetista } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function Projetistas() {
  const [projetistas, setProjetistas] = useState<Projetista[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Projetista | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjetistas();
  }, []);

  const loadProjetistas = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setProjetistas([]);
        return;
      }

      const { data, error } = await supabase
        .from('projetistas')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: Projetista[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        email: item.email || undefined,
        telefone: item.telefone || undefined,
        createdAt: item.created_at,
      }));

      setProjetistas(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar projetistas:', error);
      toast({
        title: 'Erro ao carregar projetistas',
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
          .from('projetistas')
          .update({
            nome,
            email: email || null,
            telefone: telefone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .select('*')
          .single();

        if (error) throw error;

        const updated: Projetista = {
          id: data.id,
          nome: data.nome,
          email: data.email || undefined,
          telefone: data.telefone || undefined,
          createdAt: data.created_at,
        };

        setProjetistas(projetistas.map(item =>
          item.id === updated.id ? updated : item
        ));
        toast({ title: 'Projetista atualizado com sucesso' });
      } else {
        const { data, error } = await supabase
          .from('projetistas')
          .insert({
            nome,
            email: email || null,
            telefone: telefone || null,
            user_id: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;

        const newItem: Projetista = {
          id: data.id,
          nome: data.nome,
          email: data.email || undefined,
          telefone: data.telefone || undefined,
          createdAt: data.created_at,
        };

        setProjetistas([...projetistas, newItem]);
        toast({ title: 'Projetista criado com sucesso' });
      }
    } catch (error: any) {
      console.error('Erro ao salvar projetista:', error);
      toast({
        title: 'Erro ao salvar projetista',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }

    setNome('');
    setEmail('');
    setTelefone('');
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Projetista) => {
    setEditingItem(item);
    setNome(item.nome);
    setEmail(item.email || '');
    setTelefone(item.telefone || '');
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
        .from('projetistas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjetistas(projetistas.filter(item => item.id !== id));
      toast({ title: 'Projetista excluído' });
    } catch (error: any) {
      console.error('Erro ao excluir projetista:', error);
      toast({
        title: 'Erro ao excluir projetista',
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
        .from('projetistas')
        .insert(payload)
        .select('*');

      if (error) throw error;

      const newItems: Projetista[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        email: item.email || undefined,
        telefone: item.telefone || undefined,
        createdAt: item.created_at,
      }));

      setProjetistas([...projetistas, ...newItems]);
      toast({ title: `${newItems.length} projetista(s) importado(s) com sucesso` });
    } catch (error: any) {
      console.error('Erro ao importar projetistas:', error);
      toast({
        title: 'Erro ao importar projetistas',
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
            <CardTitle>Projetistas</CardTitle>
            <CardDescription>Gerencie os projetistas e fornecedores</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingItem(null);
                setNome('');
                setEmail('');
                setTelefone('');
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Projetista' : 'Novo Projetista'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone (opcional)</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98888-8888"
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
            {projetistas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum projetista cadastrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetistas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.email || '-'}</TableCell>
                      <TableCell>{item.telefone || '-'}</TableCell>
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
            <ImportacaoGenerica<Projetista>
              tipo="projetista"
              onImport={handleImport}
              existingData={projetistas}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
