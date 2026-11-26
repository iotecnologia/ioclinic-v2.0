import { describe, expect, it } from 'vitest';
import { gradeDoDia, horariosLivres } from '../src/regras/agenda';
import { CLINICA_PADRAO } from '../src/dados/gerador';
import type { Agendamento } from '../src/tipos/modelos';

const ag = (inicio: string, fim: string, situacao: Agendamento['situacao'] = 'confirmado', visitaId = inicio): Agendamento => ({
  id: inicio, clinicaId: 'c', visitaId, profissionalId: 'p', pacienteId: 'x', servicoId: 's', data: '2026-12-03', inicio, fim,
  pagamento: { tipo: 'particular' }, valor: 100, situacao, eventos: [],
});

describe('agenda', () => {
  it('monta o dia com livres entre os pacientes e respeita o almoço', () => {
    const g = gradeDoDia('2026-12-03', [ag('09:00', '10:00'), ag('13:00', '13:30')], CLINICA_PADRAO);
    expect(g.map((l) => (l.tipo === 'livre' ? `livre ${l.inicio}-${l.fim}` : l.visita.inicio))).toEqual(['livre 08:00-09:00', '09:00', 'livre 10:00-12:00', '13:00', 'livre 13:30-18:00']);
  });
  it('visita com vários serviços vira uma linha só, do início do primeiro ao fim do último', () => {
    const g = gradeDoDia('2026-12-03', [ag('09:00', '10:00', 'confirmado', 'v1'), ag('10:00', '10:30', 'confirmado', 'v1')], CLINICA_PADRAO);
    const visitas = g.filter((l) => l.tipo === 'visita');
    expect(visitas).toHaveLength(1);
    expect(visitas[0].tipo === 'visita' && [visitas[0].visita.inicio, visitas[0].visita.fim, visitas[0].visita.valor]).toEqual(['09:00', '10:30', 200]);
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
  it('hoje não oferece horário que já passou', () => {
    expect(horariosLivres('2026-12-03', 30, [], CLINICA_PADRAO, [], undefined, '14:10')[0]).toBe('14:30');
  });
  it('domingo não tem horário', () => {
    expect(horariosLivres('2026-12-06', 30, [], CLINICA_PADRAO)).toEqual([]);
  });
});
