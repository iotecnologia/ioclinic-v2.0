// Ficha do paciente: consulta. Visitas e pagamentos à esquerda; cadastro, próximo agendamento e documentos à direita.
// O registro clínico (CID, observação) só aparece para a médica.
import { useState } from 'react';
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';
import { pagamentoDo } from '../estado/acoes';
import { brl, dataBR, hoje, idade, MESES_CURTO } from '../regras/formato';
import { NOME_SITUACAO } from '../regras/agenda';
import { ir } from '../estado/rota';
import { FormPaciente } from '../componentes/FormPaciente';
import { NovoAgendamento } from '../componentes/Agendamento';
import { EmitirDocumento, NOME_DOC } from '../componentes/Documentos';

export function FichaPaciente({ id }: { id: string }) {
  const { base } = useDados();
  const { usuario } = useSessao();
  const [janela, setJanela] = useState<'editar' | 'agendar' | 'documento' | null>(null);
  const p = base.pacientes.find((x) => x.id === id);
  if (!p) return <p className="vazio">Paciente não encontrado. <a onClick={() => ir('pacientes')}>Voltar</a></p>;
  const medica = usuario?.perfil === 'medica';
  const h = hoje();
  const ags = base.agendamentos.filter((a) => a.pacienteId === id);
  const passadas = ags.filter((a) => a.data < h || a.situacao === 'atendido' || a.situacao === 'faltou').sort((x, y) => y.data.localeCompare(x.data));
  const proximos = ags.filter((a) => !passadas.includes(a) && a.situacao !== 'cancelado').sort((x, y) => (x.data + x.inicio).localeCompare(y.data + y.inicio));
  const atendidas = passadas.filter((a) => a.situacao === 'atendido');
  const docs = base.documentos.filter((d) => d.pacienteId === id).sort((x, y) => y.data.localeCompare(x.data));
  const totalPago = base.pagamentos.filter((x) => x.pacienteId === id).reduce((s, x) => s + x.valor, 0);
  const desde = p.criadoEm ? `${MESES_CURTO[Number(p.criadoEm.slice(5, 7)) - 1]}/${p.criadoEm.slice(0, 4)}` : '';
  const serv = (sid: string) => base.servicos.find((s) => s.id === sid)?.nome ?? '';

  return (
    <>
      <p className="trilha"><a onClick={() => ir('pacientes')}>Pacientes</a> / {p.nome}</p>
      <div className="cab" style={{ alignItems: 'flex-start' }}>
        <div><h1>{p.nome}</h1><div className="mut" style={{ marginTop: 4 }}>{p.nascimento ? `${idade(p.nascimento)} anos · ` : ''}Paciente desde {desde} · {atendidas.length} {atendidas.length === 1 ? 'visita' : 'visitas'}</div></div>
        <div className="acoes">
          <button className="pri" onClick={() => setJanela('agendar')}>Novo agendamento</button>
          {medica && <button onClick={() => setJanela('documento')}>Emitir documento</button>}
          <button onClick={() => setJanela('editar')}>Editar cadastro</button>
        </div>
      </div>

      <div className="colunas" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div>
          <h3>Visitas e pagamentos</h3>
          <table>
            <thead><tr><th>Data</th><th>Serviço</th>{medica && <th>Registro da Dra.</th>}<th>Forma</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {passadas.map((a) => {
                const pg = pagamentoDo(base, a.id);
                const reg = base.registros.find((r) => r.agendamentoId === a.id);
                return (
                  <tr key={a.id}>
                    <td>{dataBR(a.data)}</td>
                    <td>{serv(a.servicoId)}{a.situacao === 'faltou' && <span className="neg"> · faltou</span>}</td>
                    {medica && <td className="peq">{reg ? <>{reg.cid}{reg.observacao && <div className="mut">{reg.observacao}</div>}{reg.examesPedidos.length > 0 && <div className="mut">Pediu: {reg.examesPedidos.join(', ')}</div>}</> : ''}</td>}
                    <td>{pg ? `${pg.forma}${pg.parcelas > 1 ? ` ${pg.parcelas}x` : ''}` : a.valor === 0 ? 'Sem custo' : a.situacao === 'atendido' ? 'A receber' : '—'}</td>
                    <td className="num">{pg ? brl(pg.valor) : '—'}</td>
                  </tr>
                );
              })}
              {!passadas.length && <tr><td colSpan={5} className="vazio">Nenhuma visita ainda.</td></tr>}
              {passadas.length > 0 && <tr className="total"><td colSpan={medica ? 4 : 3}>Total pago</td><td className="num">{brl(totalPago)}</td></tr>}
            </tbody>
          </table>
        </div>

        <div>
          <h3>Cadastro</h3>
          <div className="dados">
            <span className="mut">Celular</span><span>{p.celular || '—'}</span>
            <span className="mut">Nascimento</span><span>{p.nascimento ? dataBR(p.nascimento) : '—'}</span>
            <span className="mut">CPF</span><span>{p.cpf || '—'}</span>
            <span className="mut">Termo LGPD</span><span className={p.termoLgpd ? '' : 'atencao'}>{p.termoLgpd ? 'Assinado' : 'Pendente'}</span>
          </div>
          <h3 style={{ marginTop: 24 }}>Próximos agendamentos</h3>
          {proximos.length ? proximos.map((a) => (
            <p key={a.id} style={{ margin: '0 0 6px' }}>{dataBR(a.data)} {a.inicio} · {serv(a.servicoId)} <span className="mut">· {NOME_SITUACAO[a.situacao]}</span></p>
          )) : <p className="mut" style={{ margin: 0 }}>Nenhum</p>}
          <h3 style={{ marginTop: 24 }}>Documentos emitidos</h3>
          {docs.length ? docs.slice(0, 6).map((d) => <p key={d.id} style={{ margin: '0 0 6px' }}>{dataBR(d.data)} · {NOME_DOC[d.tipo]}</p>) : <p className="mut" style={{ margin: 0 }}>Nenhum</p>}
        </div>
      </div>

      {janela === 'editar' && <FormPaciente paciente={p} onFechar={() => setJanela(null)} />}
      {janela === 'agendar' && <NovoAgendamento dataInicial={h} pacienteInicial={p.id} onFechar={() => setJanela(null)} />}
      {janela === 'documento' && <EmitirDocumento pacienteId={p.id} onFechar={() => setJanela(null)} />}
    </>
  );
}
