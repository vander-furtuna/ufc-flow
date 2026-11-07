# Deploy da v2 (Coolify)

Como pôr a v2 no ar numa VM com o Coolify: três containers (`web`, `api`, `postgres`), um volume para o banco e outro para os uploads (modelagem, Execução na VM, D100).

Domínios, DNS e backup não estão configurados no repositório. O endereço da API e o do web são definidos na VM, no Coolify. O backup é um risco ainda em aberto (modelagem, Lacunas e riscos).

## Peças

| Container  | Imagem                                 | Porta interna | Volume                      | Observações                                                                                                 |
| ---------- | -------------------------------------- | ------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `postgres` | `postgres:17-alpine`                   | 5432          | `postgres-data`             | Só na rede interna do compose.                                                                              |
| `api`      | `apps/api/Dockerfile`                  | 3333          | `uploads` → `/data/uploads` | Aplica as migrations a cada subida e depois sobe a API. Healthcheck em `/v1/health`.                        |
| `web`      | `Dockerfile` da raiz (Next standalone) | 3000          | —                           | Fala com a API por `http://api:3333` (BFF). Renderiza por requisição: o catálogo vem só da API (D51, D100). |

- O arquivo é o [`docker/compose.prod.yml`](../../docker/compose.prod.yml). Nenhum serviço publica porta: quem expõe `web` e, se for preciso, `api` é o proxy do Coolify (Traefik), com os domínios configurados nele.
- A API precisa de um endereço público só para a extensão do navegador, que fala com ela direto (Bearer). O web usa a rede interna.
- O `Dockerfile` da raiz continua sendo o do web, porque é o caminho que o Coolify já usa em produção.

## Primeiro deploy

1. No Coolify, crie um recurso **Docker Compose** a partir do repositório, branch `master`, arquivo `docker/compose.prod.yml`.
2. Preencha as variáveis das tabelas abaixo. As obrigatórias são `POSTGRES_PASSWORD`, `JWT_SECRET` e `WEB_URL`.
3. Configure no Coolify o domínio do `web` (porta 3000) e, para a extensão, o da `api` (porta 3333).
4. Faça o deploy. A `api` só fica saudável depois das migrations; o `web` espera por ela.
5. Crie o primeiro admin e o catálogo inicial, no terminal do container `api` (ou com `docker compose exec api`):

   ```sh
   SEED_ADMIN_PASSWORD='uma-senha-forte' node dist/seed-admin.js --email voce@ufc.br --name "Seu Nome"
   node dist/seed-catalog.js
   ```

   Sem `SEED_ADMIN_PASSWORD`, a senha é gerada e mostrada uma vez. O `seed-catalog` leva os 6 cursos e as 9 ECs do antigo `courses.ts` pelo pipeline de importação; é idempotente.

6. Entre com o admin. Na primeira vez, o web pede o aceite dos Termos e da Política (o seed não grava aceite).
7. Em `/admin/semestres`, cadastre e marque o semestre vigente e dispare a primeira coleta de turmas. Depois disso, o job de 6 horas mantém as turmas em dia.
8. Gere a extensão com os endereços públicos (abaixo) e publique o pacote.

## Variáveis

### `postgres`

| Variável            | Obrigatória | Padrão    | Para quê          |
| ------------------- | ----------- | --------- | ----------------- |
| `POSTGRES_PASSWORD` | sim         | —         | Senha do banco.   |
| `POSTGRES_USER`     | não         | `ufcflow` | Usuário do banco. |
| `POSTGRES_DB`       | não         | `ufcflow` | Nome do banco.    |

### `api`

O compose monta `DATABASE_URL` a partir das variáveis do `postgres` e fixa `NODE_ENV=production`. As demais vêm do `apps/api/src/config/env.ts`; variável vazia vale como ausente.

| Variável                                                            | Obrigatória | Padrão no compose | Para quê                                                                                                                                                            |
| ------------------------------------------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                                        | sim         | —                 | Assina os tokens de acesso. 32+ caracteres (`openssl rand -base64 48`). Trocar invalida os tokens de acesso em uso; as sessões renovam sozinhas pelo refresh token. |
| `WEB_URL`                                                           | sim         | —                 | Endereço público do web; base dos links de redefinição de senha.                                                                                                    |
| `TRUST_PROXY_HOPS`                                                  | não         | `1`               | Proxies à frente da API. Um só: o Traefik do Coolify, ou o próprio web pela rede interna. Com um CDN na frente, some mais um.                                       |
| `SWAGGER_ENABLED`                                                   | não         | `false`           | Swagger em `/docs`. Ligado em produção, exige `SWAGGER_USER` e `SWAGGER_PASSWORD`.                                                                                  |
| `SWAGGER_USER`, `SWAGGER_PASSWORD`                                  | não         | —                 | Autenticação básica do Swagger.                                                                                                                                     |
| `SIGAA_SYNC_ENABLED`                                                | não         | `true`            | Leitura semanal da lista pública de cursos do SIGAA.                                                                                                                |
| `CLASSES_SYNC_ENABLED`                                              | não         | `true`            | Coleta de turmas a cada 6 horas.                                                                                                                                    |
| `CLASSES_SYNC_PAUSE_MS`                                             | não         | `5000`            | Pausa entre cursos na coleta.                                                                                                                                       |
| `FORUM_RATE_BURST`, `FORUM_RATE_BURST_SECONDS`, `FORUM_RATE_HOURLY` | não         | `1`, `10`, `30`   | Limite de envio no fórum.                                                                                                                                           |
| `EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL`                            | não         | `false`           | Avaliar exige e-mail `@alu.ufc.br` (desligado até haver SMTP).                                                                                                      |

A imagem já define `PORT=3333`, `UPLOADS_DIR=/data/uploads` e `MIGRATIONS_DIR=/app/drizzle`.

### `web`

| Variável                                                   | Quando   | Para quê                                                                                        |
| ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `API_URL`                                                  | execução | Fixado no compose em `http://api:3333`. Sem ele, o catálogo fica vazio.                         |
| `PRIVACY_CONTACT_EMAIL`                                    | execução | E-mail de contato da Política de privacidade. Sem ele, a política orienta a falar com um admin. |
| `NEXT_PUBLIC_CURRENT_YEAR`, `NEXT_PUBLIC_CURRENT_SEMESTER` | build    | Semestre usado só quando a API ainda não tem semestre vigente marcado.                          |
| `NEXT_PUBLIC_SITE_URL`                                     | build    | Repassado ao build, como antes.                                                                 |

### Extensão

A extensão não roda no Coolify: é gerada na máquina de quem publica. Antes do `pnpm --filter @ufc-flow/extension build`, ajuste `apps/extension/.env.production` com os endereços públicos:

| Variável                     | Para quê                                                          |
| ---------------------------- | ----------------------------------------------------------------- |
| `PLASMO_PUBLIC_FLOW_API_URL` | Endereço público da API; entra também no `host_permissions`.      |
| `PLASMO_PUBLIC_FLOW_WEB_URL` | Endereço público do web (links para criar conta e abrir a grade). |

## Atualizar

Cada deploy reconstrói as imagens. A `api` aplica as migrations novas antes de subir, e os volumes guardam o banco e os uploads entre versões. Para voltar uma versão, faça o deploy da tag anterior. Migrations não têm volta automática: confira as do PR antes de mesclar.

## Conferir localmente

Com o Docker, a mesma pilha sobe na máquina. Crie um arquivo de variáveis fora do repositório (ou `docker/.env.prod`, ignorado pelo git) com pelo menos `POSTGRES_PASSWORD`, `JWT_SECRET` e `WEB_URL`. Para abrir no navegador, publique as portas com um arquivo extra, também fora do repositório:

```yaml
# portas.yml
services:
  api:
    ports: ['3433:3333']
  web:
    ports: ['3100:3000']
```

```sh
docker compose -f docker/compose.prod.yml -f portas.yml --env-file docker/.env.prod up -d --build
docker compose -f docker/compose.prod.yml exec api node dist/seed-admin.js --email admin@exemplo.org --name "Admin"
docker compose -f docker/compose.prod.yml exec api node dist/seed-catalog.js
```

## Observações

- **Vercel Analytics:** o componente só entra quando o web roda na Vercel (`VERCEL` definido). No Coolify, o script não existe.
- **Previews da Vercel:** sem `API_URL`, o catálogo dos previews fica vazio. Para ver a grade num preview, configure ali um `API_URL` acessível.
- **Logs:** `docker compose logs api` e `docker compose logs web`, ou pelo próprio Coolify. Falhas de coleta do SIGAA também viram aviso `SCRAPE_FAILED` para os admins.
