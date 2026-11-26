// Sessão do usuário (mock): login conferido contra a lista de usuários. Senha única de demonstração.
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '../tipos/modelos';

export const SENHA_DEMO = 'ioclinic';
const CHAVE = 'ioclinic:sessao';

interface Ctx { usuario: Usuario | null; entrar: (u: Usuario) => void; sair: () => void }
const SessaoCtx = createContext<Ctx | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null'); } catch { return null; }
  });
  const entrar = (u: Usuario) => {
    setUsuario(u);
    try { sessionStorage.setItem(CHAVE, JSON.stringify(u)); } catch { /* ignora */ }
  };
  const sair = () => {
    setUsuario(null);
    try { sessionStorage.removeItem(CHAVE); } catch { /* ignora */ }
    location.hash = '';
  };
  return <SessaoCtx.Provider value={{ usuario, entrar, sair }}>{children}</SessaoCtx.Provider>;
}

export function useSessao() {
  const c = useContext(SessaoCtx);
  if (!c) throw new Error('useSessao fora do SessaoProvider');
  return c;
}
