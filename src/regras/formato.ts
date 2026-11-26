// Datas e números no padrão brasileiro. Datas sempre como texto AAAA-MM-DD (sem fuso).

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const doisDig = (n: number) => String(n).padStart(2, '0');

export function iso(d: Date): string {
  return `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;
}
export function hoje(): string {
  return iso(new Date());
}
export function agoraHHMM(): string {
  const d = new Date();
  return `${doisDig(d.getHours())}:${doisDig(d.getMinutes())}`;
}
export function paraData(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}
export function somarDias(s: string, n: number): string {
  const d = paraData(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function diaSemana(s: string): number {
  return paraData(s).getDay();
}
export function dataBR(s: string): string {
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
}
export function diaMes(s: string): string {
  return dataBR(s).slice(0, 5);
}
/** "quinta-feira, 26 de novembro" */
export function dataExtenso(s: string): string {
  const d = paraData(s);
  const t = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  return t[0].toUpperCase() + t.slice(1);
}
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function hhmm(min: number): string {
  return `${doisDig(Math.floor(min / 60))}:${doisDig(min % 60)}`;
}
export function idade(nascimento: string, ref = hoje()): number {
  const [a, m, d] = nascimento.split('-').map(Number);
  const [ra, rm, rd] = ref.split('-').map(Number);
  return ra - a - (rm < m || (rm === m && rd < d) ? 1 : 0);
}

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function brl(v: number, sinal = false): string {
  const s = 'R$ ' + fmt.format(Math.abs(v));
  if (v < 0) return '− ' + s;
  return sinal && v > 0 ? '+ ' + s : s;
}
export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
/** Converte "R$ 1.234,50" ou "1234,5" em número. */
export function lerValor(s: string): number {
  const limpo = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}
export function novoId(prefixo: string): string {
  return `${prefixo}_${Math.random().toString(36).slice(2, 10)}`;
}
/** Compara sem acento e sem caixa: para buscas. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
