// Regras da agenda: visitas (serviços em sequência do mesmo paciente), grade do dia, horários livres e avisos.
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

/** Serviços da visita, em ordem de horário. Com `todos=false`, ignora os cancelados (serviço tirado da visita). */
export function servicosDaVisita(ags: Agendamento[], visitaId: string, todos = false): Agendamento[] {
  return ags.filter((a) => a.visitaId === visitaId && (todos || ocupa(a))).sort((x, y) => minutos(x.inicio) - minutos(y.inicio));
}

/** Uma visita vista como um bloco: início do primeiro serviço, fim do último. */
export interface Visita { id: string; data: string; inicio: string; fim: string; pacienteId: string; itens: Agendamento[]; situacao: Situacao; valor: number }

export function montarVisita(itens: Agendamento[]): Visita {
  const vivos = itens.filter(ocupa);
  const base = vivos.length ? vivos : itens;
  const ord = [...base].sort((x, y) => minutos(x.inicio) - minutos(y.inicio));
  return {
    id: ord[0].visitaId, data: ord[0].data, inicio: ord[0].inicio, fim: ord[ord.length - 1].fim, pacienteId: ord[0].pacienteId,
    itens: ord, situacao: ord[0].situacao, valor: ord.reduce((s, a) => s + a.valor, 0),
  };
}

export function visitasDoDia(data: string, ags: Agendamento[], incluirCanceladas = false): Visita[] {
  const porVisita = new Map<string, Agendamento[]>();
  for (const a of ags) if (a.data === data) porVisita.set(a.visitaId, [...(porVisita.get(a.visitaId) ?? []), a]);
  return [...porVisita.values()].map(montarVisita).filter((v) => incluirCanceladas || v.situacao !== 'cancelado')
    .sort((x, y) => minutos(x.inicio) - minutos(y.inicio));
}

export type LinhaDia = { tipo: 'visita'; visita: Visita } | { tipo: 'livre'; inicio: string; fim: string };

/** Monta o dia: visitas em ordem e os intervalos livres dentro do horário de atendimento.
 *  O livre é calculado pelos horários de cada serviço (uma visita pode ter serviços em horários separados). */
export function gradeDoDia(data: string, ags: Agendamento[], clinica: Clinica, bloqueios: Bloqueio[] = []): LinhaDia[] {
  const turnos = bloqueios.some((b) => b.data === data) ? [] : clinica.horarios[diaSemana(data)] ?? [];
  const visitas = visitasDoDia(data, ags);
  const linhas: LinhaDia[] = visitas.map((visita) => ({ tipo: 'visita', visita }));
  const ocupados = ags.filter((a) => a.data === data && ocupa(a)).map((a) => [minutos(a.inicio), minutos(a.fim)] as [number, number]).sort((x, y) => x[0] - y[0]);
  for (const t of turnos) {
    let cursor = minutos(t.inicio);
    const fimTurno = minutos(t.fim);
    for (const [ini, fim] of ocupados) {
      if (fim <= cursor || ini >= fimTurno) continue;
      if (ini > cursor) linhas.push({ tipo: 'livre', inicio: hhmm(cursor), fim: hhmm(ini) });
      cursor = Math.max(cursor, fim);
    }
    if (cursor < fimTurno) linhas.push({ tipo: 'livre', inicio: hhmm(cursor), fim: t.fim });
  }
  const ini = (l: LinhaDia) => minutos(l.tipo === 'livre' ? l.inicio : l.visita.inicio);
  return linhas.sort((x, y) => ini(x) - ini(y) || (x.tipo === 'livre' ? 1 : -1));
}

/** Horários de início possíveis (a partir de `aPartirDe`, quando é hoje) para `duracao` minutos, de 30 em 30,
 *  sem atravessar o almoço nem outro paciente. `ignorarVisita`: ao remarcar, a própria visita não conta como ocupada. */
export function horariosLivres(data: string, duracao: number, ags: Agendamento[], clinica: Clinica, bloqueios: Bloqueio[] = [], ignorarVisita?: string, aPartirDe?: string): string[] {
  if (bloqueios.some((b) => b.data === data)) return [];
  const turnos = clinica.horarios[diaSemana(data)] ?? [];
  const ocupados = ags.filter((a) => a.data === data && ocupa(a) && a.visitaId !== ignorarVisita).map((a) => [minutos(a.inicio), minutos(a.fim)]);
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
