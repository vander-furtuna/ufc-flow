# Plano de Gerenciamento de Configuração de Software (PGCS)

## Projeto: UFC FLOW

Este documento estabelece o plano formal para o gerenciamento de configuração de software (GCS) do projeto **UFC FLOW**. Ele detalha os processos, ferramentas, papéis, responsabilidades e fluxos de trabalho necessários para garantir a integridade, o controle de mudanças e a rastreabilidade das baselines de software desenvolvidas.

---

## 1. Informações de Controle e Histórico do Documento

### 1.1 Metadados do Documento

- **Título**: Plano de Gerenciamento de Configuração de Software (PGCS)
- **Projeto**: UFC FLOW (Interface Interativa de Fluxo Curricular da UFC)
- **Versão**: 1.1.3
- **Data**: 14 de junho de 2026
- **Status**: Publicado / Ativo
- **Autor**: Vander Furtuna

### 1.2 Histórico de Revisões

| Versão    | Data       | Descrição da Alteração                                                         | Autor             | Status   |
| :-------- | :--------- | :----------------------------------------------------------------------------- | :---------------- | :------- |
| **1.0.0** | 14/06/2026 | Criação inicial do Plano de Gerenciamento de Configuração do Projeto UFC FLOW. | Vanderlei Furtuna | Aprovado |

---

## 2. Introdução

### 2.1 Objetivo

O objetivo deste documento é definir a estratégia formal de Gerenciamento de Configuração de Software (GCS) a ser aplicada ao projeto **UFC FLOW**. Ele descreve os procedimentos operacionais padrão para a identificação, controle, auditoria e relato de status de todos os Itens de Configuração (ICs) ao longo do ciclo de vida de desenvolvimento do software.

### 2.2 Escopo

Este plano aplica-se a todas as ramificações de código, documentações, dados estáticos de cursos, configurações de compiladores, scripts de integração contínua (CI) e pacotes de release do UFC FLOW.

### 2.3 Definições, Acrônimos e Abreviaturas

- **GCS (Gerenciamento de Configuração de Software)**: Disciplina voltada ao controle sistemático das modificações nos artefatos de um projeto.
- **IC (Item de Configuração)**: Elemento de software (código, arquivo de configuração, documento, script) mapeado de forma única para sofrer controle de versão.
- **Baseline (Linha de Base)**: Especificação ou produto de software aprovado formalmente que serve como ponto de partida estável para desenvolvimentos subsequentes.
- **PR (Pull Request)**: Mecanismo de colaboração no Git para submissão de alterações que passarão por validação e revisão de código.
- **CI (Integração Contínua)**: Processo automatizado de build e validação de código a cada alteração submetida ao repositório.
- **SemVer (Semantic Versioning)**: Padrão de numeração de versão (MAJOR.MINOR.PATCH) baseado no impacto das alterações no sistema.
- **Bun**: Runtime e gerenciador de pacotes rápido para JavaScript/TypeScript.

### 2.4 Referências

- Padrão IEEE 828-2012 (_IEEE Standard for Configuration Management in Systems and Software Engineering_).
- Catálogo de Itens de Configuração: [CONFIGURATION_ITEMS.md](file:///c:/Users/furtu/www/react/ufc flow/CONFIGURATION_ITEMS.md) / [ConfigurationItens.md](file:///c:/Users/furtu/www/react/ufc flow/ConfigurationItens.md).
- Repositório UFC FLOW no GitHub: `https://github.com/vander-furtuna/ufc flow`.

---

## 3. Organização e Responsabilidades

Para assegurar a disciplina de configuração do projeto, são estabelecidos papéis claros com diferentes níveis de autoridade e responsabilidade.

### 3.1 Papéis de GCS

1. **Gerente de GCS**:
   - Mantém o PGC atualizado e alinhado com as necessidades do projeto.
   - Cria tags e gera releases na branch principal.
   - Executa auditorias de configuração e gera relatórios de status.
   - Gerencia permissões no repositório GitHub.
2. **Líder Técnico / Arquiteto**:
   - Define regras de arquitetura que geram novos Itens de Configuração.
   - Atua como revisor técnico principal em Pull Requests.
   - Resolve conflitos de integração complexos nas baselines estáveis.
3. **Desenvolvedor**:
   - Cria ramificações secundárias para implementar features ou correções.
   - Realiza commits atômicos de acordo com os padrões definidos.
   - Atualiza as dependências em conformidade com as políticas do projeto.
   - Abre e valida Pull Requests garantindo aprovação no build local.
4. **Analista de Garantia da Qualidade (QA)**:
   - Valida as releases implantadas em ambientes de homologação.
   - Confirma que o comportamento do sistema condiz com as especificações da baseline correspondente.

### 3.2 Matriz de Responsabilidade (RACI)

A matriz abaixo delimita o envolvimento de cada papel nas principais atividades de gerenciamento de configuração:

| Atividade de GCS                  | Gerente de GCS | Líder Técnico | Desenvolvedor | QA / Testes |
| :-------------------------------- | :------------: | :-----------: | :-----------: | :---------: |
| Definição de Políticas e PGC      |     **A**      |     **R**     |     **C**     |    **I**    |
| Criação e Mapeamento de ICs       |     **R**      |     **A**     |     **C**     |    **I**    |
| Desenvolvimento (Codificação)     |     **I**      |     **C**     |     **R**     |    **I**    |
| Revisão de Código (Code Review)   |     **I**      |     **A**     |     **R**     |    **I**    |
| Geração de Baselines e Releases   |     **A**      |     **R**     |     **I**     |    **C**    |
| Execução de Auditorias (AFC/AFCF) |     **R**      |     **A**     |     **C**     |    **C**    |
| Resolução de Bugs de Configuração |     **C**      |     **A**     |     **R**     |    **I**    |

- **R (Responsible)**: Quem executa fisicamente a atividade.
- **A (Accountable)**: Quem responde juridicamente/tecnicamente pelo resultado final e aprova.
- **C (Consulted)**: Quem é consultado previamente para opinar ou ajudar.
- **I (Informed)**: Quem é notificado sobre os resultados ou status da atividade.

---

## 4. Identificação de Configuração

A Identificação de Configuração visa caracterizar a estrutura física e lógica do software através do mapeamento de seus elementos fundamentais.

### 4.1 Convenção de Nomenclatura dos Itens de Configuração

Cada Item de Configuração é registrado sob a notação sequencial `IC-XXX` (onde `XXX` indica o sequencial numérico de `001` a `999`).
O projeto UFC FLOW classifica seus ICs em quatro categorias principais:

- **CONF (Configuração/Infraestrutura)**: Arquivos que afetam o comportamento global de compilação, análise estática de código e setup do sistema (ex: `tsconfig.json`, `next.config.mjs`).
- **SRC (Código-Fonte)**: Páginas, componentes, ganchos (hooks), utilitários e serviços do ecossistema React/Next.js (ex: `src/app/globals.css`, `layout.tsx`).
- **DATA (Dados Estáticos/Estruturas)**: Arquivos contendo dados de negócios locais, como matrizes de disciplinas universitárias (ex: `src/data/courses.ts`).
- **DOC (Documentação)**: Documentos regulamentares, roteiros e catálogos (ex: `README.md`, `PLANO_GERENCIAMENTO_CONFIGURACAO.md`).

O inventário oficial e detalhado dos itens ativos encontra-se documentado no catálogo de itens de configuração do projeto: [CONFIGURATION_ITEMS.md](file:///c:/Users/furtu/www/react/ufc flow/CONFIGURATION_ITEMS.md).

### 4.2 Definição de Baselines (Linhas de Base)

As baselines representam momentos formais de controle ao longo do ciclo de vida de desenvolvimento:

```
[Desenvolvimento] (Develop)
        │
        ▼  (Validação de CI/CD e aprovação em PR)
[Baseline de Homologação] (Staging / Release Branches)
        │
        ▼  (Aprovação da Auditoria e Testes Funcionais)
[Baseline de Produção] (Master - vMAJOR.MINOR.PATCH)
```

1. **Baseline de Desenvolvimento (Development Baseline)**:
   - **Ramo Git**: `develop`
   - **Frequência**: Dinâmica / Contínua.
   - **Constituição**: Código-fonte validado pelo pipeline de integração contínua (CI) básico.
   - **Controle**: Permite commits de merge após a aprovação de Pull Requests.
2. **Baseline de Homologação (Staging Baseline)**:
   - **Ramo Git**: `release/vX.Y.Z` ou branches estáveis de homologação.
   - **Frequência**: Semanal ou ao final de sprints.
   - **Constituição**: Código congelado temporariamente para testes de QA adicionais e validação de empacotamento completo.
   - **Controle**: Apenas correções de bugs urgentes são aplicadas a esta linha de base.
3. **Baseline de Produção (Production Baseline)**:
   - **Ramo Git**: `master`
   - **Frequência**: Sob demanda, após a homologação formal.
   - **Constituição**: Código auditado, versionado semanticamente e empacotado.
   - **Controle**: Acesso restrito para merge; alterações requerem a geração de uma nova tag do Git (ex.: `v1.6.0`).

---

## 5. Controle de Alterações e Mudanças

O processo de controle de alterações visa garantir que todas as modificações nos ICs sejam realizadas de forma transparente, rastreável e sem gerar efeitos colaterais destrutivos nas baselines.

### 5.1 Fluxo de Trabalho de Alteração (Workflow do Git)

O projeto adota uma arquitetura baseada em **GitFlow simplificado**:

```mermaid
gitGraph
    commit id: "Inicial"
    branch develop
    checkout develop
    commit id: "Base de Dev"
    branch feat/agenda
    checkout feat/agenda
    commit id: "feat: adiciona agenda"
    commit id: "feat: interface da agenda"
    checkout develop
    merge feat/agenda id: "Merge PR #4"
    branch release/v1.6.0
    checkout release/v1.6.0
    commit id: "chore: define versao v1.6.0"
    checkout main
    merge release/v1.6.0 id: "Release v1.6.0"
    tag id: "v1.6.0"
    checkout develop
    merge release/v1.6.0 id: "Merge de volta"
```

1. **Início da Alteração**: Toda mudança deve ser precedida por uma Issue ou tarefa cadastrada no painel do projeto.
2. **Criação de Branch**: O desenvolvedor cria uma ramificação a partir de `develop`:
   - Para novas funcionalidades: `feat/nome-curto`
   - Para correções de bugs: `fix/nome-curto`
   - Para manutenções de infraestrutura/configuração: `chore/nome-curto`
   - Para refatorações: `refactor/nome-curto`
3. **Desenvolvimento e Validação Local**: O código é alterado e o desenvolvedor deve executar localmente o build e validações:
   ```bash
   bun run lint
   bun run build
   ```
4. **Submissão de Pull Request**: A alteração é enviada ao GitHub criando um PR direcionado ao ramo `develop`.
5. **Integração Contínua**: O pipeline automático no GitHub Actions roda testes e builds estáticos.
6. **Peer Review**: Pelo menos um outro desenvolvedor ou o Líder Técnico deve revisar o código, fazendo sugestões ou aprovando o PR.
7. **Merge**: Após a validação de CI e aprovação humana, o PR é mesclado em `develop` utilizando a estratégia de _squash_ (combinando os commits em um único commit limpo) ou _merge commit_ padrão.

### 5.2 Padrão de Commits (Conventional Commits)

As mensagens de commit devem descrever claramente o impacto da alteração, utilizando o seguinte padrão:

```
<tipo>(<escopo>): <descrição sucinta em português minúsculo>
```

- **Tipos válidos**: `feat` (funcionalidade), `fix` (correção), `chore` (dependências/build), `docs` (documentações), `style` (formatação e estilizações visuais pura), `refactor` (refatoração interna de código).
- **Exemplo**: `feat(agenda): adiciona popup de detalhes da disciplina selecionada`

---

## 6. Processo de Integração e Entrega Contínuas (CI/CD)

### 6.1 Integração Contínua (CI)

O projeto conta com um fluxo automatizado de integração definido em `.github/workflows/ci.yml`. O pipeline roda automaticamente nas seguintes ocasiões:

- Pushes diretos para o branch `master`.
- Pull Requests abertos ou modificados tendo a branch `master` como destino.

O fluxo de CI executa as seguintes etapas estruturadas na nuvem:

1. **Ambiente**: Máquina virtual Ubuntu de última geração.
2. **Setup do Runtime**: Configuração do runtime **Bun** em sua versão estável mais recente.
3. **Mecanismo de Cache**: Recupera o cache de dependências do Bun com base na hash do arquivo `bun.lock` (IC-010). Isso acelera o tempo de execução.
4. **Instalação Estrita**: Roda o comando `bun install --frozen-lockfile` para proibir atualizações não controladas de dependências durante o build da CI.
5. **Análise Estática (Linting)**: Executa o analisador de código estático `bun run lint` (ESLint) para barrar violações de padrões de desenvolvimento.
6. **Compilação e Tipagem**:
   - Executa `bun x next typegen` para assegurar que os tipos das rotas dinâmicas do Next.js estejam atualizados.
   - Roda `bun x tsc --noEmit` para verificar se existem falhas de tipagem no TypeScript.
7. **Build de Produção**: Roda o empacotamento completo `bun run build` para garantir que a baseline compila perfeitamente sem falhas silenciosas.

Caso qualquer uma das etapas falhe, o build é classificado como quebrado e a mesclagem é bloqueada até que o desenvolvedor submeta as correções necessárias.

---

## 7. Versionamento e Gerenciamento de Releases

### 7.1 Versionamento Semântico (SemVer)

O UFC FLOW adota estritamente o Versionamento Semântico no formato `X.Y.Z`:

- **MAJOR (X)**: Incrementado quando há mudanças estruturais que causam incompatibilidade retroativa ou redesenho completo de rotas e APIs do UFC FLOW.
- **MINOR (Y)**: Incrementado ao adicionar novas funcionalidades úteis (como uma nova página de agenda ou simulação) de forma retrocompatível.
- **PATCH (Z)**: Incrementado ao realizar correções de bugs, pequenas melhorias de performance ou atualizações de estilo visual.

### 7.2 Fluxo de Geração de Release

1. O ramo `develop` é congelado quando atinge o conjunto de features planejado para a release.
2. É criada uma branch de lançamento: `release/vX.Y.Z`.
3. O Gerente de GCS realiza os seguintes passos locais:
   - Atualiza a versão no campo `"version"` do `package.json`.
   - Gera o build de produção local e atualiza o arquivo `bun.lock` se necessário.
   - Comita as mudanças de infraestrutura: `chore(release): prepara versao vX.Y.Z`.
4. A branch de release é mesclada em `master` e em `develop`.
5. Uma tag do Git é gerada no commit mesclado na `master`:
   ```bash
   git checkout master
   git tag -a vX.Y.Z -m "Release: Versão X.Y.Z - Descrição rápida das novidades"
   git push origin vX.Y.Z
   ```
6. O changelog é gerado e as notas da release são publicadas na aba de Releases do GitHub.

---

## 8. Auditorias de Configuração e Controle de Qualidade

A auditoria serve como um processo formal de conformidade para atestar que os artefatos gerados refletem com precisão as políticas estabelecidas neste plano.

### 8.1 Auditoria Física de Configuração (AFC)

- **Objetivo**: Garantir que todos os Itens de Configuração (ICs) planejados para a versão estejam presentes e que arquivos temporários ou confidenciais não tenham sido empacotados por engano.
- **Critérios**: O Gerente de GCS revisa as modificações de arquivos comparando com a baseline anterior. Deve garantir que arquivos como `.env.local` estejam ausentes da árvore rastreada e que o catálogo em `CONFIGURATION_ITEMS.md` reflita fielmente o estado real da raiz do projeto.
- **Frequência**: Antes de cada merge de release para o ramo `master`.

### 8.2 Auditoria Funcional de Configuração (AFCF)

- **Objetivo**: Comprovar que o build do sistema foi gerado a partir do código auditado e que atende a todos os requisitos funcionais sem regressões críticas.
- **Critérios**: Confirmação visual de aprovação do status do pipeline do GitHub Actions (CI verde) e execução bem-sucedida de validação de rota dinâmica em ambiente local ou de preview.
- **Frequência**: Realizada a cada Pull Request elegível para merge no ramo `master` ou `develop`.

---

## 9. Status Accounting (Relato da Situação da Configuração)

O Relato da Situação garante que a evolução das configurações e baselines seja mapeada e acessível para todos os interessados no projeto.

- **Log de Commits**: O repositório Git atua como o diário de bordo principal contendo a linha do tempo atômica e imutável de todas as modificações.
- **Relatório de Versões (Changelog)**: Documento de acompanhamento que resume o histórico de alterações entre as tags de versão de forma amigável ao usuário final e desenvolvedores.
- **Verificação de Itens**: A tabela de Itens de Configuração deve conter referências explícitas às versões em que foram incluídos ou modificados, mantendo viva a rastreabilidade estrutural do UFC FLOW.

---

## 10. Ferramentas Aprovadas de GCS

Para assegurar a consistência dos processos descritos, a equipe do UFC FLOW concorda em utilizar exclusivamente as seguintes ferramentas homologadas:

| Ferramenta               | Categoria                        | Escopo de Uso                                                                     |
| :----------------------- | :------------------------------- | :-------------------------------------------------------------------------------- |
| **Git**                  | Sistema de Controle de Versão    | Gerenciamento de histórico, controle distribuído local e branches.                |
| **GitHub**               | Plataforma de Hospedagem         | Hospedagem remota, controle de Pull Requests, gerenciamento de Issues e Actions.  |
| **Bun**                  | Gerenciador de Pacotes e Runtime | Resolução, instalação e empacotamento rápido de dependências locais.              |
| **Next.js & TypeScript** | Framework de Aplicação           | Estrutura de código, tipagem estática e compilação do UFC FLOW.                   |
| **ESLint & Prettier**    | Qualidade & Formatação           | Validação e formatação automática de padrões estéticos e regras de código.        |
| **GitHub Actions**       | Integração Contínua (CI)         | Execução automatizada de pipeline de testes, lint e builds em servidores remotos. |

---

## 11. Contingência, Backup e Recuperação

### 11.1 Plano de Backup

O repositório do UFC FLOW no GitHub funciona como o ponto centralizado de backup. Contudo, devido à natureza distribuída do Git, cada clone local mantido pelos desenvolvedores serve como um backup redundante completo de todo o histórico de desenvolvimento e configuração do projeto.

### 11.2 Procedimento de Recuperação e Rollback de Código

Se um erro crítico de configuração ou bug funcional for detectado na baseline de produção ativa, o seguinte fluxo de contingência deve ser acionado pelo Gerente de GCS:

1. Identificar o último commit ou tag estável no Git (ex: `v1.5.0`).
2. Criar uma correção emergencial revertendo o commit problemático na branch `master` ou apontando a implantação de produção para a tag estável anterior.
3. Forçar o deploy da baseline restaurada.
4. Mesclar a reversão na branch `develop` para garantir a sincronia entre as ramificações de longa duração.

### 11.3 Indisponibilidade de Ferramentas

Na eventualidade de indisponibilidade da plataforma GitHub:

- O desenvolvimento local deve continuar normalmente nas branches de funcionalidade.
- A troca de patches de código entre desenvolvedores pode ser feita através da geração de patches do Git (`git format-patch`) ou repositórios locais intermediários compartilhados via rede local.
- O pipeline de CI/CD deve ser rodado manualmente em uma máquina local de desenvolvimento usando os scripts `bun install --frozen-lockfile`, `bun run lint` e `bun run build` antes de qualquer liberação emergencial.
