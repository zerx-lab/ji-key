# SQLite + Next.js standalone 生产镜像
# 依赖 next.config.ts 中 output: 'standalone'

FROM oven/bun:1-alpine AS base

# ── 安装阶段 ──────────────────────────────────────────────
FROM base AS deps
# libc6-compat: alpine 兼容性
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── 构建阶段 ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 声明 Coolify 通过 --build-arg 传入的参数
ARG PAYLOAD_SECRET
ARG PORT=4567

# 构建时使用临时数据库，避免找不到文件报错
ENV DATABASE_URL=file:/tmp/build.db
# 优先使用 build-arg 传入的 secret，回退到占位符
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET:-build-time-secret-placeholder}
ENV PORT=${PORT}
ENV NEXT_TELEMETRY_DISABLED=1
# 降低内存上限，适应生产服务器
ENV NODE_OPTIONS="--no-deprecation --max-old-space-size=4096"

RUN ./node_modules/.bin/next build 2>&1

# ── 运行阶段 ──────────────────────────────────────────────
FROM node:22-alpine AS runner
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

# 复制 @libsql 原生模块（standalone 模式不会自动打包 .node 文件）
# alpine 使用 musl libc，需要 linux-x64-musl 版本
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql

USER nextjs

ARG PORT=4567
ENV PORT=${PORT}
ENV HOSTNAME=0.0.0.0

EXPOSE ${PORT}

# 运行时 DATABASE_URL / PAYLOAD_SECRET 由环境变量注入（docker-compose / Coolify）
CMD ["node", "server.js"]
