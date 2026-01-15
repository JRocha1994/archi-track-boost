import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { calcularStatusAnalise, calcularStatusEntrega, calcularDataPrevistaAnalise } from '@/lib/statusCalculator';
import type { Disciplina, Empreendimento, Obra, Projetista, Revisao } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Send, Square, Copy, Trash2, Bot } from 'lucide-react';

interface ParsedRevisaoDraft {
  empreendimentoId?: string;
  obraId?: string;
  disciplinaId?: string;
  projetistaId?: string;
  empreendimentoNome?: string | null;
  obraNome?: string | null;
  disciplinaNome?: string | null;
  projetistaNome?: string | null;
  numeroRevisao?: number;
  dataPrevistaEntrega?: string;
  dataEntrega?: string;
  dataPrevistaAnalise?: string;
  dataAnalise?: string;
  justificativa?: string;
}

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function AssistenteIA() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Olá! Envie um texto descrevendo as revisões ou envie um áudio. Eu vou entender e propor um resumo estruturado para você revisar e salvar.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [drafts, setDrafts] = useState<ParsedRevisaoDraft[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null); // não usado após gravação

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [projetistas, setProjetistas] = useState<Projetista[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = session?.user;
        if (!user) return;

        const [empRes, obrasRes, discRes, projRes, revRes] = await Promise.all([
          supabase.from('empreendimentos').select('*').order('created_at', { ascending: true }),
          supabase.from('obras').select('*').order('created_at', { ascending: true }),
          supabase.from('disciplinas').select('*').order('created_at', { ascending: true }),
          supabase.from('projetistas').select('*').order('created_at', { ascending: true }),
          supabase.from('revisoes').select('*').order('created_at', { ascending: false }),
        ]);

        if (empRes.error) throw empRes.error;
        if (obrasRes.error) throw obrasRes.error;
        if (discRes.error) throw discRes.error;
        if (projRes.error) throw projRes.error;
        if (revRes.error) throw revRes.error;

        setEmpreendimentos((empRes.data || []).map((i: any) => ({ id: i.id, nome: i.nome, createdAt: i.created_at })));
        setObras((obrasRes.data || []).map((i: any) => ({ id: i.id, nome: i.nome, empreendimentoId: i.empreendimento_id, createdAt: i.created_at })));
        setDisciplinas((discRes.data || []).map((i: any) => ({ id: i.id, nome: i.nome, createdAt: i.created_at })));
        setProjetistas((projRes.data || []).map((i: any) => ({ id: i.id, nome: i.nome, email: i.email || undefined, telefone: i.telefone || undefined, createdAt: i.created_at })));
        setRevisoes((revRes.data || []).map((i: any) => ({
          id: i.id,
          empreendimentoId: i.empreendimento_id,
          obraId: i.obra_id,
          disciplinaId: i.disciplina_id,
          projetistaId: i.projetista_id,
          numeroRevisao: i.numero_revisao,
          dataPrevistaEntrega: i.data_prevista_entrega,
          dataEntrega: i.data_entrega || undefined,
          dataPrevistaAnalise: i.data_prevista_analise || undefined,
          dataAnalise: i.data_analise || undefined,
          justificativa: i.justificativa,
          statusEntrega: i.status_entrega,
          statusAnalise: i.status_analise,
          createdAt: i.created_at,
        })));
      } catch (err: any) {
        console.error('Erro ao carregar catálogos:', err);
        toast({ title: 'Erro ao carregar dados', description: err.message || 'Tente novamente.', variant: 'destructive' });
      }
    };
    loadAll();
  }, [toast]);

  const obrasFiltered = useMemo(() => {
    return (empId?: string) => obras.filter(o => o.empreendimentoId === (empId || ''));
  }, [obras]);

  const getNome = (id: string, list: any[]) => list.find(item => item.id === id)?.nome || '';

  const handleDeleteRevisao = async (id: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = session?.user;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('revisoes').delete().eq('id', id);
      if (error) throw error;
      setRevisoes(revisoes.filter(r => r.id !== id));
      toast({ title: 'Revisão excluída' });
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      toast({ title: 'Erro ao excluir', description: err.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDuplicateRevisao = (revisao: Revisao) => {
    const revisoesRelacionadas = revisoes.filter(
      r => r.empreendimentoId === revisao.empreendimentoId &&
           r.obraId === revisao.obraId &&
           r.disciplinaId === revisao.disciplinaId &&
           r.projetistaId === revisao.projetistaId
    );
    const numerosRevisao = revisoesRelacionadas.map(r => r.numeroRevisao);
    const maiorNumero = Math.max(...numerosRevisao, 0);
    const novoNumero = maiorNumero + 1;
    setDrafts((prev) => [...prev, {
      empreendimentoId: revisao.empreendimentoId,
      obraId: revisao.obraId,
      disciplinaId: revisao.disciplinaId,
      projetistaId: revisao.projetistaId,
      numeroRevisao: novoNumero,
      dataPrevistaEntrega: '',
      dataEntrega: '',
      dataPrevistaAnalise: '',
      dataAnalise: '',
      justificativa: '',
    }]);
    toast({ title: 'Nova revisão adicionada aos drafts' });
  };

  // Utils de matching de nomes -> IDs
  const normalize = (s?: string | null) => (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[.,;:()\[\]\-_/]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = (s: string) => normalize(s).split(' ').filter(Boolean);
  const acronym = (s: string) => tokens(s).map(t => t[0]).join('');
  const overlapScore = (a: string[], b: string[]) => {
    const setA = new Set(a);
    const setB = new Set(b);
    let inter = 0;
    for (const t of setA) if (setB.has(t)) inter++;
    const union = setA.size + setB.size - inter;
    return union === 0 ? 0 : Math.round((inter / union) * 100);
  };

  const findBestIdByName = <T extends { id: string; nome: string }>(name: string | null | undefined, list: T[]) => {
    const n = normalize(name);
    if (!n) return undefined;
    const nTokens = tokens(n);
    const nAcr = acronym(n);
    let best: { id: string; score: number } | undefined;
    for (const item of list) {
      const li = normalize(item.nome);
      const liTokens = tokens(li);
      const liAcr = acronym(li);
      let score = 0;
      if (li === n) score = 100;
      else {
        const jacc = overlapScore(nTokens, liTokens); // token overlap
        const acrMatch = (nAcr && liAcr && (nAcr === liAcr || liAcr.startsWith(nAcr) || nAcr.startsWith(liAcr))) ? 20 : 0;
        const startMatch = (li.startsWith(n) || n.startsWith(li)) ? 10 : 0;
        const contain = (li.includes(n) || n.includes(li)) ? 5 : 0;
        score = Math.min(100, jacc + acrMatch + startMatch + contain);
      }
      if (!best || score > best.score) best = { id: item.id, score };
    }
    return best && best.score >= 55 ? best.id : undefined;
  };

  const mapNamesToIds = (incoming: ParsedRevisaoDraft): ParsedRevisaoDraft => {
    const withEmpId = incoming.empreendimentoId || findBestIdByName(incoming.empreendimentoNome, empreendimentos);
    const withObraId = incoming.obraId || findBestIdByName(incoming.obraNome, obras.filter(o => !withEmpId || o.empreendimentoId === withEmpId));
    const withDiscId = incoming.disciplinaId || findBestIdByName(incoming.disciplinaNome, disciplinas);
    const withProjId = incoming.projetistaId || findBestIdByName(incoming.projetistaNome, projetistas);
    return { ...incoming, empreendimentoId: withEmpId, obraId: withObraId, disciplinaId: withDiscId, projetistaId: withProjId };
  };

  const handleSendText = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      // Preparar contexto das revisões existentes
      const contexto = revisoes.map(r => ({
        empreendimento: getNome(r.empreendimentoId, empreendimentos),
        obra: getNome(r.obraId, obras),
        disciplina: getNome(r.disciplinaId, disciplinas),
        projetista: getNome(r.projetistaId, projetistas),
        numeroRevisao: r.numeroRevisao,
      }));

      const { data, error } = await (supabase.functions as any).invoke('parse-revisao', {
        body: { prompt: userMsg.content, contexto },
      });
      if (error) throw error;
      const parsedDrafts: ParsedRevisaoDraft[] = data?.drafts || [];
      const resolved = parsedDrafts.map(d => mapNamesToIds(d));
      setDrafts((prev) => [...prev, ...resolved]);
      setMessages((prev) => [...prev, { role: 'assistant', content: `${resolved.length} revisão(s) extraída(s). Revise abaixo e ajuste se necessário.` }]);
    } catch (err: any) {
      console.error('Erro ao analisar texto:', err);
      toast({ title: 'Erro ao processar texto', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const sendAudioBlob = async (blob: Blob) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: `[Áudio gravado enviado]` }]);
    try {
      const base64 = await blobToBase64(blob);
      const { data, error } = await (supabase.functions as any).invoke('transcrever', {
        body: { audioBase64: base64, filename: 'gravacao.webm', mimeType: blob.type || 'audio/webm' },
      });
      if (error) throw error;
      const transcript: string = data?.transcript || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Transcrição: ${transcript}` }]);

      // Preparar contexto das revisões existentes
      const contexto = revisoes.map(r => ({
        empreendimento: getNome(r.empreendimentoId, empreendimentos),
        obra: getNome(r.obraId, obras),
        disciplina: getNome(r.disciplinaId, disciplinas),
        projetista: getNome(r.projetistaId, projetistas),
        numeroRevisao: r.numeroRevisao,
      }));

      const { data: parsed, error: parseErr } = await (supabase.functions as any).invoke('parse-revisao', {
        body: { prompt: transcript, contexto },
      });
      if (parseErr) throw parseErr;
      const parsedDrafts: ParsedRevisaoDraft[] = parsed?.drafts || [];
      const resolved = parsedDrafts.map(d => mapNamesToIds(d));
      setDrafts((prev) => [...prev, ...resolved]);
      setMessages((prev) => [...prev, { role: 'assistant', content: `${resolved.length} revisão(s) extraída(s) do áudio. Revise abaixo.` }]);
    } catch (err: any) {
      console.error('Erro com áudio:', err);
      toast({ title: 'Erro ao processar áudio', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecord = async () => {
    try {
      if (!isRecording) {
        // Start
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const mr = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mr.onstop = async () => {
          try {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            await sendAudioBlob(blob);
          } finally {
            audioChunksRef.current = [];
            mediaStreamRef.current?.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
            mediaRecorderRef.current = null;
          }
        };
        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);
        toast({ title: 'Gravando...', description: 'Clique em Parar para enviar.' });
      } else {
        // Stop
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
      }
    } catch (err: any) {
      console.error('Permissão/erro de gravação:', err);
      toast({ title: 'Não foi possível acessar o microfone', description: err.message || 'Verifique permissões do navegador.', variant: 'destructive' });
      // cleanup
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    if (drafts.length === 0) return;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = session?.user;
      if (!user) {
        toast({ title: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }

      // Validação e preparação em lote
      const toInsert = drafts.map((d, idx) => {
        if (!d.empreendimentoId || !d.obraId || !d.disciplinaId || !d.projetistaId ||
            d.numeroRevisao === undefined || d.numeroRevisao === null || !d.dataPrevistaEntrega || !d.justificativa) {
          throw new Error(`Linha ${idx + 1}: campos obrigatórios faltando.`);
        }
        const dataPrevistaAnalise = calcularDataPrevistaAnalise(d.dataEntrega);
        const statusEntrega = calcularStatusEntrega(d.dataPrevistaEntrega!, d.dataEntrega);
        const statusAnalise = calcularStatusAnalise(dataPrevistaAnalise, d.dataAnalise);
        return {
          empreendimento_id: d.empreendimentoId!,
          obra_id: d.obraId!,
          disciplina_id: d.disciplinaId!,
          projetista_id: d.projetistaId!,
          numero_revisao: Number(d.numeroRevisao!),
          data_prevista_entrega: d.dataPrevistaEntrega!,
          data_entrega: d.dataEntrega || null,
          data_prevista_analise: dataPrevistaAnalise || null,
          data_analise: d.dataAnalise || null,
          justificativa: d.justificativa!,
          status_entrega: statusEntrega,
          status_analise: statusAnalise,
          user_id: user.id,
        };
      });

      const { error } = await supabase.from('revisoes').insert(toInsert);
      if (error) throw error;
      toast({ title: 'Revisões salvas com sucesso' });
      setDrafts([]);
      // Recarregar revisões
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (s2?.user) {
        const { data: revData } = await supabase.from('revisoes').select('*').eq('user_id', s2.user.id).order('created_at', { ascending: false });
        if (revData) {
          setRevisoes(revData.map((i: any) => ({
            id: i.id,
            empreendimentoId: i.empreendimento_id,
            obraId: i.obra_id,
            disciplinaId: i.disciplina_id,
            projetistaId: i.projetista_id,
            numeroRevisao: i.numero_revisao,
            dataPrevistaEntrega: i.data_prevista_entrega,
            dataEntrega: i.data_entrega || undefined,
            dataPrevistaAnalise: i.data_prevista_analise || undefined,
            dataAnalise: i.data_analise || undefined,
            justificativa: i.justificativa,
            statusEntrega: i.status_entrega,
            statusAnalise: i.status_analise,
            createdAt: i.created_at,
          })));
        }
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Registros salvos. Você pode enviar mais instruções.' }]);
    } catch (err: any) {
      console.error('Erro ao salvar revisão:', err);
      toast({ title: 'Erro ao salvar', description: err.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assistente IA</h1>
        <p className="text-muted-foreground">Converse por texto ou áudio para inserir novas revisões. Revise o resumo proposto antes de salvar.</p>
      </div>

      <div className="space-y-6">
        {/* Revisões Salvas */}
        <Card>
          <CardHeader>
            <CardTitle>Revisões Salvas</CardTitle>
            <CardDescription>Todos os registros já salvos no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {revisoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma revisão salva ainda.</p>
            ) : (
              <div className="border rounded-md overflow-auto max-h-[50vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Empreendimento</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Projetista</TableHead>
                      <TableHead>Revisão</TableHead>
                      <TableHead>Prev. Entrega</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Prev. Análise</TableHead>
                      <TableHead>Data Análise</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revisoes.map((rev) => (
                      <TableRow key={rev.id}>
                        <TableCell>{getNome(rev.empreendimentoId, empreendimentos)}</TableCell>
                        <TableCell>{getNome(rev.obraId, obras)}</TableCell>
                        <TableCell>{getNome(rev.disciplinaId, disciplinas)}</TableCell>
                        <TableCell>{getNome(rev.projetistaId, projetistas)}</TableCell>
                        <TableCell>{rev.numeroRevisao}</TableCell>
                        <TableCell>{rev.dataPrevistaEntrega}</TableCell>
                        <TableCell>{rev.dataEntrega || '-'}</TableCell>
                        <TableCell>{rev.dataPrevistaAnalise || '-'}</TableCell>
                        <TableCell>{rev.dataAnalise || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{rev.justificativa}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicateRevisao(rev)} title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRevisao(rev.id)} title="Remover">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drafts Sugeridos pela IA */}
        <Card>
          <CardHeader>
            <CardTitle>Novos Registros (Sugeridos pela IA)</CardTitle>
            <CardDescription>Edite e ajuste antes de salvar. Você pode acumular várias linhas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada para revisar ainda. Envie uma mensagem ou áudio.</p>
            ) : (
              <div className="space-y-3">
                <div className="border rounded-md overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="min-w-[200px]">Empreendimento *</TableHead>
                        <TableHead className="min-w-[180px]">Obra *</TableHead>
                        <TableHead className="min-w-[180px]">Disciplina *</TableHead>
                        <TableHead className="min-w-[180px]">Projetista *</TableHead>
                        <TableHead className="min-w-[120px]">Revisão *</TableHead>
                        <TableHead className="min-w-[150px]">Prev. Entrega *</TableHead>
                        <TableHead className="min-w-[150px]">Entrega</TableHead>
                        <TableHead className="min-w-[160px]">Prev. Análise</TableHead>
                        <TableHead className="min-w-[150px]">Data Análise</TableHead>
                        <TableHead className="min-w-[260px]">Justificativa *</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={row.empreendimentoId || ''} onValueChange={(v) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, empreendimentoId: v, obraId: '' } : r))}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {empreendimentos.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={row.obraId || ''} onValueChange={(v) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, obraId: v } : r))}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {obrasFiltered(row.empreendimentoId).map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={row.disciplinaId || ''} onValueChange={(v) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, disciplinaId: v } : r))}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={row.projetistaId || ''} onValueChange={(v) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, projetistaId: v } : r))}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {projetistas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="h-8" value={row.numeroRevisao ?? ''} min={0} step={1}
                              onChange={(e) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, numeroRevisao: e.target.value === '' ? undefined : parseInt(e.target.value) } : r))} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" value={row.dataPrevistaEntrega || ''}
                              onChange={(e) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, dataPrevistaEntrega: e.target.value } : r))} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" value={row.dataEntrega || ''}
                              onChange={(e) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, dataEntrega: e.target.value, dataPrevistaAnalise: calcularDataPrevistaAnalise(e.target.value) || '' } : r))} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" value={row.dataPrevistaAnalise || ''} disabled title="Calculado automaticamente" />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" value={row.dataAnalise || ''}
                              onChange={(e) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, dataAnalise: e.target.value } : r))} />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8" value={row.justificativa || ''}
                              onChange={(e) => setDrafts(drafts.map((r, idx) => idx===i ? { ...r, justificativa: e.target.value } : r))} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setDrafts(drafts.filter((_, idx) => idx !== i))}>Remover</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="pt-2">
                  <Button className="w-full" onClick={handleSave}>Salvar Todas</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Chat
            </CardTitle>
            <CardDescription>Descreva as revisões que deseja registrar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[360px] border rounded-md p-3 overflow-auto bg-muted/20">
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === 'user' ? 'text-right' : ''}>
                    <div className={m.role === 'user' ? 'inline-block bg-primary text-primary-foreground px-3 py-2 rounded-md' : 'inline-block bg-card border px-3 py-2 rounded-md'}>
                      <span className="whitespace-pre-wrap text-sm">{m.content}</span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div>
                    <div className="inline-block bg-card border px-3 py-2 rounded-md text-sm opacity-80">Processando...</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ex.: Registrar revisão 2 do projeto X, obra Y, disciplina Elétrica, projetista Fulano, entrega prevista 2025-11-30, justificativa atraso do fornecedor."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[72px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1" />
              <Button variant={isRecording ? "destructive" : "secondary"} onClick={handleToggleRecord} disabled={isLoading}>
                {isRecording ? (<><Square className="h-4 w-4 mr-2" /> Parar</>) : (<><Mic className="h-4 w-4 mr-2" /> Gravar</>)}
              </Button>
              <Button onClick={handleSendText} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4 mr-2" /> Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
