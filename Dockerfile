# API Avatar Torremolinos — imagen para Railway/Render (monorepo)
FROM node:20-alpine

WORKDIR /app

# Dependencias (raíz + api + packages compartidos)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN npm ci

# Código de la API y Prisma
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

# Railway/Render exponen PORT; migraciones al arranque
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
