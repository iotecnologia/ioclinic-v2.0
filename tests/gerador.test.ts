import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/dados/gerador';

describe('base fictícia', () => {
  const b = gerarBase('2026-11-26', '11:00');
  it('é determinística', () => {
    expect(gerarBase('2026-11-26', '11:00').agendamentos.length).toBe(b.agendamentos.length);
  });
  it('hoje tem agenda e ninguém se sobrepõe', () => {
    const hoje = b.agendamentos.filter((a) => a.data === '2026-11-26' && a.situacao !== 'cancelado');
    expect(hoje.length).toBeGreaterThanOrEqual(3);
    for (const a of hoje) for (const c of hoje) if (a !== c) expect(a.inicio >= c.fim || a.fim <= c.inicio).toBe(true);
  });
  it('todo pagamento aponta para agendamento atendido', () => {
    for (const p of b.pagamentos) expect(b.agendamentos.find((a) => a.id === p.agendamentoId)?.situacao).toBe('atendido');
  });
  it('tudo pertence à clínica (pronto para várias clínicas)', () => {
    for (const lista of [b.pacientes, b.agendamentos, b.pagamentos, b.despesas, b.servicos]) for (const x of lista) expect(x.clinicaId).toBe(b.clinica.id);
  });
});
