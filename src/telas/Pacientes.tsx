// Pacientes: lista para consulta. Clicar abre a ficha; "Novo paciente" abre o pop-up de cadastro.
import { useMemo, useState } from 'react';
import { useDados } from '../estado/Dados';
import { buscarPacientes } from '../componentes/BuscaPaciente';
import { FormPaciente } from '../componentes/FormPaciente';
import { dataBR, hoje } from '../regras/formato';
import { ir } from '../estado/rota';
import { ID_RETIRADA } from '../estado/acoes';

const POR_PAGINA = 15;

export function Pacientes() {
  const { base } = useDados();
  const [termo, setTermo] = useState('');
  const [pagina, setPagina] = useState(0);
  const [novo, setNovo] = useState(false);

  const linhas = useMemo(() => {
    const h = hoje();
    return buscarPacientes(base.pacientes, termo).map((p) => {
      const ags = base.agendamentos.filter((a) => a.pacienteId === p.id);
      const feitos = ags.filter((a) => a.situacao === 'atendido' && a.servicoId !== ID_RETIRADA).sort((x, y) => y.data.localeCompare(x.data));
      const ultima = feitos[0];
      const servUltima = ultima ? feitos.filter((a) => a.visitaId === ultima.visitaId).map((a) => a.servicoId) : [];
      const prox = ags.filter((a) => a.data >= h && !['cancelado', 'atendido', 'faltou'].includes(a.situacao)).sort((x, y) => (x.data + x.inicio).localeCompare(y.data + y.inicio))[0];
      return { p, ultima, servUltima, qtd: new Set(feitos.map((a) => a.visitaId)).size, prox };
    }).sort((x, y) => x.p.nome.localeCompare(y.p.nome, 'pt-BR'));
  }, [base, termo]);

  const total = linhas.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visiveis = linhas.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);
  const nomeServ = (id: string) => base.servicos.find((s) => s.id === id)?.nome ?? '';

  return (
    <>
      <div className="cab">
        <h1>Pacientes</h1><span className="mut">{base.pacientes.length} cadastrados</span>
        <div className="acoes"><button className="pri" onClick={() => setNovo(true)}>Novo paciente</button></div>
      </div>
      <input className="busca" style={{ marginBottom: 16 }} placeholder="Buscar por nome, CPF ou celular" value={termo} onChange={(e) => { setTermo(e.target.value); setPagina(0); }} />
      <table>
        <thead><tr><th>Paciente</th><th className="so-desktop">Celular</th><th>Última visita</th><th className="so-desktop">Último serviço</th><th className="so-largo">Próximo agendamento</th><th className="num">Visitas</th></tr></thead>
        <tbody>
          {visiveis.map(({ p, ultima, servUltima, qtd, prox }) => (
            <tr key={p.id} className="clicavel" onClick={() => ir(`pacientes/${p.id}`)}>
              <td>{p.nome}</td><td className="so-desktop">{p.celular}</td>
              <td>{ultima ? dataBR(ultima.data) : '—'}</td><td className="so-desktop">{servUltima.length ? servUltima.map(nomeServ).join(' + ') : '—'}</td>
              <td className="so-largo">{prox ? `${dataBR(prox.data)} ${prox.inicio}` : '—'}</td><td className="num">{qtd}</td>
            </tr>
          ))}
          {!visiveis.length && <tr><td colSpan={6} className="vazio">Nenhum paciente encontrado.</td></tr>}
        </tbody>
      </table>
      <div className="paginacao mut peq">
        <span>{total ? `${pag * POR_PAGINA + 1} a ${Math.min(total, (pag + 1) * POR_PAGINA)} de ${total}` : ''}</span>
        <button className="seta" disabled={pag === 0} onClick={() => setPagina(pag - 1)} aria-label="Página anterior">‹</button>
        <button className="seta" disabled={pag >= paginas - 1} onClick={() => setPagina(pag + 1)} aria-label="Próxima página">›</button>
      </div>
      {novo && <FormPaciente onFechar={() => setNovo(false)} onSalvo={(p) => ir(`pacientes/${p.id}`)} />}
    </>
  );
}
