// Navegação simples por hash: #/agenda, #/pacientes, #/pacientes/pac_12, #/caixa, #/configuracoes
import { useEffect, useState } from 'react';

export function useRota(): string[] {
  const ler = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [partes, setPartes] = useState(ler);
  useEffect(() => {
    const f = () => { setPartes(ler()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return partes;
}

export function ir(caminho: string) {
  location.hash = '#/' + caminho;
}
