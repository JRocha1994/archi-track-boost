import type { StatusEntrega, StatusAnalise } from '@/types';

export function calcularStatusEntrega(dataPrevistaEntrega: string, dataEntrega?: string): StatusEntrega {
  const prevista = new Date(dataPrevistaEntrega);
  prevista.setHours(0, 0, 0, 0);

  // Se tem data de entrega
  if (dataEntrega) {
    const entrega = new Date(dataEntrega);
    entrega.setHours(0, 0, 0, 0);

    // Entregue depois do prazo: Dt. de Entrega > Dt. Prevista Entrega
    if (entrega > prevista) {
      return 'entregue-depois-do-prazo';
    }

    // No prazo: Dt. de Entrega <= Dt. Prevista Entrega
    return 'no-prazo';
  }

  // Dt. de Entrega vazia - verificar se está atrasado
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Atrasado: Dt. Prevista Entrega < Hoje e Dt. de Entrega vazia
  if (prevista < hoje) {
    return 'atrasado';
  }

  // Pendente: Dt. Prevista Entrega >= Hoje e Dt. de Entrega vazia
  return 'pendente';
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
