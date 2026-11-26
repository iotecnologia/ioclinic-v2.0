// Estado do mock: a base inteira fica no navegador (localStorage).
// No sistema real, esta camada é trocada por chamadas ao backend, sem mexer nas telas.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { Base } from '../tipos/modelos';
import { gerarBase } from '../dados/gerador';
import { hoje } from '../regras/formato';

const CHAVE = 'ioclinic:v3'; // mudou o formato dos dados (visitas): versão nova descarta a base antiga do navegador

function carregar(): Base {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    // a base de demonstração é refeita a cada dia, para a agenda de hoje estar sempre cheia
    if (salvo && salvo.geradoEm === hoje()) return salvo.base;
  } catch { /* sem armazenamento: segue com base nova */ }
  return gerarBase();
}

function salvar(base: Base) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ geradoEm: hoje(), base })); } catch { /* ignora */ }
}

interface Ctx {
  base: Base;
  /** Aplica uma alteração na base (recebe uma cópia, pode mutar), salva e devolve o retorno de fn. */
  alterar: <T>(fn: (b: Base) => T) => T;
  restaurar: () => void;
}
const DadosCtx = createContext<Ctx | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<Base>(carregar);
  const atual = useRef(base);
  const alterar = useCallback(<T,>(fn: (b: Base) => T): T => {
    const nova = structuredClone(atual.current);
    const r = fn(nova);
    atual.current = nova;
    salvar(nova);
    setBase(nova);
    return r;
  }, []);
  const restaurar = useCallback(() => {
    const nova = gerarBase();
    atual.current = nova;
    salvar(nova);
    setBase(nova);
  }, []);
  return <DadosCtx.Provider value={{ base, alterar, restaurar }}>{children}</DadosCtx.Provider>;
}

export function useDados() {
  const c = useContext(DadosCtx);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
