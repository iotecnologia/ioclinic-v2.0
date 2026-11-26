// Pop-up padrão: toda inclusão e alteração acontece aqui; as telas só consultam.
import { useEffect, type ReactNode } from 'react';

export function Janela({ titulo, sub, largura = 560, onFechar, rodape, children }: {
  titulo: string; sub?: ReactNode; largura?: number; onFechar: () => void; rodape?: ReactNode; children: ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onFechar]);
  return (
    <div className="fundo-janela" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="janela" style={{ width: largura }} role="dialog" aria-label={titulo}>
        <div className="jc">
          <div><h2>{titulo}</h2>{sub && <div className="mut" style={{ marginTop: 3 }}>{sub}</div>}</div>
          <button className="fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </div>
        <div className="jb">{children}</div>
        {rodape && <div className="jr">{rodape}</div>}
      </div>
    </div>
  );
}
