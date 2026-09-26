#!/bin/sh
# Arranque del backend en Docker: migraciones, seed solo si la base es nueva, y la API.
set -e

DB_FILE="${DATABASE_URL#file:}"
FIRST_RUN=0
[ -f "$DB_FILE" ] || FIRST_RUN=1

pnpm exec prisma migrate deploy

# El seed borra y vuelve a cargar las citas: solo corre la primera vez, así los datos persisten al reiniciar.
if [ "$FIRST_RUN" = 1 ]; then
  pnpm exec prisma db seed
fi

exec node dist/main.js
