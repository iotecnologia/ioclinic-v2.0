// Cadastro / edição de paciente (pop-up).
import { useState } from 'react';
import type { Paciente } from '../tipos/modelos';
import { useDados } from '../estado/Dados';
import { salvarPaciente } from '../estado/acoes';
import { Janela } from './Janela';

export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    const s = d.slice(0, t).split('').reduce((a, v, i) => a + Number(v) * (t + 1 - i), 0);
    if (((s * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}
const mascaraCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const mascaraCel = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');

export function FormPaciente({ paciente, nomeInicial = '', onFechar, onSalvo }: { paciente?: Paciente; nomeInicial?: string; onFechar: () => void; onSalvo?: (p: Paciente) => void }) {
  const { alterar } = useDados();
  const [f, setF] = useState({
    nome: paciente?.nome ?? nomeInicial, celular: paciente?.celular ?? '', nascimento: paciente?.nascimento ?? '',
    cpf: paciente?.cpf ?? '', termoLgpd: paciente?.termoLgpd ?? false,
  });
  const [erro, setErro] = useState('');
  const salvar = () => {
    if (f.nome.trim().split(' ').length < 2) return setErro('Informe nome e sobrenome.');
    if (f.celular.replace(/\D/g, '').length < 10) return setErro('Informe o celular com DDD.');
    if (f.cpf && !cpfValido(f.cpf)) return setErro('CPF inválido.');
    const salvo = alterar((b) => structuredClone(salvarPaciente(b, { ...f, nome: f.nome.trim(), id: paciente?.id })));
    onSalvo?.(salvo);
    onFechar();
  };
  return (
    <Janela titulo={paciente ? 'Editar cadastro' : 'Novo paciente'} onFechar={onFechar}
      rodape={<><button className="pri" onClick={salvar}>Salvar</button><button onClick={onFechar}>Cancelar</button></>}>
      <div className="campos">
        <div><label className="rot">Nome completo</label><input className="w100" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus /></div>
        <div className="linha2">
          <div><label className="rot">Celular (WhatsApp)</label><input className="w100" value={f.celular} onChange={(e) => setF({ ...f, celular: mascaraCel(e.target.value) })} placeholder="(19) 99999-9999" /></div>
          <div><label className="rot">Nascimento</label><input className="w100" type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></div>
        </div>
        <div className="linha2">
          <div><label className="rot">CPF</label><input className="w100" value={f.cpf} onChange={(e) => setF({ ...f, cpf: mascaraCpf(e.target.value) })} placeholder="000.000.000-00" /></div>
        </div>
        <label className="peq" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={f.termoLgpd} onChange={(e) => setF({ ...f, termoLgpd: e.target.checked })} style={{ width: 16, height: 16 }} />
          Paciente assinou o termo de consentimento (LGPD)
        </label>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </Janela>
  );
}
