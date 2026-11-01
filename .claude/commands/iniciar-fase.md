---
description: Prepara o trabalho de uma fase do roadmap da v2 (leitura, plano e branch)
argument-hint: <número da fase, ex. 1>
---

Vamos trabalhar na fase $ARGUMENTS do roadmap da v2 do UFC Flow.

1. Leia `docs/v2/estado-atual.md` e a seção "Fase $ARGUMENTS" de `docs/v2/roadmap.md`.
2. Leia as seções de `docs/v2/modelagem.md` citadas na fase e, se houver telas listadas, os PNG e HTML correspondentes em `docs/v2/telas/` (veja `docs/v2/telas.md`).
3. Confira no código o que já existe para essa fase e se as fases das quais ela depende estão concluídas. Se uma dependência estiver pendente, avise antes de continuar.
4. Apresente um plano curto: as entregas da fase quebradas em passos, os arquivos e pacotes que serão criados ou alterados, os testes que serão escritos primeiro e as dúvidas que a modelagem não responde.
5. Espere minha aprovação do plano. Depois, atualize a `develop` local (`git pull --ff-only`), crie a branch `feature/fase-$ARGUMENTS-<assunto>` a partir dela e siga `docs/v2/convencoes.md`.
6. Ao fechar a fase, com tudo verde, envie a branch e abra o PR para `develop` com `gh pr create`. O merge fica comigo.
