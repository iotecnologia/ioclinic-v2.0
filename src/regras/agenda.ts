// Regras da agenda: grade do dia (ocupados + livres), horários livres para um serviço e avisos.
import type { Agendamento, Clinica, Situacao } from '../tipos/modelos';
import { diaSemana, hhmm, minutos } from './formato';

export const NOME_SITUACAO: Record<Situacao, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  sem_resposta: 'Sem resposta',
  pediu_remarcar: 'Pediu para remarcar',
  na_clinica: 'Na clínica',
  atendido: 'Atendido',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};
/** Situações que pedem ação da recepção. */
export const PEDE_ATENCAO: Situacao[] = ['sem_resposta', 'pediu_remarcar'];

export interface Bloqueio { data: string; motivo: string }

export function ocupa(a: Agendamento): boolean {
  return a.situacao !== 'cancelado';
}

export type LinhaDia = { tipo: 'agendamento'; ag: Agendamento } | { tipo: 'livre'; inicio: string; fim: string };

/** Monta o dia: agendamentos em ordem e, entre eles, os intervalos livres dentro do horário de atendimento. */
export function gradeDoDia(data: string, ags: Agendamento[], clinica: Clinica, bloqueios: Bloqueio[] = []): LinhaDia[] {
  const turnos = bloqueios.some((b) => b.data === data) ? [] : clinica.horarios[diaSemana(data)] ?? [];
  const doDia = ags.filter((a) => a.data === data && ocupa(a)).sort((x, y) => minutos(x.inicio) - minutos(y.inicio));
  const linhas: LinhaDia[] = [];
  for (const t of turnos) {
    let cursor = minutos(t.inicio);
    const fimTurno = minutos(t.fim);
    for (const a of doDia.filter((a) => minutos(a.inicio) >= minutos(t.inicio) && minutos(a.inicio) < fimTurno)) {
      if (minutos(a.inicio) > cursor) linhas.push({ tipo: 'livre', inicio: hhmm(cursor), fim: a.inicio });
      linhas.push({ tipo: 'agendamento', ag: a });
      cursor = Math.max(cursor, minutos(a.fim));
    }
    if (cursor < fimTurno) linhas.push({ tipo: 'livre', inicio: hhmm(cursor), fim: t.fim });
  }
  // agendamentos fora do horário (encaixes) também aparecem
  for (const a of doDia) if (!linhas.some((l) => l.tipo === 'agendamento' && l.ag.id === a.id)) linhas.push({ tipo: 'agendamento', ag: a });
  return linhas.sort((x, y) => minutos(x.tipo === 'livre' ? x.inicio : x.ag.inicio) - minutos(y.tipo === 'livre' ? y.inicio : y.ag.inicio));
}

/** Horários de início possíveis (a partir de `aPartirDe`, quando é hoje) para um serviço de `duracao` minutos (de 30 em 30), sem atravessar o almoço nem outro paciente. */
export function horariosLivres(data: string, duracao: number, ags: Agendamento[], clinica: Clinica, bloqueios: Bloqueio[] = [], ignorarId?: string, aPartirDe?: string): string[] {
  if (bloqueios.some((b) => b.data === data)) return [];
  const turnos = clinica.horarios[diaSemana(data)] ?? [];
  const ocupados = ags.filter((a) => a.data === data && ocupa(a) && a.id !== ignorarId).map((a) => [minutos(a.inicio), minutos(a.fim)]);
  const livres: string[] = [];
  for (const t of turnos) {
    for (let ini = minutos(t.inicio); ini + duracao <= minutos(t.fim); ini += 30) {
      const fim = ini + duracao;
      if (aPartirDe && ini < minutos(aPartirDe)) continue;
      if (!ocupados.some(([a, b]) => ini < b && fim > a)) livres.push(hhmm(ini));
    }
  }
  return livres;
}
