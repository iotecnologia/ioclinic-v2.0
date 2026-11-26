// Caixa (só a médica): resultado do mês no formato do DRE que ela já usa, lançamentos e despesas fixas.
// As entradas chegam sozinhas da Agenda (botão Receber); aqui só se lançam despesas.
import { useMemo, useState } from 'react';
import { useDados } from '../estado/Dados';
import { resultadoDoMes } from '../regras/caixa';
import { brl, diaMes, hoje, lerValor, MESES, MESES_CURTO, normalizar, pct } from '../regras/formato';
import { lancarDespesa } from '../estado/acoes';
import { Janela } from '../componentes/Janela';
import type { DespesaFixa } from '../tipos/modelos';

export const CATEGORIAS = ['Aluguel', 'Condomínio', 'Contadora', 'Funcionários', 'Impostos', 'Sistemas', 'Marketing', 'Luz', 'Internet e telefone', 'Taxas bancárias', 'Material administrativo', 'Material para procedimentos', 'Repasse para outros profissionais', 'Serviços externos', 'Outros gastos'];

const mesDe = (s: string) => s.slice(0, 7);
function somarMes(m: string, n: number) {
  const [a, mm] = m.split('-').map(Number);
  const d = new Date(a, mm - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const nomeMes = (m: string) => { const t = MESES[Number(m.slice(5)) - 1]; return `${t[0].toUpperCase()}${t.slice(1)} ${m.slice(0, 4)}`; };

export function Caixa() {
  const { base } = useDados();
  const [mes, setMes] = useState(mesDe(hoje()));
  const [aba, setAba] = useState<'resultado' | 'lancamentos' | 'fixas'>('resultado');
  const [despesa, setDespesa] = useState(false);
  const [fixa, setFixa] = useState<DespesaFixa | null>(null);
  const r = useMemo(() => resultadoDoMes(base, mes), [base, mes]);
  const emAndamento = mes === mesDe(hoje());
  const primeiroMes = mesDe(base.pagamentos.reduce((m, p) => (p.data < m ? p.data : m), hoje()));

  const exportar = () => {
    const linhas = [['Data', 'Tipo', 'Descrição', 'Categoria / serviço', 'Forma', 'Valor', 'Taxa']];
    for (const p of base.pagamentos.filter((x) => x.data.startsWith(mes)))
      linhas.push([p.data, 'Entrada', base.pacientes.find((x) => x.id === p.pacienteId)?.nome ?? '', base.servicos.find((s) => s.id === p.servicoId)?.nome ?? '', p.forma, p.valor.toFixed(2).replace('.', ','), p.taxa.toFixed(2).replace('.', ',')]);
    for (const d of base.despesas.filter((x) => x.data.startsWith(mes)))
      linhas.push([d.data, 'Saída', d.descricao, d.categoria, '', (-d.valor).toFixed(2).replace('.', ','), '']);
    const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `caixa-${mes}.csv`;
    a.click();
  };

  return (
    <>
      <div className="cab">
        <h1>Caixa</h1>
        <button className="seta" disabled={mes <= primeiroMes} onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior">‹</button>
        <span style={{ fontSize: 17, minWidth: 170, textAlign: 'center' }}>{nomeMes(mes)}</span>
        <button className="seta" disabled={emAndamento} onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês">›</button>
        <div className="acoes"><button onClick={exportar}>Exportar</button><button className="pri" onClick={() => setDespesa(true)}>Lançar despesa</button></div>
      </div>
      <div className="abas">
        <a className={aba === 'resultado' ? 'on' : ''} onClick={() => setAba('resultado')}>Resultado</a>
        <a className={aba === 'lancamentos' ? 'on' : ''} onClick={() => setAba('lancamentos')}>Lançamentos</a>
        <a className={aba === 'fixas' ? 'on' : ''} onClick={() => setAba('fixas')}>Despesas fixas</a>
      </div>

      {aba === 'resultado' && (
        <>
          <div className="colunas" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <h3>Resultado de {MESES[Number(mes.slice(5)) - 1]}{emAndamento ? ' (até hoje)' : ''}</h3>
              <table>
                <thead><tr><th /><th className="num">Valor</th><th className="num">% do recebido</th></tr></thead>
                <tbody>
                  {([['Recebido de pacientes', r.recebido], [`Impostos (${String(base.clinica.aliquotaImpostos).replace('.', ',')}%)`, -r.impostos], ['Taxas da maquininha', -r.taxas], ['Custos dos exames', -r.custos], ['Gastos fixos', -r.gastosFixos]] as [string, number][]).map(([n, v]) => (
                    <tr key={n}><td>{n}</td><td className="num">{brl(v)}</td><td className="num mut">{r.recebido ? pct(Math.abs(v) / r.recebido) : '—'}</td></tr>
                  ))}
                  <tr className="total"><td>Resultado do mês</td><td className={'num ' + (r.resultado >= 0 ? 'pos' : 'neg')}>{brl(r.resultado, true)}</td><td className="num mut">{r.recebido ? pct(Math.abs(r.resultado) / r.recebido) : '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3>Onde ganha: recebido por serviço</h3>
              <table>
                <thead><tr><th>Serviço</th><th className="num">Qtd.</th><th className="num">Valor</th></tr></thead>
                <tbody>{r.porServico.map((x) => <tr key={x.servicoId}><td>{base.servicos.find((s) => s.id === x.servicoId)?.nome}</td><td className="num">{x.qtd}</td><td className="num">{brl(x.valor)}</td></tr>)}</tbody>
              </table>
              <h3 style={{ marginTop: 26 }}>Onde gasta: gastos fixos por categoria</h3>
              <table><tbody>{r.porCategoria.map((x) => <tr key={x.categoria}><td>{x.categoria}</td><td className="num">{brl(x.valor)}</td></tr>)}</tbody></table>
            </div>
          </div>
          <div style={{ marginTop: 30 }}><h3>Últimos meses</h3><Grafico ate={mes} /></div>
        </>
      )}

      {aba === 'lancamentos' && <Lancamentos mes={mes} />}

      {aba === 'fixas' && (
        <table>
          <thead><tr><th>Despesa</th><th>Categoria</th><th>Vencimento</th><th className="num">Valor</th><th>Situação</th></tr></thead>
          <tbody>
            {base.despesasFixas.map((f) => (
              <tr key={f.id} className={'clicavel ' + (f.ativa ? '' : 'livre')} onClick={() => setFixa(f)}>
                <td>{f.descricao}</td><td>{f.categoria}</td><td>Dia {f.diaVencimento}</td><td className="num">{brl(f.valor)}</td><td>{f.ativa ? 'Ativa' : 'Encerrada'}</td>
              </tr>
            ))}
            <tr className="total"><td colSpan={3}>Total por mês (ativas)</td><td className="num">{brl(base.despesasFixas.filter((f) => f.ativa).reduce((s, f) => s + f.valor, 0))}</td><td /></tr>
          </tbody>
        </table>
      )}

      {despesa && <LancarDespesa onFechar={() => setDespesa(false)} />}
      {fixa && <EditarFixa fixa={fixa} onFechar={() => setFixa(null)} />}
    </>
  );
}

function Lancamentos({ mes }: { mes: string }) {
  const { base } = useDados();
  const [filtro, setFiltro] = useState<'todos' | 'entradas' | 'saidas'>('todos');
  const [termo, setTermo] = useState('');
  const linhas = useMemo(() => {
    const ent = base.pagamentos.filter((p) => p.data.startsWith(mes)).map((p) => ({ id: p.id, data: p.data, desc: base.pacientes.find((x) => x.id === p.pacienteId)?.nome ?? '', cat: base.servicos.find((s) => s.id === p.servicoId)?.nome ?? '', forma: p.forma + (p.parcelas > 1 ? ` ${p.parcelas}x` : ''), valor: p.valor, taxa: p.taxa }));
    const sai = base.despesas.filter((d) => d.data.startsWith(mes)).map((d) => ({ id: d.id, data: d.data, desc: d.descricao, cat: d.categoria, forma: '', valor: -d.valor, taxa: 0 }));
    const t = normalizar(termo);
    return [...(filtro !== 'saidas' ? ent : []), ...(filtro !== 'entradas' ? sai : [])]
      .filter((l) => !t || normalizar(l.desc + ' ' + l.cat).includes(t))
      .sort((x, y) => y.data.localeCompare(x.data));
  }, [base, mes, filtro, termo]);
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}><option value="todos">Entradas e saídas</option><option value="entradas">Só entradas</option><option value="saidas">Só saídas</option></select>
        <input placeholder="Buscar" style={{ width: 280 }} value={termo} onChange={(e) => setTermo(e.target.value)} />
      </div>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Serviço / categoria</th><th>Forma</th><th className="num">Valor</th><th className="num">Taxa</th></tr></thead>
        <tbody>
          {linhas.map((l) => <tr key={l.id}><td>{diaMes(l.data)}</td><td>{l.desc}</td><td>{l.cat}</td><td>{l.forma}</td><td className={'num ' + (l.valor < 0 ? 'neg' : '')}>{brl(l.valor)}</td><td className="num mut">{l.taxa ? brl(l.taxa) : '—'}</td></tr>)}
          {!linhas.length && <tr><td colSpan={6} className="vazio">Nenhum lançamento.</td></tr>}
          {linhas.length > 0 && <tr className="total"><td colSpan={4}>Saldo dos lançamentos listados</td><td className={'num ' + (total < 0 ? 'neg' : 'pos')}>{brl(total, true)}</td><td /></tr>}
        </tbody>
      </table>
    </>
  );
}

function Grafico({ ate }: { ate: string }) {
  const { base } = useDados();
  const meses = Array.from({ length: 9 }, (_, i) => somarMes(ate, i - 8));
  const dados = meses.map((m) => { const r = resultadoDoMes(base, m); return { m, rec: r.recebido, sai: r.recebido - r.resultado, res: r.resultado }; });
  const topo = Math.max(1, ...dados.map((d) => Math.max(d.rec, d.sai)));
  const W = 1100, H = 230, passo = (W - 60) / dados.length;
  const mil = (v: number) => Math.abs(v) < 50 ? 'empate' : `${v > 0 ? '+' : '−'}${(Math.abs(v) / 1000).toFixed(1).replace('.', ',')} mil`;
  return (
    <>
      <svg className="grafico" width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Recebido e saídas por mês">
        <line x1={30} y1={195} x2={W - 10} y2={195} stroke="#cfd5db" />
        {dados.map((d, i) => {
          const x = 50 + i * passo, hr = (d.rec / topo) * 165, hs = (d.sai / topo) * 165;
          return (
            <g key={d.m}>
              <title>{`${nomeMes(d.m)}: recebido ${brl(d.rec)}, saídas ${brl(d.sai)}, resultado ${brl(d.res, true)}`}</title>
              <rect x={x} y={195 - hr} width={34} height={hr} fill="#0C3257" />
              <rect x={x + 38} y={195 - hs} width={34} height={hs} fill="#91AFC7" />
              <text x={x + 36} y={Math.min(195 - hr, 195 - hs) - 6} textAnchor="middle" fontSize={12} fill={d.res >= 0 ? '#1f6b3a' : '#9b2c2c'}>{d.rec || d.sai ? mil(d.res) : ''}</text>
              <text x={x + 36} y={214} textAnchor="middle" fontSize={13} fill="#547793" fontWeight={d.m === ate ? 600 : 400}>{MESES_CURTO[Number(d.m.slice(5)) - 1]}</text>
            </g>
          );
        })}
      </svg>
      <p className="mut peq legenda" style={{ margin: '6px 0 0' }}><i style={{ background: '#0C3257' }} />Recebido &nbsp; <i style={{ background: '#91AFC7' }} />Saídas &nbsp; Número acima das barras: resultado do mês</p>
    </>
  );
}

function LancarDespesa({ onFechar }: { onFechar: () => void }) {
  const { alterar } = useDados();
  const [f, setF] = useState({ descricao: '', categoria: 'Outros gastos', valor: '', data: hoje(), fixa: false });
  const [erro, setErro] = useState('');
  const salvar = () => {
    const valor = lerValor(f.valor);
    if (!f.descricao.trim()) return setErro('Informe a descrição.');
    if (valor <= 0) return setErro('Informe o valor.');
    alterar((b) => {
      lancarDespesa(b, { descricao: f.descricao.trim(), categoria: f.categoria, valor, data: f.data, fixa: f.fixa });
      if (f.fixa) b.despesasFixas.push({ id: `fx_${Date.now()}`, clinicaId: b.clinica.id, descricao: f.descricao.trim(), categoria: f.categoria, valor, diaVencimento: Number(f.data.slice(8)), ativa: true });
    });
    onFechar();
  };
  return (
    <Janela titulo="Lançar despesa" largura={520} onFechar={onFechar} rodape={<><button className="pri" onClick={salvar}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">Descrição</label><input className="w100" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} autoFocus /></div>
        <div className="linha2">
          <div><label className="rot">Categoria</label><select className="w100" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="rot">Valor</label><input className="w100" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="R$ 0,00" /></div>
        </div>
        <div className="linha2"><div><label className="rot">Data do pagamento</label><input className="w100" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div></div>
        <label className="peq" style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={f.fixa} onChange={(e) => setF({ ...f, fixa: e.target.checked })} />Repete todo mês (despesa fixa)</label>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}

function EditarFixa({ fixa, onFechar }: { fixa: DespesaFixa; onFechar: () => void }) {
  const { alterar } = useDados();
  const [f, setF] = useState({ ...fixa, valorTxt: String(fixa.valor).replace('.', ',') });
  const salvar = (ativa = f.ativa) => {
    alterar((b) => { const x = b.despesasFixas.find((d) => d.id === fixa.id); if (x) Object.assign(x, { descricao: f.descricao, categoria: f.categoria, valor: lerValor(f.valorTxt), diaVencimento: f.diaVencimento, ativa }); });
    onFechar();
  };
  return (
    <Janela titulo="Despesa fixa" largura={520} onFechar={onFechar}
      rodape={<><button className="pri" onClick={() => salvar()}>Salvar</button><button onClick={onFechar}>Cancelar</button><div className="dir"><button onClick={() => salvar(!f.ativa)}>{f.ativa ? 'Encerrar' : 'Reativar'}</button></div></>}>
      <div className="campos">
        <div><label className="rot">Descrição</label><input className="w100" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
        <div className="linha3">
          <div><label className="rot">Categoria</label><select className="w100" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="rot">Valor</label><input className="w100" value={f.valorTxt} onChange={(e) => setF({ ...f, valorTxt: e.target.value })} /></div>
          <div><label className="rot">Dia do vencimento</label><input className="w100" type="number" min={1} max={31} value={f.diaVencimento} onChange={(e) => setF({ ...f, diaVencimento: Number(e.target.value) })} /></div>
        </div>
        <p className="mut peq" style={{ margin: 0 }}>Valor novo vale a partir do próximo vencimento. Os meses já pagos não mudam.</p>
      </div>
    </Janela>
  );
}
