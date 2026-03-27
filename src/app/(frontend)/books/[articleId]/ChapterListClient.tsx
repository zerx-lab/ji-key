'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, CheckCircle2, ChevronRight, BookOpen, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChapterItem {
  index: number
  title: string
  completed: boolean
  isLast: boolean
}

interface ChapterListClientProps {
  articleId: string
  chapters: ChapterItem[]
  isLoggedIn: boolean
}

export function ChapterListClient({ articleId, chapters, isLoggedIn }: ChapterListClientProps) {
  const [query, setQuery] = useState('')
  const [jumpInput, setJumpInput] = useState('')
  const [jumpError, setJumpError] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lastRef = useRef<HTMLAnchorElement>(null)
  const jumpInputRef = useRef<HTMLInputElement>(null)

  // 过滤章节（支持标题关键词 + 章节号）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        String(c.index + 1).includes(q),
    )
  }, [query, chapters])

  // 页面加载后滚动到上次章节
  useEffect(() => {
    if (lastRef.current && !query) {
      setTimeout(() => {
        lastRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 300)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 快速跳转到指定章节号
  function handleJump(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(jumpInput, 10)
    if (!jumpInput || isNaN(num) || num < 1 || num > chapters.length) {
      setJumpError(true)
      setTimeout(() => setJumpError(false), 1000)
      return
    }
    const targetIndex = num - 1
    // 在列表中找到对应行并滚动
    const el = listRef.current?.querySelector(`[data-chapter-index="${targetIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      ;(el as HTMLElement).focus()
    }
    setJumpInput('')
  }

  return (
    <div className="flex flex-col gap-3 fade-in-up">
      {/* ── 标题行 ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[var(--color-accent)]" aria-hidden />
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider select-none">
            章节列表
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            共 {chapters.length} 章
            {filtered.length !== chapters.length && (
              <span className="ml-1 text-[var(--color-accent)]">· 筛选出 {filtered.length} 章</span>
            )}
          </span>
        </div>

        {/* 右侧：搜索框 + 跳转框 */}
        <div className="flex items-center gap-2">
          {/* 关键词搜索 */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索章节…"
              className={cn(
                'pl-7 pr-3 py-1.5 text-xs rounded-[var(--radius-md)]',
                'border border-[var(--color-border)] bg-[var(--color-surface)]',
                'text-[var(--color-text-dim)] placeholder:text-[var(--color-text-muted)]',
                'focus:outline-none focus:border-[var(--color-accent)]',
                'transition-colors duration-150 w-36',
              )}
            />
          </div>

          {/* 章节号跳转 */}
          <form onSubmit={handleJump} className="flex items-center gap-1">
            <div className="relative">
              <Hash
                size={11}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                ref={jumpInputRef}
                type="number"
                min={1}
                max={chapters.length}
                value={jumpInput}
                onChange={(e) => {
                  setJumpInput(e.target.value)
                  setJumpError(false)
                }}
                placeholder={`1–${chapters.length}`}
                className={cn(
                  'pl-6 pr-2 py-1.5 text-xs rounded-[var(--radius-md)]',
                  'border bg-[var(--color-surface)]',
                  'text-[var(--color-text-dim)] placeholder:text-[var(--color-text-muted)]',
                  'focus:outline-none transition-colors duration-150 w-24',
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
                  jumpError
                    ? 'border-[var(--color-error)] text-[var(--color-error)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]',
                )}
              />
            </div>
            <button
              type="submit"
              className={cn(
                'px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium',
                'border border-[var(--color-border)] bg-[var(--color-surface)]',
                'text-[var(--color-text-dim)]',
                'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                'transition-all duration-150 select-none',
              )}
            >
              跳转
            </button>
          </form>
        </div>
      </div>

      {/* ── 章节列表主体 ── */}
      {chapters.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center gap-3 py-16 rounded-[var(--radius-lg)]',
            'border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]',
          )}
        >
          <BookOpen size={20} className="text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">该书暂无章节内容</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center gap-2 py-12 rounded-[var(--radius-lg)]',
            'border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]',
          )}
        >
          <Search size={18} className="text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">没有匹配的章节</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            清除搜索
          </button>
        </div>
      ) : (
        <div
          ref={listRef}
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
            'bg-[var(--color-surface)] overflow-hidden',
          )}
        >
          {filtered.map((chapter, i) => {
            const isLast = chapter.isLast && !query
            return (
              <Link
                key={chapter.index}
                ref={isLast ? lastRef : undefined}
                href={`/practice/${articleId}/${chapter.index}`}
                data-chapter-index={chapter.index}
                className={cn(
                  'group flex items-center gap-4 px-5 py-3.5',
                  'transition-colors duration-100 focus:outline-none',
                  'hover:bg-[var(--color-surface-2)] focus-visible:bg-[var(--color-surface-2)]',
                  i < filtered.length - 1 && 'border-b border-[var(--color-border)]',
                  isLast && 'bg-[var(--color-accent-light)]',
                )}
              >
                {/* 章节序号 */}
                <span
                  className={cn(
                    'shrink-0 w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)]',
                    'text-xs font-mono font-medium tabular-nums transition-colors duration-100',
                    chapter.completed && isLoggedIn
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                      : isLast
                        ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
                  )}
                >
                  {chapter.index + 1}
                </span>

                {/* 章节标题 */}
                <span
                  className={cn(
                    'flex-1 text-sm leading-snug line-clamp-1 transition-colors duration-100',
                    isLast
                      ? 'text-[var(--color-accent)] font-medium'
                      : chapter.completed && isLoggedIn
                        ? 'text-[var(--color-text-dim)]'
                        : 'text-[var(--color-text-dim)]',
                    'group-hover:text-[var(--color-text)]',
                  )}
                >
                  {chapter.title}
                </span>

                {/* 右侧状态 */}
                <span className="shrink-0 flex items-center gap-1.5">
                  {/* 上次阅读标记 */}
                  {isLast && (
                    <span className="text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] px-1.5 py-0.5 rounded-full select-none">
                      上次
                    </span>
                  )}
                  {/* 已完成标记（仅登录用户） */}
                  {chapter.completed && isLoggedIn && (
                    <CheckCircle2
                      size={14}
                      className="text-[var(--color-accent)] opacity-70"
                    />
                  )}
                  {/* 箭头 */}
                  <ChevronRight
                    size={14}
                    className={cn(
                      'transition-colors duration-100',
                      isLast
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-border-hover)] group-hover:text-[var(--color-accent)]',
                    )}
                  />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
