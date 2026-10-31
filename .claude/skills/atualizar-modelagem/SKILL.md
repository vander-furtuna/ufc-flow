---
name: atualizar-modelagem
description: Mantém docs/v2 (modelagem, roadmap, estado atual, telas) em dia quando uma decisão, regra de negócio, tabela, endpoint ou tela muda, ou quando uma fase termina. Use quando o usuário disser que decidiu algo, quando a implementação revelar um caso que a modelagem não cobre, ou ao fechar uma fase do roadmap.
argument-hint: <o que mudou>
---

# Atualizar a documentação da v2

`docs/v2/modelagem.md` é a fonte de verdade da v2 **dentro do repositório**. O documento colaborativo citado no topo dele é só a origem histórica: não tente editá-lo daqui.

## Quando uma decisão ou regra muda

1. **Registro de decisões:** acrescente uma linha na tabela de `docs/v2/modelagem.md` com o próximo id livre (`D20`, `D21`, …) e as colunas Tema, Decisão e Consequência na modelagem. Nunca renumere nem apague linhas antigas; se uma decisão foi revertida, escreva a nova e cite a antiga ("substitui D7").
2. **Seção afetada:** ajuste o texto, as tabelas e os blocos de schema da seção correspondente. Procure por nomes de tabela, coluna e endpoint para achar todas as menções (`grep -n "<nome>" docs/v2/*.md`) e mantenha tudo coerente.
3. **Consequências:**
   - Mudou a permissão de alguém → Matriz de permissões.
   - Novo evento → tabela de tipos em Notificações.
   - Nova finalidade de arquivo → tabela de Arquivos.
   - Novo risco → Lacunas e riscos em aberto.
4. **Roadmap:** inclua, mova ou risque as caixas afetadas em `docs/v2/roadmap.md`.
5. **Telas:** se a mudança invalida uma tela, anote na linha dela em `docs/v2/telas.md` ("desatualizada: <motivo>") e avise o usuário. O redesenho e a reexportação são feitos fora do repositório.
6. Faça a mudança de documentação **no mesmo PR** do código que a implementa.

## Ao fechar uma fase

- Marque as caixas concluídas em `docs/v2/roadmap.md`.
- Atualize `docs/v2/estado-atual.md`: branches, itens concluídos, pendências imediatas e a tabela de divergências (remova as resolvidas, acrescente as novas).
- Se a fase criou comandos, pacotes ou regras que todo agente precisa saber, atualize o `CLAUDE.md` da raiz, de forma curta.

## Estilo

- Português do Brasil, frases curtas, a decisão primeiro e o porquê depois.
- Nomes de tabela, coluna, enum e rota em `código`.
- Não reescreva seções que não mudaram.
