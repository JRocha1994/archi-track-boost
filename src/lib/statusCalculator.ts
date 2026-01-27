import type { StatusEntrega, StatusAnalise } from '@/types';

export function calcularStatusEntrega(dataPrevistaEntrega: string, dataEntrega?: string): StatusEntrega {
  // 1. Pendente: Dt. de Entrega vazia
  if (!dataEntrega) {
    return 'pendente';
  }

  // 2 e 3. Comparação de datas (quando ambas estão preenchidas)
  const prevista = new Date(dataPrevistaEntrega);
  const entrega = new Date(dataEntrega);

  // Entregue depois do prazo: Dt. de Entrega > Dt. Prevista Entrega
  if (entrega > prevista) {
    return 'entregue-depois-do-prazo';
  }

  // No prazo: Dt. de Entrega <= Dt. Prevista Entrega
  return 'no-prazo';
}

export function calcularStatusAnalise(dataPrevistaAnalise?: string, dataAnalise?: string): StatusAnalise {
  if (!dataPrevistaAnalise) return 'pendente';
  if (!dataAnalise) return 'pendente';

  const prevista = new Date(dataPrevistaAnalise);
  const analise = new Date(dataAnalise);

  return analise > prevista ? 'atrasado' : 'no-prazo';
}

export function calcularDataPrevistaAnalise(dataEntrega?: string, prazoMedioAnalise: number = 5): string | undefined {
  if (!dataEntrega) return undefined;

  const entrega = new Date(dataEntrega);
  entrega.setDate(entrega.getDate() + prazoMedioAnalise);

  return entrega.toISOString().split('T')[0];
}
