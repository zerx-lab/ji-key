import React from 'react'
import type { Metadata } from 'next'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import config from '@payload-config'
import { History, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TypingSession, Article } from '@/payload-types'

export const metadata: Metadata = {
  title: '历史记录 · Ji-Key',
}

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${mins}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h > 0) return `${h}h ${rem}m`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [sessionsResult, totalResult, weekResult] = await Promise.all([
    payload.find({
      collection: 'typing-sessions',
      overrideAccess: false,
      user,
      where: { user: { equals: user.id } },
      limit: PAGE_SIZE,
      page,
      sort: '-createdAt',
      depth: 1,
    }),
    payload.find({
      collection: 'typing-sessions',
      overrideAccess: false,
      user,
      where: { user: { equals: user.id } },
      limit: 0,
    }),
    payload.find({
      collection: 'typing-sessions',
      overrideAccess: false,
      user,
      where: {
        and: [
          { user: { equals: user.id } },
          { createdAt: { greater_than: weekAgo.toISOString() } },
        ],
      },
      limit: 0,
    }),
  ])

  const sessions = sessionsResult.docs as TypingSession[]
  const totalDocs = totalResult.totalDocs
  const weekDocs = weekResult.totalDocs
  const totalPages = sessionsResult.totalPages

  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalDocs)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-8">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4 slide-up">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <History size={20} className="text-[var(--color-accent)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">历史记录</h1>
          </div>
          <p className="text-sm text-[var(--color-text-dim)]">
            全部{' '}
            <span className="text-[var(--color-text)] font-medium tabular-nums">{totalDocs}</span>{' '}
            次 · 本周{' '}
            <span className="text-[var(--color-text)] font-medium tabular-nums">{weekDocs}</span> 次
          </p>
        </div>
        <Link
          href="/stats"
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-[var(--radius-md)]',
            'text-sm font-medium select-none',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-colors duration-150',
          )}
        >
          查看统计
        </Link>
      </div>

      {/* 空状态 */}
      {sessions.length === 0 && (
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)]',
            'p-12 flex flex-col items-center gap-4 text-center fade-in',
          )}
        >
          <Clock size={32} className="text-[var(--color-text-muted)]" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--color-text-dim)]">还没有练习记录</p>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">
              完成打字练习后，你的成绩将自动保存在这里。
            </p>
          </div>
          <Link
            href="/books"
            className={cn(
              'mt-1 px-4 py-2 rounded-[var(--radius-md)]',
              'text-sm font-medium select-none',
              'bg-[var(--color-accent)] text-white',
              'hover:opacity-90 transition-opacity duration-150',
            )}
          >
            去练习
          </Link>
        </div>
      )}

      {/* 记录列表 */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-6 fade-in">
          <div
            className={cn(
              'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
              'bg-[var(--color-surface)] overflow-hidden',
            )}
          >
            {sessions.map((s, idx) => {
              const articleTitle =
                typeof s.article === 'object' && s.article !== null
                  ? (s.article as Article).title
                  : '未知文章'
              const articleId =
                typeof s.article === 'object' && s.article !== null
                  ? (s.article as Article).id
                  : typeof s.article === 'number'
                    ? s.article
                    : 0
              const chapterTitle = s.chapterTitle ?? `第 ${s.chapterIndex + 1} 章`
              const isLast = idx === sessions.length - 1

              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    'hover:bg-[var(--color-surface-2)] transition-colors duration-100',
                    !isLast && 'border-b border-[var(--color-border)]',
                  )}
                >
                  {/* WPM */}
                  <div className="w-14 shrink-0 flex flex-col items-center">
                    <span
                      className={cn(
                        'font-mono font-bold tabular-nums text-xl leading-tight',
                        'text-[var(--color-accent)]',
                      )}
                    >
                      {s.wpm}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider select-none">
                      wpm
                    </span>
                  </div>

                  {/* 文章 + 章节 */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <Link
                      href={`/books/${articleId}`}
                      className={cn(
                        'text-sm font-medium truncate',
                        'text-[var(--color-text)]',
                        'hover:text-[var(--color-accent)] transition-colors duration-100',
                      )}
                    >
                      {articleTitle}
                    </Link>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[var(--color-text-muted)] truncate">
                        {chapterTitle}
                      </span>
                      {s.completed && (
                        <CheckCircle2
                          size={11}
                          className="shrink-0 text-[var(--color-accent)] opacity-80"
                        />
                      )}
                    </div>
                  </div>

                  {/* 准确率 + 用时 */}
                  <div className="shrink-0 flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-sm tabular-nums text-[var(--color-text-dim)]">
                        {s.accuracy}%
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] select-none sm:hidden">
                        准确率
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                        {formatDuration(s.duration)}
                      </span>
                    </div>
                  </div>

                  {/* 日期（中等屏幕以上显示） */}
                  <div className="hidden md:block w-32 shrink-0 text-right">
                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>

                  {/* 再练按钮 */}
                  <Link
                    href={`/practice/${articleId}/${s.chapterIndex}`}
                    className={cn(
                      'shrink-0 px-2.5 py-1 rounded-[var(--radius-md)]',
                      'text-xs font-medium select-none',
                      'border border-[var(--color-border)] bg-[var(--color-surface)]',
                      'text-[var(--color-text-muted)]',
                      'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                      'transition-colors duration-150',
                    )}
                  >
                    再练
                  </Link>
                </div>
              )
            })}
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 ? (
                <Link
                  href={`/history?page=${page - 1}`}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium select-none',
                    'border border-[var(--color-border)] bg-[var(--color-surface)]',
                    'text-[var(--color-text-dim)]',
                    'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                    'transition-colors duration-150',
                  )}
                >
                  <ChevronLeft size={14} />
                  上一页
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium select-none',
                    'border border-[var(--color-border)] bg-[var(--color-surface)]',
                    'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed',
                  )}
                >
                  <ChevronLeft size={14} />
                  上一页
                </span>
              )}

              <span className="text-sm text-[var(--color-text-dim)] tabular-nums select-none">
                第 <span className="font-medium text-[var(--color-text)]">{page}</span> /{' '}
                <span className="font-medium text-[var(--color-text)]">{totalPages}</span> 页
              </span>

              {page < totalPages ? (
                <Link
                  href={`/history?page=${page + 1}`}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium select-none',
                    'border border-[var(--color-border)] bg-[var(--color-surface)]',
                    'text-[var(--color-text-dim)]',
                    'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                    'transition-colors duration-150',
                  )}
                >
                  下一页
                  <ChevronRight size={14} />
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium select-none',
                    'border border-[var(--color-border)] bg-[var(--color-surface)]',
                    'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed',
                  )}
                >
                  下一页
                  <ChevronRight size={14} />
                </span>
              )}
            </div>
          )}

          {/* 总条数说明 */}
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            显示第 <span className="tabular-nums">{rangeStart}</span> –{' '}
            <span className="tabular-nums">{rangeEnd}</span> 条，共{' '}
            <span className="tabular-nums">{totalDocs}</span> 条记录
          </p>
        </div>
      )}
    </div>
  )
}
