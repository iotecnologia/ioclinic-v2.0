// Emitir documento: receita, atestado, declaração de comparecimento e pedido de exames.
// Sai no modelo da Dra. (timbre, CRM/RQE, endereço), preto no branco, para imprimir e assinar à mão.
import { useState } from 'react';
import type { TipoDocumento } from '../tipos/modelos';
import type { Visita } from '../regras/agenda';
import { useDados } from '../estado/Dados';
import { emitirDocumento } from '../estado/acoes';
import { MESES, hoje, paraData } from '../regras/formato';
import { Janela } from './Janela';

export const NOME_DOC: Record<TipoDocumento, string> = { receita: 'Receita', atestado: 'Atestado', declaracao: 'Declaração de comparecimento', pedido_exames: 'Pedido de exames' };
const TITULO: Record<TipoDocumento, string> = { receita: 'RECEITUÁRIO', atestado: 'ATESTADO MÉDICO', declaracao: 'DECLARAÇÃO DE COMPARECIMENTO', pedido_exames: 'SOLICITAÇÃO DE EXAMES' };
const EXAMES = ['Ecocardiograma', 'Eletrocardiograma', 'Teste ergométrico', 'MAPA 24h', 'Holter 24h', 'Perfil lipídico', 'Hemograma completo', 'Glicemia de jejum', 'TSH e T4 livre', 'Creatinina e ureia'];

const extenso = (d: string) => { const x = paraData(d); return `${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`; };

export function EmitirDocumento({ pacienteId, visita, onFechar }: { pacienteId: string; visita?: Visita; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const c = base.clinica;
  const pac = base.pacientes.find((p) => p.id === pacienteId)!;
  const [tipo, setTipo] = useState<TipoDocumento>('receita');
  const [receita, setReceita] = useState('Uso oral\n\n1. ');
  const [dias, setDias] = useState(1);
  const [cid, setCid] = useState('');
  const [comCid, setComCid] = useState(false);
  const [entrada, setEntrada] = useState(visita?.itens[0].chegouAs ?? visita?.inicio ?? '08:00');
  const [saida, setSaida] = useState(visita?.fim ?? '09:00');
  const [exames, setExames] = useState<string[]>([]);
  const [timbrado, setTimbrado] = useState(true);
  const data = visita?.data ?? hoje();

  const corpo: Record<TipoDocumento, string> = {
    receita: receita,
    atestado: `Atesto, para os devidos fins, que ${pac.nome} esteve sob meus cuidados médicos em ${extenso(data)}, necessitando de ${dias} dia${dias > 1 ? 's' : ''} de afastamento de suas atividades a partir desta data.${comCid && cid ? `\n\nCID: ${cid}` : ''}`,
    declaracao: `Declaro, para os devidos fins, que ${pac.nome} compareceu a este consultório em ${extenso(data)}, das ${entrada} às ${saida}, para atendimento médico.`,
    pedido_exames: `Solicito:\n\n${exames.map((e) => `• ${e}`).join('\n') || '• '}`,
  };

  const imprimir = () => {
    alterar((b) => emitirDocumento(b, { pacienteId, tipo, data: hoje(), conteudo: corpo[tipo] }));
    setTimeout(() => window.print(), 50);
  };

  return (
    <Janela titulo="Emitir documento" sub={pac.nome} largura={860} onFechar={onFechar}
      rodape={<><button className="pri" onClick={imprimir}>Imprimir ou salvar PDF</button><button onClick={onFechar}>Fechar</button></>}>
      <div className="doc-grade" style={{ margin: '-18px -22px', padding: '18px 22px' }}>
        <div className="campos" style={{ alignContent: 'start' }}>
          <div><label className="rot">Documento</label>
            <div className="doc-tipos">{(Object.keys(NOME_DOC) as TipoDocumento[]).map((t) => <button key={t} className={t === tipo ? 'sel' : ''} onClick={() => setTipo(t)}>{NOME_DOC[t]}</button>)}</div></div>
          {tipo === 'receita' && <div><label className="rot">Medicamentos e posologia</label><textarea rows={8} value={receita} onChange={(e) => setReceita(e.target.value)} /></div>}
          {tipo === 'atestado' && <>
            <div><label className="rot">Dias de afastamento</label><input type="number" min={1} value={dias} onChange={(e) => setDias(Math.max(1, Number(e.target.value)))} style={{ width: 90 }} /></div>
            <label className="peq" style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={comCid} onChange={(e) => setComCid(e.target.checked)} />Incluir CID (paciente autorizou)</label>
            {comCid && <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="I10" />}
          </>}
          {tipo === 'declaracao' && <div className="linha2">
            <div><label className="rot">Chegada</label><input type="time" className="w100" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></div>
            <div><label className="rot">Saída</label><input type="time" className="w100" value={saida} onChange={(e) => setSaida(e.target.value)} /></div>
          </div>}
          {tipo === 'pedido_exames' && <div><label className="rot">Exames</label>
            <div style={{ display: 'grid', gap: 4 }}>{EXAMES.map((e) => <label key={e} className="peq" style={{ display: 'flex', gap: 6 }}><input type="checkbox" checked={exames.includes(e)} onChange={() => setExames(exames.includes(e) ? exames.filter((x) => x !== e) : [...exames, e])} />{e}</label>)}</div></div>}
          <label className="peq" style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={timbrado} onChange={(e) => setTimbrado(e.target.checked)} />Imprimir o timbre (papel comum)</label>
        </div>
        <div className="folha">
          <div className="timbre" style={{ visibility: timbrado ? 'visible' : 'hidden' }}>
            <img src="./dra-simbolo.png" alt="" style={{ height: 46, display: 'block', margin: '0 auto 4px' }} />
            <img src="./dra-nome.png" alt={c.medicaNomeCompleto} style={{ height: 30 }} />
            <div style={{ fontSize: 11.5, color: '#547793', marginTop: 4 }}>{c.crm} · {c.rqe}</div>
          </div>
          <p style={{ margin: '20px 0 0' }}>Paciente: {pac.nome}</p>
          <div className="titulo">{TITULO[tipo]}</div>
          <div className="corpo">{corpo[tipo]}</div>
          <p style={{ margin: '24px 0 0' }}>{c.cidade.split('/')[0]}, {extenso(data)}.</p>
          <div className="assinatura">{c.medicaNomeCompleto}<br /><span style={{ fontSize: 11 }}>{c.crm}</span></div>
          <div className="rodape" style={{ visibility: timbrado ? 'visible' : 'hidden' }}>{c.endereco} · {c.cidade} · {c.whatsapp}</div>
        </div>
      </div>
    </Janela>
  );
}
