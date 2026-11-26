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
| Login | — | Entrar | Recuperar senha · Alterar minha senha (clicando no próprio nome, no topo) |
| **Agenda** (inicial) | Quem vem hoje e o que precisa de atenção? | Novo agendamento | Detalhe da visita (Chegou, Receber, Confirmar, Remarcar, Faltou, Cancelar; Dra.: Registrar atendimento, Emitir documento) · Novo agendamento · Receber · Remarcar · Cancelar |
| **Pacientes** | Quem é o paciente? | Novo paciente | Cadastro do paciente |
| Ficha do paciente | O que o paciente já fez e pagou? | Novo agendamento | Editar cadastro · Emitir documento · Novo agendamento |
| **Caixa** (Dra.) | Onde ganho e onde perco? | Lançar despesa | Lançar despesa · Despesa fixa · Exportar CSV |
| **Configurações** (Dra.) | — | Novo serviço / usuário · Editar horários · Editar dados | Serviço · Usuário (definir nova senha) · Mensagem do WhatsApp · Horários · Dados da clínica (alíquota, taxas da maquininha, lembrete) |

## Visita com vários serviços

No Novo agendamento, **"Adicionar outro exame"** inclui mais um exame para o mesmo paciente. Os exames são feitos
em sequência: o calendário e os horários livres consideram o tempo total. Os exames formam a **visita**: uma linha só na agenda, com
um "Chegou", um "Receber" (total), uma mensagem de confirmação; remarcar/cancelar movem tudo junto. Dá para
**tirar** um exame da visita sem cancelar o resto. No Caixa continua um lançamento por serviço.

**Holter e MAPA**: ao agendar, o sistema marca sozinho a **retirada do aparelho** no próximo dia de atendimento,
no mesmo horário (ou no primeiro livre), 15 minutos, sem custo. Ela acompanha a visita se for remarcada ou cancelada.
Qualquer serviço pode ter essa opção (Configurações → Serviços).

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
- **Agendamento = um serviço com o horário escolhido; `visitaId` junta os serviços da mesma visita.** A retirada do Holter/MAPA aponta para a visita de origem (`retiradaDe`).
- **Agendamento tem `profissionalId`**: hoje só a Dra.; a clínica pode crescer com outros médicos.
- **Só particular**: a clínica não atende convênio; cada serviço tem um valor.
- **Serviço usado não é excluído**, só desativado (o histórico e o caixa dependem dele).
- **Custo por exame** (repasse/material) entra nos custos do Caixa a cada atendimento.
- **Resultado do mês** = recebido − impostos (alíquota) − taxas da maquininha − custos dos exames − gastos fixos.
- O registro do atendimento (CID, observação, exames, retorno) é visível só para o perfil médica (dado de saúde, LGPD).

## O que é simulado e precisa virar real

- Envio e resposta de WhatsApp (API oficial da Meta, número da clínica).
- Login, senha e recuperação de senha por e-mail. No mock a senha fica em `senhaMock` dentro da base do navegador; no sistema real vai para o serviço de autenticação (com hash).
- Banco de dados, backup e regras de acesso por perfil e por clínica.
- Termo de consentimento LGPD, exclusão de dados a pedido do paciente.
- Bloqueios de agenda (feriados e férias).

## Celular e tablet

Até 1024px (tablet): some a coluna Pagamento da agenda e colunas secundárias; blocos lado a lado viram um embaixo do outro.
Até 640px (celular): menu vira botão "Menu"; agenda em duas linhas por paciente; pop-ups ocupam a tela inteira com os botões embaixo;
tabelas largas rolam para o lado.

## Padrão visual

Fonte do sistema (Segoe UI no Windows). Cores da identidade da Dra.: `#0C3257` principal, `#547793` secundária,
`#91AFC7` linhas, `#DEE8F4` seleção, `#FDFDF3` fundo. Tabelas simples, sem cards, pílulas ou ícones decorativos,
sem texto explicando a tela. Amarelo só para o que pede atenção; verde e vermelho só para resultado.
Documentos impressos levam só a marca da Dra.
