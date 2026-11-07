# Documentação da v2

Tudo que um desenvolvedor (pessoa ou agente) precisa para continuar a v2 do UFC Flow sem contexto prévio.

## Ordem de leitura

1. [estado-atual.md](estado-atual.md): o que já foi feito, o que está pendente e onde o repositório diverge da modelagem.
2. [modelagem.md](modelagem.md): a fonte de verdade da v2. Traz o escopo, o registro de decisões (D1–D41, L1–L11), a arquitetura e as tabelas, regras e endpoints de cada módulo.
3. [roadmap.md](roadmap.md): as 14 fases (0 a 13), em ordem de dependência, com entregas em checklist e critérios de pronto.
4. [telas.md](telas.md): as 39 telas (PNG + HTML), com o que cada uma mostra, seus estados e a fase em que entra.
5. [design-system.md](design-system.md): como traduzir os mockups para os tokens Tailwind/shadcn do web.
6. [convencoes.md](convencoes.md): padrões de código, testes, git e definição de pronto.
7. [deploy.md](deploy.md): deploy no Coolify, variáveis de ambiente e seeds do primeiro deploy.

## Mapa rápido: funcionalidade → modelagem → telas → fase

| Funcionalidade                                | Seção da modelagem                 | Telas                                                                                    | Fase |
| --------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ---- |
| Regras puras (requisitos, horário, progresso) | Catálogo acadêmico; Vida acadêmica | —                                                                                        | 1    |
| Formato de importação e contratos             | Importação e edição de grades      | —                                                                                        | 2    |
| Extensão do SIGAA                             | Importação e edição de grades      | `Ext-*`                                                                                  | 3    |
| Contas, sessões, papéis, moderadores          | Usuários, papéis e permissões      | `Main`, `Mobile-Entrar`                                                                  | 4    |
| Catálogo no banco e editor de ECs             | Catálogo acadêmico; Importação     | `Admin-EC`, `Mobile-Admin-EC*`, `Ext-Envio-*`                                            | 5    |
| Turmas coletadas e agendas sincronizadas      | Turmas e agendas                   | `Agenda-Notificacoes`, `Mobile-Agenda`, `*Importar-Agendas`                              | 6    |
| Notificações                                  | Notificações                       | `Agenda-Notificacoes`, `Mobile-Notificacoes`                                             | 7    |
| Upload de arquivos                            | Arquivos e imagens                 | —                                                                                        | 8    |
| Histórico, horas e progresso                  | Vida acadêmica do aluno            | `Minha-Area`, `Historico`, `Mobile-*Historico*`, `Mobile-Minha-Area`, `Mobile-Navegacao` | 9    |
| Hub e página de links                         | Hub do curso; Página de links      | `Hub`, `Links-*`, `Mobile-Hub`, `Mobile-Links*`                                          | 10   |
| Fórum e moderação                             | Fórum do curso                     | `Forum`, `*Forum*`, `*Admin-Moderacao`                                                   | 11   |
| Avaliação de disciplinas                      | Avaliação de disciplinas           | `Disciplina-Avaliacao`, `Mobile-Disciplina`                                              | 12   |
| LGPD e deploy                                 | Usuários (LGPD); Lacunas e riscos  | —                                                                                        | 13   |

## Origem destes documentos

- A modelagem foi escrita e revisada com o autor num documento colaborativo ([link](https://claude.ai/artifact/UMzzHykJMZDD9gwt7Mdi7K)). A partir desta cópia, o repositório é a referência.
- As telas foram desenhadas num canvas de design ([link](https://claude.ai/artifact/PANzrrVpUaqDCUdE3awhWa)) e exportadas para `telas/`. Se uma tela mudar lá, reexporte o PNG e o HTML.
