// Pop-ups da agenda: detalhe do agendamento, novo agendamento, receber, remarcar, cancelar e registrar atendimento.
import { useMemo, useState } from 'react';
import type { Agendamento, FormaPagamento, Paciente } from '../tipos/modelos';
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';
import { agendar, cancelar, chegou, confirmarManual, faltou, pagamentoDo, receber, registrarAtendimento, remarcar, valorDoServico } from '../estado/acoes';
import { NOME_SITUACAO } from '../regras/agenda';
import { brl, dataBR, diaMes, hhmm, hoje, lerValor, minutos } from '../regras/formato';
import { taxaMaquininha } from '../regras/caixa';
import { LISTA_CID } from '../dados/gerador';
import { ir } from '../estado/rota';
import { Janela } from './Janela';
import { BuscaPaciente } from './BuscaPaciente';
import { FormPaciente } from './FormPaciente';
import { EscolherHorario } from './EscolherHorario';
import { EmitirDocumento } from './Documentos';

export function textoSituacao(a: Agendamento) {
  return a.situacao === 'na_clinica' && a.chegouAs ? `Na clínica desde ${a.chegouAs}` : NOME_SITUACAO[a.situacao];
}

// ---------------------------------------------------------------- detalhe
type Sub = 'receber' | 'remarcar' | 'cancelar' | 'registrar' | 'documento' | null;

export function DetalheAgendamento({ id, onFechar, onReagendar }: { id: string; onFechar: () => void; onReagendar: (pacienteId: string) => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [sub, setSub] = useState<Sub>(null);
  const a = base.agendamentos.find((x) => x.id === id);
  if (!a) return null;
  const pac = base.pacientes.find((p) => p.id === a.pacienteId)!;
  const srv = base.servicos.find((s) => s.id === a.servicoId)!;
  const pago = pagamentoDo(base, a.id);
  const medica = usuario?.perfil === 'medica';
  const conv = a.pagamento.tipo === 'convenio' ? base.convenios.find((c) => c.id === (a.pagamento as { convenioId: string }).convenioId)?.nome : null;
  const aberto = ['agendado', 'confirmado', 'sem_resposta', 'pediu_remarcar'].includes(a.situacao);
  const ehHoje = a.data === hoje();
  const podeReceber = a.valor > 0 && !pago && (a.situacao === 'na_clinica' || a.situacao === 'atendido');

  const botoes = (
    <>
      {aberto && ehHoje && <button className="pri" onClick={() => alterar((b) => chegou(b, a.id))}>Chegou</button>}
      {podeReceber && <button className="pri" onClick={() => setSub('receber')}>Receber</button>}
      {aberto && a.situacao !== 'confirmado' && <button onClick={() => alterar((b) => confirmarManual(b, a.id))}>Confirmar</button>}
      {medica && (a.situacao === 'na_clinica' || a.situacao === 'atendido') && <button onClick={() => setSub('registrar')}>{a.situacao === 'atendido' ? 'Ver registro' : 'Registrar atendimento'}</button>}
      {medica && (a.situacao === 'na_clinica' || a.situacao === 'atendido') && <button onClick={() => setSub('documento')}>Emitir documento</button>}
      <div className="dir">
        {aberto && <button onClick={() => setSub('remarcar')}>Remarcar</button>}
        {aberto && a.data <= hoje() && <button onClick={() => alterar((b) => faltou(b, a.id))}>Faltou</button>}
        {aberto && <button onClick={() => setSub('cancelar')}>Cancelar</button>}
        {(a.situacao === 'faltou' || a.situacao === 'cancelado') && <button onClick={() => onReagendar(a.pacienteId)}>Agendar de novo</button>}
      </div>
    </>
  );

  return (
    <>
      <Janela titulo={pac.nome} largura={680} onFechar={onFechar} rodape={botoes}
        sub={<>{srv.nome} · {dataBR(a.data)} · {a.inicio} às {a.fim} · {a.valor ? brl(a.valor) : 'sem custo'}{conv ? ` · ${conv}` : ''}</>}>
        <p style={{ margin: '0 0 12px' }}>
          Situação: <b className={['sem_resposta', 'pediu_remarcar'].includes(a.situacao) ? 'atencao' : ''}>{textoSituacao(a)}</b>
          {pago && <span className="mut"> · Pago em {diaMes(pago.data)} · {pago.forma}{pago.parcelas > 1 ? ` ${pago.parcelas}x` : ''}</span>}
          {podeReceber && <span className="mut"> · A receber {brl(a.valor)}</span>}
        </p>
        <ul className="historico">
          {a.eventos.map((e, i) => <li key={i}><span>{diaMes(e.quando.slice(0, 10))} {e.quando.slice(11, 16)}</span>{e.texto}</li>)}
        </ul>
        <p className="peq" style={{ margin: '14px 0 0' }}><a onClick={() => { onFechar(); ir(`pacientes/${pac.id}`); }}>Abrir ficha do paciente</a> <span className="mut">· {pac.celular}</span></p>
      </Janela>
      {sub === 'receber' && <Receber ag={a} onFechar={() => setSub(null)} />}
      {sub === 'remarcar' && <Remarcar ag={a} onFechar={() => setSub(null)} />}
      {sub === 'cancelar' && <Cancelar ag={a} onFechar={() => setSub(null)} />}
      {sub === 'registrar' && <RegistrarAtendimento ag={a} onFechar={() => setSub(null)} />}
      {sub === 'documento' && <EmitirDocumento pacienteId={a.pacienteId} ag={a} onFechar={() => setSub(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- receber
const FORMAS: FormaPagamento[] = ['PIX', 'Dinheiro', 'Débito', 'Crédito'];

function Receber({ ag, onFechar }: { ag: Agendamento; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [parcelas, setParcelas] = useState(1);
  const [valorTxt, setValorTxt] = useState(String(ag.valor).replace('.', ','));
  const [erro, setErro] = useState('');
  const valor = lerValor(valorTxt);
  const taxa = taxaMaquininha(base.clinica, forma, parcelas, valor);
  const confirmar = () => {
    if (valor <= 0) return setErro('Informe o valor.');
    if (usuario?.perfil === 'recepcao' && valor < ag.valor * 0.9) return setErro('Desconto acima de 10% só com a Dra.');
    alterar((b) => receber(b, ag.id, forma, forma === 'Crédito' ? parcelas : 1, valor));
    onFechar();
  };
  return (
    <Janela titulo="Receber" sub={base.pacientes.find((p) => p.id === ag.pacienteId)?.nome} largura={460} onFechar={onFechar}
      rodape={<><button className="pri" onClick={confirmar}>Confirmar recebimento</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">Valor</label><input className="w100" value={valorTxt} onChange={(e) => { setValorTxt(e.target.value); setErro(''); }} /></div>
        <div><label className="rot">Forma de pagamento</label>
          <div className="horarios">{FORMAS.map((f) => <button key={f} type="button" className={f === forma ? 'sel' : ''} onClick={() => setForma(f)}>{f}</button>)}</div></div>
        {forma === 'Crédito' && (
          <div><label className="rot">Parcelas</label>
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}x de {brl(valor / n)}</option>)}</select></div>
        )}
        <p className="mut peq" style={{ margin: 0 }}>{taxa ? `Taxa da maquininha: ${brl(taxa)} · entra ${brl(valor - taxa)}` : 'Sem taxa'}</p>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

// ---------------------------------------------------------------- remarcar / cancelar
function Remarcar({ ag, onFechar }: { ag: Agendamento; onFechar: () => void }) {
  const { alterar } = useDados();
  const [data, setData] = useState(ag.data < hoje() ? hoje() : ag.data);
  const [hora, setHora] = useState('');
  return (
    <Janela titulo="Remarcar" sub={`Hoje marcado para ${dataBR(ag.data)} às ${ag.inicio}`} largura={640} onFechar={onFechar}
      rodape={<><button className="pri" disabled={!hora} onClick={() => { alterar((b) => remarcar(b, ag.id, data, hora)); onFechar(); }}>Remarcar e avisar o paciente</button><button onClick={onFechar}>Cancelar</button></>}>
      <EscolherHorario data={data} hora={hora} duracao={minutos(ag.fim) - minutos(ag.inicio)} ignorarId={ag.id} onData={setData} onHora={setHora} />
    </Janela>
  );
}

function Cancelar({ ag, onFechar }: { ag: Agendamento; onFechar: () => void }) {
  const { alterar } = useDados();
  const [motivo, setMotivo] = useState('');
  return (
    <Janela titulo="Cancelar agendamento" largura={440} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => { alterar((b) => cancelar(b, ag.id, motivo.trim())); onFechar(); }}>Cancelar agendamento</button><button onClick={onFechar}>Voltar</button></>}>
      <label className="rot">Motivo</label>
      <input className="w100" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Paciente pediu pelo WhatsApp" autoFocus />
    </Janela>
  );
}

// ---------------------------------------------------------------- registrar atendimento (só a médica)
const EXAMES = ['Ecocardiograma', 'Eletrocardiograma', 'Teste ergométrico', 'MAPA 24h', 'Holter 24h', 'Bioimpedância', 'Perfil lipídico', 'Hemograma', 'Glicemia de jejum'];
const RETORNOS: [string, number | null][] = [['Sem retorno', null], ['30 dias', 30], ['60 dias', 60], ['90 dias', 90], ['6 meses', 180], ['1 ano', 365]];

function RegistrarAtendimento({ ag, onFechar }: { ag: Agendamento; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const atual = base.registros.find((r) => r.agendamentoId === ag.id);
  const [cid, setCid] = useState(atual?.cid ?? '');
  const [obs, setObs] = useState(atual?.observacao ?? '');
  const [exames, setExames] = useState<string[]>(atual?.examesPedidos ?? []);
  const [retorno, setRetorno] = useState<number | null>(atual?.retornoDias ?? 30);
  const marcar = (e: string) => setExames(exames.includes(e) ? exames.filter((x) => x !== e) : [...exames, e]);
  return (
    <Janela titulo="Registro do atendimento" sub={`${base.pacientes.find((p) => p.id === ag.pacienteId)?.nome} · ${dataBR(ag.data)}`} largura={620} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => { alterar((b) => registrarAtendimento(b, ag.id, { cid, observacao: obs.trim(), examesPedidos: exames, retornoDias: retorno })); onFechar(); }}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">CID</label>
          <input className="w100" list="lista-cid" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Digite o código ou o nome" />
          <datalist id="lista-cid">{LISTA_CID.map(([c, d]) => <option key={c} value={`${c} · ${d}`} />)}</datalist></div>
        <div><label className="rot">Observação</label><textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <div><label className="rot">Exames pedidos</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {EXAMES.map((e) => <label key={e} className="peq" style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={exames.includes(e)} onChange={() => marcar(e)} />{e}</label>)}
          </div></div>
        <div><label className="rot">Retorno</label>
          <select value={String(retorno)} onChange={(e) => setRetorno(e.target.value === 'null' ? null : Number(e.target.value))}>
            {RETORNOS.map(([n, v]) => <option key={n} value={String(v)}>{n}</option>)}</select></div>
      </div>
    </Janela>
  );
}

// ---------------------------------------------------------------- novo agendamento
export function NovoAgendamento({ dataInicial, horaInicial, pacienteInicial, onFechar }: { dataInicial: string; horaInicial?: string; pacienteInicial?: string; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [pac, setPac] = useState<Paciente | null>(() => base.pacientes.find((p) => p.id === pacienteInicial) ?? null);
  const [cadastrar, setCadastrar] = useState<string | null>(null);
  const ativos = base.servicos.filter((s) => s.ativo);
  const [servicos, setServicos] = useState<string[]>(['srv_consulta']);
  const [convenio, setConvenio] = useState<string>('');
  const [data, setData] = useState(dataInicial < hoje() ? hoje() : dataInicial);
  const [hora, setHora] = useState(horaInicial ?? '');
  const [whats, setWhats] = useState(true);
  const [erro, setErro] = useState('');
  const escolhidos = servicos.map((id) => base.servicos.find((s) => s.id === id)!);
  const duracao = escolhidos.reduce((a, s) => a + s.duracaoMin, 0);
  const valor = escolhidos.reduce((a, s) => a + valorDoServico(s, convenio || null), 0);
  const semValorConvenio = convenio && escolhidos.some((s) => !(convenio in s.valoresConvenio));

  const confirmar = () => {
    if (!pac) return setErro('Escolha o paciente.');
    if (!hora) return setErro('Escolha o horário.');
    alterar((b) => {
      let ini = minutos(hora);
      for (const s of escolhidos) {
        agendar(b, { pacienteId: pac.id, servicoId: s.id, data, inicio: hhmm(ini), convenioId: convenio || null, enviarWhatsapp: whats, origem: usuario?.perfil === 'medica' ? 'pela Dra.' : 'pela recepção' });
        ini += s.duracaoMin;
      }
    });
    onFechar();
  };

  const listaServ = useMemo(() => ativos, [ativos]);
  return (
    <>
      <Janela titulo="Novo agendamento" largura={680} onFechar={onFechar}
        rodape={<><button className="pri" onClick={confirmar}>Agendar</button><button onClick={onFechar}>Cancelar</button></>}>
        <div className="campos">
          <div><label className="rot">Paciente</label><BuscaPaciente selecionado={pac} onEscolher={setPac} onNovo={(n) => setCadastrar(n)} /></div>
          {servicos.map((id, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: i === 0 ? '1fr 200px' : '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>{i === 0 && <label className="rot">Serviço</label>}
                <select className="w100" value={id} onChange={(e) => { const n = [...servicos]; n[i] = e.target.value; setServicos(n); setHora(''); }}>
                  {listaServ.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.duracaoMin >= 60 ? `${s.duracaoMin / 60} hora` : `${s.duracaoMin} min`})</option>)}
                </select></div>
              {i === 0 ? (
                <div><label className="rot">Pagamento</label>
                  <select className="w100" value={convenio} onChange={(e) => setConvenio(e.target.value)}>
                    <option value="">Particular</option>
                    {base.convenios.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select></div>
              ) : <button onClick={() => { setServicos(servicos.filter((_, j) => j !== i)); setHora(''); }}>Remover</button>}
            </div>
          ))}
          <a className="peq" style={{ marginTop: -6 }} onClick={() => { setServicos([...servicos, 'srv_eco']); setHora(''); }}>Adicionar outro serviço em seguida</a>
          <EscolherHorario data={data} hora={hora} duracao={duracao} onData={setData} onHora={setHora} />
          <p style={{ margin: 0 }} className="mut">Valor: <b style={{ color: 'var(--texto)' }}>{valor ? brl(valor) : 'sem custo'}</b>
            {semValorConvenio && <span className="atencao"> · Valor do convênio não cadastrado para este serviço</span>}</p>
          <label className="peq" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={whats} onChange={(e) => setWhats(e.target.checked)} style={{ width: 16, height: 16 }} />
            Enviar confirmação ao paciente pelo WhatsApp
          </label>
          {erro && <div className="erro">{erro}</div>}
        </div>
      </Janela>
      {cadastrar !== null && <FormPaciente nomeInicial={cadastrar} onFechar={() => setCadastrar(null)} onSalvo={(p) => setPac(p)} />}
    </>
  );
}
