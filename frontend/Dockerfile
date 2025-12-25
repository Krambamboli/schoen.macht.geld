# syntax=docker/dockerfile:1

# ===== Base stage =====
FROM oven/bun:1 AS base
WORKDIR /app

# ===== Dependencies stage =====
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ===== Build stage =====
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate API client from static OpenAPI spec
RUN bunx @hey-api/openapi-ts -i openapi.json -o src/lib/api/client

RUN bun run build

# ===== Production stage =====
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]