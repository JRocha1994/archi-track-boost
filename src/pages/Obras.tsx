import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImportacaoGenerica } from '@/components/ImportacaoGenerica';
import type { Empreendimento, Obra } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function Obras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Obra | null>(null);
  const [nome, setNome] = useState('');
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEmpreendimentos();
    loadObras();
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

  const loadObras = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setObras([]);
        return;
      }

      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: Obra[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        empreendimentoId: item.empreendimento_id,
        createdAt: item.created_at,
      }));

      setObras(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error);
      toast({
        title: 'Erro ao carregar obras',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !empreendimentoId) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
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
          .from('obras')
          .update({
            nome,
            empreendimento_id: empreendimentoId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .select('*')
          .single();

        if (error) throw error;

        const updated: Obra = {
          id: data.id,
          nome: data.nome,
          empreendimentoId: data.empreendimento_id,
          createdAt: data.created_at,
        };

        setObras(obras.map(item => 
          item.id === updated.id ? updated : item
        ));
        toast({ title: 'Obra atualizada com sucesso' });
      } else {
        const { data, error } = await supabase
          .from('obras')
          .insert({
            nome,
            empreendimento_id: empreendimentoId,
            user_id: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;

        const newItem: Obra = {
          id: data.id,
          nome: data.nome,
          empreendimentoId: data.empreendimento_id,
          createdAt: data.created_at,
        };

        setObras([...obras, newItem]);
        toast({ title: 'Obra criada com sucesso' });
      }
    } catch (error: any) {
      console.error('Erro ao salvar obra:', error);
      toast({
        title: 'Erro ao salvar obra',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }

    setNome('');
    setEmpreendimentoId('');
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Obra) => {
    setEditingItem(item);
    setNome(item.nome);
    setEmpreendimentoId(item.empreendimentoId);
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
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setObras(obras.filter(item => item.id !== id));
      toast({ title: 'Obra excluída' });
    } catch (error: any) {
      console.error('Erro ao excluir obra:', error);
      toast({
        title: 'Erro ao excluir obra',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEmpreendimentoNome = (id: string) => {
    return empreendimentos.find(e => e.id === id)?.nome || 'N/A';
  };

  const handleImport = async (items: Array<{ nome: string; empreendimentoId: string }>) => {
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
        empreendimento_id: item.empreendimentoId,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('obras')
        .insert(payload)
        .select('*');

      if (error) throw error;

      const newItems: Obra[] = (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        empreendimentoId: item.empreendimento_id,
        createdAt: item.created_at,
      }));

      setObras([...obras, ...newItems]);
      toast({ title: `${newItems.length} obra(s) importada(s) com sucesso` });
    } catch (error: any) {
      console.error('Erro ao importar obras:', error);
      toast({
        title: 'Erro ao importar obras',
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
            <CardTitle>Obras</CardTitle>
            <CardDescription>Gerencie as obras vinculadas aos empreendimentos</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingItem(null); setNome(''); setEmpreendimentoId(''); }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="empreendimento">Empreendimento</Label>
                  <Select value={empreendimentoId} onValueChange={setEmpreendimentoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o empreendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {empreendimentos.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nome">Nome da Obra</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Torre A"
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
            {obras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma obra cadastrada ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obras.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{getEmpreendimentoNome(item.empreendimentoId)}</TableCell>
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
            <ImportacaoGenerica<Obra>
              tipo="obra"
              onImport={handleImport}
              empreendimentos={empreendimentos}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
