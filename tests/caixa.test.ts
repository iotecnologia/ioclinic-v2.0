import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/dados/gerador';
import { resultadoDoMes, taxaMaquininha } from '../src/regras/caixa';
import { agendarVisita, cancelar, excluirServico, pagamentosDaVisita, receber, remarcar, tirarDaVisita, usosDoServico } from '../src/estado/acoes';
import { servicosDaVisita } from '../src/regras/agenda';

describe('caixa e visitas', () => {
  const base = gerarBase('2026-11-26', '11:00');
  const nova = (b: typeof base, servicoIds: string[], data = '2026-12-09', inicio = '08:00') =>
    agendarVisita(b, { pacienteId: b.pacientes[0].id, servicoIds, data, inicio, convenioId: null, enviarWhatsapp: true, origem: 'pela recepção' });

  it('resultado fecha a conta do DRE', () => {
    const r = resultadoDoMes(base, '2026-10');
    expect(r.recebido).toBeGreaterThan(0);
    expect(r.resultado).toBeCloseTo(r.recebido - r.impostos - r.taxas - r.custos - r.gastosFixos, 2);
  });
  it('taxas reais da maquininha', () => {
    expect(taxaMaquininha(base.clinica, 'PIX', 1, 600)).toBe(0);
    expect(taxaMaquininha(base.clinica, 'Débito', 1, 600)).toBeCloseTo(8.52, 2);
    expect(taxaMaquininha(base.clinica, 'Crédito', 1, 600)).toBeCloseTo(16.8, 2);
    expect(taxaMaquininha(base.clinica, 'Crédito', 6, 600)).toBeCloseTo(18.3, 2);
    expect(taxaMaquininha(base.clinica, 'Crédito', 10, 600)).toBeCloseTo(20.1, 2);
  });
  it('visita com vários serviços: em sequência, uma mensagem, um recebimento repartido por serviço', () => {
    const b = structuredClone(base);
    const vid = nova(b, ['srv_consulta', 'srv_eco']);
    const itens = servicosDaVisita(b.agendamentos, vid);
    expect(itens.map((a) => `${a.inicio}-${a.fim}`)).toEqual(['08:00-09:00', '09:00-09:30']);
    expect(itens[0].eventos.filter((e) => e.texto.includes('Confirmação')).length).toBe(1);
    receber(b, vid, 'PIX', 1, 810); // desconto de 10% sobre 900
    const pgs = pagamentosDaVisita(b, vid);
    expect(pgs.map((p) => p.valor)).toEqual([540, 270]);
  });
  it('Holter marca a retirada no dia seguinte, e ela acompanha remarcar e cancelar', () => {
    const b = structuredClone(base);
    const vid = nova(b, ['srv_holter'], '2026-12-09', '14:00');
    const ret = () => b.agendamentos.find((a) => a.retiradaDe === vid)!;
    expect(ret().data).toBe('2026-12-10');
    expect(ret().valor).toBe(0);
    remarcar(b, vid, '2026-12-14', '08:00');
    expect(ret().data).toBe('2026-12-15');
    cancelar(b, vid, '');
    expect(ret().situacao).toBe('cancelado');
  });
  it('tirar um serviço não cancela o resto e não deixa buraco', () => {
    const b = structuredClone(base);
    const vid = nova(b, ['srv_consulta', 'srv_eco', 'srv_ecodoppler']);
    const eco = servicosDaVisita(b.agendamentos, vid)[1];
    tirarDaVisita(b, eco.id);
    const resto = servicosDaVisita(b.agendamentos, vid);
    expect(resto.map((a) => a.servicoId)).toEqual(['srv_consulta', 'srv_ecodoppler']);
    expect(resto.map((a) => a.inicio)).toEqual(['08:00', '09:00']); // sem buraco
  });
  it('serviço usado não pode ser excluído', () => {
    const b = structuredClone(base);
    expect(usosDoServico(b, 'srv_consulta')).toBeGreaterThan(0);
    expect(() => excluirServico(b, 'srv_consulta')).toThrow();
  });
});
