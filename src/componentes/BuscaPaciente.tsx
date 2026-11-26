// Campo de busca de paciente por nome, CPF ou celular, com lista de sugestões.
import { useEffect, useMemo, useState } from 'react';
import { useDados } from '../estado/Dados';
import { normalizar } from '../regras/formato';
import type { Paciente } from '../tipos/modelos';

export function buscarPacientes(pacientes: Paciente[], termo: string): Paciente[] {
  const t = normalizar(termo.trim());
  if (!t) return pacientes;
  const dig = t.replace(/\D/g, '');
  return pacientes.filter((p) => normalizar(p.nome).includes(t) || (dig.length >= 3 && (p.cpf.replace(/\D/g, '').includes(dig) || p.celular.replace(/\D/g, '').includes(dig))));
}

export function BuscaPaciente({ selecionado, onEscolher, onNovo }: { selecionado: Paciente | null; onEscolher: (p: Paciente | null) => void; onNovo?: (nome: string) => void }) {
  const { base } = useDados();
  const [termo, setTermo] = useState(selecionado?.nome ?? '');
  const [aberto, setAberto] = useState(false);
  useEffect(() => { if (selecionado) setTermo(selecionado.nome); }, [selecionado]);
  const lista = useMemo(() => (termo.trim().length >= 2 ? buscarPacientes(base.pacientes, termo).slice(0, 8) : []), [termo, base.pacientes]);
  return (
    <div>
      <input className="w100" value={termo} placeholder="Nome, CPF ou celular"
        onChange={(e) => { setTermo(e.target.value); setAberto(true); if (selecionado) onEscolher(null); }}
        onFocus={() => setAberto(true)} />
      {aberto && !selecionado && termo.trim().length >= 2 && (
        <div className="sugestoes">
          {lista.map((p) => <div key={p.id} onMouseDown={() => { onEscolher(p); setTermo(p.nome); setAberto(false); }}>{p.nome} <span className="mut peq">· {p.celular}</span></div>)}
          {onNovo && <div onMouseDown={() => { onNovo(termo.trim()); setAberto(false); }} style={{ color: 'var(--azul2)' }}>Cadastrar novo paciente: {termo.trim()}</div>}
        </div>
      )}
    </div>
  );
}
