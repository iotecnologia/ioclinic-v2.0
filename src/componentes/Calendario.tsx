// Calendário de um mês. `podeEscolher` decide quais dias ficam clicáveis (ex.: só dias com horário livre).
import { useState } from 'react';
import { MESES, hoje, iso, paraData } from '../regras/formato';

export function Calendario({ valor, onEscolher, podeEscolher }: { valor: string; onEscolher: (d: string) => void; podeEscolher?: (d: string) => boolean }) {
  const [mes, setMes] = useState(() => { const d = paraData(valor); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const primeiro = mes.getDay();
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const h = hoje();
  return (
    <div>
      <div className="cal-cab">
        <button className="seta" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button>
        <b style={{ fontWeight: 600 }}>{MESES[mes.getMonth()][0].toUpperCase() + MESES[mes.getMonth()].slice(1)} {mes.getFullYear()}</b>
        <button className="seta" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Próximo mês">›</button>
      </div>
      <div className="cal">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <b key={i}>{d}</b>)}
        {Array.from({ length: primeiro }, (_, i) => <span key={'v' + i} />)}
        {Array.from({ length: dias }, (_, i) => {
          const d = iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1));
          return (
            <button key={d} className={(d === valor ? 'sel ' : '') + (d === h ? 'hoje' : '')}
              disabled={podeEscolher ? !podeEscolher(d) : false} onClick={() => onEscolher(d)}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
}
