// Configurações (só a médica): serviços e preços, horários, mensagens do WhatsApp, convênios, usuários e dados da clínica.
import { useState } from 'react';
import type { Servico, Usuario } from '../tipos/modelos';
import { useDados } from '../estado/Dados';
import { excluirServico, salvarServico, usosDoServico } from '../estado/acoes';
import { brl, DIAS, lerValor, novoId } from '../regras/formato';
import { Janela } from '../componentes/Janela';

type Aba = 'servicos' | 'horarios' | 'mensagens' | 'convenios' | 'usuarios' | 'clinica';
const ABAS: [Aba, string][] = [['servicos', 'Serviços'], ['horarios', 'Horários'], ['mensagens', 'Mensagens do WhatsApp'], ['convenios', 'Convênios'], ['usuarios', 'Usuários'], ['clinica', 'Dados da clínica']];

const MENSAGENS_PADRAO = {
  confirmacao: 'Olá, {paciente}! Seu horário com a {medica} está marcado para {data} às {hora} ({servico}).\nResponda 1 para confirmar ou 2 para remarcar.',
  lembrete: 'Olá, {paciente}! Lembrando do seu horário amanhã, {data} às {hora}, com a {medica}.\nEndereço: {endereco}.',
  remarcacao: 'Olá, {paciente}! Seu horário foi remarcado para {data} às {hora}. Responda 1 para confirmar.',
};

export function Configuracoes() {
  const { base, restaurar } = useDados();
  const [aba, setAba] = useState<Aba>('servicos');
  const [servico, setServico] = useState<Servico | 'novo' | null>(null);
  const [usuario, setUsuario] = useState<Usuario | 'novo' | null>(null);
  const [convenio, setConvenio] = useState(false);
  const [msgs, setMsgs] = useState(MENSAGENS_PADRAO);
  const [msg, setMsg] = useState<keyof typeof MENSAGENS_PADRAO | null>(null);
  const c = base.clinica;

  const botao = aba === 'servicos' ? <button className="pri" onClick={() => setServico('novo')}>Novo serviço</button>
    : aba === 'convenios' ? <button className="pri" onClick={() => setConvenio(true)}>Novo convênio</button>
    : aba === 'usuarios' ? <button className="pri" onClick={() => setUsuario('novo')}>Novo usuário</button> : null;

  return (
    <>
      <div className="cab"><h1>Configurações</h1><div className="acoes">{botao}</div></div>
      <div className="abas rolagem">{ABAS.map(([id, n]) => <a key={id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)}>{n}</a>)}</div>

      {aba === 'servicos' && (
        <div className="rolagem"><table>
          <colgroup><col /><col style={{ width: 130 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col style={{ width: 120 }} /></colgroup>
          <thead><tr><th>Serviço</th><th>Duração</th><th className="num">Valor particular</th><th className="num">Valor convênio</th><th className="num">Custo por exame</th><th>Situação</th></tr></thead>
          <tbody>{base.servicos.map((s) => (
            <tr key={s.id} className={'clicavel ' + (s.ativo ? '' : 'livre')} onClick={() => setServico(s)}>
              <td>{s.nome}</td><td>{s.duracaoMin >= 60 ? `${s.duracaoMin / 60} hora` : `${s.duracaoMin} min`}</td>
              <td className="num">{s.valorParticular ? brl(s.valorParticular) : 'Sem custo'}</td>
              <td className="num">{Object.keys(s.valoresConvenio).length ? Object.entries(s.valoresConvenio).map(([id, v]) => `${base.convenios.find((x) => x.id === id)?.nome} ${brl(v)}`).join(' · ') : '—'}</td>
              <td className="num">{s.custoPorExame ? brl(s.custoPorExame) : '—'}</td><td>{s.ativo ? 'Ativo' : 'Desativado'}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {aba === 'horarios' && (
        <table style={{ maxWidth: 640 }}>
          <thead><tr><th>Dia</th><th>Manhã</th><th>Tarde</th></tr></thead>
          <tbody>{[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const t = c.horarios[d] ?? [];
            return <tr key={d}><td>{DIAS[d][0].toUpperCase() + DIAS[d].slice(1)}</td><td>{t[0] ? `${t[0].inicio} às ${t[0].fim}` : 'Fechado'}</td><td>{t[1] ? `${t[1].inicio} às ${t[1].fim}` : t[0] ? 'Fechado' : ''}</td></tr>;
          })}</tbody>
        </table>
      )}

      {aba === 'mensagens' && (
        <div className="rolagem"><table>
          <colgroup><col style={{ width: 220 }} /><col /><col style={{ width: 160 }} /></colgroup>
          <thead><tr><th>Mensagem</th><th>Texto</th><th>Quando sai</th></tr></thead>
          <tbody>
            {([['confirmacao', 'Confirmação', 'Ao agendar'], ['lembrete', 'Lembrete', `Na véspera, ${c.horaLembrete}`], ['remarcacao', 'Remarcação', 'Ao remarcar']] as [keyof typeof msgs, string, string][]).map(([k, n, q]) => (
              <tr key={k} className="clicavel" onClick={() => setMsg(k)}><td>{n}</td><td style={{ whiteSpace: 'pre-wrap' }}>{msgs[k]}</td><td>{q}</td></tr>
            ))}
          </tbody>
        </table></div>
      )}

      {aba === 'convenios' && (
        <table style={{ maxWidth: 640 }}>
          <thead><tr><th>Convênio</th><th className="num">Serviços com valor</th><th>Situação</th></tr></thead>
          <tbody>{base.convenios.map((cv) => <tr key={cv.id}><td>{cv.nome}</td><td className="num">{base.servicos.filter((s) => cv.id in s.valoresConvenio).length} de {base.servicos.length}</td><td>{cv.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody>
        </table>
      )}

      {aba === 'usuarios' && (
        <div className="rolagem"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
          <tbody>{base.usuarios.map((u) => <tr key={u.id} className="clicavel" onClick={() => setUsuario(u)}><td>{u.nome}</td><td>{u.email}</td><td>{u.perfil === 'medica' ? 'Médica (administradora)' : 'Recepção'}</td><td>{u.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody>
        </table></div>
      )}

      {aba === 'clinica' && (
        <>
          <div className="dados" style={{ gridTemplateColumns: '200px 1fr', maxWidth: 720 }}>
            <span className="mut">Médica</span><span>{c.medicaNomeCompleto}</span>
            <span className="mut">Registro</span><span>{c.crm} · {c.rqe}</span>
            <span className="mut">Endereço</span><span>{c.endereco} · {c.cidade}</span>
            <span className="mut">WhatsApp da clínica</span><span>{c.whatsapp}</span>
            <span className="mut">Alíquota de impostos</span><span>{String(c.aliquotaImpostos).replace('.', ',')}%</span>
            <span className="mut">Taxas da maquininha</span><span>Débito {String(c.taxasCartao.debito).replace('.', ',')}% · Crédito à vista {String(c.taxasCartao.credito).replace('.', ',')}% · 2x a 6x {String(c.taxasCartao.creditoParcelado).replace('.', ',')}% · 7x a 12x {String(c.taxasCartao.creditoLongo).replace('.', ',')}%</span>
          </div>
          <p style={{ marginTop: 30 }}><button onClick={() => { if (confirm('Voltar os dados de demonstração ao início?')) restaurar(); }}>Restaurar dados de demonstração</button></p>
        </>
      )}

      {servico && <EditarServico servico={servico === 'novo' ? null : servico} onFechar={() => setServico(null)} />}
      {usuario && <EditarUsuario usuario={usuario === 'novo' ? null : usuario} onFechar={() => setUsuario(null)} />}
      {convenio && <NovoConvenio onFechar={() => setConvenio(false)} />}
      {msg && <EditarMensagem texto={msgs[msg]} onSalvar={(t) => setMsgs({ ...msgs, [msg]: t })} onFechar={() => setMsg(null)} />}
    </>
  );
}

function EditarServico({ servico, onFechar }: { servico: Servico | null; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const [f, setF] = useState({
    nome: servico?.nome ?? '', duracaoMin: servico?.duracaoMin ?? 30, retirada: servico?.retiradaDiaSeguinte ?? false,
    valor: servico ? String(servico.valorParticular).replace('.', ',') : '', custo: servico?.custoPorExame ? String(servico.custoPorExame).replace('.', ',') : '',
    conv: Object.fromEntries(base.convenios.map((c) => [c.id, servico?.valoresConvenio[c.id] != null ? String(servico.valoresConvenio[c.id]).replace('.', ',') : ''])) as Record<string, string>,
  });
  const [erro, setErro] = useState('');
  const usos = servico ? usosDoServico(base, servico.id) : 0;
  const salvar = (ativo = servico?.ativo ?? true) => {
    if (!f.nome.trim()) return setErro('Informe o nome.');
    const valoresConvenio: Record<string, number> = {};
    for (const [id, v] of Object.entries(f.conv)) if (v.trim()) valoresConvenio[id] = lerValor(v);
    alterar((b) => salvarServico(b, { id: servico?.id, nome: f.nome.trim(), duracaoMin: f.duracaoMin, valorParticular: lerValor(f.valor), custoPorExame: lerValor(f.custo), valoresConvenio, ativo, retiradaDiaSeguinte: f.retirada, interno: servico?.interno }));
    onFechar();
  };
  return (
    <Janela titulo={servico ? 'Editar serviço' : 'Novo serviço'} largura={600} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => salvar()}>Salvar</button><button onClick={onFechar}>Cancelar</button>
        {servico && <div className="dir">{usos === 0
          ? <button onClick={() => { alterar((b) => excluirServico(b, servico.id)); onFechar(); }}>Excluir</button>
          : <button onClick={() => salvar(!servico.ativo)}>{servico.ativo ? 'Desativar' : 'Reativar'}</button>}</div>}</>}>
      <div className="campos">
        <div><label className="rot">Nome</label><input className="w100" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus={!servico} /></div>
        <div className="linha3">
          <div><label className="rot">Duração</label><select className="w100" value={f.duracaoMin} onChange={(e) => setF({ ...f, duracaoMin: Number(e.target.value) })}>{[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m === 90 ? '1h30' : m >= 60 ? `${m / 60} hora${m > 60 ? 's' : ''}` : `${m} min`}</option>)}</select></div>
          <div><label className="rot">Valor particular</label><input className="w100" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="R$ 0,00" /></div>
          <div><label className="rot">Custo por exame</label><input className="w100" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} placeholder="R$ 0,00" /></div>
        </div>
        {base.convenios.length > 0 && (
          <div><label className="rot">Valor por convênio</label>
            <table><tbody>{base.convenios.map((c) => (
              <tr key={c.id}><td style={{ padding: '6px 0' }}>{c.nome}</td><td className="num" style={{ padding: '6px 0' }}><input style={{ width: 140 }} value={f.conv[c.id] ?? ''} onChange={(e) => setF({ ...f, conv: { ...f.conv, [c.id]: e.target.value } })} placeholder="Não atende" /></td></tr>
            ))}</tbody></table></div>
        )}
        {!servico?.interno && <label className="peq" style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={f.retirada} onChange={(e) => setF({ ...f, retirada: e.target.checked })} />Marcar a retirada do aparelho no dia seguinte</label>}
        {servico && <p className="mut peq" style={{ margin: 0 }}>{usos ? `Usado em ${usos} agendamentos. Valor novo vale para os próximos agendamentos; para tirar da agenda, desative.` : 'Ainda não foi usado: pode ser excluído.'}</p>}
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

function EditarUsuario({ usuario, onFechar }: { usuario: Usuario | null; onFechar: () => void }) {
  const { alterar } = useDados();
  const [f, setF] = useState({ nome: usuario?.nome ?? '', email: usuario?.email ?? '', perfil: usuario?.perfil ?? 'recepcao', ativo: usuario?.ativo ?? true });
  const salvar = (ativo = f.ativo) => {
    alterar((b) => {
      const u = usuario && b.usuarios.find((x) => x.id === usuario.id);
      if (u) Object.assign(u, { ...f, ativo });
      else b.usuarios.push({ id: novoId('usr'), clinicaId: b.clinica.id, ...f, ativo: true });
    });
    onFechar();
  };
  return (
    <Janela titulo={usuario ? 'Editar usuário' : 'Novo usuário'} largura={480} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => salvar()}>Salvar</button><button onClick={onFechar}>Cancelar</button>{usuario && <div className="dir"><button onClick={() => salvar(!f.ativo)}>{f.ativo ? 'Desativar' : 'Reativar'}</button></div>}</>}>
      <div className="campos">
        <div><label className="rot">Nome</label><input className="w100" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
        <div><label className="rot">E-mail</label><input className="w100" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="rot">Perfil</label><select value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value as Usuario['perfil'] })}><option value="recepcao">Recepção</option><option value="medica">Médica (administradora)</option></select></div>
        {!usuario && <p className="mut peq" style={{ margin: 0 }}>O usuário recebe um e-mail para criar a senha.</p>}
      </div>
    </Janela>
  );
}

function NovoConvenio({ onFechar }: { onFechar: () => void }) {
  const { alterar } = useDados();
  const [nome, setNome] = useState('');
  return (
    <Janela titulo="Novo convênio" largura={420} onFechar={onFechar}
      rodape={<><button className="pri" disabled={!nome.trim()} onClick={() => { alterar((b) => b.convenios.push({ id: novoId('conv'), clinicaId: b.clinica.id, nome: nome.trim(), ativo: true })); onFechar(); }}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <label className="rot">Nome</label><input className="w100" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      <p className="mut peq" style={{ margin: '12px 0 0' }}>Depois, informe o valor de cada serviço no convênio em Serviços.</p>
    </Janela>
  );
}

function EditarMensagem({ texto, onSalvar, onFechar }: { texto: string; onSalvar: (t: string) => void; onFechar: () => void }) {
  const [t, setT] = useState(texto);
  return (
    <Janela titulo="Mensagem do WhatsApp" largura={560} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => { onSalvar(t); onFechar(); }}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} />
      <p className="mut peq" style={{ margin: '10px 0 0' }}>Campos preenchidos sozinhos: {'{paciente} {medica} {data} {hora} {servico} {endereco}'}</p>
    </Janela>
  );
}
