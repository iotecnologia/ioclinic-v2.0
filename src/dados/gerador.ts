// Base FICTÍCIA para apresentação, no mesmo padrão da clínica real (serviços, preços, volume,
// formas de pagamento e categorias de despesa), com nomes e valores inventados.
// Gerada a partir da data de hoje: sempre tem histórico de ~10 meses e agenda para as próximas semanas.
// Determinística (mesma semente → mesma base), para a apresentação sair sempre igual.
import type { Agendamento, Base, Clinica, Despesa, DespesaFixa, Documento, FormaPagamento, Paciente, Pagamento, RegistroAtendimento, Servico, Situacao } from '../tipos/modelos';
import { agoraHHMM, diaSemana, hhmm, hoje as hojeIso, iso, minutos, paraData, somarDias } from '../regras/formato';
import { taxaMaquininha } from '../regras/caixa';

const CLINICA = 'cli_flavia';
const PROF = 'prof_flavia';

export const CLINICA_PADRAO: Clinica = {
  id: CLINICA,
  nome: 'Dra. Flávia Mothé',
  especialidade: 'Cardiologia',
  medicaNomeCompleto: 'Dra. Flávia Silva Mothé',
  crm: 'CRM-SP 158.420',
  rqe: 'RQE 89.241',
  endereco: 'R. Eduardo Lane, 36 · Jardim Guanabara',
  cidade: 'Campinas/SP',
  whatsapp: '(19) 99406-4572',
  aliquotaImpostos: 16.33,
  taxasCartao: { debito: 1.42, credito: 2.8, creditoParcelado: 3.05, creditoLongo: 3.35 },
  horaLembrete: '10:00',
  horarios: {
    1: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }],
    2: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }],
    3: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }],
    4: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }],
    5: [{ inicio: '08:00', fim: '12:00' }, { inicio: '13:00', fim: '18:00' }],
    6: [{ inicio: '08:00', fim: '12:00' }],
  },
};

const s = (id: string, nome: string, duracaoMin: number, valorParticular: number, extra: Partial<Servico> = {}): Servico =>
  ({ id, clinicaId: CLINICA, nome, duracaoMin, valorParticular, valoresConvenio: {}, custoPorExame: 0, ativo: true, ...extra });

// Preços reais da clínica
export const SERVICOS_PADRAO: Servico[] = [
  s('srv_consulta', 'Consulta cardiológica', 60, 600),
  s('srv_retorno', 'Retorno (até 30 dias)', 60, 0),
  s('srv_ecg', 'Eletrocardiograma (ECG)', 30, 150),
  s('srv_eco', 'Ecocardiograma', 30, 300),
  s('srv_holter', 'Holter 24h', 30, 230, { custoPorExame: 100, retiradaDiaSeguinte: true }),
  s('srv_mapa', 'MAPA 24h', 30, 230, { custoPorExame: 100, retiradaDiaSeguinte: true }),
  s('srv_ergo', 'Teste ergométrico', 30, 300),
  s('srv_bio', 'Bioimpedância', 30, 150),
  s('srv_ecodoppler', 'Ecodoppler', 30, 350),
  s('srv_retirada', 'Retirada do aparelho', 15, 0, { interno: true }),
];

// Peso de cada serviço no volume (mesma proporção da clínica real)
const MIX: [string, number][] = [['srv_consulta', 130], ['srv_bio', 65], ['srv_eco', 37], ['srv_retorno', 20], ['srv_mapa', 14], ['srv_holter', 9], ['srv_ergo', 8], ['srv_ecg', 7], ['srv_ecodoppler', 5]];
// Formas de pagamento na proporção real
const FORMAS: [FormaPagamento, number][] = [['Crédito', 41], ['Débito', 26], ['PIX', 24], ['Dinheiro', 9]];

const NOMES_F = ['Ana', 'Beatriz', 'Carla', 'Cláudia', 'Daniela', 'Elaine', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Joana', 'Juliana', 'Lúcia', 'Márcia', 'Mariana', 'Patrícia', 'Regina', 'Renata', 'Sandra', 'Silvia', 'Tânia', 'Vera', 'Adriana', 'Rosana', 'Luciana', 'Cristina', 'Denise', 'Eliane', 'Marta', 'Neide', 'Aparecida', 'Sônia', 'Simone', 'Teresa', 'Yara'];
const NOMES_M = ['Antônio', 'Carlos', 'Eduardo', 'Fábio', 'Gustavo', 'Henrique', 'João', 'José', 'Luiz', 'Marcelo', 'Mário', 'Paulo', 'Pedro', 'Ricardo', 'Roberto', 'Rodrigo', 'Sérgio', 'Valter', 'Wagner', 'Alexandre', 'Edson', 'Gilberto', 'Jorge', 'Nelson', 'Osvaldo', 'Rubens', 'Sebastião', 'Ademir', 'Benedito', 'Cláudio'];
const SOBRENOMES = ['Almeida', 'Andrade', 'Barbosa', 'Bastos', 'Cardoso', 'Carvalho', 'Castro', 'Correia', 'Costa', 'Dias', 'Duarte', 'Faria', 'Ferraz', 'Fonseca', 'Freitas', 'Gomes', 'Lima', 'Lopes', 'Macedo', 'Martins', 'Medeiros', 'Mendes', 'Moraes', 'Moreira', 'Nogueira', 'Oliveira', 'Pacheco', 'Pereira', 'Pinto', 'Prado', 'Queiroz', 'Rezende', 'Ribeiro', 'Rocha', 'Santana', 'Siqueira', 'Souza', 'Tavares', 'Teixeira', 'Vieira', 'Bertoni', 'Zanetti', 'Furlan', 'Brandão', 'Camargo'];

const CIDS: [string, string][] = [['I10', 'Hipertensão essencial'], ['I48', 'Fibrilação e flutter atrial'], ['R00.2', 'Palpitações'], ['I25.1', 'Doença aterosclerótica do coração'], ['E78.0', 'Hipercolesterolemia pura'], ['R07.4', 'Dor torácica não especificada'], ['I50.9', 'Insuficiência cardíaca não especificada'], ['Z00.0', 'Exame médico geral']];
export const LISTA_CID = CIDS;

const FIXAS: Omit<DespesaFixa, 'id' | 'clinicaId' | 'ativa'>[] = [
  { descricao: 'Aluguel da sala', categoria: 'Aluguel', valor: 2380, diaVencimento: 5 },
  { descricao: 'Condomínio', categoria: 'Condomínio', valor: 1520, diaVencimento: 10 },
  { descricao: 'Escritório de contabilidade', categoria: 'Contadora', valor: 1180, diaVencimento: 10 },
  { descricao: 'Salário da recepção', categoria: 'Funcionários', valor: 2350, diaVencimento: 5 },
  { descricao: 'INSS e FGTS', categoria: 'Funcionários', valor: 1240, diaVencimento: 20 },
  { descricao: 'Vale-transporte e cesta', categoria: 'Funcionários', valor: 490, diaVencimento: 5 },
  { descricao: 'Sistema de gestão', categoria: 'Sistemas', valor: 2200, diaVencimento: 15 },
  { descricao: 'Assessoria de marketing', categoria: 'Marketing', valor: 1200, diaVencimento: 15 },
  { descricao: 'Anúncios Google', categoria: 'Marketing', valor: 700, diaVencimento: 25 },
  { descricao: 'Energia elétrica', categoria: 'Luz', valor: 280, diaVencimento: 18 },
  { descricao: 'Internet e telefone', categoria: 'Internet e telefone', valor: 225, diaVencimento: 12 },
  { descricao: 'Aluguel da maquininha', categoria: 'Taxas bancárias', valor: 80, diaVencimento: 8 },
];

function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gerarBase(hoje = hojeIso(), agora = agoraHHMM(), semente = 2026): Base {
  const r = prng(semente);
  const escolha = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const pesado = <T,>(xs: [T, number][]) => {
    let x = r() * xs.reduce((a, [, p]) => a + p, 0);
    for (const [v, p] of xs) if ((x -= p) <= 0) return v;
    return xs[0][0];
  };
  const quando = (data: string, hora: string) => `${data}T${hora}`;

  // ---------- pacientes ----------
  const pacientes: Paciente[] = [];
  const usados = new Set<string>();
  while (pacientes.length < 190) {
    const fem = r() < 0.56;
    const s1 = escolha(SOBRENOMES), s2 = escolha(SOBRENOMES);
    const nome = `${escolha(fem ? NOMES_F : NOMES_M)} ${s1} ${s2}`;
    if (s1 === s2 || usados.has(nome)) continue;
    usados.add(nome);
    const ano = 1942 + Math.floor(r() * 60);
    pacientes.push({
      id: `pac_${pacientes.length + 1}`, clinicaId: CLINICA, nome,
      celular: `(19) 9${Math.floor(r() * 9000 + 1000)}-${Math.floor(r() * 9000 + 1000)}`,
      nascimento: iso(new Date(ano, Math.floor(r() * 12), 1 + Math.floor(r() * 28))),
      cpf: cpfFicticio(r), termoLgpd: r() < 0.92, criadoEm: '',
    });
  }

  // ---------- agenda: ~10 meses para trás e 5 semanas para frente ----------
  const inicio = iso(new Date(paraData(hoje).getFullYear(), paraData(hoje).getMonth() - 10, 1));
  const fimAgenda = somarDias(hoje, 35);
  const agendamentos: Agendamento[] = [];
  const pagamentos: Pagamento[] = [];
  const registros: RegistroAtendimento[] = [];
  const documentos: Documento[] = [];
  const ultimaConsulta = new Map<string, string>();
  const reservas = new Map<string, [number, number][]>(); // horários já tomados por retiradas de aparelho
  let n = 0;

  for (let d = inicio; d <= fimAgenda; d = somarDias(d, 1)) {
    const turnos = CLINICA_PADRAO.horarios[diaSemana(d)];
    if (!turnos) continue;
    const futuro = d > hoje;
    const distancia = futuro ? (paraData(d).getTime() - paraData(hoje).getTime()) / 864e5 : 0;
    // volume: ~1,5 por dia útil no histórico (cresce ao longo do ano); hoje cheio para a apresentação; futuro vai rareando
    const mesesAtras = (paraData(hoje).getTime() - paraData(d).getTime()) / (864e5 * 30);
    let qtd = d === hoje ? 5 : d === somarDias(hoje, 1) ? 4 : futuro ? Math.round((3.2 - distancia / 12) * r() + 0.8) : Math.round(r() * (3.3 - mesesAtras * 0.12) + 0.3);
    if (diaSemana(d) === 6) qtd = Math.min(qtd, 2);
    const ocupados: [number, number][] = [...(reservas.get(d) ?? [])];
    let feitos = 0;
    for (let k = 0; k < qtd * 3 && feitos < qtd; k++) {
      const sorteado = pesado(MIX);
      const servs = [SERVICOS_PADRAO.find((x) => x.id === sorteado)!];
      // parte das consultas já sai com um exame em seguida (mesma visita)
      if (sorteado === 'srv_consulta' && r() < 0.3) {
        const extra = escolha(['srv_eco', 'srv_ecg', 'srv_bio']);
        servs.push(SERVICOS_PADRAO.find((x) => x.id === extra)!);
      }
      const dur = servs.reduce((a, x) => a + x.duracaoMin, 0);
      const t = escolha(turnos);
      const slots = (minutos(t.fim) - minutos(t.inicio) - dur) / 30;
      if (slots < 0) continue;
      const ini = minutos(t.inicio) + Math.floor(r() * (slots + 1)) * 30;
      const fim = ini + dur;
      if (ocupados.some(([a, b]) => ini < b && fim > a)) continue;
      let pac = escolha(pacientes);
      if (sorteado === 'srv_retorno') {
        // retorno só para quem teve consulta nos últimos 30 dias
        const cand = [...ultimaConsulta].filter(([, data]) => data >= somarDias(d, -30) && data < d);
        if (!cand.length) continue;
        const alvo = escolha(cand)[0];
        pac = pacientes.find((p) => p.id === alvo)!;
      }
      ocupados.push([ini, fim]);
      feitos++;
      const visitaId = `vis_${++n}`;
      const eventos: { quando: string; texto: string }[] = [];
      const marcadoEm = somarDias(d, -(2 + Math.floor(r() * 12)));
      const horaMarcou = hhmm(8 * 60 + Math.floor(r() * 18) * 30);
      eventos.push({ quando: quando(marcadoEm, horaMarcou), texto: r() < 0.3 ? 'Agendado pelo paciente no WhatsApp' : 'Agendado pela recepção' });
      eventos.push({ quando: quando(marcadoEm, horaMarcou), texto: 'Confirmação enviada pelo WhatsApp' });
      const respondeu = r();
      const vesperaPassou = somarDias(d, -1) < hoje || (somarDias(d, -1) === hoje && agora >= CLINICA_PADRAO.horaLembrete);
      const ehHoje = d === hoje;
      const passou = d < hoje || (ehHoje && fim <= minutos(agora));
      const emCurso = ehHoje && !passou && ini <= minutos(agora) + 20;

      let situacao: Situacao;
      if (!futuro && !ehHoje || passou) situacao = r() < 0.035 ? 'faltou' : 'atendido';
      else if (emCurso) situacao = 'na_clinica';
      else if (respondeu < 0.12) situacao = 'sem_resposta';
      else situacao = distancia > 6 && respondeu > 0.6 ? 'agendado' : 'confirmado';

      if (situacao !== 'sem_resposta' && situacao !== 'agendado') eventos.push({ quando: quando(marcadoEm, hhmm(minutos(horaMarcou) + 40)), texto: 'Paciente confirmou' });
      if (vesperaPassou) eventos.push({ quando: quando(somarDias(d, -1), CLINICA_PADRAO.horaLembrete), texto: 'Lembrete enviado pelo WhatsApp' });
      let chegouAs: string | undefined;
      if (situacao === 'atendido' || situacao === 'na_clinica') {
        chegouAs = hhmm(ini - 5 - Math.floor(r() * 15));
        eventos.push({ quando: quando(d, chegouAs), texto: 'Chegou à clínica' });
      }
      if (situacao === 'faltou') eventos.push({ quando: quando(d, hhmm(fim)), texto: 'Marcado como falta' });
      if (situacao === 'atendido') eventos.push({ quando: quando(d, hhmm(fim)), texto: 'Atendimento registrado' });
      const forma = pesado(FORMAS);
      const total = servs.reduce((a, x) => a + x.valorParticular, 0);
      const parcelas = forma === 'Crédito' && total >= 600 && r() < 0.3 ? 2 : 1;
      if (situacao === 'atendido' && total > 0) eventos.push({ quando: quando(d, hhmm(fim + 5)), texto: `Pagamento recebido · ${forma}${parcelas > 1 ? ` ${parcelas}x` : ''}` });

      let cursor = ini;
      const criados: Agendamento[] = [];
      for (const servico of servs) {
        const ag: Agendamento = {
          id: `ag_${++n}`, clinicaId: CLINICA, visitaId, profissionalId: PROF, pacienteId: pac.id, servicoId: servico.id,
          data: d, inicio: hhmm(cursor), fim: hhmm(cursor + servico.duracaoMin), pagamento: { tipo: 'particular' }, valor: servico.valorParticular,
          situacao, chegouAs, eventos: eventos.map((e) => ({ ...e })),
        };
        cursor += servico.duracaoMin;
        criados.push(ag);
        if (situacao === 'atendido' && ag.valor > 0)
          pagamentos.push({ id: `pg_${n}`, clinicaId: CLINICA, agendamentoId: ag.id, pacienteId: pac.id, servicoId: servico.id, data: d, valor: ag.valor, forma, parcelas, taxa: taxaMaquininha(CLINICA_PADRAO, forma, parcelas, ag.valor) });
      }
      agendamentos.push(...criados);

      // Holter/MAPA: retirada do aparelho no próximo dia de atendimento, mesmo horário, 15 min
      if (servs.some((x) => x.retiradaDiaSeguinte) && situacao !== 'faltou') {
        let dr = somarDias(d, 1);
        while (!CLINICA_PADRAO.horarios[diaSemana(dr)]) dr = somarDias(dr, 1);
        const turnosR = CLINICA_PADRAO.horarios[diaSemana(dr)]!;
        const cabe = turnosR.some((tr) => ini >= minutos(tr.inicio) && ini + 15 <= minutos(tr.fim));
        const iniR = cabe ? ini : minutos(turnosR[0].inicio);
        reservas.set(dr, [...(reservas.get(dr) ?? []), [iniR, iniR + 30]]);
        const passouR = dr < hoje || (dr === hoje && iniR + 15 <= minutos(agora));
        agendamentos.push({
          id: `ag_${++n}`, clinicaId: CLINICA, visitaId: `vis_${++n}`, profissionalId: PROF, pacienteId: pac.id, servicoId: 'srv_retirada',
          data: dr, inicio: hhmm(iniR), fim: hhmm(iniR + 15), pagamento: { tipo: 'particular' }, valor: 0, retiradaDe: visitaId,
          situacao: passouR ? 'atendido' : 'confirmado',
          eventos: [{ quando: eventos[0].quando, texto: `Agendada sozinha: retirada do ${servs.filter((x) => x.retiradaDiaSeguinte).map((x) => x.nome).join(' e ')}` }, { quando: eventos[0].quando, texto: 'Avisado junto com a confirmação' }, ...(passouR ? [{ quando: quando(dr, hhmm(iniR)), texto: 'Aparelho devolvido' }] : [])],
        });
      }

      if (situacao === 'atendido') {
        if (sorteado === 'srv_consulta') ultimaConsulta.set(pac.id, d);
        if (sorteado === 'srv_consulta' || sorteado === 'srv_retorno') {
          const [cid, desc] = escolha(CIDS);
          const exames = r() < 0.5 ? [escolha(['Ecocardiograma', 'Holter 24h', 'MAPA 24h', 'Teste ergométrico', 'Perfil lipídico', 'Hemograma'])] : [];
          registros.push({ id: `reg_${n}`, clinicaId: CLINICA, agendamentoId: criados[0].id, pacienteId: pac.id, data: d, cid: `${cid} · ${desc}`, observacao: escolha(['Paciente estável, manter conduta.', 'Ajustada a medicação. Reavaliar no retorno.', 'Orientado sobre dieta e atividade física.', 'Solicitados exames para investigação.']), examesPedidos: exames, retornoDias: sorteado === 'srv_consulta' ? 30 : null });
          if (r() < 0.45) documentos.push({ id: `doc_${n}`, clinicaId: CLINICA, pacienteId: pac.id, tipo: exames.length ? 'pedido_exames' : 'receita', data: d, conteudo: exames.join(', ') || 'Losartana potássica 50 mg' });
        }
      }
      if (!pac.criadoEm || marcadoEm < pac.criadoEm) pac.criadoEm = marcadoEm;
    }
  }
  for (const p of pacientes) if (!p.criadoEm) p.criadoEm = inicio;
  // demonstração (por visita): hoje um paciente ainda não respondeu; amanhã um pediu para remarcar;
  // o último atendido de hoje ainda está "a receber"
  const daVisita = (vid: string) => agendamentos.filter((a) => a.visitaId === vid);
  const normal = (a: Agendamento) => a.servicoId !== 'srv_retirada';
  const futuroHoje = agendamentos.find((a) => a.data === hoje && a.situacao === 'confirmado' && normal(a));
  if (futuroHoje) for (const x of daVisita(futuroHoje.visitaId)) { x.situacao = 'sem_resposta'; x.eventos = x.eventos.filter((e) => e.texto !== 'Paciente confirmou'); }
  const amanha = agendamentos.filter((a) => a.data === somarDias(hoje, 1) && normal(a));
  if (amanha.length > 1) {
    for (const x of daVisita(amanha[1].visitaId)) {
      x.situacao = 'pediu_remarcar';
      x.eventos = x.eventos.filter((e) => e.texto !== 'Paciente confirmou' && !e.texto.startsWith('Lembrete'));
      x.eventos.push({ quando: quando(hoje, '09:12'), texto: 'Paciente pediu para remarcar (respondeu 2 no WhatsApp)' });
    }
  }
  const ultimoHoje = agendamentos.filter((a) => a.data === hoje && a.situacao === 'atendido' && a.valor > 0).sort((x, y) => x.inicio.localeCompare(y.inicio)).pop();
  if (ultimoHoje) for (const x of daVisita(ultimoHoje.visitaId)) {
    const i = pagamentos.findIndex((p) => p.agendamentoId === x.id);
    if (i >= 0) pagamentos.splice(i, 1);
    x.eventos = x.eventos.filter((e) => !e.texto.startsWith('Pagamento'));
  }

  // ---------- despesas: fixas todo mês (com pequena variação) + algumas variáveis ----------
  const despesasFixas: DespesaFixa[] = FIXAS.map((f, i) => ({ ...f, id: `fx_${i + 1}`, clinicaId: CLINICA, ativa: true }));
  const despesas: Despesa[] = [];
  let m = paraData(inicio);
  while (iso(m) <= hoje) {
    const ano = m.getFullYear();
    const mes = m.getMonth();
    for (const f of despesasFixas) {
      const data = iso(new Date(ano, mes, f.diaVencimento));
      if (data > hoje) continue;
      const varia = ['Luz', 'Funcionários', 'Marketing'].includes(f.categoria) ? 1 + (r() - 0.5) * 0.2 : 1;
      despesas.push({ id: `dp_${despesas.length + 1}`, clinicaId: CLINICA, descricao: f.descricao, categoria: f.categoria, data, valor: Math.round(f.valor * varia * 100) / 100, fixa: true });
    }
    // impostos pagos (≈ alíquota sobre o mês anterior)
    const dataImp = iso(new Date(ano, mes, 20));
    if (dataImp <= hoje) despesas.push({ id: `dp_${despesas.length + 1}`, clinicaId: CLINICA, descricao: 'Simples Nacional', categoria: 'Impostos', data: dataImp, valor: Math.round(1800 + r() * 1400), fixa: false });
    if (r() < 0.6) {
      const data = iso(new Date(ano, mes, 3 + Math.floor(r() * 24)));
      if (data <= hoje) despesas.push({ id: `dp_${despesas.length + 1}`, clinicaId: CLINICA, ...escolha([
        { descricao: 'Papelaria', categoria: 'Material administrativo', valor: Math.round(80 + r() * 260) },
        { descricao: 'Eletrodos e gel', categoria: 'Material para procedimentos', valor: Math.round(300 + r() * 600) },
        { descricao: 'Manutenção do ar-condicionado', categoria: 'Serviços externos', valor: 500 },
        { descricao: 'Copa (café, copos)', categoria: 'Outros gastos', valor: Math.round(60 + r() * 90) },
      ]), data, fixa: false });
    }
    m = new Date(ano, mes + 1, 1);
  }

  return {
    clinica: CLINICA_PADRAO,
    profissionais: [{ id: PROF, clinicaId: CLINICA, nome: 'Dra. Flávia Silva Mothé' }],
    usuarios: [
      { id: 'usr_flavia', clinicaId: CLINICA, nome: 'Dra. Flávia', email: 'flavia@ioclinic.exemplo', perfil: 'medica', ativo: true },
      { id: 'usr_recepcao', clinicaId: CLINICA, nome: 'Recepção', email: 'recepcao@ioclinic.exemplo', perfil: 'recepcao', ativo: true },
    ],
    convenios: [{ id: 'conv_unimed', clinicaId: CLINICA, nome: 'Unimed', ativo: true }],
    servicos: SERVICOS_PADRAO.map((x) => ({ ...x })),
    pacientes, agendamentos, pagamentos, despesas, despesasFixas, registros, documentos,
  };
}

function cpfFicticio(r: () => number): string {
  const d = Array.from({ length: 9 }, () => Math.floor(r() * 10));
  for (const t of [10, 11]) {
    const s = d.reduce((a, v, i) => a + v * (t - i), 0);
    d.push(((s * 10) % 11) % 10);
  }
  const x = d.join('');
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`;
}
