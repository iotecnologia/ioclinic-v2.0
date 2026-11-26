// Link de ação (não navega para outro endereço): clicável com mouse, toque e teclado (Enter/Espaço).
// Visual em app.css: cor muda, sublinhado aparece e cursor de mão ao passar o mouse.
import type { AnchorHTMLAttributes, KeyboardEvent, MouseEvent } from 'react';

export function Acao({ onClick, className = '', children, ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & { onClick: (e?: MouseEvent<HTMLAnchorElement>) => void }) {
  const tecla = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  };
  return <a role="button" tabIndex={0} className={('acao ' + className).trim()} onClick={onClick} onKeyDown={tecla} {...resto}>{children}</a>;
}
