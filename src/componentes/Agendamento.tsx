// Pop-ups da agenda, sempre por VISITA (um ou mais serviços do paciente em sequência):
// detalhe, novo agendamento, receber, remarcar, cancelar e registrar atendimento.
import { useState } from 'react';
import type { FormaPagamento, Paciente } from '../tipos/modelos';
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';
import { agendarVisita, cancelar, chegou, confirmarManual, faltou, horarioDaRetirada, ID_RETIRADA, pagamentoDo, pagamentosDaVisita, receber, registrarAtendimento, registroDaVisita, remarcar, tirarDaVisita } from '../estado/acoes';
import { horariosLivres, montarVisita, NOME_SITUACAO, servicosDaVisita, type Visita } from '../regras/agenda';
import { agoraHHMM, brl, dataBR, dataExtenso, diaMes, hhmm, hoje, lerValor, minutos } from '../regras/formato';
import { taxaMaquininha } from '../regras/caixa';
import { LISTA_CID } from '../dados/gerador';
import { ir } from '../estado/rota';
import { Janela } from './Janela';
import { BuscaPaciente } from './BuscaPaciente';
import { FormPaciente } from './FormPaciente';
import { EscolherHorario } from './EscolherHorario';
import { Calendario } from './Calendario';
import { EmitirDocumento } from './Documentos';

export function textoSituacao(v: Visita) {
  const chegouAs = v.itens[0].chegouAs;
  return v.situacao === 'na_clinica' && chegouAs ? `Na clínica desde ${chegouAs}` : NOME_SITUACAO[v.situacao];
}

// ---------------------------------------------------------------- detalhe da visita
type Sub = 'receber' | 'remarcar' | 'cancelar' | 'registrar' | 'documento' | null;

export function DetalheVisita({ visitaId, onFechar, onReagendar }: { visitaId: string; onFechar: () => void; onReagendar: (pacienteId: string) => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [sub, setSub] = useState<Sub>(null);
  const todos = servicosDaVisita(base.agendamentos, visitaId, true);
  if (!todos.length) return null;
  const v = montarVisita(todos);
  const pac = base.pacientes.find((p) => p.id === v.pacienteId)!;
  const nomeServ = (id: string) => base.servicos.find((s) => s.id === id)?.nome ?? '';
  const pagos = pagamentosDaVisita(base, visitaId);
  const aReceber = v.itens.filter((a) => a.valor > 0 && !pagoDo(a.id)).reduce((s, a) => s + a.valor, 0);
  function pagoDo(id: string) { return pagamentoDo(base, id); }
  const medica = usuario?.perfil === 'medica';
  const primeiro = v.itens[0];
  const aberto = ['agendado', 'confirmado', 'sem_resposta', 'pediu_remarcar'].includes(v.situacao);
  const ehHoje = v.data === hoje();
  const atendendo = v.situacao === 'na_clinica' || v.situacao === 'atendido';
  const podeReceber = aReceber > 0 && atendendo;
  const ehRetirada = v.itens.every((a) => a.servicoId === ID_RETIRADA);
  const origem = primeiro.retiradaDe ? montarVisita(servicosDaVisita(base.agendamentos, primeiro.retiradaDe, true)) : null;

  const botoes = (
    <>
      {aberto && ehHoje && <button className="pri" onClick={() => alterar((b) => chegou(b, visitaId))}>{ehRetirada ? 'Devolveu o aparelho' : 'Chegou'}</button>}
      {podeReceber && <button className="pri" onClick={() => setSub('receber')}>Receber {brl(aReceber)}</button>}
      {aberto && v.situacao !== 'confirmado' && <button onClick={() => alterar((b) => confirmarManual(b, visitaId))}>Confirmar</button>}
      {medica && atendendo && !ehRetirada && <button onClick={() => setSub('registrar')}>{registroDaVisita(base, visitaId) ? 'Ver registro' : 'Registrar atendimento'}</button>}
      {medica && atendendo && !ehRetirada && <button onClick={() => setSub('documento')}>Emitir documento</button>}
      <div className="dir">
        {aberto && !ehRetirada && <button onClick={() => setSub('remarcar')}>Remarcar</button>}
        {aberto && v.data <= hoje() && !ehRetirada && <button onClick={() => alterar((b) => faltou(b, visitaId))}>Faltou</button>}
        {aberto && <button onClick={() => setSub('cancelar')}>Cancelar</button>}
        {(v.situacao === 'faltou' || v.situacao === 'cancelado') && <button onClick={() => onReagendar(v.pacienteId)}>Agendar de novo</button>}
      </div>
    </>
  );

  return (
    <>
      <Janela titulo={pac.nome} largura={700} onFechar={onFechar} rodape={botoes}
        sub={<>{dataBR(v.data)} · {v.inicio} às {v.fim}</>}>
        <p style={{ margin: '0 0 12px' }}>
          Situação: <b className={['sem_resposta', 'pediu_remarcar'].includes(v.situacao) ? 'atencao' : ''}>{textoSituacao(v)}</b>
          {pagos.length > 0 && aReceber === 0 && <span className="mut"> · Pago em {diaMes(pagos[0].data)} · {pagos[0].forma}{pagos[0].parcelas > 1 ? ` ${pagos[0].parcelas}x` : ''}</span>}
          {podeReceber && <span className="mut"> · A receber {brl(aReceber)}</span>}
        </p>
        {origem && <p className="mut" style={{ margin: '0 0 12px' }}>Retirada do aparelho colocado em {dataBR(origem.data)} às {origem.inicio}.</p>}

        <table style={{ marginBottom: 14 }}>
          <thead><tr><th>Horário</th><th>Serviço</th><th className="num">Valor</th><th /></tr></thead>
          <tbody>
            {todos.map((a) => (
              <tr key={a.id} className={a.situacao === 'cancelado' ? 'livre' : ''}>
                <td>{a.inicio}</td>
                <td>{nomeServ(a.servicoId)}{a.situacao === 'cancelado' && ' · retirado da visita'}</td>
                <td className="num">{a.valor ? brl(a.valor) : 'sem custo'}</td>
                <td className="num">{v.itens.length > 1 && a.situacao !== 'cancelado' && !pagoDo(a.id) && v.situacao !== 'atendido' &&
                  <button className="link" onClick={() => alterar((b) => tirarDaVisita(b, a.id))}>Tirar</button>}</td>
              </tr>
            ))}
            {v.itens.length > 1 && <tr className="total"><td colSpan={2}>Total</td><td className="num">{brl(v.valor)}</td><td /></tr>}
          </tbody>
        </table>

        <ul className="historico">
          {primeiro.eventos.map((e, i) => <li key={i}><span>{diaMes(e.quando.slice(0, 10))} {e.quando.slice(11, 16)}</span>{e.texto}</li>)}
        </ul>
        <p className="peq" style={{ margin: '14px 0 0' }}><a onClick={() => { onFechar(); ir(`pacientes/${pac.id}`); }}>Abrir ficha do paciente</a> <span className="mut">· {pac.celular}</span></p>
      </Janela>
      {sub === 'receber' && <Receber visitaId={visitaId} total={aReceber} onFechar={() => setSub(null)} />}
      {sub === 'remarcar' && <Remarcar visita={v} onFechar={() => setSub(null)} />}
      {sub === 'cancelar' && <Cancelar visitaId={visitaId} onFechar={() => setSub(null)} />}
      {sub === 'registrar' && <RegistrarAtendimento visita={v} onFechar={() => setSub(null)} />}
      {sub === 'documento' && <EmitirDocumento pacienteId={v.pacienteId} visita={v} onFechar={() => setSub(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- receber (a visita inteira)
const FORMAS: FormaPagamento[] = ['PIX', 'Dinheiro', 'Débito', 'Crédito'];

function Receber({ visitaId, total, onFechar }: { visitaId: string; total: number; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [parcelas, setParcelas] = useState(1);
  const [valorTxt, setValorTxt] = useState(total.toFixed(2).replace('.', ','));
  const [erro, setErro] = useState('');
  const valor = lerValor(valorTxt);
  const p = forma === 'Crédito' ? parcelas : 1;
  const taxa = taxaMaquininha(base.clinica, forma, p, valor);
  const pac = base.pacientes.find((x) => x.id === servicosDaVisita(base.agendamentos, visitaId)[0]?.pacienteId);
  const confirmar = () => {
    if (valor <= 0) return setErro('Informe o valor.');
    if (usuario?.perfil === 'recepcao' && valor < total * 0.9) return setErro('Desconto acima de 10% só com a Dra.');
    alterar((b) => receber(b, visitaId, forma, p, valor));
    onFechar();
  };
  return (
    <Janela titulo="Receber" sub={pac?.nome} largura={460} onFechar={onFechar}
      rodape={<><button className="pri" onClick={confirmar}>Confirmar recebimento</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">Valor</label><input className="w100" inputMode="decimal" value={valorTxt} onChange={(e) => { setValorTxt(e.target.value); setErro(''); }} /></div>
        <div><label className="rot">Forma de pagamento</label>
          <div className="horarios">{FORMAS.map((f) => <button key={f} type="button" className={f === forma ? 'sel' : ''} onClick={() => setForma(f)}>{f}</button>)}</div></div>
        {forma === 'Crédito' && (
          <div><label className="rot">Parcelas</label>
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x de {brl(valor / n)}</option>)}</select></div>
        )}
        <p className="mut peq" style={{ margin: 0 }}>{taxa ? `Taxa da maquininha: ${brl(taxa)} · entra ${brl(valor - taxa)}` : 'Sem taxa'}</p>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

// ---------------------------------------------------------------- remarcar / cancelar
function Remarcar({ visita, onFechar }: { visita: Visita; onFechar: () => void }) {
  const { alterar } = useDados();
  const [data, setData] = useState(visita.data < hoje() ? hoje() : visita.data);
  const [hora, setHora] = useState('');
  return (
    <Janela titulo="Remarcar" sub={`Hoje marcado para ${dataBR(visita.data)} às ${visita.inicio}`} largura={660} onFechar={onFechar}
      rodape={<><button className="pri" disabled={!hora} onClick={() => { alterar((b) => remarcar(b, visita.id, data, hora)); onFechar(); }}>Remarcar e avisar o paciente</button><button onClick={onFechar}>Cancelar</button></>}>
      <EscolherHorario data={data} hora={hora} duracao={minutos(visita.fim) - minutos(visita.inicio)} ignorarVisita={visita.id} onData={setData} onHora={setHora} />
    </Janela>
  );
}

function Cancelar({ visitaId, onFechar }: { visitaId: string; onFechar: () => void }) {
  const { alterar } = useDados();
  const [motivo, setMotivo] = useState('');
  return (
    <Janela titulo="Cancelar agendamento" largura={440} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => { alterar((b) => cancelar(b, visitaId, motivo.trim())); onFechar(); }}>Cancelar agendamento</button><button onClick={onFechar}>Voltar</button></>}>
      <label className="rot">Motivo</label>
      <input className="w100" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Paciente pediu pelo WhatsApp" autoFocus />
    </Janela>
  );
}

// ---------------------------------------------------------------- registrar atendimento (só a médica)
const EXAMES = ['Ecocardiograma', 'Eletrocardiograma', 'Teste ergométrico', 'MAPA 24h', 'Holter 24h', 'Ecodoppler', 'Bioimpedância', 'Perfil lipídico', 'Hemograma'];
const RETORNOS: [string, number | null][] = [['Sem retorno', null], ['30 dias', 30], ['60 dias', 60], ['90 dias', 90], ['6 meses', 180], ['1 ano', 365]];

function RegistrarAtendimento({ visita, onFechar }: { visita: Visita; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const atual = registroDaVisita(base, visita.id);
  const [cid, setCid] = useState(atual?.cid ?? '');
  const [obs, setObs] = useState(atual?.observacao ?? '');
  const [exames, setExames] = useState<string[]>(atual?.examesPedidos ?? []);
  const [retorno, setRetorno] = useState<number | null>(atual?.retornoDias ?? 30);
  const marcar = (e: string) => setExames(exames.includes(e) ? exames.filter((x) => x !== e) : [...exames, e]);
  return (
    <Janela titulo="Registro do atendimento" sub={`${base.pacientes.find((p) => p.id === visita.pacienteId)?.nome} · ${dataBR(visita.data)}`} largura={620} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => { alterar((b) => registrarAtendimento(b, visita.id, { cid, observacao: obs.trim(), examesPedidos: exames, retornoDias: retorno })); onFechar(); }}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">CID</label>
          <input className="w100" list="lista-cid" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Digite o código ou o nome" />
          <datalist id="lista-cid">{LISTA_CID.map(([c, d]) => <option key={c} value={`${c} · ${d}`} />)}</datalist></div>
        <div><label className="rot">Observação</label><textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        <div><label className="rot">Exames pedidos</label>
          <div className="grade-check">
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
// Uma lista de exames: cada linha tem o serviço e o horário. A recepcionista decide os horários
// (pode pôr todos no mesmo horário ou um depois do outro). "Adicionar outro exame" inclui mais uma linha.
type Linha = { servicoId: string; hora: string };

export function NovoAgendamento({ dataInicial, horaInicial, pacienteInicial, onFechar }: { dataInicial: string; horaInicial?: string; pacienteInicial?: string; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const { usuario } = useSessao();
  const [pac, setPac] = useState<Paciente | null>(() => base.pacientes.find((p) => p.id === pacienteInicial) ?? null);
  const [cadastrar, setCadastrar] = useState<string | null>(null);
  const opcoes = base.servicos.filter((s) => s.ativo && !s.interno);
  const [data, setData] = useState(dataInicial < hoje() ? hoje() : dataInicial);
  const [linhas, setLinhas] = useState<Linha[]>([{ servicoId: '', hora: horaInicial ?? '' }]);
  const [whats, setWhats] = useState(true);
  const [erro, setErro] = useState('');
  const serv = (id: string) => base.servicos.find((s) => s.id === id);
  const desde = (d: string) => (d === hoje() ? agoraHHMM() : undefined);
  const livres = (servicoId: string) => horariosLivres(data, serv(servicoId)?.duracaoMin ?? 30, base.agendamentos, base.clinica, [], undefined, desde(data));
  const total = linhas.reduce((a, l) => a + (serv(l.servicoId)?.valorParticular ?? 0), 0);
  const comRetirada = linhas.find((l) => serv(l.servicoId)?.retiradaDiaSeguinte && l.hora);
  const ret = serv(ID_RETIRADA);
  const retirada = comRetirada && ret ? horarioDaRetirada(base, data, comRetirada.hora, ret.duracaoMin) : null;

  const mudar = (i: number, l: Partial<Linha>) => { setLinhas(linhas.map((x, j) => (j === i ? { ...x, ...l } : x))); setErro(''); };
  const adicionar = () => {
    // sugere o horário logo depois do exame anterior (a recepcionista pode trocar)
    const ant = linhas[linhas.length - 1];
    const fimAnt = ant.hora && serv(ant.servicoId) ? hhmm(minutos(ant.hora) + serv(ant.servicoId)!.duracaoMin) : '';
    setLinhas([...linhas, { servicoId: '', hora: fimAnt }]);
  };
  const confirmar = () => {
    if (!pac) return setErro('Escolha o paciente.');
    if (linhas.some((l) => !l.servicoId)) return setErro('Escolha o exame de cada linha.');
    if (linhas.some((l) => !l.hora)) return setErro('Escolha o horário de cada exame.');
    if (linhas.some((l) => !livres(l.servicoId).includes(l.hora))) return setErro('Algum horário não está mais livre. Confira os horários.');
    alterar((b) => agendarVisita(b, { pacienteId: pac.id, data, itens: linhas.map((l) => ({ servicoId: l.servicoId, inicio: l.hora })), enviarWhatsapp: whats, origem: usuario?.perfil === 'medica' ? 'pela Dra.' : 'pela recepção' }));
    onFechar();
  };

  return (
    <>
      <Janela titulo="Novo agendamento" largura={860} onFechar={onFechar}
        rodape={<><button className="pri" onClick={confirmar}>Agendar</button><button onClick={onFechar}>Cancelar</button></>}>
        <div className="campos">
          <div><label className="rot">Paciente</label><BuscaPaciente selecionado={pac} onEscolher={setPac} onNovo={(n) => setCadastrar(n)} /></div>
          <div className="escolher-horario">
            <Calendario valor={data} onEscolher={(d) => { setData(d); setLinhas(linhas.map((l) => ({ ...l, hora: '' }))); }}
              podeEscolher={(d) => d >= hoje() && horariosLivres(d, 30, base.agendamentos, base.clinica, [], undefined, desde(d)).length > 0} />
            <div>
              <label className="rot">Exames · {dataExtenso(data)}</label>
              <div className="lista-exames">
                {linhas.map((l, i) => {
                  const hs = l.servicoId ? livres(l.servicoId) : [];
                  return (
                    <div key={i} className="linha-exame">
                      <select value={l.servicoId} onChange={(e) => mudar(i, { servicoId: e.target.value, hora: e.target.value && livres(e.target.value).includes(l.hora) ? l.hora : '' })}>
                        <option value="">Escolha o exame</option>
                        {opcoes.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.valorParticular ? brl(s.valorParticular) : 'sem custo'}</option>)}
                      </select>
                      <select value={l.hora} disabled={!l.servicoId} onChange={(e) => mudar(i, { hora: e.target.value })} aria-label="Horário">
                        <option value="">{l.servicoId && !hs.length ? 'Sem horário' : 'Horário'}</option>
                        {hs.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {linhas.length > 1 ? <button onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>Remover</button> : <span />}
                    </div>
                  );
                })}
              </div>
              <button style={{ marginTop: 10 }} onClick={adicionar}>Adicionar outro exame</button>
              <p style={{ margin: '14px 0 0' }}>Total: <b>{total ? brl(total) : 'sem custo'}</b></p>
              {retirada && <p className="mut" style={{ margin: '6px 0 0' }}>Retirada do aparelho: {dataBR(retirada.data)} às {retirada.inicio} (marcada sozinha).</p>}
            </div>
          </div>
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
