// Calendário + horários livres para uma duração. Usado no Novo agendamento e no Remarcar.
import { useMemo } from 'react';
import { useDados } from '../estado/Dados';
import { horariosLivres } from '../regras/agenda';
import { agoraHHMM, dataExtenso, hoje } from '../regras/formato';
import { Calendario } from './Calendario';

export function EscolherHorario({ data, hora, duracao, ignorarId, onData, onHora }: {
  data: string; hora: string; duracao: number; ignorarId?: string; onData: (d: string) => void; onHora: (h: string) => void;
}) {
  const { base } = useDados();
  const desde = (d: string) => (d === hoje() ? agoraHHMM() : undefined);
  const livres = useMemo(() => horariosLivres(data, duracao, base.agendamentos, base.clinica, [], ignorarId, desde(data)), [data, duracao, base, ignorarId]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 22 }}>
      <Calendario valor={data} onEscolher={(d) => { onData(d); onHora(''); }}
        podeEscolher={(d) => d >= hoje() && horariosLivres(d, duracao, base.agendamentos, base.clinica, [], ignorarId, desde(d)).length > 0} />
      <div>
        <label className="rot">Horários livres · {dataExtenso(data)}</label>
        {livres.length ? (
          <div className="horarios">
            {livres.map((h) => <button key={h} type="button" className={h === hora ? 'sel' : ''} onClick={() => onHora(h)}>{h}</button>)}
          </div>
        ) : <p className="mut" style={{ margin: 0 }}>Nenhum horário livre neste dia.</p>}
      </div>
    </div>
  );
}
