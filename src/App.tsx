// Rotas: sem login → tela de entrada. Caixa e Configurações são só da médica (administradora).
import { DadosProvider } from './estado/Dados';
import { SessaoProvider, useSessao } from './estado/Sessao';
import { useRota } from './estado/rota';
import { Topo } from './componentes/Topo';
import { Login } from './telas/Login';
import { Agenda } from './telas/Agenda';
import { Pacientes } from './telas/Pacientes';
import { FichaPaciente } from './telas/FichaPaciente';
import { Caixa } from './telas/Caixa';
import { Configuracoes } from './telas/Configuracoes';

function Telas() {
  const { usuario } = useSessao();
  const [tela = 'agenda', id] = useRota();
  if (!usuario) return <Login />;
  const medica = usuario.perfil === 'medica';
  let conteudo;
  if (tela === 'pacientes' && id) conteudo = <FichaPaciente id={id} />;
  else if (tela === 'pacientes') conteudo = <Pacientes />;
  else if (tela === 'caixa' && medica) conteudo = <Caixa />;
  else if (tela === 'configuracoes' && medica) conteudo = <Configuracoes />;
  else conteudo = <Agenda />;
  const ativo = ['pacientes', 'caixa', 'configuracoes'].includes(tela) ? tela : 'agenda';
  return (
    <>
      <Topo ativo={ativo} />
      {(ativo === 'agenda' || ativo === 'configuracoes' || (tela === 'pacientes' && id)) && <img className="marca-dagua" src="./dra-simbolo.png" alt="" />}
      <main>{conteudo}</main>
    </>
  );
}

export default function App() {
  return (
    <DadosProvider>
      <SessaoProvider>
        <Telas />
      </SessaoProvider>
    </DadosProvider>
  );
}
