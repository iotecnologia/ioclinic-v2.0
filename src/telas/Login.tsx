// Entrada: logo da clínica de um lado, acesso com a marca IO do outro.
import { useState } from 'react';
import { useDados } from '../estado/Dados';
import { SENHA_DEMO, useSessao } from '../estado/Sessao';

export function Login() {
  const { base } = useDados();
  const { entrar } = useSessao();
  const [email, setEmail] = useState('recepcao@ioclinic.exemplo');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [recuperar, setRecuperar] = useState(false);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const u = base.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.ativo);
    if (!u || senha !== SENHA_DEMO) { setErro('E-mail ou senha não conferem.'); return; }
    entrar(u);
    location.hash = '#/agenda';
  };

  return (
    <div className="login">
      <div className="marca"><img src="./dra-logo.png" alt={base.clinica.nome} /></div>
      <form className="form" onSubmit={enviar}>
        <div className="produto" style={{ marginBottom: 34, fontSize: 20 }}><img src="./io-simbolo.png" alt="" style={{ height: 56 }} />IO Clinic</div>
        {recuperar ? (
          <>
            <h1 style={{ marginBottom: 6 }}>Recuperar senha</h1>
            <p className="mut" style={{ margin: '0 0 24px' }}>Enviaremos um link para o seu e-mail.</p>
            <label className="rot">E-mail</label>
            <input className="w100" style={{ marginBottom: 22 }} value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="button" className="pri w100" style={{ padding: 10 }} onClick={() => { setRecuperar(false); setErro('Link enviado. Confira o seu e-mail.'); }}>Enviar link</button>
            <a style={{ marginTop: 16, textAlign: 'center' }} onClick={() => setRecuperar(false)}>Voltar</a>
          </>
        ) : (
          <>
            <h1 style={{ marginBottom: 6 }}>Entrar</h1>
            <p className="mut" style={{ margin: '0 0 24px' }}>Clínica {base.clinica.nome}</p>
            <label className="rot" htmlFor="email">E-mail</label>
            <input id="email" className="w100" style={{ marginBottom: 16 }} value={email} onChange={(e) => { setEmail(e.target.value); setErro(''); }} autoComplete="username" />
            <label className="rot" htmlFor="senha">Senha</label>
            <input id="senha" type="password" className="w100" style={{ marginBottom: 8 }} value={senha} onChange={(e) => { setSenha(e.target.value); setErro(''); }} autoComplete="current-password" />
            <div className="erro" style={{ minHeight: 20, marginBottom: 6 }}>{erro}</div>
            <button type="submit" className="pri w100" style={{ padding: 10 }}>Entrar</button>
            <a style={{ marginTop: 16, textAlign: 'center' }} onClick={() => setRecuperar(true)}>Esqueci minha senha</a>
          </>
        )}
        <p className="mut peq" style={{ marginTop: 60, textAlign: 'center' }}>IO Clinic · desenvolvido por IO Tecnologia</p>
      </form>
    </div>
  );
}
