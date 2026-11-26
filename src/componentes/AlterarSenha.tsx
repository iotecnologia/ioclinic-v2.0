// Alterar a própria senha (qualquer usuário) ou definir nova senha de outro usuário (só a médica, em Configurações).
import { useState } from 'react';
import { useDados } from '../estado/Dados';
import { senhaDe } from '../estado/Sessao';
import type { Usuario } from '../tipos/modelos';
import { Janela } from './Janela';

export function senhaFraca(s: string): string | null {
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números.';
  return null;
}

/** `propria`: pede a senha atual. Sem `propria`: a administradora define a senha de outro usuário. */
export function AlterarSenha({ usuario, propria, onFechar }: { usuario: Usuario; propria: boolean; onFechar: () => void }) {
  const { base, alterar } = useDados();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repete, setRepete] = useState('');
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(false);
  const salvar = () => {
    const u = base.usuarios.find((x) => x.id === usuario.id);
    if (!u) return setErro('Usuário não encontrado.');
    if (propria && atual !== senhaDe(u)) return setErro('A senha atual não confere.');
    const fraca = senhaFraca(nova);
    if (fraca) return setErro(fraca);
    if (nova !== repete) return setErro('As duas senhas novas não são iguais.');
    alterar((b) => { const x = b.usuarios.find((y) => y.id === usuario.id); if (x) x.senhaMock = nova; });
    setFeito(true);
  };
  if (feito) return (
    <Janela titulo="Senha alterada" largura={420} onFechar={onFechar} rodape={<button className="pri" onClick={onFechar}>Fechar</button>}>
      <p style={{ margin: 0 }}>{propria ? 'Use a senha nova no próximo acesso.' : `${usuario.nome} já pode entrar com a senha nova.`}</p>
    </Janela>
  );
  return (
    <Janela titulo={propria ? 'Alterar minha senha' : 'Definir nova senha'} sub={propria ? undefined : usuario.nome} largura={440} onFechar={onFechar}
      rodape={<><button className="pri" onClick={salvar}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        {propria && <div><label className="rot">Senha atual</label><input type="password" className="w100" value={atual} onChange={(e) => { setAtual(e.target.value); setErro(''); }} autoComplete="current-password" autoFocus /></div>}
        <div><label className="rot">Senha nova</label><input type="password" className="w100" value={nova} onChange={(e) => { setNova(e.target.value); setErro(''); }} autoComplete="new-password" autoFocus={!propria} /></div>
        <div><label className="rot">Repita a senha nova</label><input type="password" className="w100" value={repete} onChange={(e) => { setRepete(e.target.value); setErro(''); }} autoComplete="new-password" /></div>
        <p className="mut peq" style={{ margin: 0 }}>Pelo menos 8 caracteres, com letras e números.</p>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}
