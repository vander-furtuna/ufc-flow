---
name: regra-academica-tdd
description: Implementa ou altera uma regra acadêmica pura no packages/academic-core com teste escrito antes. Use para pré-requisitos e equivalências (RequirementExpr), conflito de horário, termo letivo "2026.1", regras do histórico, progresso de integralização, disciplinas liberadas, menções @CÓDIGO ou normalização de busca, e sempre que web, API ou extensão precisarem de uma dessas regras.
argument-hint: <regra, ex. "avaliar RequirementExpr com equivalências">
---

# Regra acadêmica com TDD

Regras acadêmicas do UFC Flow moram **só** em `packages/academic-core`. Web, API e extensão importam de `@ufc-flow/academic-core`; nunca reimplemente uma regra fora daqui.

## 1. Ache a regra na modelagem

Leia a seção correspondente de `docs/v2/modelagem.md` antes de escrever qualquer coisa:

| Regra | Seção da modelagem |
| --- | --- |
| `RequirementExpr`, equivalências, ciclos | Catálogo acadêmico › Requisitos como expressão |
| Conflito de horário, uma turma por disciplina | Turmas e agendas › Agenda |
| Situações e novas tentativas | Vida acadêmica do aluno › Regras do histórico (e o diagrama de estados) |
| Progresso de integralização | Vida acadêmica do aluno › Progresso de integralização |
| Menções `@CÓDIGO` | Fórum do curso › Menções a disciplinas |
| Termo letivo | Turmas e agendas (`academic_terms`) |

Se a modelagem não responder a um caso, **pare e pergunte ao usuário**. Não invente a regra; depois registre a resposta com a skill `atualizar-modelagem`.

## 2. Escreva os testes primeiro

- Arquivo ao lado do código: `packages/academic-core/src/<area>/<regra>.test.ts` (Vitest).
- **Cada linha de tabela de regras da modelagem vira pelo menos um caso.** Use `it.each` com tabelas legíveis.
- Inclua bordas: lista vazia, disciplina fora do catálogo, código citado que não existe, empate, valores no limite (nota 0 e 10, teto de horas exato).
- Fixtures reais em `packages/academic-core/src/__fixtures__/`, por exemplo uma EC de Eng. de Computação ou textos de requisito copiados do SIGAA.
- Rode e **veja falhar** pelo motivo certo: `pnpm --filter @ufc-flow/academic-core test`.

## 3. Implemente o mínimo

- Funções puras: sem I/O, sem `Date.now()` ou `new Date()` (receba o termo ou a data como parâmetro), sem dependência de framework.
- Identificadores em inglês; mensagens e comentários de domínio podem citar os termos do SIGAA (`E`, `OU`, `APROVEITADA`).
- Exporte pelo `src/index.ts`. Tipos públicos com nomes estáveis, porque web e API vão depender deles.
- Rode os testes até ficarem verdes, depois refatore com eles verdes.

## Invariantes que valem para todo o pacote

- `RequirementExpr` tem exatamente esta forma (decisão da modelagem):
  ```ts
  type RequirementExpr =
    | { kind: 'subject'; code: string }
    | { kind: 'and'; items: RequirementExpr[] }
    | { kind: 'or'; items: RequirementExpr[] }
  ```
- A árvore referencia **códigos** de disciplina, nunca IDs. Um código pode não existir no catálogo.
- Uma disciplina está cumprida com `APROVADO` ou `APROVEITADA`, nela ou numa equivalente. Equivalências são globais (D5).
- O texto do SIGAA usa `E` e `OU` com parênteses, como `( ECO0018 E ( SBL0084 OU CEC0022 ) )`. O parser respeita parênteses; sem eles, `E` tem precedência sobre `OU`. Confirme a precedência com fixtures reais antes de fixar.
- Menções: `@([A-Z]{2,5}\d{3,5})`.
- Termos comparam por ano e depois por período (`2025.2` < `2026.1`).

## 4. Feche

- Cobertura do pacote ≥ 90%: `pnpm --filter @ufc-flow/academic-core test -- --coverage`.
- Troque duplicatas existentes pelo import do pacote (ex.: `apps/web/src/utils/check-time-conflict`).
- Rode `pnpm typecheck` e `pnpm lint` na raiz.
- Marque a caixa correspondente em `docs/v2/roadmap.md` (fase 1 ou a fase que pediu a regra).
