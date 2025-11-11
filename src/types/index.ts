export interface Empreendimento {
  id: string;
  nome: string;
  createdAt: string;
}

export interface Obra {
  id: string;
  nome: string;
  empreendimentoId: string;
  createdAt: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  createdAt: string;
}

export interface Projetista {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  createdAt: string;
}

export type StatusEntrega = "no-prazo" | "atrasado" | "pendente";
export type StatusAnalise = "no-prazo" | "atrasado" | "pendente";

export interface Revisao {
  id: string;
  empreendimentoId: string;
  obraId: string;
  disciplinaId: string;
  projetistaId: string;
  numeroRevisao: string;
  dataEntrega: string;
  dataEnvio?: string;
  dataAnalise?: string;
  justificativa: string;
  statusEntrega: StatusEntrega;
  statusAnalise: StatusAnalise;
  createdAt: string;
}
