import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/dados/gerador';
import { resultadoDoMes, taxaMaquininha } from '../src/regras/caixa';
import { agendar, receber, excluirServico, usosDoServico } from '../src/estado/acoes';

describe('caixa', () => {
  const base = gerarBase('2026-11-26', '11:00');
  it('resultado fecha a conta do DRE', () => {
    const r = resultadoDoMes(base, '2026-10');
    expect(r.recebido).toBeGreaterThan(0);
    expect(r.resultado).toBeCloseTo(r.recebido - r.impostos - r.taxas - r.custos - r.gastosFixos, 2);
  });
  it('taxa da maquininha por forma', () => {
    expect(taxaMaquininha(base.clinica, 'PIX', 1, 600)).toBe(0);
    expect(taxaMaquininha(base.clinica, 'Débito', 1, 600)).toBeCloseTo(8.52, 2);
    expect(taxaMaquininha(base.clinica, 'Crédito', 2, 600)).toBeCloseTo(18.3, 2);
  });
  it('receber na agenda entra no caixa sozinho', () => {
    const b = structuredClone(base);
    const antes = resultadoDoMes(b, '2026-12').recebido;
    const a = agendar(b, { pacienteId: b.pacientes[0].id, servicoId: 'srv_eco', data: '2026-12-02', inicio: '08:00', convenioId: null, enviarWhatsapp: true, origem: 'pela recepção' });
    receber(b, a.id, 'PIX', 1, 300);
    const pg = b.pagamentos.find((p) => p.agendamentoId === a.id)!;
    expect(pg.valor).toBe(300);
    expect(resultadoDoMes(b, pg.data.slice(0, 7)).recebido).toBeGreaterThanOrEqual(antes);
  });
  it('serviço usado não pode ser excluído', () => {
    const b = structuredClone(base);
    expect(usosDoServico(b, 'srv_consulta')).toBeGreaterThan(0);
    expect(() => excluirServico(b, 'srv_consulta')).toThrow();
  });
});
