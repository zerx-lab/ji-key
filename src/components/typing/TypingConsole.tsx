'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, List, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ────────────────────────────────────────────
   把文本按「视觉行」分组（固定字符数 / 行）
   这样可以实现固定 3 行显示 + 整行滚动，
   光标始终在第 1~2 行内，视觉稳定不跳动。

   CHARS_PER_LINE 决定每行字符数，根据容器
   宽度（640px）和字体大小（18px Lora）估算，
   约 55~60 字符 / 行，取 55 作为软换行点。
   实际按单词边界断行，避免单词被截断。

   行间用 \n 连接 —— 用户必须按 Enter 才能
   跨行，Enter 在打字逻辑中匹配 \n 字符。
──────────────────────────────────────────── */
const CHARS_PER_LINE = 55

/**
 * 把单行流文本按软断行分组，行间插入 \n。
 * 返回含 \n 的字符串，打字时 Enter = \n。
 */
function splitIntoLines(text: string): string {
  const lines: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= CHARS_PER_LINE) {
      lines.push(remaining)
      break
    }
    // 在 CHARS_PER_LINE 处向前找最近的空格断行
    let breakAt = CHARS_PER_LINE
    while (breakAt > 0 && remaining[breakAt] !== ' ') {
      breakAt--
    }
    // 找不到空格（长单词），强制在 CHARS_PER_LINE 处断
    if (breakAt === 0) breakAt = CHARS_PER_LINE

    lines.push(remaining.slice(0, breakAt))
    // 跳过断行处的空格，改为 \n 连接
    remaining = remaining.slice(remaining[breakAt] === ' ' ? breakAt + 1 : breakAt)
  }

  return lines.join('\n')
}

/* ────────────────────────────────────────────
   类型定义
──────────────────────────────────────────── */

type CharState = 'pending' | 'correct' | 'error'

interface CharData {
  char: string
  state: CharState
}

interface SessionStats {
  wpm: number
  accuracy: number
  duration: number
  correctChars: number
  errorChars: number
  totalChars: number
}

interface ChapterRef {
  index: number
  title: string
}

interface Props {
  articleId: number
  articleTitle: string
  chapterIndex: number
  totalChapters: number
  chapterTitle: string
  content: string
  allChapters: ChapterRef[]
  user: { id: number; email: string } | null
}

/* ────────────────────────────────────────────
   工具函数
──────────────────────────────────────────── */

function calcWPM(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds < 1) return 0
  return Math.round((correctChars / 5) * (60 / elapsedSeconds))
}

function calcAccuracy(correct: number, errors: number): number {
  const total = correct + errors
  if (total === 0) return 100
  return Math.round((correct / total) * 100)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}s`
}

/* ────────────────────────────────────────────
   主组件
──────────────────────────────────────────── */

export function TypingConsole({
  articleId,
  articleTitle,
  chapterIndex,
  totalChapters,
  chapterTitle,
  content,
  allChapters,
  user,
}: Props) {
  const router = useRouter()

  // content 已在服务端 page.tsx 的 normalizeContent() 中处理过。
  // 这里仅做最后兜底。
  const normalizedContent = content
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // ── 打字状态 ──
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const [saving, setSaving] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const textContainerRef = useRef<HTMLDivElement>(null)

  // ── 把 normalizedContent 按行分组（行间用 \n） ──
  // lineContent 是含 \n 的字符串，用户打字时 Enter 匹配 \n
  const lineContent = useMemo(() => splitIntoLines(normalizedContent), [normalizedContent])
  const lines = useMemo(() => lineContent.split('\n'), [lineContent])

  // ── 字符数组（derived，基于 lineContent） ──
  const chars: CharData[] = useMemo(() => {
    return lineContent.split('').map((char, i) => {
      const typed = input[i]
      let state: CharState = 'pending'
      if (typed !== undefined) {
        state = typed === char ? 'correct' : 'error'
      }
      return { char, state }
    })
  }, [lineContent, input])

  const cursorIndex = Math.min(input.length, lineContent.length)

  // 计算当前光标在第几行（0-based），基于 lineContent
  const currentLineIndex = useMemo(() => {
    let charCount = 0
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length
      if (i < lines.length - 1) charCount += 1 // +1 for \n
      if (cursorIndex <= charCount) return i
    }
    return Math.max(0, lines.length - 1)
  }, [lines, cursorIndex])

  // 显示从 displayStartLine 开始的 3 行
  const displayStartLine = useMemo(() => {
    return Math.max(0, currentLineIndex - 1)
  }, [currentLineIndex])

  // 每行在 lineContent 中的起始偏移
  const lineOffsets = useMemo(() => {
    const offsets: number[] = []
    let offset = 0
    for (let i = 0; i < lines.length; i++) {
      offsets.push(offset)
      offset += lines[i].length + (i < lines.length - 1 ? 1 : 0) // +1 for \n
    }
    return offsets
  }, [lines])

  // ── 实时统计 ──
  const stats = useMemo<SessionStats>(() => {
    const correctChars = chars.filter((c) => c.state === 'correct').length
    const errorChars = chars.filter((c) => c.state === 'error').length
    return {
      wpm: calcWPM(correctChars, elapsed),
      accuracy: calcAccuracy(correctChars, errorChars),
      duration: elapsed,
      correctChars,
      errorChars,
      totalChars: lineContent.length,
    }
  }, [chars, elapsed, normalizedContent.length])

  // ── 进度 ──
  const progress =
    lineContent.length > 0 ? Math.min(100, (input.length / lineContent.length) * 100) : 0

  // ── 计时器 ──
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) return
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 200)
  }, [])

  // ── 重置 ──
  const reset = useCallback(() => {
    stopTimer()
    setInput('')
    setStarted(false)
    setFinished(false)
    setElapsed(0)
    setSaving(false)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [stopTimer])

  // ── content 变化时重置 ──
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  useEffect(() => () => stopTimer(), [stopTimer])

  // ── 保存记录到后端 ──
  const saveSession = useCallback(
    async (finalStats: SessionStats) => {
      if (!user) return
      setSaving(true)
      try {
        await fetch('/api/typing-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user: user.id,
            article: articleId,
            chapterIndex,
            chapterTitle,
            wpm: finalStats.wpm,
            accuracy: finalStats.accuracy,
            duration: finalStats.duration,
            correctChars: finalStats.correctChars,
            errorChars: finalStats.errorChars,
            totalChars: lineContent.length,
            completed: true,
          }),
        })
      } catch {
        // 静默失败，不影响用户体验
      } finally {
        setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, articleId, chapterIndex, chapterTitle],
  )

  // ── 完成检测（useEffect 统一处理） ──
  useEffect(() => {
    if (finished || !started) return
    if (input.length === lineContent.length && input === lineContent) {
      stopTimer()
      setFinished(true)
      const finalElapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
      setElapsed(finalElapsed)
      const correctChars = lineContent.length
      const finalStats: SessionStats = {
        wpm: calcWPM(correctChars, finalElapsed),
        accuracy: 100,
        duration: finalElapsed,
        correctChars,
        errorChars: 0,
        totalChars: lineContent.length,
      }
      saveSession(finalStats)
    }
  }, [input, finished, started, lineContent, stopTimer, saveSession])

  // ── 输入处理 ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (finished) return

      const val = e.target.value
      // 不允许超过文本长度
      if (val.length > lineContent.length) return

      if (!started && val.length > 0) {
        setStarted(true)
        startTimer()
      }

      setInput(val)
    },
    [finished, started, lineContent, startTimer],
  )

  // ── 键盘快捷键 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        reset()
        return
      }
      if (e.key === 'Escape') {
        reset()
        return
      }
      // Enter 键：跳到下一行行首
      // 如果光标不在行尾，用错误字符填充当前行剩余部分，再追加 \n 跳到下一行
      if (e.key === 'Enter') {
        e.preventDefault()
        if (finished) return
        if (!started) {
          setStarted(true)
          startTimer()
        }
        setInput((prev) => {
          const pos = prev.length
          // 找当前行行尾的 \n（在 lineContent 中）
          const nextNl = lineContent.indexOf('\n', pos)
          // 已在最后一行，不做任何事
          if (nextNl === -1) return prev
          // 用空格填充跳过的字符（input[i] !== lineContent[i] → 显示为 error）
          const skipLen = nextNl - pos
          const fill = ' '.repeat(skipLen)
          return prev + fill + '\n'
        })
      }
    },
    [reset, finished, lineContent, started, startTimer],
  )

  // ── 点击文本区域聚焦 ──
  const handleTextClick = useCallback(() => {
    if (!finished) inputRef.current?.focus()
  }, [finished])

  // ── 章节导航 ──
  const prevHref = chapterIndex > 0 ? `/practice/${articleId}/${chapterIndex - 1}` : null
  const nextHref =
    chapterIndex < totalChapters - 1 ? `/practice/${articleId}/${chapterIndex + 1}` : null

  const handleNext = useCallback(() => {
    if (nextHref) router.push(nextHref)
  }, [nextHref, router])

  // ── 自动聚焦 ──
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  // ── 键盘监听（全局，页面任意位置按键即触发聚焦） ──
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (
        finished ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (e.key === 'Tab') return
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [finished])

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)]">
      {/* ══════════════════════════════
          顶部面包屑 + 实时统计栏
      ══════════════════════════════ */}
      <div className="sticky top-14 z-40 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-6 h-9 flex items-center justify-between gap-4">
          {/* 面包屑 */}
          <nav className="flex items-center gap-1.5 text-xs min-w-0">
            <Link
              href="/books"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors duration-150 shrink-0"
            >
              书库
            </Link>
            <span className="text-[var(--color-border-hover)] shrink-0">/</span>
            <Link
              href={`/practice/${articleId}/0`}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors duration-150 truncate max-w-[120px] sm:max-w-[200px]"
            >
              {articleTitle}
            </Link>
            <span className="text-[var(--color-border-hover)] shrink-0">/</span>
            <span className="truncate max-w-[120px] sm:max-w-[200px] text-[var(--color-text-dim)]">
              {chapterTitle}
            </span>
          </nav>

          {/* 实时统计 */}
          <div className="flex items-center gap-5 shrink-0">
            <TopBarStat label="WPM" value={started ? String(stats.wpm) : '--'} accent />
            <TopBarStat label="准确率" value={started ? `${stats.accuracy}%` : '--'} />
            <TopBarStat
              label="用时"
              value={started ? formatTime(elapsed) : '--'}
              className="hidden sm:flex"
            />
            {/* 进度 */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-20 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          主体：两列布局（空白 + 文本）
      ══════════════════════════════ */}
      <div className="flex-1 flex">
        {/* 左侧空白区域（章节列表抽屉触发区） */}
        <div className="hidden lg:flex flex-col items-end pt-12 pr-10 w-64 xl:w-80 shrink-0">
          <button
            type="button"
            onClick={() => setShowChapterList((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
              'text-xs font-medium text-[var(--color-text-muted)]',
              'hover:text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
              'border border-[var(--color-border)] bg-[var(--color-surface)]',
              'transition-all duration-150 select-none',
            )}
          >
            <List size={13} />
            章节列表
          </button>

          {showChapterList && (
            <div
              className={cn(
                'mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
                'bg-[var(--color-surface)] shadow-lg shadow-black/5',
                'py-1 overflow-y-auto max-h-[60vh] fade-in',
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-semibold text-[var(--color-text-dim)] select-none">
                  {totalChapters} 个章节
                </span>
                <button
                  type="button"
                  onClick={() => setShowChapterList(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-dim)]"
                >
                  <X size={13} />
                </button>
              </div>
              {allChapters.map((ch) => (
                <Link
                  key={ch.index}
                  href={`/practice/${articleId}/${ch.index}`}
                  onClick={() => setShowChapterList(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs transition-colors duration-100',
                    ch.index === chapterIndex
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)] font-medium'
                      : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
                  )}
                >
                  <span className="text-[var(--color-text-muted)] w-5 shrink-0 tabular-nums text-right">
                    {ch.index + 1}.
                  </span>
                  <span className="truncate">{ch.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 中央文本区域 */}
        <div className="flex-1 flex flex-col items-center px-6 lg:px-0">
          {/* 章节标题 */}
          <div className="w-full max-w-[640px] pt-10 pb-4">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider select-none mb-1">
              第 {chapterIndex + 1} 章 / 共 {totalChapters} 章
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-text)] tracking-tight">
              {chapterTitle}
            </h2>
          </div>

          {/* 打字文本区 */}
          <div
            role="button"
            tabIndex={-1}
            ref={textContainerRef}
            onClick={handleTextClick}
            onKeyDown={(e) => e.key === 'Enter' && handleTextClick()}
            className={cn(
              'w-full max-w-[640px] relative cursor-text',
              'rounded-[var(--radius-lg)]',
              'transition-all duration-200',
            )}
          >
            {/* 未聚焦遮罩 */}
            {!isFocused && !finished && (
              <div
                className={cn(
                  'absolute inset-0 z-10 flex items-center justify-center',
                  'rounded-[var(--radius-lg)]',
                  'bg-[var(--color-bg)]/60 backdrop-blur-[3px]',
                )}
              >
                <p className="text-sm text-[var(--color-text-dim)] bg-[var(--color-surface)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-sm select-none">
                  点击此处，或直接开始打字
                </p>
              </div>
            )}

            {/* 文字渲染：固定 3 行显示，整行滚动 */}
            <div
              className="typing-text py-1 select-none overflow-hidden"
              style={{ height: 'calc(1.85em * 3)' }}
            >
              {[0, 1, 2].map((offset) => {
                const lineIdx = displayStartLine + offset
                if (lineIdx >= lines.length)
                  return <div key={offset} style={{ height: '1.85em' }} />

                const lineText = lines[lineIdx]
                const lineStart = lineOffsets[lineIdx]
                const isCurrentLine = lineIdx === currentLineIndex
                // 非当前行及已完成行的透明度
                const isPastLine = lineIdx < currentLineIndex
                const isFutureLine = lineIdx > currentLineIndex

                return (
                  <div
                    key={lineIdx}
                    className={cn(
                      'transition-opacity duration-150',
                      isPastLine && 'opacity-30',
                      isFutureLine && 'opacity-50',
                    )}
                    style={{ height: '1.85em', whiteSpace: 'pre' }}
                  >
                    {lineText.split('').map((ch, j) => {
                      const globalIdx = lineStart + j
                      const c = chars[globalIdx]
                      const isCursor = globalIdx === cursorIndex && !finished

                      return (
                        <React.Fragment key={j}>
                          {isCursor && (
                            <span
                              className={cn(
                                'typing-cursor',
                                started && isFocused && 'typing-cursor-active',
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              c?.state === 'correct' && 'char-correct',
                              c?.state === 'error' && 'char-error',
                              (!c || c.state === 'pending') && 'char-pending',
                            )}
                          >
                            {ch === ' ' ? '\u00A0' : ch}
                          </span>
                        </React.Fragment>
                      )
                    })}
                    {/* 行尾换行符（\n）位置的光标和提示符 */}
                    {(() => {
                      if (lineIdx >= lines.length - 1) return null
                      const nlIdx = lineStart + lineText.length // \n 在 lineContent 的位置
                      const nlChar = chars[nlIdx]
                      const isCursor = nlIdx === cursorIndex && !finished
                      return (
                        <React.Fragment>
                          {isCursor && (
                            <span
                              className={cn(
                                'typing-cursor',
                                started && isFocused && 'typing-cursor-active',
                              )}
                            />
                          )}
                          {/* 用 ↵ 提示用户按 Enter，已输入时淡化 */}
                          <span
                            className={cn(
                              'text-[0.75em] select-none',
                              nlChar?.state === 'correct' &&
                                'opacity-30 text-[var(--color-correct)]',
                              nlChar?.state === 'error' && 'char-error',
                              (!nlChar || nlChar.state === 'pending') &&
                                'opacity-20 text-[var(--color-pending)]',
                            )}
                          >
                            ↵
                          </span>
                        </React.Fragment>
                      )
                    })()}
                    {/* 最后一行末尾光标 */}
                    {lineIdx === lines.length - 1 &&
                      cursorIndex === lineStart + lineText.length &&
                      !finished && (
                        <span
                          className={cn(
                            'typing-cursor',
                            started && isFocused && 'typing-cursor-active',
                          )}
                        />
                      )}
                  </div>
                )
              })}
            </div>

            {/* 完成覆盖层 */}
            {finished && (
              <div
                className={cn(
                  'absolute inset-0 z-10 flex flex-col items-center justify-center gap-4',
                  'rounded-[var(--radius-lg)]',
                  'bg-[var(--color-bg)]/90 backdrop-blur-[4px]',
                  'fade-in',
                )}
              >
                <CheckCircle2 size={36} className="text-[var(--color-accent)]" />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-3xl font-bold font-mono tabular-nums text-[var(--color-accent)]">
                    {stats.wpm}
                    <span className="text-base font-normal text-[var(--color-text-muted)] ml-1.5">
                      WPM
                    </span>
                  </p>
                  <p className="text-sm text-[var(--color-text-dim)]">
                    准确率 {stats.accuracy}% · {formatTime(elapsed)}
                    {saving && (
                      <span className="text-[var(--color-text-muted)] ml-2 text-xs">保存中…</span>
                    )}
                  </p>
                </div>

                {/* 完成后操作 */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)]',
                      'text-sm font-medium border border-[var(--color-border)]',
                      'bg-[var(--color-surface)] text-[var(--color-text-dim)]',
                      'hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)]',
                      'transition-all duration-150 select-none',
                    )}
                  >
                    <RotateCcw size={13} />
                    再练一次
                  </button>
                  {nextHref && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)]',
                        'text-sm font-semibold',
                        'bg-[var(--color-accent)] text-white',
                        'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
                      )}
                    >
                      下一章
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 操作提示行 */}
          {!finished && (
            <div className="w-full max-w-[640px] flex items-center justify-between mt-4 mb-2">
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1 hover:text-[var(--color-text-dim)] transition-colors select-none"
                >
                  <RotateCcw size={11} />
                  重置
                </button>
                <span className="mx-1.5 opacity-30">·</span>
                <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] font-mono text-[10px] bg-[var(--color-surface)]">
                  Tab
                </kbd>
                <span className="ml-1">重置</span>
              </div>
              {started && stats.errorChars > 0 && (
                <span className="text-xs text-[var(--color-error)] font-mono tabular-nums select-none">
                  {stats.errorChars} 处错误
                </span>
              )}
            </div>
          )}

          {/* 隐藏输入框：textarea 避免 iOS 软键盘问题，Enter 已在 onKeyDown 中阻止 */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="sr-only"
            aria-label="打字练习输入区域"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-gramm="false"
            rows={1}
          />
        </div>

        {/* 右侧空白（平衡布局） */}
        <div className="hidden lg:block w-64 xl:w-80 shrink-0" />
      </div>

      {/* ══════════════════════════════
          底部章节导航
      ══════════════════════════════ */}
      <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[720px] px-6 h-12 flex items-center justify-between">
          {/* 上一章 */}
          <div className="w-24">
            {prevHref ? (
              <Link
                href={prevHref}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text-dim)]',
                  'transition-colors duration-150 select-none',
                )}
              >
                <ChevronLeft size={14} />
                上一章
              </Link>
            ) : (
              <Link
                href={`/practice/${articleId}/0`}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text-dim)]',
                  'transition-colors duration-150 select-none',
                )}
              >
                <ChevronLeft size={14} />
                返回首章
              </Link>
            )}
          </div>

          {/* 章节点 */}
          <div className="flex items-center gap-1.5">
            {allChapters.slice(0, 20).map((ch) => (
              <Link
                key={ch.index}
                href={`/practice/${articleId}/${ch.index}`}
                title={ch.title}
                className={cn(
                  'rounded-full transition-all duration-150',
                  ch.index === chapterIndex
                    ? 'w-4 h-2 bg-[var(--color-accent)]'
                    : 'w-2 h-2 bg-[var(--color-border)] hover:bg-[var(--color-border-hover)]',
                )}
                aria-label={ch.title}
              />
            ))}
            {allChapters.length > 20 && (
              <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
                +{allChapters.length - 20}
              </span>
            )}
          </div>

          {/* 下一章 */}
          <div className="w-24 flex justify-end">
            {nextHref ? (
              <Link
                href={nextHref}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  'text-[var(--color-text-dim)] hover:text-[var(--color-accent)]',
                  'transition-colors duration-150 select-none',
                )}
              >
                下一章
                <ChevronRight size={14} />
              </Link>
            ) : (
              <Link
                href="/books"
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  'text-[var(--color-text-dim)] hover:text-[var(--color-accent)]',
                  'transition-colors duration-150 select-none',
                )}
              >
                回书库
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   顶部统计栏子组件
──────────────────────────────────────────── */

function TopBarStat({
  label,
  value,
  accent = false,
  className,
}: {
  label: string
  value: string
  accent?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-1.5', className)}>
      <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] select-none">
        {label}
      </span>
      <span
        className={cn(
          'font-mono font-bold tabular-nums text-sm',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]',
        )}
      >
        {value}
      </span>
    </div>
  )
}
