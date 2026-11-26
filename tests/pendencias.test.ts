import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/dados/gerador';
import { pendencias } from '../src/regras/pendencias';
import { receber } from '../src/estado/acoes';

describe('sino de pendências', () => {
  const base = gerarBase('2026-11-26', '11:00');
  it('mostra quem não respondeu, quem pediu para remarcar e quem falta pagar', () => {
    const tipos = new Set(pendencias(base, '2026-11-26').map((p) => p.tipo));
    expect(tipos.has('pediu_remarcar')).toBe(true);
    expect(tipos.has('a_receber')).toBe(true);
  });
  it('recebeu: sai do sino', () => {
    const b = structuredClone(base);
    const p = pendencias(b, '2026-11-26').find((x) => x.tipo === 'a_receber')!;
    receber(b, p.visita.id, 'PIX', 1, p.visita.valor);
    expect(pendencias(b, '2026-11-26').some((x) => x.tipo === 'a_receber' && x.visita.id === p.visita.id)).toBe(false);
  });
});
