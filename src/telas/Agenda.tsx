// Agenda: tela inicial das duas (recepção e Dra.). Um dia por vez; cada linha é uma VISITA
// (um ou mais serviços do paciente em sequência). Clicar no paciente abre o pop-up; clicar num
// horário livre abre o Novo agendamento naquele horário. As pendências ficam no sino do topo.
// Celular: cada visita vira duas linhas (horário e nome; serviços e situação), sem a coluna de pagamento.
import { useEffect, useState } from 'react';
import { useDados } from '../estado/Dados';
import { gradeDoDia, PEDE_ATENCAO, type Visita } from '../regras/agenda';
import { brl, dataExtenso, diaSemana, hoje, somarDias } from '../regras/formato';
import { pagamentoDo } from '../estado/acoes';
import { useRota } from '../estado/rota';
import { Calendario } from '../componentes/Calendario';
import { DetalheVisita, NovoAgendamento, textoSituacao } from '../componentes/Agendamento';

export function Agenda() {
  const { base } = useDados();
  const [data, setData] = useState(hoje());
  const [calAberto, setCalAberto] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ data: string; hora?: string; paciente?: string } | null>(null);
  // vindo do sino: #/agenda/<data>/<visitaId>/<marca> abre o dia e o pop-up do paciente
  const [, dRota, vRota, marca] = useRota();
  useEffect(() => {
    if (dRota && vRota) { setData(dRota); setAberta(vRota); }
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
          <button className="seta" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">‹</button>
          <span className="dia">{dataExtenso(data)}</span>
          <button className="seta" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">›</button>
          <div style={{ position: 'relative' }}>
            <button className="link" onClick={() => setCalAberto(!calAberto)}>Calendário</button>
            {calAberto && <div className="popover"><Calendario valor={data} onEscolher={(d) => { setData(d); setCalAberto(false); }} /></div>}
          </div>
          {data !== hoje() && <button className="link" onClick={() => setData(hoje())}>Hoje</button>}
        </div>
        <div className="acoes"><button className="pri" onClick={() => setNovo({ data })}>Novo agendamento</button></div>
      </div>

      {fechado ? <p className="vazio">Sem atendimento neste dia.</p> : (
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
      )}
      {!fechado && <p className="mut peq" style={{ marginTop: 14 }}>{qtdPac} {qtdPac === 1 ? 'paciente' : 'pacientes'} · {qtdLivre} {qtdLivre === 1 ? 'horário livre' : 'horários livres'}</p>}

      {aberta && <DetalheVisita visitaId={aberta} onFechar={() => setAberta(null)} onReagendar={(p) => { setAberta(null); setNovo({ data: hoje(), paciente: p }); }} />}
      {novo && <NovoAgendamento dataInicial={novo.data} horaInicial={novo.hora} pacienteInicial={novo.paciente} onFechar={() => setNovo(null)} />}
    </>
  );
}
