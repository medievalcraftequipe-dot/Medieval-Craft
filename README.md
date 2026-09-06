# Tempest Light

Tempest Light e a base de uma plataforma profissional de comunicacao em tempo real. Esta primeira entrega cria a arquitetura, containers de producao, API, banco, Redis, armazenamento S3 compativel, web app, shell desktop, cadastro, login, sessoes e a primeira interface funcional.

## Stack

- Backend: Node.js, TypeScript, NestJS, Prisma e PostgreSQL.
- Cache/realtime-ready: Redis.
- Web: React, TypeScript e Vite.
- Desktop: Electron reutilizando o app web.
- Storage: MinIO nesta primeira host, preparado para S3, Cloudflare R2 ou outro provedor compativel.
- Proxy/HTTPS: Caddy com certificado automatico.

## Subir na host

Na host/VPS, instale Docker e Docker Compose, envie os arquivos do projeto e configure o DNS:

- `app.seu-dominio.com` apontando para o IP da host.
- `api.seu-dominio.com` apontando para o IP da host.

Depois:

```bash
cp .env.production.example .env.production
```

Edite `.env.production` com seus dominios, senhas fortes e dados SMTP. O `DATABASE_URL` precisa usar a mesma senha definida em `POSTGRES_PASSWORD`. O SMTP e usado para enviar o e-mail de ativacao da conta.

Suba tudo:

```bash
docker compose --env-file .env.production up -d --build
```

Crie as tabelas:

```bash
docker compose --env-file .env.production exec api pnpm --filter @tempest-light/api db:deploy
```

Verifique:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f api
```

O app ficara em `https://app.seu-dominio.com` e a API em `https://api.seu-dominio.com/api/v1`.

## Launcher e instalador

O app desktop possui launcher e instalador Windows via Electron/electron-builder. Quem instala nao precisa de Tauri, Rust nem ferramentas de desenvolvimento; baixa apenas o instalador.

```bash
pnpm build:installer:windows
```

Enquanto o servidor online ainda nao estiver publicado, o launcher abre o programa com conta local neste computador. Para distribuicao por GitHub agora, configure somente a URL do manifest do GitHub Releases quando tiver o repositorio real.

Quando quiser login sincronizado entre varios computadores, envio real de e-mail, chat/voz online e perfis compartilhados, configure a URL da API em `.env.production`. O build tambem gera `INSTALADOR/JSON_PARA_GITHUB/` com os arquivos `.json` para anexar em uma Release publica do GitHub.

## API inicial

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/desktop/updates/publish`
- `GET /api/v1/users/username/:username`

O cadastro cria a conta e envia o e-mail de ativacao. O login so libera acesso depois que a conta for ativada pelo link.

## Desenvolvimento opcional

Existe um compose separado para desenvolvimento local em `docker-compose.dev.yml`. Ele nao e o caminho de producao.

## Proximos modulos

1. Amigos, bloqueios e DMs.
2. Comunidades, membros, canais e cargos.
3. Mensagens persistidas.
4. WebSocket para chat em tempo real, digitando, entrega e presenca.
5. Convites e moderacao.
6. Uploads com verificacao de seguranca.
7. Sinalizacao WebRTC para voz, video e tela.
8. Bots, API publica e painel administrativo completo.

