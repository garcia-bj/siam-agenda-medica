# Se construye desde la raíz del monorepo (un solo pnpm-lock.yaml): docker compose lo hace con `context: .`
# Debian slim y no Alpine: better-sqlite3 trae binarios precompilados para glibc.
FROM node:24-bookworm-slim

# Prisma busca OpenSSL al instalar y al migrar (sin él avisa en cada arranque).
# corepack no instala pnpm 12 (ver CONTEXTO.md §9).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.6.0

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend backend

# El postinstall del backend genera el cliente de Prisma.
RUN pnpm install --frozen-lockfile --filter backend \
  && pnpm --filter backend build

WORKDIR /app/backend
ENV PORT=3001
EXPOSE 3001
CMD ["sh", "docker-entrypoint.sh"]
