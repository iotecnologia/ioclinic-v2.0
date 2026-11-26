// Caixa: resultado do mês no mesmo formato que a Dra. já usa (DRE da planilha), com a taxa da maquininha separada.
// Recebido − impostos (alíquota) − taxas da maquininha − custos dos exames − gastos fixos = resultado.
import type { Base, Clinica, FormaPagamento } from '../tipos/modelos';

export const CATEGORIAS_CUSTO = ['Repasse para outros profissionais', 'Material para procedimentos'];
export const CATEGORIA_IMPOSTOS = 'Impostos'; // pagos de fato; no resultado usamos a alíquota

export function taxaMaquininha(c: Clinica, forma: FormaPagamento, parcelas: number, valor: number): number {
  const t = c.taxasCartao;
  const p = forma === 'Débito' ? t.debito : forma === 'Crédito' ? (parcelas >= 7 ? t.creditoLongo : parcelas > 1 ? t.creditoParcelado : t.credito) : 0;
  return Math.round(valor * p) / 100;
}

export interface Resultado {
  recebido: number;
  impostos: number;
  taxas: number;
  custos: number;
  gastosFixos: number;
  resultado: number;
  porServico: { servicoId: string; qtd: number; valor: number }[];
  porCategoria: { categoria: string; valor: number }[];
}

/** mes = "AAAA-MM" */
export function resultadoDoMes(b: Base, mes: string): Resultado {
  const pags = b.pagamentos.filter((p) => p.data.startsWith(mes));
  const recebido = soma(pags.map((p) => p.valor));
  const taxas = soma(pags.map((p) => p.taxa));
  const desp = b.despesas.filter((d) => d.data.startsWith(mes));
  const custoExames = soma(pags.map((p) => b.servicos.find((s) => s.id === p.servicoId)?.custoPorExame ?? 0));
  const custos = custoExames + soma(desp.filter((d) => CATEGORIAS_CUSTO.includes(d.categoria)).map((d) => d.valor));
  const fixos = desp.filter((d) => !CATEGORIAS_CUSTO.includes(d.categoria) && d.categoria !== CATEGORIA_IMPOSTOS);
  const gastosFixos = soma(fixos.map((d) => d.valor));
  const impostos = Math.round(recebido * b.clinica.aliquotaImpostos) / 100;
  const porServ = new Map<string, { qtd: number; valor: number }>();
  for (const p of pags) {
    const r = porServ.get(p.servicoId) ?? { qtd: 0, valor: 0 };
    r.qtd++;
    r.valor += p.valor;
    porServ.set(p.servicoId, r);
  }
  const porCat = new Map<string, number>();
  for (const d of fixos) porCat.set(d.categoria, (porCat.get(d.categoria) ?? 0) + d.valor);
  return {
    recebido, impostos, taxas, custos, gastosFixos,
    resultado: arred(recebido - impostos - taxas - custos - gastosFixos),
    porServico: [...porServ].map(([servicoId, r]) => ({ servicoId, ...r })).sort((x, y) => y.valor - x.valor),
    porCategoria: [...porCat].map(([categoria, valor]) => ({ categoria, valor })).sort((x, y) => y.valor - x.valor),
  };
}

const arred = (v: number) => Math.round(v * 100) / 100;
export const soma = (vs: number[]) => arred(vs.reduce((a, v) => a + v, 0));
