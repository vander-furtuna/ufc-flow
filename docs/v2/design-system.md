# Design system

As telas da v2 seguem o design system do UFC Flow ([Figma](https://www.figma.com/design/XwbrDDljsdjLx8PcP8JC2S/UFC-Flow-%E2%80%94-Design-System?node-id=0-1)) e o que o front já implementa em `apps/web/src/app/globals.css` (Tailwind v4 + shadcn, base `slate`). Os mockups usam hex inline porque a ferramenta de design exige. **No código, use os tokens e utilitários abaixo, nunca o hex solto.**

## Cores neutras

Os mockups usam a escala `slate` do Tailwind v4. Cada hex corresponde a um token do `globals.css` ou a um utilitário `slate-*`.

| Hex no mockup | Tailwind    | Token shadcn                   | Uso                                     |
| ------------- | ----------- | ------------------------------ | --------------------------------------- |
| `#020618`     | `slate-950` | `foreground`                   | Texto principal, títulos                |
| `#0f172b`     | `slate-900` | `primary`                      | Botão primário, aba ativa (fundo)       |
| `#1d293d`     | `slate-800` | —                              | Texto de corpo em cards, links          |
| `#314158`     | `slate-700` | —                              | Bordas no tema escuro                   |
| `#45556c`     | `slate-600` | ≈ `muted-foreground`           | Texto secundário, rótulos, metadados    |
| `#62748e`     | `slate-500` | `muted-foreground`             | Placeholder, texto terciário            |
| `#e2e8f0`     | `slate-200` | `border`, `input`              | Bordas de card, campos, divisores       |
| `#f1f5f9`     | `slate-100` | `secondary`, `muted`, `accent` | Fundos sutis, chips, item ativo do menu |
| `#f8fafc`     | `slate-50`  | —                              | Fundo da página nas áreas logadas       |
| `#ffffff`     | `white`     | `background`, `card`           | Cards e superfícies                     |

O texto secundário dos mockups (`slate-600`) é um tom mais escuro que o `muted-foreground` atual (`slate-500`). Prefira o token; use `text-slate-600` só onde o contraste com fundos `slate-50`/`slate-100` ficar abaixo de AA. O tema escuro já existe em `.dark` no `globals.css`, e as telas novas precisam funcionar nos dois temas.

## Cores de significado

| Significado             | Fundo                                  | Texto                    | Onde aparece                                   |
| ----------------------- | -------------------------------------- | ------------------------ | ---------------------------------------------- |
| Sucesso / Aprovado      | `#f0fdf4` (`green-50`)                 | `#15803d` (`green-700`)  | Situação Aprovado, botão Aprovar, checagens ok |
| Em andamento / Cursando | `#ecfeff` (`cyan-50`)                  | `#0e7490` (`cyan-700`)   | Situação Cursando, destaques de seleção        |
| Atenção                 | `#fffbeb` / `#fef3c7` (`amber-50/100`) | `#b45309` (`amber-700`)  | Situação Trancada, pontos a revisar, rascunho  |
| Erro / Reprovado        | `#fef2f2` / `#fee2e2` (`red-50/100`)   | `#b91c1c` (`red-700`)    | Situação Reprovado, alertas, ação destrutiva   |
| Neutro / Suprimida      | `#f1f5f9` (`slate-100`)                | `#45556c` (`slate-600`)  | Situação Suprimida                             |
| Aproveitada             | `#eef2ff` (`indigo-50`)                | `#4338ca` (`indigo-700`) | Situação Aproveitada                           |

**Natureza das disciplinas:** use as cores já definidas em `apps/web/src/data/colors.ts` (`NATURE_COLORS`), por exemplo Obrigatória `#f97316` e Optativa `#c026d3`. Os chips dos mockups usam a versão clara: fundo `orange-50` com texto `orange-800`; fundo `fuchsia-50` com texto `fuchsia-800`. As **vertentes** usam a cor própria de cada uma (`branches.color`).

Quando um conjunto se repete (situações, naturezas, tipos de post), centralize o mapeamento num só lugar (ex.: `apps/web/src/data/status-colors.ts`) em vez de espalhar classes.

## Tipografia

| Papel                                                            | Fonte                                                       | Peso    | Tamanho típico                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Títulos de página e de seção, nome do curso, números de destaque | Clash Display (`font-clash`)                                | 600     | 28/34 px (h1 desktop), 22–24 px (h1 mobile, modais), 16–20 px (cards)                          |
| Corpo, rótulos, botões                                           | Geist (`font-sans`)                                         | 400–600 | 14 px corpo, 13 px secundário, 12 px metadados e chips, 15 px textos de leitura (fórum, posts) |
| Códigos de disciplina, JSON, expressões                          | `font-mono` (DM Mono no web; os mockups mostram Geist Mono) | 400–500 | 12–13 px                                                                                       |

As fontes já estão configuradas em `apps/web/src/app/layout.tsx` (Clash Display local, Geist do Google). Títulos em Clash Display com tracking normal. Rótulos de seção em caixa alta (`INTEGRALIZAÇÃO`, `1º PERÍODO`) usam 12–13 px, peso 600 e `tracking-wide`.

## Forma e espaçamento

- **Raios:** 999px em chips, badges, avatares e pílulas; 10–12px em botões e campos; 14–16px em cards; 20–24px em modais e painéis grandes. O `--radius` do web é `1rem` (16px), então use `rounded-md`, `rounded-lg`, `rounded-xl` e `rounded-full` conforme a escala do shadcn.
- **Alturas:** botões e campos com 40px (desktop) e 44px (mobile, alvo de toque). Ícones de ação com área de 44×44 no mobile.
- **Espaçamento:** grade de 4px. Gaps comuns são 8, 12, 16, 20 e 24. Páginas desktop com padding de 24–32px; mobile com 16px.
- **Layout logado desktop:** navegação lateral de ~240px mais conteúdo fluido (`flex-wrap`, conteúdo `flex: 999 1 560px`), e painéis laterais de 360–400px para detalhe ou edição (`Historico`, `Admin-EC`, `Disciplina-Avaliacao`).
- **Mobile:** o painel lateral vira folha inferior ou tela cheia, e os filtros viram chips roláveis na horizontal.

## Componentes recorrentes

| Padrão                             | Telas                                           | Implementação sugerida                                                                                                |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Abas em pílula (segmented control) | Main, Admin-Moderacao, Links-Editor, Ext-Painel | `Tabs` do shadcn estilizado: trilho `bg-white border rounded-2xl p-1`, aba ativa `bg-primary text-primary-foreground` |
| Chips de filtro com contagem       | Historico, Hub, Ext-Painel                      | `ToggleGroup` com `aria-pressed`                                                                                      |
| Painel lateral de detalhe/edição   | Historico, Admin-EC, Disciplina-Avaliacao       | `Sheet` (lado direito no desktop, base no mobile)                                                                     |
| Alerta inline                      | Admin-Moderacao, Admin-EC, Agenda               | Componente `Alert` com variantes success/warning/destructive das cores acima                                          |
| Editor de expressão E/OU           | Admin-EC, Mobile-Admin-EC-Editar                | Componente recursivo sobre `RequirementExpr` do `academic-core`, mostrando a expressão em texto embaixo               |
| Popover de menção `@`              | Forum, Mobile-Forum-Escrever                    | `Popover` + `Command` do shadcn, ancorado no cursor                                                                   |
| Badge de contagem                  | Header (sino), menu Admin                       | `Badge` arredondado, vermelho para pendências                                                                         |
| Card de post / mensagem            | Hub, Forum                                      | Avatar com iniciais, metadados em `text-xs text-muted-foreground`, ações com contador                                 |

Acessibilidade: os mockups já usam `role="tab"`, `aria-selected`, `aria-pressed`, `aria-current`, `role="dialog"` e `aria-label` em botões de ícone. Mantenha isso na implementação, e garanta contraste AA nos dois temas.

## Temas da página de links

Os seis temas são fixos (sem cor livre) e definidos em `packages/contracts`. Valores extraídos de `Links-Editor.dc.html`:

| Tema    | Fundo     | Destaque  | Borda     | Texto     | Superfície | Capa      |
| ------- | --------- | --------- | --------- | --------- | ---------- | --------- |
| CIANO   | `#ecfeff` | `#0891b2` | `#a5f3fc` | `#083344` | `#ffffff`  | `#cffafe` |
| LARANJA | `#fff7ed` | `#ea580c` | `#fed7aa` | `#7c2d12` | `#ffffff`  | `#ffedd5` |
| VERDE   | `#f0fdf4` | `#16a34a` | `#bbf7d0` | `#14532d` | `#ffffff`  | `#dcfce7` |
| VIOLETA | `#f5f3ff` | `#7c3aed` | `#ddd6fe` | `#4c1d95` | `#ffffff`  | `#ede9fe` |
| BRANCO  | `#ffffff` | `#0f172b` | `#e2e8f0` | `#020618` | `#f8fafc`  | `#f1f5f9` |
| ESCURO  | `#020618` | `#22d3ee` | `#314158` | `#f8fafc` | `#1d293d`  | `#1d293d` |

Estilos de botão: Preenchido (fundo no destaque), Contorno (borda de 2px no destaque) e Suave (superfície com borda). Formatos: Reto (6px), Arredondado (14px) e Pílula (999px). Fonte do título: Clash Display ou Geist.

## Marca

- `telas/assets/logo-ufc-flow.svg` (logo completa) e `logo-ufc-flow-simbolo.svg` (símbolo).
- No web, o componente `apps/web/src/components/logo.tsx` e os SVGs em `apps/web/src/assets/` são a referência.
