// Topo: marca do produto (IO) à esquerda, menu, e a clínica + usuário à direita.
// No celular o menu vira um botão "Menu" que abre a lista por baixo do topo.
import { useState } from 'react';
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';
import { AlterarSenha } from './AlterarSenha';

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
  const medica = usuario?.perfil === 'medica';
  const itens = MENU.filter((m) => medica || !m.medica);
  return (
    <header className="topo">
      <div className="produto"><img src="./io-simbolo.png" alt="" />IO Clinic</div>
      <nav className="menu-largo">
        {itens.map((m) => <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>{m.nome}</a>)}
      </nav>
      <div className="direita">
        <span className="clinica"><img src="./dra-simbolo.png" alt="" /><span>{base.clinica.nome} · {base.clinica.especialidade}</span></span>
        <a className="usuario" title="Alterar minha senha" onClick={() => setSenha(true)}>{usuario?.nome}</a>
        <a className="menu-largo" onClick={sair}>Sair</a>
        <button className="botao-menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Menu'}</button>
      </div>
      {aberto && (
        <nav className="menu-celular" onClick={() => setAberto(false)}>
          {itens.map((m) => <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>{m.nome}</a>)}
          <a onClick={() => setSenha(true)}>Alterar minha senha</a>
          <a onClick={sair}>Sair</a>
        </nav>
      )}
      {senha && usuario && <AlterarSenha usuario={usuario} propria onFechar={() => setSenha(false)} />}
    </header>
  );
}
