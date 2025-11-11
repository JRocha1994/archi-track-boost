import { useState } from 'react';
import { useObras, useEmpreendimentos } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Obra } from '@/types';

export default function Obras() {
  const [obras, setObras] = useObras();
  const [empreendimentos] = useEmpreendimentos();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Obra | null>(null);
  const [nome, setNome] = useState('');
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !empreendimentoId) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (editingItem) {
      setObras(obras.map(item => 
        item.id === editingItem.id ? { ...item, nome, empreendimentoId } : item
      ));
      toast({ title: 'Obra atualizada com sucesso' });
    } else {
      const newItem: Obra = {
        id: crypto.randomUUID(),
        nome,
        empreendimentoId,
        createdAt: new Date().toISOString(),
      };
      setObras([...obras, newItem]);
      toast({ title: 'Obra criada com sucesso' });
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

  const handleDelete = (id: string) => {
    setObras(obras.filter(item => item.id !== id));
    toast({ title: 'Obra excluída' });
  };

  const getEmpreendimentoNome = (id: string) => {
    return empreendimentos.find(e => e.id === id)?.nome || 'N/A';
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
      </CardContent>
    </Card>
  );
}
