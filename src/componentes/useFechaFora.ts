// Fecha um painel flutuante (calendário, sino) ao clicar fora dele ou apertar Esc.
import { useEffect, type RefObject } from 'react';

export function useFechaFora(ref: RefObject<HTMLElement>, aberto: boolean, fechar: () => void) {
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) fechar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('touchstart', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('touchstart', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [ref, aberto, fechar]);
}
