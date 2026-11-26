import { describe, expect, it } from 'vitest';
import { gradeDoDia, horariosLivres } from '../src/regras/agenda';
import { CLINICA_PADRAO } from '../src/dados/gerador';
import type { Agendamento } from '../src/tipos/modelos';

const ag = (inicio: string, fim: string, situacao: Agendamento['situacao'] = 'confirmado'): Agendamento => ({
  id: inicio, clinicaId: 'c', profissionalId: 'p', pacienteId: 'x', servicoId: 's', data: '2026-12-03', inicio, fim,
  pagamento: { tipo: 'particular' }, valor: 0, situacao, eventos: [],
});

describe('agenda', () => {
  it('monta o dia com livres entre os pacientes e respeita o almoço', () => {
    const g = gradeDoDia('2026-12-03', [ag('09:00', '10:00'), ag('13:00', '13:30')], CLINICA_PADRAO);
    expect(g.map((l) => (l.tipo === 'livre' ? `livre ${l.inicio}-${l.fim}` : l.ag.inicio))).toEqual(['livre 08:00-09:00', '09:00', 'livre 10:00-12:00', '13:00', 'livre 13:30-18:00']);
  });
  it('consulta de 1h não atravessa o almoço nem outro paciente', () => {
    const livres = horariosLivres('2026-12-03', 60, [ag('09:00', '09:30')], CLINICA_PADRAO);
    expect(livres).not.toContain('11:30');
    expect(livres).not.toContain('08:30');
    expect(livres).toContain('08:00');
    expect(livres).toContain('17:00');
  });
  it('cancelado libera o horário', () => {
    expect(horariosLivres('2026-12-03', 30, [ag('09:00', '09:30', 'cancelado')], CLINICA_PADRAO)).toContain('09:00');
  });
  it('domingo não tem horário', () => {
    expect(horariosLivres('2026-12-06', 30, [], CLINICA_PADRAO)).toEqual([]);
  });
});
