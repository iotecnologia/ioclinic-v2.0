// Agenda: tela inicial das duas (recepção e Dra.). Um dia por vez; clicar no paciente abre o pop-up;
// clicar num horário livre abre o Novo agendamento naquele horário.
import { useState } from 'react';
import { useDados } from '../estado/Dados';
import { gradeDoDia, PEDE_ATENCAO } from '../regras/agenda';
import { brl, dataExtenso, diaSemana, hoje, somarDias } from '../regras/formato';
import { pagamentoDo } from '../estado/acoes';
import { Calendario } from '../componentes/Calendario';
import { DetalheAgendamento, NovoAgendamento, textoSituacao } from '../componentes/Agendamento';
import type { Agendamento } from '../tipos/modelos';

export function Agenda() {
  const { base } = useDados();
  const [data, setData] = useState(hoje());
  const [calAberto, setCalAberto] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ data: string; hora?: string; paciente?: string } | null>(null);

  const linhas = gradeDoDia(data, base.agendamentos, base.clinica);
  const fechado = !base.clinica.horarios[diaSemana(data)];
  const nome = (a: Agendamento) => base.pacientes.find((p) => p.id === a.pacienteId)?.nome ?? '';
  const servico = (a: Agendamento) => base.servicos.find((s) => s.id === a.servicoId)?.nome ?? '';

  // Atenção: hoje e amanhã, quem não respondeu ou pediu para remarcar
  const amanha = somarDias(hoje(), 1);
  const atencao = base.agendamentos.filter((a) => (a.data === hoje() || a.data === amanha) && PEDE_ATENCAO.includes(a.situacao))
    .sort((x, y) => (x.data + x.inicio).localeCompare(y.data + y.inicio));

  const pagamento = (a: Agendamento) => {
    const p = pagamentoDo(base, a.id);
    if (p) return `Recebido · ${p.forma} · ${brl(p.valor)}`;
    if (a.valor === 0) return a.situacao === 'atendido' ? 'Sem custo' : '';
    if (a.situacao === 'na_clinica' || a.situacao === 'atendido') return `A receber · ${brl(a.valor)}`;
    return '';
  };
  const qtdPac = linhas.filter((l) => l.tipo === 'agendamento').length;
  const qtdLivre = linhas.filter((l) => l.tipo === 'livre').length;

  return (
    <>
      <div className="cab">
        <h1>Agenda</h1>
        <button className="seta" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">‹</button>
        <span style={{ fontSize: 17, minWidth: 260, textAlign: 'center' }}>{dataExtenso(data)}</span>
        <button className="seta" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">›</button>
        <div style={{ position: 'relative' }}>
          <button className="link" onClick={() => setCalAberto(!calAberto)}>Calendário</button>
          {calAberto && <div className="popover"><Calendario valor={data} onEscolher={(d) => { setData(d); setCalAberto(false); }} /></div>}
        </div>
        {data !== hoje() && <button className="link" onClick={() => setData(hoje())}>Hoje</button>}
        <div className="acoes"><button className="pri" onClick={() => setNovo({ data })}>Novo agendamento</button></div>
      </div>

      {atencao.length > 0 && (
        <div className="faixa">
          <b>Atenção</b>
          <span>
            {atencao.map((a, i) => (
              <span key={a.id}>{i > 0 && ' · '}
                <a style={{ color: 'inherit' }} onClick={() => { setData(a.data); setAberto(a.id); }}>
                  {nome(a).split(' ').slice(0, 2).join(' ')} ({a.data === hoje() ? 'hoje' : 'amanhã'}, {a.inicio})
                </a> {a.situacao === 'sem_resposta' ? 'não respondeu à confirmação' : 'pediu para remarcar'}
              </span>
            ))}
          </span>
        </div>
      )}

      {fechado ? <p className="vazio">Sem atendimento neste dia.</p> : (
        <table>
          <colgroup><col style={{ width: 90 }} /><col /><col style={{ width: 200 }} /><col style={{ width: 210 }} /><col style={{ width: 260 }} /></colgroup>
          <thead><tr><th>Horário</th><th>Paciente</th><th>Serviço</th><th>Situação</th><th>Pagamento</th></tr></thead>
          <tbody>
            {linhas.map((l) => l.tipo === 'livre' ? (
              <tr key={'l' + l.inicio} className="livre clicavel" onClick={() => setNovo({ data, hora: data >= hoje() ? l.inicio : undefined })} title="Agendar neste horário">
                <td>{l.inicio}</td><td>Livre até {l.fim}</td><td /><td /><td />
              </tr>
            ) : (
              <tr key={l.ag.id} className="clicavel" onClick={() => setAberto(l.ag.id)}>
                <td>{l.ag.inicio}</td>
                <td>{nome(l.ag)}</td>
                <td>{servico(l.ag)}</td>
                <td className={PEDE_ATENCAO.includes(l.ag.situacao) ? 'atencao' : l.ag.situacao === 'faltou' ? 'neg' : ''}>{textoSituacao(l.ag)}</td>
                <td className="mut">{pagamento(l.ag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!fechado && <p className="mut peq" style={{ marginTop: 14 }}>{qtdPac} {qtdPac === 1 ? 'paciente' : 'pacientes'} · {qtdLivre} {qtdLivre === 1 ? 'horário livre' : 'horários livres'}</p>}

      {aberto && <DetalheAgendamento id={aberto} onFechar={() => setAberto(null)} onReagendar={(p) => { setAberto(null); setNovo({ data: hoje(), paciente: p }); }} />}
      {novo && <NovoAgendamento dataInicial={novo.data} horaInicial={novo.hora} pacienteInicial={novo.paciente} onFechar={() => setNovo(null)} />}
    </>
  );
}
