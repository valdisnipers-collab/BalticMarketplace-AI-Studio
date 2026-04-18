# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Server runs as TypeScript — compiled frontend served as static files from dist/
# tsconfig has noEmit:true and build script is Vite-only, so tsx is required at runtime
RUN npm install -g tsx@4.21.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["tsx", "server.ts"]
