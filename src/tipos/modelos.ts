// Modelo de dados do IO Clinic.
// Pensado para crescer: TODO registro pertence a uma clínica (clinicaId) — é isso que permite vender
// o mesmo sistema para vários médicos. O agendamento aponta para um profissional (hoje só a Dra.),
// e o pagamento pode ser particular ou por convênio.
// No sistema real, cada interface vira uma coleção/tabela no banco.

export type Perfil = 'medica' | 'recepcao';

export interface Usuario {
  id: string;
  clinicaId: string;
  nome: string;
  email: string;
  perfil: Perfil; // médica = administradora (vê Caixa e Configurações)
  ativo: boolean;
}

export interface Clinica {
  id: string;
  nome: string; // "Dra. Flávia Mothé"
  especialidade: string;
  medicaNomeCompleto: string;
  crm: string;
  rqe: string;
  endereco: string;
  cidade: string;
  whatsapp: string;
  aliquotaImpostos: number; // % sobre o recebido (DRE)
  taxasCartao: { debito: number; credito: number; creditoParcelado: number }; // % da maquininha
  horaLembrete: string; // lembrete da véspera, ex.: "10:00"
  horarios: Record<number, { inicio: string; fim: string }[]>; // 0=domingo … 6=sábado
}

export interface Profissional {
  id: string;
  clinicaId: string;
  nome: string;
}

export interface Convenio {
  id: string;
  clinicaId: string;
  nome: string;
  ativo: boolean;
}

export interface Servico {
  id: string;
  clinicaId: string;
  nome: string;
  duracaoMin: number;
  valorParticular: number;
  valoresConvenio: Record<string, number>; // convenioId → valor
  custoPorExame: number; // repasse/material: entra nos custos do Caixa
  ativo: boolean; // serviço já usado não é excluído, é desativado
}

export interface Paciente {
  id: string;
  clinicaId: string;
  nome: string;
  celular: string;
  nascimento: string; // AAAA-MM-DD
  cpf: string;
  termoLgpd: boolean;
  criadoEm: string;
}

export type Situacao = 'agendado' | 'confirmado' | 'sem_resposta' | 'pediu_remarcar' | 'na_clinica' | 'atendido' | 'faltou' | 'cancelado';

export interface EventoAgendamento {
  quando: string; // ISO data-hora
  texto: string; // "Confirmação enviada pelo WhatsApp", "Chegou à clínica"…
}

export interface Agendamento {
  id: string;
  clinicaId: string;
  profissionalId: string;
  pacienteId: string;
  servicoId: string;
  data: string; // AAAA-MM-DD
  inicio: string; // HH:MM
  fim: string;
  pagamento: { tipo: 'particular' } | { tipo: 'convenio'; convenioId: string };
  valor: number;
  situacao: Situacao;
  chegouAs?: string;
  eventos: EventoAgendamento[];
}

export type FormaPagamento = 'PIX' | 'Dinheiro' | 'Débito' | 'Crédito';

export interface Pagamento {
  id: string;
  clinicaId: string;
  agendamentoId?: string;
  pacienteId: string;
  servicoId: string;
  data: string;
  valor: number;
  forma: FormaPagamento;
  parcelas: number;
  taxa: number; // R$ descontado pela maquininha
}

export interface Despesa {
  id: string;
  clinicaId: string;
  descricao: string;
  categoria: string;
  data: string; // data do pagamento
  valor: number;
  fixa: boolean; // fixa = se repete todo mês
}

export interface DespesaFixa {
  id: string;
  clinicaId: string;
  descricao: string;
  categoria: string;
  valor: number;
  diaVencimento: number;
  ativa: boolean;
}

export interface RegistroAtendimento {
  id: string;
  clinicaId: string;
  agendamentoId: string;
  pacienteId: string;
  data: string;
  cid: string;
  observacao: string;
  examesPedidos: string[];
  retornoDias: number | null;
}

export type TipoDocumento = 'receita' | 'atestado' | 'declaracao' | 'pedido_exames';

export interface Documento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: TipoDocumento;
  data: string;
  conteudo: string; // texto livre do documento
}

export interface Base {
  clinica: Clinica;
  profissionais: Profissional[];
  usuarios: Usuario[];
  convenios: Convenio[];
  servicos: Servico[];
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  pagamentos: Pagamento[];
  despesas: Despesa[];
  despesasFixas: DespesaFixa[];
  registros: RegistroAtendimento[];
  documentos: Documento[];
}
