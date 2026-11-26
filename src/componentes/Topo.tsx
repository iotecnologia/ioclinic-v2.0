// Topo: marca do produto (IO) à esquerda, menu, e à direita o sino de pendências, a clínica e o usuário.
// No celular o menu vira um botão "Menu" que abre a lista por baixo do topo.
import { useCallback, useRef, useState } from 'react';
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';
import { AlterarSenha } from './AlterarSenha';
import { useFechaFora } from './useFechaFora';
import { pendencias } from '../regras/pendencias';
import { dataBR, hoje, somarDias } from '../regras/formato';
import { ir } from '../estado/rota';
import { Acao } from './Acao';

const MENU = [
  { id: 'agenda', nome: 'Agenda', medica: false },
  { id: 'pacientes', nome: 'Pacientes', medica: false },
  { id: 'caixa', nome: 'Caixa', medica: true },
  { id: 'configuracoes', nome: 'Configurações', medica: true },
];

export function Topo({ ativo }: { ativo: string }) {
  const { base } = useDados();
  const { usuario, sair } = useSessao();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState(false);
  const [sino, setSino] = useState(false);
  const refSino = useRef<HTMLDivElement>(null);
  const lista = pendencias(base, hoje());
  useFechaFora(refSino, sino, useCallback(() => setSino(false), []));
  const quando = (d: string) => (d === hoje() ? 'Hoje' : d === somarDias(hoje(), 1) ? 'Amanhã' : dataBR(d).slice(0, 5));
  const nome = (id: string) => base.pacientes.find((p) => p.id === id)?.nome ?? '';
  const medica = usuario?.perfil === 'medica';
  const itens = MENU.filter((m) => medica || !m.medica);
  return (
    <header className="topo">
      <div className="produto"><img src="./io-simbolo.png" alt="" />IO Clinic</div>
      <nav className="menu-largo">
        {itens.map((m) => <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>{m.nome}</a>)}
      </nav>
      <div className="direita">
        <div className="sino" ref={refSino}>
          <button className="botao-sino" aria-label={`Pendências: ${lista.length}`} aria-expanded={sino} onClick={() => setSino(!sino)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {lista.length > 0 && <span className="contador">{lista.length}</span>}
          </button>
          {sino && (
            <div className="painel-sino">
              <div className="painel-cab">Pendências</div>
              {lista.length === 0 && <p className="vazio" style={{ padding: '18px 16px', margin: 0 }}>Nenhuma pendência.</p>}
              {lista.map((p) => (
                <button key={p.tipo + p.visita.id} className="item-sino" onClick={() => { setSino(false); ir(`agenda/${p.visita.data}/${p.visita.id}/${Date.now()}`); }}>
                  <span className="quem">{nome(p.visita.pacienteId)}</span>
                  <span className={'oque' + (p.tipo === 'a_receber' ? '' : ' atencao')}>{p.texto}</span>
                  <span className="mut peq">{quando(p.visita.data)}, {p.visita.inicio}</span>
                  <span className="acao">{p.acao} ›</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="clinica"><img src="./dra-simbolo.png" alt="" /><span>{base.clinica.nome} · {base.clinica.especialidade}</span></span>
        <Acao className="usuario" title="Alterar minha senha" onClick={() => setSenha(true)}>{usuario?.nome}</Acao>
        <Acao className="menu-largo" onClick={sair}>Sair</Acao>
        <button className="botao-menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Menu'}</button>
      </div>
      {aberto && (
        <nav className="menu-celular" onClick={() => setAberto(false)}>
          {itens.map((m) => <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>{m.nome}</a>)}
          <Acao onClick={() => setSenha(true)}>Alterar minha senha</Acao>
          <Acao onClick={sair}>Sair</Acao>
        </nav>
      )}
      {senha && usuario && <AlterarSenha usuario={usuario} propria onFechar={() => setSenha(false)} />}
    </header>
  );
}
