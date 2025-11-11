import { useLocalStorage } from './useLocalStorage';
import type { Empreendimento, Obra, Disciplina, Projetista, Revisao } from '@/types';

export function useEmpreendimentos() {
  return useLocalStorage<Empreendimento[]>('empreendimentos', []);
}

export function useObras() {
  return useLocalStorage<Obra[]>('obras', []);
}

export function useDisciplinas() {
  return useLocalStorage<Disciplina[]>('disciplinas', []);
}

export function useProjetistas() {
  return useLocalStorage<Projetista[]>('projetistas', []);
}

export function useRevisoes() {
  return useLocalStorage<Revisao[]>('revisoes', []);
}
