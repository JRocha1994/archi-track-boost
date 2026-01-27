import type { StatusEntrega, StatusAnalise } from '@/types';

export function calcularStatusEntrega(dataPrevistaEntrega: string, dataEntrega?: string): StatusEntrega {
  const prevista = new Date(dataPrevistaEntrega);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Normaliza para meia-noite
  prevista.setHours(0, 0, 0, 0);

  // Se tem data de entrega
  if (dataEntrega) {
    const entrega = new Date(dataEntrega);
    entrega.setHours(0, 0, 0, 0);

    // Entregue após o prazo = "Entregue fora do prazo"
    if (entrega > prevista) {
      return 'entregue-fora-prazo';
    }
    // Entregue dentro do prazo
    return 'no-prazo';
  }

  // Não entregue ainda
  // Se hoje > data prevista = "Atrasado" (pendente e com prazo estourado)
  if (hoje > prevista) {
    return 'atrasado';
  }

  // Ainda dentro do prazo, aguardando entrega
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
