FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
ENV DATABASE_URL=postgresql://tempest_light:tempest_light@postgres:5432/tempest_light?schema=public
RUN pnpm --filter @tempest-light/api db:generate
RUN pnpm --filter @tempest-light/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/api ./backend/api
EXPOSE 4000
CMD ["pnpm", "--filter", "@tempest-light/api", "start"]
