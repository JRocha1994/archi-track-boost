import type { StatusEntrega, StatusAnalise } from '@/types';

export function calcularStatusEntrega(dataPrevistaEntrega: string, dataEntrega?: string): StatusEntrega {
  if (!dataEntrega) return 'pendente';
  
  const prevista = new Date(dataPrevistaEntrega);
  const entrega = new Date(dataEntrega);
  
  return entrega > prevista ? 'atrasado' : 'no-prazo';
}

export function calcularStatusAnalise(dataPrevistaAnalise?: string, dataAnalise?: string): StatusAnalise {
  if (!dataPrevistaAnalise) return 'pendente';
  if (!dataAnalise) return 'pendente';
  
  const prevista = new Date(dataPrevistaAnalise);
  const analise = new Date(dataAnalise);
  
  return analise > prevista ? 'atrasado' : 'no-prazo';
}

export function calcularDataPrevistaAnalise(dataEntrega?: string): string | undefined {
  if (!dataEntrega) return undefined;
  
  const entrega = new Date(dataEntrega);
  entrega.setDate(entrega.getDate() + 5);
  
  return entrega.toISOString().split('T')[0];
}
