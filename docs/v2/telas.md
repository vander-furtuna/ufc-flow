# Telas da v2

São 39 telas desenhadas para as novas funcionalidades: 12 desktop, 18 mobile e 9 da extensão. Elas foram feitas a partir do design system do UFC Flow no Figma e do front atual. Originais no canvas de design: [UFC Flow v2 — Novas telas](https://claude.ai/artifact/PANzrrVpUaqDCUdE3awhWa).

## Como usar estes arquivos

- `telas/png/<Tela>.png`: captura da tela no estado inicial. Telas desktop marcadas "página" foram capturadas inteiras, com rolagem; as demais no tamanho do quadro.
- `telas/html/<Tela>.dc.html`: o mockup em HTML. É a especificação mais precisa: textos, hierarquia, espaçamentos, cores e **estados alternativos**. Abas, filtros e modos que o PNG não mostra estão no bloco `<sc-if>`/`renderVals()` do script no fim de cada arquivo.
- `telas/html/canvas.json`: posição, tamanho e título de cada quadro.
- `telas/assets/`: logo do UFC Flow (completa e símbolo) e a fonte Clash Display usadas pelos mockups.

Os HTML usam um formato da ferramenta de design (`<x-dc>`, `{{hole}}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`) e não rodam fora dela. Leia-os como especificação; **não copie o markup**. Implemente com os componentes do web (shadcn/Tailwind) seguindo [design-system.md](design-system.md). Os dados das telas (nomes, números, códigos) são fictícios e coerentes entre si: Ana Souza, aluna e moderadora de Eng. de Computação, Sobral, EC 2025.1, semestre 2026.1.

Responsividade: o desktop é desenhado para 1440 px e o mobile para 390 px. Use as duas versões da mesma tela como os extremos de um layout responsivo único, não como duas páginas.

---

## Desktop

| Tela | Fase | O que mostra | Estados e comportamentos |
| --- | --- | --- | --- |
| [Main](telas/png/Main.png) · [html](telas/html/Main.dc.html) · página | 4 | Entrar / criar conta. À esquerda, a proposta ("Seu curso, do primeiro período à colação") e três benefícios; à direita, o formulário. | Abas Entrar e Criar conta (a segunda pede nome e o aceite de Termos e Privacidade). Mostrar senha. Aviso de que a redefinição é pedida a um admin (sem SMTP). "Continuar sem conta" mantém o uso anônimo. |
| [Minha-Area](telas/png/Minha-Area.png) · [html](telas/html/Minha-Area.dc.html) · página | 9 | Painel do aluno: integralização total, por categoria e por vertente; cursando no semestre; liberadas para cursar; horas complementares. | Navegação lateral (Progresso, Histórico, Horas complementares, Agendas, Avaliações). Atalhos "Gerenciar matrículas", "Migrar de estrutura curricular", "Fechar situação", "Montar agenda" e "Lançar atividade". |
| [Historico](telas/png/Historico.png) · [html](telas/html/Historico.dc.html) · página | 9 | Histórico por semestre, com situação e nota. Painel lateral "Registrar disciplina". | Filtro por situação com contagens. Semestres anteriores recolhidos. O painel muda de campos conforme a situação: nota só em Aprovado, Reprovado e Aproveitada; origem só em Aproveitada. Reprovado mostra "nova tentativa disponível". |
| [Hub](telas/png/Hub.png) · [html](telas/html/Hub.dc.html) · página | 10 | Hub do curso: post fixado (edital de monitoria), feed de posts por tipo, links importantes e próximos prazos. | Filtro por tipo (todos, Notícia, Evento, Bolsa, Extensão, Edital). "Novo post" só para moderação. "Editar" e "Ver página" levam aos links. Abas do curso: Grade, Hub, Fórum. |
| [Forum](telas/png/Forum.png) · [html](telas/html/Forum.dc.html) · página | 11 | Timeline do fórum com o editor no topo e o popover de menção `@` aberto. Ao lado, as disciplinas mais citadas na semana e os combinados do fórum. | "3 novas mensagens" (polling). Chips de disciplina clicáveis. Curtir, responder, mais opções. Prévia da última resposta na conversa. |
| [Disciplina-Avaliacao](telas/png/Disciplina-Avaliacao.png) · [html](telas/html/Disciplina-Avaliacao.dc.html) · página | 12 | A grade com o painel lateral da disciplina aberto na aba de avaliações. | Abas do painel: Turmas, Avaliações e Discussões (mensagens do fórum que citam a disciplina). Médias e distribuição por critério, só com 5 ou mais respostas. Formulário de nota de 1 a 5 com rótulos nas pontas. "Adicionar à agenda". Link "Ver as N mensagens no fórum". |
| [Agenda-Notificacoes](telas/png/Agenda-Notificacoes.png) · [html](telas/html/Agenda-Notificacoes.dc.html) · página | 6, 7 | Agenda sincronizada (semana) com o painel de notificações aberto. | Seletor de semestre, "Nova agenda", "Baixar como imagem". Aviso de turma com horário alterado ("Rever na agenda"). Notificações agrupadas ("Diego Rocha e mais 5 curtiram"), "Marcar todas como lidas" e preferências. |
| [Importar-Agendas](telas/png/Importar-Agendas.png) · [html](telas/html/Importar-Agendas.dc.html) | 6 | Diálogo do primeiro login: agendas encontradas no navegador, para importar. | Seleção por agenda. Quando a inferência de curso empata, pergunta o curso com a contagem de turmas que batem. Avisa turmas que não existem mais. O texto do botão muda com a seleção. |
| [Admin-EC](telas/png/Admin-EC.png) · [html](telas/html/Admin-EC.dc.html) · página | 5 | Editor de estrutura curricular em rascunho, importada pela extensão. Tabela por período e painel lateral da disciplina. | Pontos para revisar (nome divergente do catálogo; requisito fora do catálogo). Modo "vincular à vertente" clicando nas linhas. Editor visual de expressão: grupos TODAS (E) / QUALQUER (OU) aninhados, com a expressão em texto embaixo. Aviso do que trava após a 1ª matrícula. "Diferenças da importação", "Exportar JSON", "Revisar e publicar". |
| [Admin-Moderacao](telas/png/Admin-Moderacao.png) · [html](telas/html/Admin-Moderacao.dc.html) · página | 11 | Moderação, com alerta de coleta de turmas que falhou. | Abas Denúncias, Pedidos de moderação e Restrições. Denúncia oculta automaticamente com motivos agregados e as ações remover, restaurar, descartar e silenciar por prazo. Pedido com nota para o solicitante e alerta de e-mail fora da UFC. Tabela de restrições com "Revogar". |
| [Links-Pagina](telas/png/Links-Pagina.png) · [html](telas/html/Links-Pagina.dc.html) · página | 10 | Página pública de links do curso (`/l/{slug}`). | Perfil com capa, bio e redes. Link em destaque com brilho e selo "Novo". Seções (Acadêmico, Comunidade, No UFC Flow) com links do tipo arquivo (PDF), com miniatura, programados ("Disponível até") e internos. Copiar link e QR code. |
| [Links-Editor](telas/png/Links-Editor.png) · [html](telas/html/Links-Editor.dc.html) · página | 10 | Editor da página de links para moderadores, com pré-visualização no celular. | Abas Links, Aparência e Estatísticas. Adicionar link, seção, rede social ou post do hub. Edição em linha (título, link, descrição, ícone ou miniatura, destaque, selo, mesma aba, visibilidade). Perfil, tema (6), estilo e formato de botões, fonte do título. Links mais clicados. |

## Mobile

| Tela | Fase | O que mostra | Estados e comportamentos |
| --- | --- | --- | --- |
| [Mobile-Entrar](telas/png/Mobile-Entrar.png) · [html](telas/html/Mobile-Entrar.dc.html) | 4 | Entrar / criar conta. | Mesmos estados de `Main`. |
| [Mobile-Minha-Area](telas/png/Mobile-Minha-Area.png) · [html](telas/html/Mobile-Minha-Area.dc.html) · inteira | 9 | Minha área empilhada. | Abas roláveis no topo. Mesmas seções do desktop. |
| [Mobile-Historico](telas/png/Mobile-Historico.png) · [html](telas/html/Mobile-Historico.dc.html) · inteira | 9 | Histórico em lista por semestre. | Filtro em chips roláveis. Semestres antigos recolhidos com contagem. Botão fixo "Registrar disciplina". |
| [Mobile-Historico-Registro](telas/png/Mobile-Historico-Registro.png) · [html](telas/html/Mobile-Historico-Registro.dc.html) | 9 | Folha inferior "Registrar disciplina". | Campos mudam com a situação, como no desktop. |
| [Mobile-Navegacao](telas/png/Mobile-Navegacao.png) · [html](telas/html/Mobile-Navegacao.dc.html) | 9 | Menu de navegação aberto. | Hub, Fórum, Grade, Simular agenda, Minha área, RU, Calendário, busca e "Sair". |
| [Mobile-Hub](telas/png/Mobile-Hub.png) · [html](telas/html/Mobile-Hub.dc.html) · inteira | 10 | Hub do curso. | Filtro por tipo. Links importantes com atalho para a página de links. "Novo post" só para moderação. |
| [Mobile-Forum](telas/png/Mobile-Forum.png) · [html](telas/html/Mobile-Forum.dc.html) | 11 | Timeline do fórum. | "↑ 3 novas mensagens". Campo "Escreva para o curso…" abre a tela de escrita. |
| [Mobile-Forum-Escrever](telas/png/Mobile-Forum-Escrever.png) · [html](telas/html/Mobile-Forum-Escrever.dc.html) | 11 | Nova mensagem com o popover de `@` aberto sobre o teclado. | Contador de caracteres (até 500). Cancelar e Publicar. |
| [Forum-Mobile](telas/png/Forum-Mobile.png) · [html](telas/html/Forum-Mobile.dc.html) | 11 | Conversa: cadeia até a raiz e respostas. | Responder, curtir ou descurtir, denunciar. Campo de resposta fixo. |
| [Mobile-Disciplina](telas/png/Mobile-Disciplina.png) · [html](telas/html/Mobile-Disciplina.dc.html) · inteira | 12 | Disciplina em tela cheia, aba avaliações. | Mesmos estados de `Disciplina-Avaliacao`. |
| [Mobile-Agenda](telas/png/Mobile-Agenda.png) · [html](telas/html/Mobile-Agenda.dc.html) | 6 | Agenda da semana. | Aviso de horário alterado. Nova agenda, baixar imagem, lista de disciplinas. |
| [Mobile-Notificacoes](telas/png/Mobile-Notificacoes.png) · [html](telas/html/Mobile-Notificacoes.dc.html) | 7 | Notificações. | Filtros Todas e Não lidas. Marcar lidas. Link para preferências. |
| [Mobile-Importar-Agendas](telas/png/Mobile-Importar-Agendas.png) · [html](telas/html/Mobile-Importar-Agendas.dc.html) | 6 | Importação de agendas locais. | Mesmos estados de `Importar-Agendas`. |
| [Mobile-Admin-EC](telas/png/Mobile-Admin-EC.png) · [html](telas/html/Mobile-Admin-EC.dc.html) · inteira | 5 | Estrutura curricular no celular. | Pontos a revisar. Lista de disciplinas com natureza, vertente e requisitos. "Mais ações" agrupa diferenças e exportação. |
| [Mobile-Admin-EC-Editar](telas/png/Mobile-Admin-EC-Editar.png) · [html](telas/html/Mobile-Admin-EC-Editar.dc.html) | 5 | Edição de uma disciplina da EC. | Editor de expressão E/OU em tela cheia. |
| [Mobile-Admin-Moderacao](telas/png/Mobile-Admin-Moderacao.png) · [html](telas/html/Mobile-Admin-Moderacao.dc.html) · inteira | 11 | Moderação no celular. | Mesmas abas e ações de `Admin-Moderacao`. |
| [Mobile-Links](telas/png/Mobile-Links.png) · [html](telas/html/Mobile-Links.dc.html) · inteira | 10 | Página pública de links. | Mesmo conteúdo de `Links-Pagina`. |
| [Mobile-Links-Editor](telas/png/Mobile-Links-Editor.png) · [html](telas/html/Mobile-Links-Editor.dc.html) | 10 | Editor da página de links, aba Aparência. | Prévia ao vivo no topo. Tema, estilo e formato de botões. |

## Extensão

| Tela | Fase | O que mostra | Estados e comportamentos |
| --- | --- | --- | --- |
| [Ext-Popup-Inicio](telas/png/Ext-Popup-Inicio.png) · [html](telas/html/Ext-Popup-Inicio.dc.html) | 3 | Popup fora do SIGAA. | Atalho para os currículos no SIGAA. Convite de login para moderadores. |
| [Ext-Popup-Login](telas/png/Ext-Popup-Login.png) · [html](telas/html/Ext-Popup-Login.dc.html) | 3 | Login com a conta do Flow. | E-mail e senha; link para criar conta no site. |
| [Ext-Popup-Detectado](telas/png/Ext-Popup-Detectado.png) · [html](telas/html/Ext-Popup-Detectado.dc.html) | 3 | Estrutura detectada na aba atual. | Resumo da EC, "Abrir painel da grade", "Enviar ao Flow", "Baixar JSON", envios recentes com status, sair. |
| [Ext-Popup-Detectado-Escuro](telas/png/Ext-Popup-Detectado-Escuro.png) · [html](telas/html/Ext-Popup-Detectado-Escuro.dc.html) | 3 | O mesmo popup no tema escuro. | Referência de cores do tema escuro da extensão. |
| [Ext-SIGAA-Launcher](telas/png/Ext-SIGAA-Launcher.png) · [html](telas/html/Ext-SIGAA-Launcher.dc.html) | 3 | Botão flutuante injetado na página do SIGAA. | "Extrair grade", "Abrir painel", "Dispensar". |
| [Ext-Painel](telas/png/Ext-Painel.png) · [html](telas/html/Ext-Painel.dc.html) | 3 | Painel sobre o SIGAA com a grade extraída por período. | Abas Grade, Vertentes, Regras da EC, Revisar. Filtros por natureza e vertente. "Destacar requisitos" e painel da disciplina (pré-requisitos, libera, equivalências, co-requisitos). |
| [Ext-Painel-Validacao](telas/png/Ext-Painel-Validacao.png) · [html](telas/html/Ext-Painel-Validacao.dc.html) | 3, 5 | Aba Revisar: checagem da leitura e envio. | Itens ok e avisos (códigos fora da EC, nome diferente do catálogo). JSON `CurriculumImportV1` gerado. Envio como moderador logado: criar rascunho novo ou atualizar o existente, com diff. "Só baixar o JSON". |
| [Ext-Envio-Concluido](telas/png/Ext-Envio-Concluido.png) · [html](telas/html/Ext-Envio-Concluido.dc.html) | 5 | Modal de rascunho criado. | Pontos para revisar e "Abrir no editor" (Admin-EC). |
| [Ext-Envio-Pendente](telas/png/Ext-Envio-Pendente.png) · [html](telas/html/Ext-Envio-Pendente.dc.html) | 5 | Modal de curso ainda inexistente no Flow. | A importação fica pendente e os admins recebem `IMPORT_PENDING`. "Baixar o JSON também". |

## Fluxos entre telas

- **Conta:** Main → Minha-Area → Historico, com Agenda-Notificacoes pelo sino.
- **Comunidade:** Hub ↔ Forum, e Hub → Links-Pagina → Links-Editor.
- **Grade:** Disciplina-Avaliacao → Forum (mensagens que citam a disciplina).
- **Administração:** Admin-EC ↔ Admin-Moderacao.
- **Extensão:** Ext-Popup-Inicio → Ext-Popup-Login → Ext-Popup-Detectado → Ext-Painel → Ext-Painel-Validacao, terminando em Ext-Envio-Concluido (abre Admin-EC no web) ou em Ext-Envio-Pendente.

Telas que já existem no front e **não** foram redesenhadas: lista de cursos, grade (React Flow), simulador de agenda anônimo, RU e calendário. Novos elementos nelas (menu do usuário, sino, abas Grade/Hub/Fórum) seguem o header das telas acima.
