# Se construye desde la raíz del monorepo (un solo pnpm-lock.yaml): docker compose lo hace con `context: .`
FROM node:24-bookworm-slim

# corepack no instala pnpm 12 (ver CONTEXTO.md §9).
RUN npm install -g pnpm@12.6.0

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
COPY frontend frontend

RUN pnpm install --frozen-lockfile --filter frontend

# Next fija las variables NEXT_PUBLIC_* al compilar: por eso son build args y no variables de entorno.
# La URL es la que usa el navegador del usuario, no la red interna de Docker.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_USE_MOCKS=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter frontend build

WORKDIR /app/frontend
EXPOSE 3000
CMD ["pnpm", "start", "--port", "3000"]
