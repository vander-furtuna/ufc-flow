---
name: implementar-tela
description: Implementa no apps/web uma tela desenhada em docs/v2/telas (ou ajusta uma existente), traduzindo o mockup para componentes shadcn e tokens Tailwind, com layout responsivo único de 390 a 1440 px, tema claro e escuro, acessibilidade e conferência visual por screenshot. Use ao construir ou alterar qualquer interface do web na v2.
argument-hint: <tela, ex. "Historico">
---

# Implementar uma tela

## 1. Entenda a tela

1. Ache a tela em `docs/v2/telas.md`: fase, o que mostra, estados e a versão mobile ou desktop correspondente.
2. **Olhe os PNGs** (`docs/v2/telas/png/<Tela>.png` e o par mobile ou desktop) com a ferramenta de leitura de imagem.
3. Leia o HTML (`docs/v2/telas/html/<Tela>.dc.html`), **inclusive o script no fim**: `renderVals()` e os blocos `<sc-if>` revelam abas, filtros e modos que o PNG não mostra. O HTML é especificação, não código para copiar.
4. Confira de onde vêm os dados na seção da modelagem e no endpoint. Se o endpoint ainda não existe, pergunte ao usuário antes de criar dados falsos. Componentes recebem props tipadas pelos schemas de `packages/contracts`.

## 2. Traduza para o web

- **Tokens, não hex:** use a tabela de `docs/v2/design-system.md` (`text-foreground`, `bg-primary`, `text-muted-foreground`, `border`, cores de situação e natureza centralizadas num só mapa).
- **Componentes:** primeiro os que já existem em `apps/web/src/components` e `components/ui`. Para um novo do shadcn, rode o CLI a partir de `apps/web`, onde fica o `components.json`: `pnpm dlx shadcn@latest add <componente>`. A skill `shadcn` ajuda a escolher e compor.
- **Padrões recorrentes** (tabela "Componentes recorrentes" do design system):
  - Abas em pílula → `Tabs`.
  - Painel lateral → `Sheet` (direita no desktop, base no mobile).
  - Popover de `@` → `Popover` + `Command`.
  - Alertas → `Alert` com variantes.
- **Tipografia:** títulos em `font-clash` (600), corpo em `font-sans` e códigos em `font-mono`.
- **Textos:** copie os textos em português exatamente como no mockup, a menos que o usuário peça outra coisa.
- **Responsivo:** **um** layout que vai de 390 a 1440 px; desktop e mobile são os extremos, não duas páginas. Menu lateral que vira empilhado ou menu, filtros em chips roláveis no mobile, alvos de toque de 44 px.
- **Tema escuro:** tudo precisa funcionar com `.dark`.
- **Acessibilidade:** preserve o que o mockup já tem (`role="tab"`, `aria-selected`, `aria-pressed`, `aria-current`, `aria-label` em botões de ícone, `role="dialog"`), foco visível e contraste AA.
- **Dados:** dados do servidor com TanStack Query ou Server Components (o web é BFF, sem token no browser). Estado de UI local.
- **Modo anônimo:** telas públicas (grade, turmas, hub, links) não podem passar a exigir login.

## 3. Confira

1. `pnpm dev:web` e abra a rota.
2. Capture 390×844 e 1440×900, nos temas claro e escuro, por exemplo com `pnpm dlx playwright screenshot --viewport-size=390,844 --color-scheme=dark <url> tmp/<tela>-390-escuro.png`. Na primeira vez pode ser preciso rodar `pnpm dlx playwright install chromium`.
3. **Olhe as capturas** ao lado dos PNGs de `docs/v2/telas/png` e corrija diferenças de hierarquia, espaçamento e estados. Não versione as capturas.
4. Rode a skill `web-design-guidelines` sobre os arquivos alterados e trate os achados relevantes.
5. `pnpm typecheck` e `pnpm lint`. Teste com Testing Library os componentes com lógica de estado (formulários, editor de expressão).
6. Marque a tela como implementada na fase correspondente de `docs/v2/roadmap.md`.
