import type { StatusEntrega, StatusAnalise } from '@/types';

export function calcularStatusEntrega(dataEntrega: string, dataEnvio?: string): StatusEntrega {
  if (!dataEnvio) return 'pendente';
  
  const entrega = new Date(dataEntrega);
  const envio = new Date(dataEnvio);
  
  return envio > entrega ? 'atrasado' : 'no-prazo';
}

export function calcularStatusAnalise(dataEnvio?: string, dataAnalise?: string): StatusAnalise {
  if (!dataEnvio) return 'pendente';
  if (!dataAnalise) return 'pendente';
  
  const envio = new Date(dataEnvio);
  const analise = new Date(dataAnalise);
  
  const diffInDays = Math.ceil((analise.getTime() - envio.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffInDays > 7 ? 'atrasado' : 'no-prazo';
}
