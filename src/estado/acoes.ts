// Ações do sistema. Recebem a base (cópia) e alteram. Ficam fora das telas para serem testáveis
// e para o dev do backend saber exatamente o que cada botão faz.
import type { Agendamento, Base, Despesa, Documento, FormaPagamento, Paciente, RegistroAtendimento, Servico } from '../tipos/modelos';
import { agoraHHMM, hhmm, hoje, minutos, novoId } from '../regras/formato';
import { taxaMaquininha } from '../regras/caixa';

const agora = () => `${hoje()}T${agoraHHMM()}`;
const achar = (b: Base, id: string) => {
  const a = b.agendamentos.find((x) => x.id === id);
  if (!a) throw new Error('Agendamento não encontrado');
  return a;
};

export interface NovoAgendamento {
  pacienteId: string;
  servicoId: string;
  data: string;
  inicio: string;
  convenioId: string | null; // null = particular
  enviarWhatsapp: boolean;
  origem: string; // "pela recepção" | "pela Dra."
}

export function valorDoServico(s: Servico, convenioId: string | null): number {
  return convenioId ? s.valoresConvenio[convenioId] ?? 0 : s.valorParticular;
}

export function agendar(b: Base, n: NovoAgendamento): Agendamento {
  const s = b.servicos.find((x) => x.id === n.servicoId)!;
  const ag: Agendamento = {
    id: novoId('ag'), clinicaId: b.clinica.id, profissionalId: b.profissionais[0].id, pacienteId: n.pacienteId, servicoId: s.id,
    data: n.data, inicio: n.inicio, fim: hhmm(minutos(n.inicio) + s.duracaoMin),
    pagamento: n.convenioId ? { tipo: 'convenio', convenioId: n.convenioId } : { tipo: 'particular' },
    valor: valorDoServico(s, n.convenioId),
    situacao: n.enviarWhatsapp ? 'agendado' : 'confirmado',
    eventos: [{ quando: agora(), texto: `Agendado ${n.origem}` }],
  };
  if (n.enviarWhatsapp) ag.eventos.push({ quando: agora(), texto: 'Confirmação enviada pelo WhatsApp' });
  b.agendamentos.push(ag);
  return ag;
}

export function confirmarManual(b: Base, id: string) {
  const a = achar(b, id);
  a.situacao = 'confirmado';
  a.eventos.push({ quando: agora(), texto: 'Confirmado pela recepção (telefone)' });
}

export function chegou(b: Base, id: string) {
  const a = achar(b, id);
  a.situacao = 'na_clinica';
  a.chegouAs = agoraHHMM();
  a.eventos.push({ quando: agora(), texto: 'Chegou à clínica' });
}

export function faltou(b: Base, id: string) {
  const a = achar(b, id);
  a.situacao = 'faltou';
  a.eventos.push({ quando: agora(), texto: 'Marcado como falta' });
}

export function cancelar(b: Base, id: string, motivo: string) {
  const a = achar(b, id);
  a.situacao = 'cancelado';
  a.eventos.push({ quando: agora(), texto: `Cancelado${motivo ? ': ' + motivo : ''}` });
}

export function remarcar(b: Base, id: string, data: string, inicio: string) {
  const a = achar(b, id);
  const dur = minutos(a.fim) - minutos(a.inicio);
  a.eventos.push({ quando: agora(), texto: `Remarcado de ${a.data.split('-').reverse().join('/')} ${a.inicio} para ${data.split('-').reverse().join('/')} ${inicio}` });
  a.data = data;
  a.inicio = inicio;
  a.fim = hhmm(minutos(inicio) + dur);
  a.situacao = 'agendado';
  a.eventos.push({ quando: agora(), texto: 'Confirmação enviada pelo WhatsApp' });
}

export function receber(b: Base, id: string, forma: FormaPagamento, parcelas: number, valor: number) {
  const a = achar(b, id);
  b.pagamentos.push({
    id: novoId('pg'), clinicaId: b.clinica.id, agendamentoId: a.id, pacienteId: a.pacienteId, servicoId: a.servicoId,
    data: hoje(), valor, forma, parcelas, taxa: taxaMaquininha(b.clinica, forma, parcelas, valor),
  });
  a.eventos.push({ quando: agora(), texto: `Pagamento recebido · ${forma}${parcelas > 1 ? ` ${parcelas}x` : ''}` });
}

export function pagamentoDo(b: Base, agendamentoId: string) {
  return b.pagamentos.find((p) => p.agendamentoId === agendamentoId);
}

export function registrarAtendimento(b: Base, id: string, r: Omit<RegistroAtendimento, 'id' | 'clinicaId' | 'agendamentoId' | 'pacienteId' | 'data'>) {
  const a = achar(b, id);
  const existente = b.registros.find((x) => x.agendamentoId === id);
  if (existente) Object.assign(existente, r);
  else b.registros.push({ id: novoId('reg'), clinicaId: b.clinica.id, agendamentoId: id, pacienteId: a.pacienteId, data: a.data, ...r });
  if (a.situacao !== 'atendido') {
    a.situacao = 'atendido';
    a.eventos.push({ quando: agora(), texto: 'Atendimento registrado' });
  }
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
