// Configurações (só a médica): serviços e preços, horários, mensagens do WhatsApp, usuários e dados da clínica.
import { useState } from 'react';
import type { Clinica, Servico, Usuario } from '../tipos/modelos';
import { useDados } from '../estado/Dados';
import { excluirServico, salvarServico, usosDoServico } from '../estado/acoes';
import { brl, DIAS, lerValor, novoId } from '../regras/formato';
import { Janela } from '../componentes/Janela';
import { AlterarSenha } from '../componentes/AlterarSenha';
import { useSessao } from '../estado/Sessao';
import { Acao } from '../componentes/Acao';

type Aba = 'servicos' | 'horarios' | 'mensagens' | 'usuarios' | 'clinica';
const ABAS: [Aba, string][] = [['servicos', 'Serviços'], ['horarios', 'Horários'], ['mensagens', 'Mensagens do WhatsApp'], ['usuarios', 'Usuários'], ['clinica', 'Dados da clínica']];

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
  const [msgs, setMsgs] = useState(MENSAGENS_PADRAO);
  const [msg, setMsg] = useState<keyof typeof MENSAGENS_PADRAO | null>(null);
  const c = base.clinica;

  const [editarClinica, setEditarClinica] = useState(false);
  const [editarHorarios, setEditarHorarios] = useState(false);
  const botao = aba === 'servicos' ? <button className="pri" onClick={() => setServico('novo')}>Novo serviço</button>
    : aba === 'usuarios' ? <button className="pri" onClick={() => setUsuario('novo')}>Novo usuário</button>
    : aba === 'horarios' ? <button className="pri" onClick={() => setEditarHorarios(true)}>Editar horários</button>
    : aba === 'clinica' ? <button className="pri" onClick={() => setEditarClinica(true)}>Editar dados</button> : null;

  return (
    <>
      <div className="cab"><h1>Configurações</h1><div className="acoes">{botao}</div></div>
      <div className="abas rolagem">{ABAS.map(([id, n]) => <Acao key={id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)}>{n}</Acao>)}</div>

      {aba === 'servicos' && (
        <div className="rolagem"><table>
          <colgroup><col /><col style={{ width: 130 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col style={{ width: 120 }} /></colgroup>
          <thead><tr><th>Serviço</th><th>Duração</th><th className="num">Valor</th><th className="num">Custo por exame</th><th>Situação</th></tr></thead>
          <tbody>{base.servicos.map((s) => (
            <tr key={s.id} className={'clicavel ' + (s.ativo ? '' : 'livre')} onClick={() => setServico(s)}>
              <td>{s.nome}</td><td>{s.duracaoMin >= 60 ? `${s.duracaoMin / 60} hora` : `${s.duracaoMin} min`}</td>
              <td className="num">{s.valorParticular ? brl(s.valorParticular) : 'Sem custo'}</td>
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

      {aba === 'usuarios' && (
        <div className="rolagem"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
          <tbody>{base.usuarios.map((u) => <tr key={u.id} className="clicavel" onClick={() => setUsuario(u)}><td>{u.nome}</td><td>{u.email}</td><td>{u.perfil === 'medica' ? 'Médica (administradora)' : 'Recepção'}</td><td>{u.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody>
        </table></div>
      )}

      {aba === 'clinica' && (
        <>
          <div className="dados" style={{ gridTemplateColumns: '200px 1fr', maxWidth: 720 }}>
            <span className="mut">Nome da clínica</span><span>{c.nome} · {c.especialidade}</span>
            <span className="mut">Médica</span><span>{c.medicaNomeCompleto}</span>
            <span className="mut">Registro</span><span>{c.crm} · {c.rqe}</span>
            <span className="mut">Endereço</span><span>{c.endereco} · {c.cidade}</span>
            <span className="mut">WhatsApp da clínica</span><span>{c.whatsapp}</span>
            <span className="mut">Lembrete da véspera</span><span>{c.horaLembrete}</span>
            <span className="mut">Alíquota de impostos</span><span>{String(c.aliquotaImpostos).replace('.', ',')}%</span>
            <span className="mut">Taxas da maquininha</span><span>Débito {String(c.taxasCartao.debito).replace('.', ',')}% · Crédito à vista {String(c.taxasCartao.credito).replace('.', ',')}% · 2x a 6x {String(c.taxasCartao.creditoParcelado).replace('.', ',')}% · 7x a 12x {String(c.taxasCartao.creditoLongo).replace('.', ',')}%</span>
          </div>
          <p style={{ marginTop: 30 }}><button onClick={() => { if (confirm('Voltar os dados de demonstração ao início?')) restaurar(); }}>Restaurar dados de demonstração</button></p>
        </>
      )}

      {servico && <EditarServico servico={servico === 'novo' ? null : servico} onFechar={() => setServico(null)} />}
      {usuario && <EditarUsuario usuario={usuario === 'novo' ? null : usuario} onFechar={() => setUsuario(null)} />}
      {editarClinica && <EditarClinica onFechar={() => setEditarClinica(false)} />}
      {editarHorarios && <EditarHorarios onFechar={() => setEditarHorarios(false)} />}
      {msg && <EditarMensagem texto={msgs[msg]} onSalvar={(t) => setMsgs({ ...msgs, [msg]: t })} onFechar={() => setMsg(null)} />}
    </>
  );
}

function EditarServico({ servico, onFechar }: { servico: Servico | null; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const [f, setF] = useState({
    nome: servico?.nome ?? '', duracaoMin: servico?.duracaoMin ?? 30, retirada: servico?.retiradaDiaSeguinte ?? false,
    valor: servico ? String(servico.valorParticular).replace('.', ',') : '', custo: servico?.custoPorExame ? String(servico.custoPorExame).replace('.', ',') : '',
  });
  const [erro, setErro] = useState('');
  const usos = servico ? usosDoServico(base, servico.id) : 0;
  const salvar = (ativo = servico?.ativo ?? true) => {
    if (!f.nome.trim()) return setErro('Informe o nome.');
    alterar((b) => salvarServico(b, { id: servico?.id, nome: f.nome.trim(), duracaoMin: f.duracaoMin, valorParticular: lerValor(f.valor), custoPorExame: lerValor(f.custo), ativo, retiradaDiaSeguinte: f.retirada, interno: servico?.interno }));
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
          <div><label className="rot">Valor</label><input className="w100" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="R$ 0,00" /></div>
          <div><label className="rot">Custo por exame</label><input className="w100" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} placeholder="R$ 0,00" /></div>
        </div>
        {!servico?.interno && <label className="peq" style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={f.retirada} onChange={(e) => setF({ ...f, retirada: e.target.checked })} />Marcar a retirada do aparelho no dia seguinte</label>}
        {servico && <p className="mut peq" style={{ margin: 0 }}>{usos ? `Usado em ${usos} agendamentos. Valor novo vale para os próximos agendamentos; para tirar da agenda, desative.` : 'Ainda não foi usado: pode ser excluído.'}</p>}
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

function EditarUsuario({ usuario, onFechar }: { usuario: Usuario | null; onFechar: () => void }) {
  const { alterar } = useDados();
  const { usuario: logado } = useSessao();
  const [senha, setSenha] = useState(false);
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
    <>
    <Janela titulo={usuario ? 'Editar usuário' : 'Novo usuário'} largura={480} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => salvar()}>Salvar</button><button onClick={onFechar}>Cancelar</button>{usuario && <div className="dir"><button onClick={() => setSenha(true)}>Definir nova senha</button>{usuario.id !== logado?.id && <button onClick={() => salvar(!f.ativo)}>{f.ativo ? 'Desativar' : 'Reativar'}</button>}</div>}</>}>
      <div className="campos">
        <div><label className="rot">Nome</label><input className="w100" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
        <div><label className="rot">E-mail</label><input className="w100" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="rot">Perfil</label><select value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value as Usuario['perfil'] })}><option value="recepcao">Recepção</option><option value="medica">Médica (administradora)</option></select></div>
        {!usuario && <p className="mut peq" style={{ margin: 0 }}>O usuário recebe um e-mail para criar a senha.</p>}
      </div>
    </Janela>
    {senha && usuario && <AlterarSenha usuario={usuario} propria={usuario.id === logado?.id} onFechar={() => setSenha(false)} />}
    </>
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

// ---------------------------------------------------------------- dados da clínica
const num = (v: number) => String(v).replace('.', ',');

function EditarClinica({ onFechar }: { onFechar: () => void }) {
  const { base, alterar } = useDados();
  const c = base.clinica;
  const [f, setF] = useState({
    nome: c.nome, especialidade: c.especialidade, medicaNomeCompleto: c.medicaNomeCompleto, crm: c.crm, rqe: c.rqe,
    endereco: c.endereco, cidade: c.cidade, whatsapp: c.whatsapp, horaLembrete: c.horaLembrete,
    aliquota: num(c.aliquotaImpostos), debito: num(c.taxasCartao.debito), credito: num(c.taxasCartao.credito),
    parcelado: num(c.taxasCartao.creditoParcelado), longo: num(c.taxasCartao.creditoLongo),
  });
  const [erro, setErro] = useState('');
  const campo = (k: keyof typeof f, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="rot">{rotulo}</label><input className="w100" value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setErro(''); }} {...extra} /></div>
  );
  const salvar = () => {
    const pcts = [f.aliquota, f.debito, f.credito, f.parcelado, f.longo].map(lerValor);
    if (pcts.some((p) => p < 0 || p > 100)) return setErro('Percentuais devem ficar entre 0 e 100.');
    if (!f.nome.trim() || !f.medicaNomeCompleto.trim()) return setErro('Informe o nome da clínica e da médica.');
    const [aliquotaImpostos, debito, credito, creditoParcelado, creditoLongo] = pcts;
    alterar((b) => {
      const novo: Partial<Clinica> = {
        nome: f.nome.trim(), especialidade: f.especialidade.trim(), medicaNomeCompleto: f.medicaNomeCompleto.trim(), crm: f.crm.trim(), rqe: f.rqe.trim(),
        endereco: f.endereco.trim(), cidade: f.cidade.trim(), whatsapp: f.whatsapp.trim(), horaLembrete: f.horaLembrete,
        aliquotaImpostos, taxasCartao: { debito, credito, creditoParcelado, creditoLongo },
      };
      Object.assign(b.clinica, novo);
    });
    onFechar();
  };
  return (
    <Janela titulo="Dados da clínica" largura={680} onFechar={onFechar}
      rodape={<><button className="pri" onClick={salvar}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div className="linha2">{campo('nome', 'Nome da clínica')}{campo('especialidade', 'Especialidade')}</div>
        <div className="linha3">{campo('medicaNomeCompleto', 'Nome completo da médica')}{campo('crm', 'CRM')}{campo('rqe', 'RQE')}</div>
        <div className="linha2">{campo('endereco', 'Endereço')}{campo('cidade', 'Cidade/UF')}</div>
        <div className="linha2">{campo('whatsapp', 'WhatsApp da clínica')}{campo('horaLembrete', 'Lembrete da véspera', { type: 'time' })}</div>
        <div className="linha2">{campo('aliquota', 'Alíquota de impostos (%)', { inputMode: 'decimal' })}<span /></div>
        <div><label className="rot">Taxas da maquininha (%)</label>
          <div className="taxas">
            {campo('debito', 'Débito', { inputMode: 'decimal' })}{campo('credito', 'Crédito à vista', { inputMode: 'decimal' })}
            {campo('parcelado', 'Crédito 2x a 6x', { inputMode: 'decimal' })}{campo('longo', 'Crédito 7x a 12x', { inputMode: 'decimal' })}
          </div></div>
        <p className="mut peq" style={{ margin: 0 }}>As taxas novas valem para os próximos recebimentos (os já lançados não mudam). A alíquota é usada no resultado do Caixa.</p>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

// ---------------------------------------------------------------- horários de atendimento
type Turno = { aberto: boolean; inicio: string; fim: string };

function EditarHorarios({ onFechar }: { onFechar: () => void }) {
  const { base, alterar } = useDados();
  const dias = [1, 2, 3, 4, 5, 6, 0];
  const [h, setH] = useState<Record<number, [Turno, Turno]>>(() => Object.fromEntries(dias.map((d) => {
    const t = base.clinica.horarios[d] ?? [];
    return [d, [
      { aberto: !!t[0], inicio: t[0]?.inicio ?? '08:00', fim: t[0]?.fim ?? '12:00' },
      { aberto: !!t[1], inicio: t[1]?.inicio ?? '13:00', fim: t[1]?.fim ?? '18:00' },
    ]];
  })) as Record<number, [Turno, Turno]>);
  const [erro, setErro] = useState('');
  const mudar = (d: number, i: 0 | 1, t: Partial<Turno>) => { const n = { ...h, [d]: [...h[d]] as [Turno, Turno] }; n[d][i] = { ...n[d][i], ...t }; setH(n); setErro(''); };
  const salvar = () => {
    for (const d of dias) for (const t of h[d]) if (t.aberto && t.inicio >= t.fim) return setErro(`${DIAS[d]}: o fim tem que ser depois do início.`);
    for (const d of dias) if (h[d][0].aberto && h[d][1].aberto && h[d][1].inicio < h[d][0].fim) return setErro(`${DIAS[d]}: a tarde começa antes de a manhã terminar.`);
    alterar((b) => {
      b.clinica.horarios = Object.fromEntries(dias.map((d) => [d, h[d].filter((t) => t.aberto).map(({ inicio, fim }) => ({ inicio, fim }))]).filter(([, t]) => (t as unknown[]).length));
    });
    onFechar();
  };
  return (
    <Janela titulo="Horários de atendimento" largura={780} onFechar={onFechar}
      rodape={<><button className="pri" onClick={salvar}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="rolagem"><table>
        <thead><tr><th>Dia</th><th>Manhã</th><th>Tarde</th></tr></thead>
        <tbody>{dias.map((d) => (
          <tr key={d}>
            <td>{DIAS[d][0].toUpperCase() + DIAS[d].slice(1)}</td>
            {([0, 1] as const).map((i) => (
              <td key={i}>
                <label className="peq" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <input type="checkbox" checked={h[d][i].aberto} onChange={(e) => mudar(d, i, { aberto: e.target.checked })} />Atende
                </label>
                {h[d][i].aberto && <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="time" value={h[d][i].inicio} onChange={(e) => mudar(d, i, { inicio: e.target.value })} />às
                  <input type="time" value={h[d][i].fim} onChange={(e) => mudar(d, i, { fim: e.target.value })} />
                </span>}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table></div>
      <p className="mut peq" style={{ margin: '10px 0 0' }}>Vale para os próximos agendamentos. Quem já está marcado continua na agenda.</p>
      {erro && <div className="erro" style={{ marginTop: 8 }}>{erro}</div>}
    </Janela>
  );
}
