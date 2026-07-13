# Etapa 1: Instalação de dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instala pnpm globalmente
RUN npm install -g pnpm

# Copia arquivos de definição de pacotes
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Etapa 2: Construção da aplicação
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desativa o envio de telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Etapa 3: Execução
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Configura o Next.js para escutar em todas as interfaces de rede
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["pnpm", "start"]
