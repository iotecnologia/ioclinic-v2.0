// Agenda: tela inicial das duas (recepção e Dra.). Visão de um dia ou da semana; no dia, cada linha é uma VISITA
// (um ou mais serviços do paciente em sequência). Clicar no paciente abre o pop-up; clicar num
// horário livre abre o Novo agendamento naquele horário. As pendências ficam no sino do topo.
// Celular: cada visita vira duas linhas (horário e nome; serviços e situação), sem a coluna de pagamento.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDados } from '../estado/Dados';
import { gradeDoDia, PEDE_ATENCAO, visitasDoDia, type Visita } from '../regras/agenda';
import { brl, DIAS, dataExtenso, diaSemana, hoje, MESES, paraData, somarDias } from '../regras/formato';
import { pagamentoDo } from '../estado/acoes';
import { useRota } from '../estado/rota';
import { Calendario } from '../componentes/Calendario';
import { DetalheVisita, NovoAgendamento, textoSituacao } from '../componentes/Agendamento';
import { useFechaFora } from '../componentes/useFechaFora';

/** Segunda-feira da semana de `d`. */
const inicioSemana = (d: string) => somarDias(d, -((diaSemana(d) + 6) % 7));
function textoSemana(seg: string) {
  const sab = somarDias(seg, 5);
  const a = paraData(seg), b = paraData(sab);
  return a.getMonth() === b.getMonth() ? `${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]}` : `${a.getDate()} de ${MESES[a.getMonth()]} a ${b.getDate()} de ${MESES[b.getMonth()]}`;
}

export function Agenda() {
  const { base } = useDados();
  const [data, setData] = useState(hoje());
  const [calAberto, setCalAberto] = useState(false);
  const [modo, setModo] = useState<'dia' | 'semana'>('dia');
  const refCal = useRef<HTMLDivElement>(null);
  useFechaFora(refCal, calAberto, useCallback(() => setCalAberto(false), []));
  const [aberta, setAberta] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ data: string; hora?: string; paciente?: string } | null>(null);
  // vindo do sino: #/agenda/<data>/<visitaId>/<marca> abre o dia e o pop-up do paciente
  const [, dRota, vRota, marca] = useRota();
  useEffect(() => {
    if (dRota && vRota) { setData(dRota); setModo('dia'); setAberta(vRota); }
  }, [dRota, vRota, marca]);

  const linhas = gradeDoDia(data, base.agendamentos, base.clinica);
  const fechado = !base.clinica.horarios[diaSemana(data)];
  const nome = (v: Visita) => base.pacientes.find((p) => p.id === v.pacienteId)?.nome ?? '';
  const servicos = (v: Visita) => v.itens.map((a) => base.servicos.find((s) => s.id === a.servicoId)?.nome ?? '').join(' + ');


  const pagamento = (v: Visita) => {
    const pagos = v.itens.map((a) => pagamentoDo(base, a.id)).filter(Boolean);
    const total = v.itens.reduce((s, a) => s + a.valor, 0);
    if (pagos.length && pagos.length === v.itens.filter((a) => a.valor > 0).length) return `Recebido · ${pagos[0]!.forma} · ${brl(pagos.reduce((s, p) => s + p!.valor, 0))}`;
    if (total === 0) return v.situacao === 'atendido' ? 'Sem custo' : '';
    if (v.situacao === 'na_clinica' || v.situacao === 'atendido') return `A receber · ${brl(total - pagos.reduce((s, p) => s + p!.valor, 0))}`;
    return '';
  };
  const classeSit = (v: Visita) => (PEDE_ATENCAO.includes(v.situacao) ? 'atencao' : v.situacao === 'faltou' ? 'neg' : '');
  const qtdPac = linhas.filter((l) => l.tipo === 'visita').length;
  const qtdLivre = linhas.filter((l) => l.tipo === 'livre').length;

  return (
    <>
      <div className="cab cab-agenda">
        <h1>Agenda</h1>
        <div className="navega-dia">
          <button className="seta" onClick={() => setData(somarDias(data, modo === 'dia' ? -1 : -7))} aria-label={modo === 'dia' ? 'Dia anterior' : 'Semana anterior'}>‹</button>
          <span className="dia">{modo === 'dia' ? dataExtenso(data) : textoSemana(inicioSemana(data))}</span>
          <button className="seta" onClick={() => setData(somarDias(data, modo === 'dia' ? 1 : 7))} aria-label={modo === 'dia' ? 'Próximo dia' : 'Próxima semana'}>›</button>
          <div style={{ position: 'relative' }} ref={refCal}>
            <button className="link" onClick={() => setCalAberto(!calAberto)}>Calendário</button>
            {calAberto && <div className="popover"><Calendario valor={data} onEscolher={(d) => { setData(d); setCalAberto(false); }} /></div>}
          </div>
          <button className="link" onClick={() => setModo(modo === 'dia' ? 'semana' : 'dia')}>{modo === 'dia' ? 'Semana' : 'Dia'}</button>
          {(modo === 'dia' ? data !== hoje() : inicioSemana(data) !== inicioSemana(hoje())) && <button className="link" onClick={() => setData(hoje())}>Hoje</button>}
        </div>
        <div className="acoes"><button className="pri" onClick={() => setNovo({ data })}>Novo agendamento</button></div>
      </div>

      {modo === 'semana' && (
        <div className="semana">
          {Array.from({ length: 6 }, (_, i) => somarDias(inicioSemana(data), i)).map((d) => {
            const vs = visitasDoDia(d, base.agendamentos);
            const fechadoDia = !base.clinica.horarios[diaSemana(d)];
            return (
              <div key={d} className={'dia-semana' + (d === hoje() ? ' hoje' : '')}>
                <button className="cab-dia" onClick={() => { setData(d); setModo('dia'); }} title="Ver este dia">
                  <span>{DIAS[diaSemana(d)].split('-')[0].replace(/^./, (c) => c.toUpperCase())}</span> <b>{paraData(d).getDate()}</b>
                  <span className="mut peq">{fechadoDia ? 'fechado' : vs.length ? `${vs.length} ${vs.length === 1 ? 'paciente' : 'pacientes'}` : 'livre'}</span>
                </button>
                {vs.map((v) => (
                  <button key={v.id} className="visita-semana" onClick={() => { setData(d); setAberta(v.id); }}>
                    <span className="hora">{v.inicio}</span>
                    <span>{nome(v).split(' ').slice(0, 2).join(' ')}</span>
                    <span className="mut peq">{servicos(v)}</span>
                    <span className={'peq ' + (classeSit(v) || 'mut')}>{textoSituacao(v)}</span>
                  </button>
                ))}
                {!fechadoDia && d >= hoje() && <button className="link peq novo-dia" onClick={() => setNovo({ data: d })}>Agendar neste dia</button>}
              </div>
            );
          })}
        </div>
      )}

      {modo === 'dia' && (fechado ? <p className="vazio">Sem atendimento neste dia.</p> : (
        <table className="tabela-agenda">
          <colgroup><col className="c-hora" /><col /><col className="c-serv" /><col className="c-sit" /><col className="c-pag" /></colgroup>
          <thead><tr><th>Horário</th><th>Paciente</th><th className="so-largo">Serviço</th><th className="so-largo">Situação</th><th className="so-desktop">Pagamento</th></tr></thead>
          <tbody>
            {linhas.map((l) => l.tipo === 'livre' ? (
              <tr key={'l' + l.inicio} className="livre clicavel" onClick={() => setNovo({ data, hora: data >= hoje() ? l.inicio : undefined })} title="Agendar neste horário">
                <td>{l.inicio}</td><td>Livre até {l.fim}</td><td className="so-largo" /><td className="so-largo" /><td className="so-desktop" />
              </tr>
            ) : (
              <tr key={l.visita.id} className="clicavel" onClick={() => setAberta(l.visita.id)}>
                <td>{l.visita.inicio}</td>
                <td>
                  {nome(l.visita)}
                  <div className="so-celular mut peq">{servicos(l.visita)} · <span className={classeSit(l.visita)}>{textoSituacao(l.visita)}</span></div>
                </td>
                <td className="so-largo">{servicos(l.visita)}</td>
                <td className={'so-largo ' + classeSit(l.visita)}>{textoSituacao(l.visita)}</td>
                <td className="so-desktop mut">{pagamento(l.visita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {modo === 'dia' && !fechado && <p className="mut peq" style={{ marginTop: 14 }}>{qtdPac} {qtdPac === 1 ? 'paciente' : 'pacientes'} · {qtdLivre} {qtdLivre === 1 ? 'horário livre' : 'horários livres'}</p>}

      {aberta && <DetalheVisita visitaId={aberta} onFechar={() => setAberta(null)} onReagendar={(p) => { setAberta(null); setNovo({ data: hoje(), paciente: p }); }} />}
      {novo && <NovoAgendamento dataInicial={novo.data} horaInicial={novo.hora} pacienteInicial={novo.paciente} onFechar={() => setNovo(null)} />}
    </>
  );
}
