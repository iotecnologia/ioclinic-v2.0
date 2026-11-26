# IO Clinic — mock de apresentação

Sistema de gestão para clínica médica da **IO Tecnologia**. Este repositório é o **mock**: roda só no navegador,
com **dados fictícios** no mesmo padrão da clínica real (serviços, preços, volume, formas de pagamento e
categorias de despesa). Nenhum dado de paciente real.

## Como rodar

Requisito: Node 20 ou superior.

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes das regras (agenda, caixa, base fictícia)
npm run build    # gera a versão final em dist/
```

Publicação: o workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica no GitHub Pages
a cada envio para `main` (em Settings → Pages, escolha **GitHub Actions**). Se um teste falhar, nada é publicado.

## Acesso de demonstração

Senha dos dois usuários: `ioclinic`

| Usuário | E-mail | O que vê |
|---|---|---|
| Recepção | recepcao@ioclinic.exemplo | Agenda e Pacientes |
| Dra. (administradora) | flavia@ioclinic.exemplo | Tudo: Agenda, Pacientes, Caixa e Configurações, registro do atendimento e documentos |

A base é refeita todo dia a partir da data de hoje (a agenda de hoje sempre tem pacientes).
Em Configurações → Dados da clínica há o botão **Restaurar dados de demonstração**.

## Mapa de telas

Regra geral: **a tela só consulta**. Incluir, alterar, receber e registrar acontecem sempre em pop-up.

| Tela | Pergunta que responde | Ação principal | Pop-ups |
|---|---|---|---|
| Login | — | Entrar | Recuperar senha |
| **Agenda** (inicial) | Quem vem hoje e o que precisa de atenção? | Novo agendamento | Detalhe do agendamento (Chegou, Receber, Confirmar, Remarcar, Faltou, Cancelar; Dra.: Registrar atendimento, Emitir documento) · Novo agendamento · Receber · Remarcar · Cancelar |
| **Pacientes** | Quem é o paciente? | Novo paciente | Cadastro do paciente |
| Ficha do paciente | O que o paciente já fez e pagou? | Novo agendamento | Editar cadastro · Emitir documento · Novo agendamento |
| **Caixa** (Dra.) | Onde ganho e onde perco? | Lançar despesa | Lançar despesa · Despesa fixa · Exportar CSV |
| **Configurações** (Dra.) | — | Novo serviço / convênio / usuário | Serviço · Convênio · Usuário · Mensagem do WhatsApp |

## Fluxo automático da agenda

Agendou → WhatsApp pede confirmação (1 confirma, 2 remarca) → lembrete na véspera (hora configurável)
→ quem não respondeu ou pediu para remarcar aparece na faixa **Atenção** da Agenda
→ no dia: Chegou → atendimento → **Receber** → o pagamento entra sozinho no Caixa (com a taxa da maquininha).

No mock, as mensagens são simuladas (aparecem no histórico do agendamento).

## Estrutura

```
src/
  tipos/modelos.ts     modelo de dados (vira as coleções/tabelas do banco)
  regras/              regras puras e testadas: agenda (dia, horários livres), caixa (resultado do mês), formato
  estado/acoes.ts      o que cada botão faz (agendar, chegou, receber, registrar, cancelar…)
  estado/Dados.tsx     base no navegador (localStorage) — no sistema real vira chamadas ao backend
  dados/gerador.ts     base fictícia de demonstração
  telas/               Login, Agenda, Pacientes, FichaPaciente, Caixa, Configuracoes
  componentes/         Janela (pop-up), Agendamento, Documentos, FormPaciente, Calendario…
  estilos/app.css      padrão visual
tests/                 testes das regras (Vitest)
```

## Modelo de dados — pontos para o backend

- **Toda entidade tem `clinicaId`**: o mesmo sistema atende várias clínicas (venda para outros médicos).
- **Agendamento tem `profissionalId`**: hoje só a Dra.; a clínica pode crescer com outros médicos.
- **Pagamento particular ou por convênio**: cada serviço tem valor particular e valor por convênio (`valoresConvenio`).
- **Serviço usado não é excluído**, só desativado (o histórico e o caixa dependem dele).
- **Custo por exame** (repasse/material) entra nos custos do Caixa a cada atendimento.
- **Resultado do mês** = recebido − impostos (alíquota) − taxas da maquininha − custos dos exames − gastos fixos.
- O registro do atendimento (CID, observação, exames, retorno) é visível só para o perfil médica (dado de saúde, LGPD).

## O que é simulado e precisa virar real

- Envio e resposta de WhatsApp (API oficial da Meta, número da clínica).
- Login, senha e recuperação de senha por e-mail (hoje senha única de demonstração).
- Banco de dados, backup e regras de acesso por perfil e por clínica.
- Termo de consentimento LGPD, exclusão de dados a pedido do paciente.
- Bloqueios de agenda (feriados e férias) e edição dos horários de atendimento.

## Padrão visual

Fonte do sistema (Segoe UI no Windows). Cores da identidade da Dra.: `#0C3257` principal, `#547793` secundária,
`#91AFC7` linhas, `#DEE8F4` seleção, `#FDFDF3` fundo. Tabelas simples, sem cards, pílulas ou ícones decorativos,
sem texto explicando a tela. Amarelo só para o que pede atenção; verde e vermelho só para resultado.
Documentos impressos levam só a marca da Dra.
