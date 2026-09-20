# Multi-stage build for the production Next.js server, deployed
# alongside this VPS's other services (n8n, onlineviewing.co.uk) behind
# the existing Traefik reverse proxy — see docs/BACKEND_ARCHITECTURE.md.
#
# Prisma 7 here uses the driver-adapter client (@prisma/adapter-pg), not
# the binary query engine, so there's no musl/Alpine native-binary
# concern to work around.

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time —
# everything else the app needs is server-only and only required at
# runtime (supplied via the container's env file, not here). DATABASE_URL
# is a placeholder: `prisma generate` only reads the schema, it never
# connects to a real database.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
