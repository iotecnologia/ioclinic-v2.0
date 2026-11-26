// Topo: marca do produto (IO) à esquerda, menu, e a clínica + usuário à direita.
import { useDados } from '../estado/Dados';
import { useSessao } from '../estado/Sessao';

const MENU = [
  { id: 'agenda', nome: 'Agenda', medica: false },
  { id: 'pacientes', nome: 'Pacientes', medica: false },
  { id: 'caixa', nome: 'Caixa', medica: true },
  { id: 'configuracoes', nome: 'Configurações', medica: true },
];

export function Topo({ ativo }: { ativo: string }) {
  const { base } = useDados();
  const { usuario, sair } = useSessao();
  const medica = usuario?.perfil === 'medica';
  return (
    <header className="topo">
      <div className="produto"><img src="./io-simbolo.png" alt="" />IO Clinic</div>
      <nav>
        {MENU.filter((m) => medica || !m.medica).map((m) => (
          <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>{m.nome}</a>
        ))}
      </nav>
      <div className="direita">
        <span className="clinica"><img src="./dra-simbolo.png" alt="" />{base.clinica.nome} · {base.clinica.especialidade}</span>
        <span>{usuario?.nome}</span>
        <a onClick={sair}>Sair</a>
      </div>
    </header>
  );
}
