# Implantacao em host

Esta base foi preparada para rodar em uma host/VPS existente usando Docker Compose. O arquivo principal `docker-compose.yml` e de producao.

## Requisitos da host

- Docker Engine.
- Docker Compose plugin.
- Portas `80` e `443` liberadas.
- DNS apontando os dominios para o IP da host.

## DNS

Configure dois registros:

- `app.seu-dominio.com` para o frontend.
- `api.seu-dominio.com` para a API.

Ambos devem apontar para o IP publico da host. O Caddy emite HTTPS automaticamente quando os registros DNS ja estao propagados.

## Variaveis

Crie o arquivo real de producao:

```bash
cp .env.production.example .env.production
```

Preencha:

- `APP_DOMAIN`
- `API_DOMAIN`
- `PUBLIC_WEB_URL`
- `API_BASE_URL`
- `VITE_API_URL`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `MINIO_ROOT_PASSWORD`
- `S3_SECRET_KEY`

Nunca use as senhas de exemplo em producao.

## Deploy

```bash
docker compose --env-file .env.production up -d --build
```

Depois de subir a primeira vez:

```bash
docker compose --env-file .env.production exec api pnpm --filter @tempest-light/api db:deploy
```

## Atualizar codigo

Envie a nova versao dos arquivos para a host e rode:

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec api pnpm --filter @tempest-light/api db:deploy
```

## Logs

```bash
docker compose --env-file .env.production logs -f api
docker compose --env-file .env.production logs -f caddy
```

## Atualizacoes desktop por GitHub Releases

O launcher desktop usa `tempest_light_update.json`, `tempest_light_installer_package.json` e, quando necessario, partes extras `tempest_light_installer_package_part*.json`, iguais ao esquema do painel Medieval. Para update, anexe apenas os JSONs gerados em uma Release publica do GitHub; nao precisa anexar `.exe`, `.yml` ou `.blockmap`.

```bash
pnpm build:installer:windows
```

Arquivos para publicar:

- `INSTALADOR/JSON_PARA_GITHUB/tempest_light_update.json`
- `INSTALADOR/JSON_PARA_GITHUB/tempest_light_installer_package.json`
- `INSTALADOR/JSON_PARA_GITHUB/tempest_light_installer_package_part*.json`
- `INSTALADOR/JSON_PARA_GITHUB/tempest_light_download_info.json`

Depois, em `apps/desktop/electron/config.json`, use a URL publica de `tempest_light_update.json` no formato `https://github.com/SEU_USUARIO/SEU_REPOSITORIO/releases/latest/download/tempest_light_update.json`.

Tambem existe publicacao pelo botao de developer no programa. Para usar esse caminho, envie a API atualizada para a Shard Cloud e configure estas variaveis na aplicacao da API:

```env
TEMPEST_LIGHT_DEVELOPER_EMAILS=rafaeltanki1212@gmail.com
TEMPEST_LIGHT_GITHUB_REPOSITORY=medievalcraftequipe-dot/Medieval-Craft
TEMPEST_LIGHT_RELEASE_WORKFLOW_ID=release.yml
TEMPEST_LIGHT_RELEASE_REF=main
TEMPEST_LIGHT_GITHUB_TOKEN=cole_aqui_o_token_do_GitHub
```

Esse token fica somente no servidor da API e serve para chamar o workflow do GitHub Actions. A Release em si continua sendo criada dentro do GitHub Actions com `permissions: contents: write`.

## Desenvolvimento local

Para testes em maquina de desenvolvimento, use `docker-compose.dev.yml`. Ele e propositalmente separado para nao confundir com deploy real.

