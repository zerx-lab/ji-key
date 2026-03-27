import React from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers.js'
import config from '@/payload.config'
import { BookOpen, Clock, ChevronRight, Layers, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Article } from '@/payload-types'
import { BooksPageClient } from './BooksPageClient'

export const metadata = {
  title: '书库 · Ji-Key',
  description: '从经典文学中选择一本书，开始你的打字练习之旅。',
}

const CATEGORY_LABELS: Record<string, string> = {
  fiction: '小说',
  prose: '散文',
  poetry: '诗歌',
  tech: '技术',
  philosophy: '哲学',
  history: '历史',
  other: '其他',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  medium: '中等',
  advanced: '进阶',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-[var(--color-accent)] bg-[var(--color-accent-light)]',
  medium: 'text-amber-700 bg-amber-50',
  advanced: 'text-rose-700 bg-rose-50',
}

const LANG_LABELS: Record<string, string> = {
  zh: '中文',
  en: 'English',
  mixed: '中英',
}

function estimateReadTime(totalChars: number): string {
  const minutes = Math.ceil(totalChars / 200)
  if (minutes < 60) return `约 ${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `约 ${h} 小时 ${m} 分钟` : `约 ${h} 小时`
}

export default async function BooksPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { user } = await payload.auth({ headers })
  const isAdmin = user && (user as { role?: string }).role === 'admin'

  const { docs: articles } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    user: user ?? undefined,
    limit: 100,
    sort: '-featured,-createdAt',
  })

  const featured = articles.filter((a) => a.featured)
  const rest = articles.filter((a) => !a.featured)

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 flex flex-col gap-8">
      {/* ── 页头 ── */}
      <div className="flex items-center justify-between fade-in-up">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[var(--color-accent)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">书库</h1>
          </div>
          <p className="text-sm text-[var(--color-text-dim)]">
            选择一本书，从任意章节开始练习。
            {articles.length > 0 && (
              <span className="text-[var(--color-text-muted)] ml-1">共 {articles.length} 本</span>
            )}
          </p>
        </div>

        {/* 仅 admin 显示导入按钮（客户端组件负责弹窗） */}
        {isAdmin && <BooksPageClient />}
      </div>

      {articles.length === 0 ? (
        /* ── 空状态 ── */
        <div
          className={cn(
            'flex flex-col items-center gap-5 py-24 rounded-[var(--radius-lg)]',
            'border border-dashed border-[var(--color-border)]',
            'bg-[var(--color-surface)]',
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]">
            <BookOpen size={22} className="text-[var(--color-text-muted)]" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-[var(--color-text-dim)]">书库暂无内容</p>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">
              {isAdmin
                ? '点击右上角「导入书籍」按钮，上传 .epub / .txt / .md 文件即可快速添加。'
                : '管理员尚未添加任何书籍，请稍后再来。'}
            </p>
          </div>
          {isAdmin && <BooksPageClient emptyState />}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* ── 推荐精选 ── */}
          {featured.length > 0 && (
            <section className="flex flex-col gap-4 fade-in-up">
              <SectionHeader label="推荐精选" accent />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((article) => (
                  <BookCard key={article.id} article={article as Article} featured />
                ))}
              </div>
            </section>
          )}

          {/* ── 全部书目 ── */}
          {rest.length > 0 && (
            <section className="flex flex-col gap-4 fade-in-up">
              {featured.length > 0 && <SectionHeader label="全部书目" />}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((article) => (
                  <BookCard key={article.id} article={article as Article} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Section 标题 ─── */
function SectionHeader({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'w-1 h-4 rounded-full',
          accent ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-hover)]',
        )}
        aria-hidden
      />
      <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider select-none">
        {label}
      </h2>
    </div>
  )
}

/* ─── 书籍卡片 ─── */
function BookCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const chapterCount = article.chapters?.length ?? 0
  const totalChars = article.totalChars ?? 0
  const difficulty = article.difficulty ?? 'medium'
  const lang = article.language ?? 'zh'
  const category = article.category ?? 'other'

  const href = `/practice/${article.id}/0`

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-[var(--radius-lg)] border bg-[var(--color-surface)]',
        'transition-all duration-200',
        'hover:border-[var(--color-border-hover)] hover:shadow-md hover:shadow-black/5',
        'hover:-translate-y-0.5',
        featured ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-border)]',
      )}
    >
      {/* 顶部色条 */}
      <div
        className={cn(
          'h-1.5 rounded-t-[var(--radius-lg)]',
          featured ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]',
        )}
      />

      {/* 内容区 */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* 标签行 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide select-none',
              DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.medium,
            )}
          >
            {DIFFICULTY_LABELS[difficulty] ?? difficulty}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)] select-none">
            {CATEGORY_LABELS[category] ?? category}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)] select-none">
            {LANG_LABELS[lang] ?? lang}
          </span>
        </div>

        {/* 书名 + 作者 */}
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-[var(--color-text)] leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors duration-150">
            {article.title}
          </h3>
          {article.author && (
            <p className="text-xs text-[var(--color-text-muted)]">{article.author}</p>
          )}
        </div>

        {/* 简介 */}
        {article.description && (
          <p className="text-xs text-[var(--color-text-dim)] leading-relaxed line-clamp-3 flex-1">
            {article.description}
          </p>
        )}

        {/* 底部元信息 */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] mt-auto">
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Layers size={11} />
              {chapterCount} 章节
            </span>
            {totalChars > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {estimateReadTime(totalChars)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              'text-[var(--color-accent)] opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150 select-none',
            )}
          >
            开始
            <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}
