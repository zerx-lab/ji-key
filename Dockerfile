# SQLite + Next.js standalone 生产镜像
# 依赖 next.config.ts 中 output: 'standalone'

FROM node:22-alpine AS base

# ── 安装阶段 ──────────────────────────────────────────────
FROM base AS deps
# libc6-compat: alpine 兼容性
# python3 make g++: better-sqlite3 原生模块编译所需
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json bun.lock* pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# ── 构建阶段 ──────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时使用临时数据库，避免找不到文件报错
ENV DATABASE_URL=file:/tmp/build.db
ENV PAYLOAD_SECRET=build-time-secret-placeholder
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build

# ── 运行阶段 ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建 SQLite 数据目录和媒体目录，赋予 nextjs 用户写权限
RUN mkdir -p /app/data /app/public/media && chown -R nextjs:nodejs /app/data /app/public/media

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 运行时 DATABASE_URL 由环境变量注入（docker-compose / Coolify）
CMD ["node", "server.js"]
