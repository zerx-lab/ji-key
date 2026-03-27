import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { headers as getHeaders } from 'next/headers.js'
import config from '@/payload.config'
import type { Article, TypingSession } from '@/payload-types'
import {
  BookOpen,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  User,
  Play,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChapterListClient } from './ChapterListClient'

interface Props {
  params: Promise<{ articleId: string }>
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

export async function generateMetadata({ params }: Props) {
  const { articleId } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const article = await payload
    .findByID({ collection: 'articles', id: Number(articleId), overrideAccess: true })
    .catch(() => null)

  if (!article) return { title: 'Ji-Key' }
  return { title: `${article.title} · Ji-Key` }
}

export default async function BookDetailPage({ params }: Props) {
  const { articleId } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const article = await payload
    .findByID({
      collection: 'articles',
      id: Number(articleId),
      overrideAccess: false,
      user: user ?? undefined,
    })
    .catch(() => null)

  if (!article) notFound()

  const typedArticle = article as Article
  const chapters = typedArticle.chapters ?? []
  const totalChars = typedArticle.totalChars ?? 0
  const difficulty = typedArticle.difficulty ?? 'medium'
  const lang = typedArticle.language ?? 'zh'
  const category = typedArticle.category ?? 'other'

  // ── 查询用户进度（仅登录用户）──
  // completedSet: 已完成的章节 index 集合
  // lastChapterIndex: 最近练习的章节 index
  let completedSet = new Set<number>()
  let lastChapterIndex: number | null = null

  if (user) {
    const { docs: sessions } = await payload.find({
      collection: 'typing-sessions',
      where: {
        and: [{ user: { equals: user.id } }, { article: { equals: Number(articleId) } }],
      },
      sort: '-createdAt',
      limit: 500,
      overrideAccess: false,
      user,
    })

    for (const s of sessions as TypingSession[]) {
      const idx = s.chapterIndex
      if (typeof idx === 'number') {
        // 最近记录（已按 -createdAt 排序，第一条即最新）
        if (lastChapterIndex === null) lastChapterIndex = idx
        if (s.completed) completedSet.add(idx)
      }
    }
  }

  // 计算下一章：最后练习章节的下一章（未超出范围）
  const nextChapterIndex =
    lastChapterIndex !== null && lastChapterIndex + 1 < chapters.length
      ? lastChapterIndex + 1
      : lastChapterIndex

  const completedCount = completedSet.size
  const progressPercent =
    chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
      {/* ── 返回书库 ── */}
      <Link
        href="/books"
        className={cn(
          'flex items-center gap-1.5 w-fit text-xs font-medium',
          'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]',
          'transition-colors duration-150 select-none fade-in',
        )}
      >
        <ChevronLeft size={14} />
        返回书库
      </Link>

      {/* ── 书籍信息卡片 ── */}
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] overflow-hidden fade-in-up',
        )}
      >
        <div className="h-1.5 bg-[var(--color-accent)]" />

        <div className="p-6 flex flex-col gap-4">
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
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-[var(--color-text)] leading-snug">
              {typedArticle.title}
            </h1>
            {typedArticle.author && (
              <p className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                <User size={12} />
                {typedArticle.author}
              </p>
            )}
          </div>

          {/* 简介 */}
          {typedArticle.description && (
            <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
              {typedArticle.description}
            </p>
          )}

          {/* 元信息 + 进度 */}
          <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {chapters.length} 个章节
              </span>
              {totalChars > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {estimateReadTime(totalChars)}
                </span>
              )}
              {user && completedCount > 0 && (
                <span className="flex items-center gap-1 text-[var(--color-accent)]">
                  <CheckCircle2 size={12} />
                  已完成 {completedCount} / {chapters.length} 章
                </span>
              )}
            </div>

            {/* 进度条（仅登录用户且有进度时显示） */}
            {user && completedCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums w-8 text-right">
                  {progressPercent}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 继续阅读 / 开始阅读 按钮 ── */}
        <div className="px-6 pb-6">
          {user && lastChapterIndex !== null ? (
            // 登录且有进度：显示"继续"
            <div className="flex items-center gap-3">
              <Link
                href={`/practice/${articleId}/${nextChapterIndex}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)]',
                  'text-sm font-semibold bg-[var(--color-accent)] text-white',
                  'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
                )}
              >
                <Play size={13} />
                继续练习 · 第 {(nextChapterIndex ?? 0) + 1} 章
              </Link>
              <span className="text-xs text-[var(--color-text-muted)]">
                上次练习到第 {lastChapterIndex + 1} 章
              </span>
            </div>
          ) : (
            // 未登录或无进度：从头开始
            <Link
              href={`/practice/${articleId}/0`}
              className={cn(
                'flex items-center gap-2 w-fit px-4 py-2 rounded-[var(--radius-md)]',
                'text-sm font-semibold bg-[var(--color-accent)] text-white',
                'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
              )}
            >
              <Play size={13} />
              {user ? '从第一章开始' : '开始练习'}
            </Link>
          )}
        </div>
      </div>

      {/* ── 章节列表（客户端组件：含搜索/跳转） ── */}
      <ChapterListClient
        articleId={articleId}
        chapters={chapters.map((c, i) => ({
          index: i,
          title: c.chapterTitle || `第 ${i + 1} 章`,
          completed: completedSet.has(i),
          isLast: lastChapterIndex === i,
        }))}
        isLoggedIn={Boolean(user)}
      />
    </div>
  )
}
