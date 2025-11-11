import { useState } from 'react';
import { useEmpreendimentos } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Empreendimento } from '@/types';

export default function Empreendimentos() {
  const [empreendimentos, setEmpreendimentos] = useEmpreendimentos();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Empreendimento | null>(null);
  const [nome, setNome] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    if (editingItem) {
      setEmpreendimentos(empreendimentos.map(item => 
        item.id === editingItem.id ? { ...item, nome } : item
      ));
      toast({ title: 'Empreendimento atualizado com sucesso' });
    } else {
      const newItem: Empreendimento = {
        id: crypto.randomUUID(),
        nome,
        createdAt: new Date().toISOString(),
      };
      setEmpreendimentos([...empreendimentos, newItem]);
      toast({ title: 'Empreendimento criado com sucesso' });
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

  const handleDelete = (id: string) => {
    setEmpreendimentos(empreendimentos.filter(item => item.id !== id));
    toast({ title: 'Empreendimento excluído' });
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
      </CardContent>
    </Card>
  );
}
