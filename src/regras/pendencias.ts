// Pendências do sino: o que a recepção precisa resolver agora.
// - Não respondeu à confirmação (hoje e amanhã)
// - Pediu para remarcar (de hoje em diante)
// - Atendido e ainda não pagou (hoje)
import type { Base } from '../tipos/modelos';
import { visitasDoDia, type Visita } from './agenda';
import { somarDias } from './formato';

export type TipoPendencia = 'sem_resposta' | 'pediu_remarcar' | 'a_receber';

export interface Pendencia {
  tipo: TipoPendencia;
  visita: Visita;
  texto: string; // o que precisa ser feito
  acao: string; // nome do botão que resolve, dentro do pop-up
}

export function pendencias(b: Base, hoje: string, diasAFrente = 7): Pendencia[] {
  const lista: Pendencia[] = [];
  const pago = (agId: string) => b.pagamentos.some((p) => p.agendamentoId === agId);
  for (let i = 0; i <= diasAFrente; i++) {
    const d = somarDias(hoje, i);
    for (const v of visitasDoDia(d, b.agendamentos)) {
      if (v.situacao === 'sem_resposta' && i <= 1) lista.push({ tipo: 'sem_resposta', visita: v, texto: 'Não respondeu à confirmação', acao: 'Confirmar' });
      if (v.situacao === 'pediu_remarcar') lista.push({ tipo: 'pediu_remarcar', visita: v, texto: 'Pediu para remarcar', acao: 'Remarcar' });
      if (i === 0 && (v.situacao === 'atendido' || v.situacao === 'na_clinica') && v.itens.some((a) => a.valor > 0 && !pago(a.id)))
        lista.push({ tipo: 'a_receber', visita: v, texto: 'Falta receber o pagamento', acao: 'Receber' });
    }
  }
  return lista.sort((x, y) => (x.visita.data + x.visita.inicio).localeCompare(y.visita.data + y.visita.inicio));
}
