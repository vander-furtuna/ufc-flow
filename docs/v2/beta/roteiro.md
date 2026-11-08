# Roteiro de verificação da v2

Checklist por perfil, para a verificação própria (fase 13, etapa 1) e para o beta fechado (etapa 2, D101). Marque o que testou, em 1440 px e em 390 px (celular) e nos temas claro e escuro. Cada problema vira um relato pelo formulário do beta ou uma issue com os rótulos de [triagem](#triagem).

Antes de começar, num ambiente com a v2 no ar (local ou o beta):

- um admin (`seed-admin`) e o catálogo (`seed-catalog`);
- o semestre vigente marcado em `/admin/semestres`, com uma coleta de turmas concluída;
- pelo menos três contas: uma de aluno com matrícula, uma de moderador de um curso e o admin;
- a extensão gerada com o endereço do ambiente ([deploy.md](../deploy.md#extensão)).

## 1. Sem conta (anônimo)

Nada aqui pode pedir login.

- [ ] `/cursos` lista os cursos; a busca encontra pelo nome.
- [ ] A grade de um curso abre no fluxo, com períodos, naturezas e as linhas de pré-requisito.
- [ ] Filtros e a troca de visualização funcionam e são lembrados ao voltar.
- [ ] O painel da disciplina mostra os detalhes, os pré-requisitos (com E/OU), o que ela libera e as turmas do semestre.
- [ ] Na aba Avaliações, as médias aparecem a partir de 5 avaliações; abaixo disso, só o aviso, sem números.
- [ ] Na aba Discussões, aparece o convite para entrar.
- [ ] Agenda local:
  - [ ] montar uma agenda com turmas do semestre;
  - [ ] ver o aviso de conflito de horário;
  - [ ] criar mais de uma agenda;
  - [ ] fechar e reabrir o navegador e encontrar tudo onde estava.
- [ ] Hub do curso: o feed, um post aberto, os prazos ("Encerra em N dias") e os links importantes.
- [ ] Página de links `/l/{curso}`: os links abrem, o QR code aparece e o tema bate com o configurado.
- [ ] O Restaurante Universitário (cardápio) e o Calendário Acadêmico funcionam como antes.
- [ ] `/termos` e `/privacidade` mostram a versão 1.0.

## 2. Aluno

- [ ] **Conta:**
  - [ ] criar a conta com o aceite dos Termos e da Política;
  - [ ] entrar, sair e entrar de novo;
  - [ ] errar a senha algumas vezes e ver o limite de tentativas;
  - [ ] pôr, trocar e remover a foto de perfil.
- [ ] **Redefinir senha:** o admin gera o link em Admin › Usuários e a senha nova funciona; o link não funciona de novo.
- [ ] **Agendas:**
  - [ ] no primeiro login, o diálogo oferece importar as agendas montadas sem conta;
  - [ ] as agendas aparecem em outro navegador com a mesma conta.
- [ ] **Notificações:**
  - [ ] o sino mostra o contador;
  - [ ] o painel e a página `/notificacoes` funcionam;
  - [ ] silenciar um tipo nas preferências funciona.
- [ ] **Minha área:**
  - [ ] criar a matrícula no curso;
  - [ ] ver o progresso de integralização, com o aviso de que é uma estimativa.
- [ ] **Histórico:**
  - [ ] registrar disciplinas como Aprovado, Reprovado, Cursando e Aproveitada;
  - [ ] a nota só aparece onde deve, e Reprovado oferece nova tentativa.
- [ ] **Horas complementares:** cadastrar uma atividade com certificado; o total por categoria respeita o teto.
- [ ] **Fórum:**
  - [ ] postar com `@CÓDIGO` (o popover sugere disciplinas) e ver a menção virar link;
  - [ ] responder, curtir e descurtir;
  - [ ] editar dentro de 15 minutos;
  - [ ] apagar uma mensagem sem respostas (some) e uma com respostas (vira "mensagem apagada");
  - [ ] denunciar a mensagem de outra pessoa;
  - [ ] postar várias vezes seguidas e ver o limite de envio.
- [ ] **Avaliar disciplina:**
  - [ ] o formulário só libera com Aprovado ou Reprovado no histórico;
  - [ ] enviar a avaliação e depois atualizá-la;
  - [ ] o total de avaliações muda.
- [ ] **Pedir moderação** de um curso em Minha conta, com justificativa, e cancelar o pedido.
- [ ] **Minha conta:**
  - [ ] baixar os dados (o arquivo traz o que foi cadastrado);
  - [ ] excluir a conta: senha errada mostra o erro; com a certa, a conta sai, as mensagens do fórum viram "Mensagem removida" e a avaliação continua na média.

## 3. Moderador do curso

- [ ] O pedido aprovado pelo admin gera a notificação, e o curso aparece como moderado.
- [ ] **Hub:**
  - [ ] criar posts dos tipos disponíveis, com capa, galeria, prazo e fixado;
  - [ ] editar, despublicar e apagar posts;
  - [ ] alunos recebem o aviso de post novo.
- [ ] **Página de links:**
  - [ ] criar seções e links e reordenar arrastando;
  - [ ] trocar a aparência;
  - [ ] ver as estatísticas de cliques e visitas.
- [ ] **Moderação do fórum** (Admin › Moderação):
  - [ ] a fila de denúncias, com o trecho denunciado;
  - [ ] ocultar, remover com categoria ou descartar as denúncias;
  - [ ] silenciar e banir alguém do fórum do curso por um período, e tirar a restrição.
- [ ] **Estruturas curriculares do curso:**
  - [ ] importar pela extensão;
  - [ ] resolver os pontos para revisar;
  - [ ] editar disciplinas, requisitos (editor E/OU) e vertentes;
  - [ ] publicar e marcar a vigente;
  - [ ] cadastrar as categorias de atividades complementares.

## 4. Admin

- [ ] **Cursos:** criar e editar; um curso sem estrutura publicada não aparece em `/cursos`.
- [ ] **Importações:** a lista, o diff de uma importação e a importação de curso pendente.
- [ ] **Semestres e turmas:**
  - [ ] cadastrar e marcar o vigente;
  - [ ] disparar a coleta;
  - [ ] ver a última coleta de cada curso;
  - [ ] uma falha vira aviso `SCRAPE_FAILED`.
- [ ] **Moderação:** aprovar e rejeitar pedidos de moderação, com nota.
- [ ] **Critérios de avaliação:** criar, editar, desativar e reordenar.
- [ ] **Usuários:**
  - [ ] buscar e filtrar por situação;
  - [ ] gerar o link de senha;
  - [ ] suspender (a pessoa não entra) e reativar;
  - [ ] descartar as avaliações de uma conta.
- [ ] **Aceite e exclusão:** com o aceite pendente, o admin passa pela tela de aceite; o único admin não consegue excluir a própria conta.

## 5. Extensão do navegador

- [ ] Carregar a pasta gerada (ou o zip do beta) em `chrome://extensions`, com o modo desenvolvedor ligado.
- [ ] Entrar pelo popup com a conta do UFC Flow.
- [ ] No SIGAA, abrir a estrutura curricular de um curso e ver o painel da extensão.
- [ ] Enviar ao UFC Flow e ver o resultado: rascunho criado, curso pendente ou diferenças.
- [ ] O popup mostra os últimos envios.

## 6. Em todas as telas

- [ ] Celular (390 px): nada corta ou sobrepõe, os menus abrem e os alvos de toque são confortáveis.
- [ ] Tema escuro: textos legíveis, nada some.
- [ ] Teclado: dá para navegar com Tab, o foco aparece e os diálogos fecham com Esc.
- [ ] Erros: com a API fora do ar, as telas avisam em vez de quebrar; uma página inexistente mostra o 404.
- [ ] Desempenho: a grade e o fórum abrem em poucos segundos numa conexão de celular.

## Triagem

Cada relato vira uma issue no GitHub, no milestone `v2.0.0`, com um rótulo de tipo e um de prioridade:

| Rótulo           | Quando                                                                             |
| ---------------- | ---------------------------------------------------------------------------------- |
| `bug`            | Algo não funciona como deveria.                                                    |
| `inconsistência` | Funciona, mas diverge de outra tela, do SIGAA ou da regra da modelagem.            |
| `melhoria`       | Sugestão de algo novo ou diferente.                                                |
| `bloqueante`     | Impede o lançamento: perda de dados, falha de segurança, fluxo principal quebrado. |
| `depois`         | Fica para depois do lançamento (vai para o milestone `v2.1`).                      |
| `beta`           | Veio do beta fechado.                                                              |

O beta termina quando não há issue `bloqueante` aberta e cada perfil passou por este roteiro (D101).
