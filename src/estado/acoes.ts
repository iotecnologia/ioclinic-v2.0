// Ações do sistema. Recebem a base (cópia) e alteram. Ficam fora das telas para serem testáveis
// e para o dev do backend saber exatamente o que cada botão faz.
// Agenda trabalha por VISITA (visitaId): os serviços do mesmo paciente em sequência andam juntos.
import type { Agendamento, Base, Despesa, Documento, FormaPagamento, Paciente, RegistroAtendimento, Servico } from '../tipos/modelos';
import { agoraHHMM, dataBR, diaSemana, hhmm, hoje, minutos, novoId, somarDias } from '../regras/formato';
import { taxaMaquininha } from '../regras/caixa';
import { horariosLivres, servicosDaVisita } from '../regras/agenda';

const agora = () => `${hoje()}T${agoraHHMM()}`;
export const ID_RETIRADA = 'srv_retirada';

function itens(b: Base, visitaId: string, todos = false): Agendamento[] {
  const v = servicosDaVisita(b.agendamentos, visitaId, todos);
  if (!v.length) throw new Error('Visita não encontrada');
  return v;
}
/** Registra o mesmo fato em todos os serviços da visita (o histórico aparece uma vez só na tela). */
function evento(lista: Agendamento[], texto: string) {
  for (const a of lista) a.eventos.push({ quando: agora(), texto });
}
/** Retirada de aparelho ligada a esta visita (Holter/MAPA), se houver. */
function retiradaDa(b: Base, visitaId: string): Agendamento[] {
  return b.agendamentos.filter((a) => a.retiradaDe === visitaId && a.situacao !== 'cancelado');
}

export interface NovaVisita {
  pacienteId: string;
  servicoIds: string[]; // na ordem em que serão feitos
  data: string;
  inicio: string;
  convenioId: string | null; // null = particular
  enviarWhatsapp: boolean;
  origem: string; // "pela recepção" | "pela Dra."
}

export function valorDoServico(s: Servico, convenioId: string | null): number {
  return convenioId ? s.valoresConvenio[convenioId] ?? 0 : s.valorParticular;
}

/** Próximo dia de atendimento depois de `data` e o horário da retirada (o mesmo, se livre; senão o primeiro livre). */
export function horarioDaRetirada(b: Base, data: string, inicio: string, duracao: number): { data: string; inicio: string } | null {
  for (let i = 1; i <= 7; i++) {
    const d = somarDias(data, i);
    if (!b.clinica.horarios[diaSemana(d)]) continue;
    const livres = horariosLivres(d, duracao, b.agendamentos, b.clinica);
    if (!livres.length) continue;
    return { data: d, inicio: livres.includes(inicio) ? inicio : livres.find((h) => h >= inicio) ?? livres[0] };
  }
  return null;
}

/** Agenda a visita (um ou mais serviços em sequência). Holter/MAPA geram a retirada no dia seguinte. Devolve o visitaId. */
export function agendarVisita(b: Base, n: NovaVisita): string {
  const visitaId = novoId('vis');
  const servicos = n.servicoIds.map((id) => b.servicos.find((s) => s.id === id)!);
  let ini = minutos(n.inicio);
  const criados: Agendamento[] = [];
  for (const s of servicos) {
    criados.push({
      id: novoId('ag'), clinicaId: b.clinica.id, visitaId, profissionalId: b.profissionais[0].id, pacienteId: n.pacienteId, servicoId: s.id,
      data: n.data, inicio: hhmm(ini), fim: hhmm(ini + s.duracaoMin),
      pagamento: n.convenioId ? { tipo: 'convenio', convenioId: n.convenioId } : { tipo: 'particular' },
      valor: valorDoServico(s, n.convenioId), situacao: n.enviarWhatsapp ? 'agendado' : 'confirmado', eventos: [],
    });
    ini += s.duracaoMin;
  }
  b.agendamentos.push(...criados);
  evento(criados, `Agendado ${n.origem}`);
  if (n.enviarWhatsapp) evento(criados, 'Confirmação enviada pelo WhatsApp');

  const comRetirada = servicos.filter((s) => s.retiradaDiaSeguinte);
  const ret = b.servicos.find((s) => s.id === ID_RETIRADA);
  if (comRetirada.length && ret) {
    const quando = horarioDaRetirada(b, n.data, n.inicio, ret.duracaoMin);
    if (quando) {
      const r: Agendamento = {
        id: novoId('ag'), clinicaId: b.clinica.id, visitaId: novoId('vis'), profissionalId: b.profissionais[0].id, pacienteId: n.pacienteId,
        servicoId: ret.id, data: quando.data, inicio: quando.inicio, fim: hhmm(minutos(quando.inicio) + ret.duracaoMin),
        pagamento: { tipo: 'particular' }, valor: 0, situacao: n.enviarWhatsapp ? 'agendado' : 'confirmado', retiradaDe: visitaId,
        eventos: [{ quando: agora(), texto: `Agendada sozinha: retirada do ${comRetirada.map((s) => s.nome).join(' e ')}` }],
      };
      if (n.enviarWhatsapp) r.eventos.push({ quando: agora(), texto: 'Avisado junto com a confirmação' });
      b.agendamentos.push(r);
      evento(criados, `Retirada do aparelho marcada para ${dataBR(quando.data)} às ${quando.inicio}`);
    }
  }
  return visitaId;
}

export function confirmarManual(b: Base, visitaId: string) {
  const v = itens(b, visitaId);
  for (const a of v) a.situacao = 'confirmado';
  evento(v, 'Confirmado pela recepção (telefone)');
}

export function chegou(b: Base, visitaId: string) {
  const v = itens(b, visitaId);
  const h = agoraHHMM();
  for (const a of v) { a.situacao = 'na_clinica'; a.chegouAs = h; }
  evento(v, 'Chegou à clínica');
}

export function faltou(b: Base, visitaId: string) {
  const v = itens(b, visitaId);
  for (const a of v) a.situacao = 'faltou';
  evento(v, 'Marcado como falta');
}

export function cancelar(b: Base, visitaId: string, motivo: string) {
  const v = itens(b, visitaId);
  for (const a of [...v, ...retiradaDa(b, visitaId)]) a.situacao = 'cancelado';
  evento(v, `Cancelado${motivo ? ': ' + motivo : ''}`);
}

/** Tira um serviço da visita sem cancelar o resto (ex.: paciente desistiu do ECG na hora). */
export function tirarDaVisita(b: Base, agendamentoId: string) {
  const a = b.agendamentos.find((x) => x.id === agendamentoId);
  if (!a) throw new Error('Serviço não encontrado');
  const srv = b.servicos.find((s) => s.id === a.servicoId);
  const inicioVisita = itens(b, a.visitaId)[0].inicio;
  a.situacao = 'cancelado';
  // os serviços que sobraram andam para frente, sem buraco no meio da visita
  let cursor = minutos(inicioVisita);
  for (const x of itens(b, a.visitaId)) {
    const dur = minutos(x.fim) - minutos(x.inicio);
    x.inicio = hhmm(cursor);
    x.fim = hhmm(cursor + dur);
    cursor += dur;
  }
  evento(itens(b, a.visitaId, true), `${srv?.nome ?? 'Serviço'} retirado da visita`);
  if (srv?.retiradaDiaSeguinte && !itens(b, a.visitaId).some((x) => b.servicos.find((s) => s.id === x.servicoId)?.retiradaDiaSeguinte))
    for (const r of retiradaDa(b, a.visitaId)) r.situacao = 'cancelado';
}

/** Move a visita inteira (e a retirada do aparelho, se houver) mantendo a sequência dos serviços. */
export function remarcar(b: Base, visitaId: string, data: string, inicio: string) {
  const v = itens(b, visitaId);
  const desloc = minutos(inicio) - minutos(v[0].inicio);
  evento(v, `Remarcado de ${dataBR(v[0].data)} ${v[0].inicio} para ${dataBR(data)} ${inicio}`);
  for (const a of v) {
    a.data = data;
    a.inicio = hhmm(minutos(a.inicio) + desloc);
    a.fim = hhmm(minutos(a.fim) + desloc);
    a.situacao = 'agendado';
  }
  evento(v, 'Confirmação enviada pelo WhatsApp');
  for (const r of retiradaDa(b, visitaId)) {
    const dur = minutos(r.fim) - minutos(r.inicio);
    r.situacao = 'cancelado';
    const q = horarioDaRetirada(b, data, inicio, dur);
    r.situacao = 'agendado';
    if (q) { r.data = q.data; r.inicio = q.inicio; r.fim = hhmm(minutos(q.inicio) + dur); }
    r.eventos.push({ quando: agora(), texto: `Retirada remarcada para ${dataBR(r.data)} às ${r.inicio}` });
  }
}

/** Recebe a visita inteira de uma vez. No Caixa continua um lançamento por serviço (para o "onde ganha");
 *  se houve desconto, ele é repartido na proporção de cada serviço. */
export function receber(b: Base, visitaId: string, forma: FormaPagamento, parcelas: number, valorTotal: number) {
  const v = itens(b, visitaId).filter((a) => a.valor > 0 && !pagamentoDo(b, a.id));
  const cheio = v.reduce((s, a) => s + a.valor, 0);
  if (!v.length || cheio <= 0) return;
  let restante = Math.round(valorTotal * 100);
  v.forEach((a, i) => {
    const centavos = i === v.length - 1 ? restante : Math.round((valorTotal * a.valor / cheio) * 100);
    restante -= centavos;
    const valor = centavos / 100;
    b.pagamentos.push({
      id: novoId('pg'), clinicaId: b.clinica.id, agendamentoId: a.id, pacienteId: a.pacienteId, servicoId: a.servicoId,
      data: hoje(), valor, forma, parcelas, taxa: taxaMaquininha(b.clinica, forma, parcelas, valor),
    });
  });
  evento(itens(b, visitaId), `Pagamento recebido · ${forma}${parcelas > 1 ? ` ${parcelas}x` : ''}`);
}

export function pagamentoDo(b: Base, agendamentoId: string) {
  return b.pagamentos.find((p) => p.agendamentoId === agendamentoId);
}
export function pagamentosDaVisita(b: Base, visitaId: string) {
  const ids = new Set(b.agendamentos.filter((a) => a.visitaId === visitaId).map((a) => a.id));
  return b.pagamentos.filter((p) => p.agendamentoId && ids.has(p.agendamentoId));
}

/** Registro da Dra.: um por visita (fica ligado ao primeiro serviço). Marca a visita como atendida. */
export function registrarAtendimento(b: Base, visitaId: string, r: Omit<RegistroAtendimento, 'id' | 'clinicaId' | 'agendamentoId' | 'pacienteId' | 'data'>) {
  const v = itens(b, visitaId);
  const ids = new Set(v.map((a) => a.id));
  const existente = b.registros.find((x) => ids.has(x.agendamentoId));
  if (existente) Object.assign(existente, r);
  else b.registros.push({ id: novoId('reg'), clinicaId: b.clinica.id, agendamentoId: v[0].id, pacienteId: v[0].pacienteId, data: v[0].data, ...r });
  if (v.some((a) => a.situacao !== 'atendido')) {
    for (const a of v) a.situacao = 'atendido';
    evento(v, 'Atendimento registrado');
  }
}
export function registroDaVisita(b: Base, visitaId: string) {
  const ids = new Set(b.agendamentos.filter((a) => a.visitaId === visitaId).map((a) => a.id));
  return b.registros.find((r) => ids.has(r.agendamentoId));
}

export function salvarPaciente(b: Base, p: Omit<Paciente, 'clinicaId' | 'criadoEm' | 'id'> & { id?: string }): Paciente {
  const existente = p.id ? b.pacientes.find((x) => x.id === p.id) : undefined;
  const { id: _id, ...dados } = p;
  if (existente) { Object.assign(existente, dados); return existente; }
  const novo: Paciente = { ...dados, id: novoId('pac'), clinicaId: b.clinica.id, criadoEm: hoje() };
  b.pacientes.push(novo);
  return novo;
}

export function salvarServico(b: Base, s: Omit<Servico, 'clinicaId' | 'id'> & { id?: string }) {
  const existente = s.id ? b.servicos.find((x) => x.id === s.id) : undefined;
  const { id: _id, ...dados } = s;
  if (existente) Object.assign(existente, dados);
  else b.servicos.push({ ...dados, id: novoId('srv'), clinicaId: b.clinica.id });
}

/** Serviço já usado não pode ser excluído (quebraria histórico e caixa): só desativado. */
export function usosDoServico(b: Base, servicoId: string): number {
  return b.agendamentos.filter((a) => a.servicoId === servicoId).length;
}
export function excluirServico(b: Base, servicoId: string) {
  if (usosDoServico(b, servicoId) > 0) throw new Error('Serviço em uso: desative em vez de excluir');
  b.servicos = b.servicos.filter((s) => s.id !== servicoId);
}

export function lancarDespesa(b: Base, d: Omit<Despesa, 'id' | 'clinicaId'>) {
  b.despesas.push({ ...d, id: novoId('dp'), clinicaId: b.clinica.id });
}

export function emitirDocumento(b: Base, d: Omit<Documento, 'id' | 'clinicaId'>) {
  b.documentos.push({ ...d, id: novoId('doc'), clinicaId: b.clinica.id });
}
