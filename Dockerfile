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

# NEXT_PUBLIC_* vars are inlined into the client bundle, so they need
# their real values even at build time. Everything else below is
# server-only and gets its real value at container runtime instead
# (supplied by the VPS's env file, not here) — these are placeholders
# needed only because `next build` evaluates every module's top-level
# code while collecting page data (e.g. src/lib/storage.ts constructs a
# Supabase client at module scope), so a handful of files throw at build
# time if their env var is completely undefined, even though nothing
# during the build ever actually calls out to these services.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV SUPABASE_SERVICE_ROLE_KEY="build-placeholder"
ENV ANTHROPIC_API_KEY="build-placeholder"
ENV KIE_AI_API_KEY="build-placeholder"
ENV RESEND_API_KEY="build-placeholder"
ENV CRON_SECRET="build-placeholder"
ENV APP_URL="http://localhost:3000"

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
