'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw, ChevronRight } from 'lucide-react'

/* ─── 类型定义 ─── */

type CharState = 'pending' | 'correct' | 'error' | 'extra'

interface CharData {
  char: string
  state: CharState
}

interface Stats {
  wpm: number
  accuracy: number
  correct: number
  errors: number
  elapsed: number // 秒
}

interface TypingAreaProps {
  /** 练习文本 */
  text: string
  /** 完成回调，携带最终统计数据 */
  onComplete?: (stats: Stats) => void
  /** 是否展示重置按钮 */
  showReset?: boolean
  /** 切换下一篇文章 */
  onNext?: () => void
}

/* ─── 常量 ─── */

const SAMPLE_TEXTS = [
  '代码如诗，简洁而有力。每一行都蕴含着开发者的思考与智慧，让机器理解人类的意图。',
  'The quick brown fox jumps over the lazy dog. Practice makes perfect, keep typing every day.',
  '好的代码是自解释的。变量名要清晰，函数要单一职责，注释要说明为什么而不是做什么。',
  'Speed comes with practice. Focus on accuracy first, then let speed follow naturally over time.',
  '打字是一门手艺，熟能生巧。坚持每天练习，你的速度和准确率都会稳步提升。',
]

/* ─── 工具函数 ─── */

function calcWPM(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds < 1) return 0
  return Math.round((correctChars / 5) * (60 / elapsedSeconds))
}

function calcAccuracy(correct: number, total: number): number {
  if (total === 0) return 100
  return Math.round((correct / total) * 100)
}

/* ─── 主组件 ─── */

export function TypingArea({ text, onComplete, showReset = true, onNext }: TypingAreaProps) {
  // ── 状态 ──
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // ── 派生状态：字符数组 ──
  const chars: CharData[] = useMemo(() => {
    return text.split('').map((char, i) => {
      const typed = input[i]
      let state: CharState = 'pending'
      if (typed !== undefined) {
        state = typed === char ? 'correct' : 'error'
      }
      return { char, state }
    })
  }, [text, input])

  // 多余字符
  const extraChars: CharData[] = useMemo(() => {
    if (input.length <= text.length) return []
    return input
      .slice(text.length)
      .split('')
      .map((char) => ({ char, state: 'extra' as CharState }))
  }, [input, text])

  // 当前光标位置
  const cursorIndex = input.length

  // 实时统计
  const stats: Stats = useMemo(() => {
    const correct = chars.filter((c) => c.state === 'correct').length
    const errors = chars.filter((c) => c.state === 'error').length + extraChars.length
    const total = correct + errors
    return {
      wpm: calcWPM(correct, elapsed),
      accuracy: calcAccuracy(correct, total),
      correct,
      errors,
      elapsed,
    }
  }, [chars, extraChars, elapsed])

  // ── 计时器 ──
  const startTimer = useCallback(() => {
    if (timerRef.current) return
    startTimeRef.current = Date.now() - elapsed * 1000
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 200)
  }, [elapsed])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── 重置 ──
  const reset = useCallback(() => {
    stopTimer()
    setInput('')
    setStarted(false)
    setFinished(false)
    setElapsed(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [stopTimer])

  // ── 文本变化时重置 ──
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // ── 卸载清理 ──
  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  // ── 处理输入 ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (finished) return

      const val = e.target.value

      // 开始计时
      if (!started && val.length > 0) {
        setStarted(true)
        startTimer()
      }

      setInput(val)

      // 检测完成：输入长度 >= 文本长度且最后一个字符正确
      if (val.length >= text.length) {
        const allCorrect = val.slice(0, text.length) === text
        if (allCorrect) {
          stopTimer()
          setFinished(true)
          const finalElapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
          setElapsed(finalElapsed)
          const correct = text.length
          const finalStats: Stats = {
            wpm: calcWPM(correct, finalElapsed),
            accuracy: 100,
            correct,
            errors: 0,
            elapsed: finalElapsed,
          }
          onComplete?.(finalStats)
        }
      }
    },
    [finished, started, text, startTimer, stopTimer, onComplete],
  )

  // ── 键盘快捷键 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tab：重置
      if (e.key === 'Tab') {
        e.preventDefault()
        reset()
      }
      // Escape：重置
      if (e.key === 'Escape') {
        reset()
      }
    },
    [reset],
  )

  // ── 点击文字区域聚焦 ──
  const handleTextClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // ── 格式化时间 ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
    return `${s}s`
  }

  // ── 进度百分比 ──
  const progress = text.length > 0 ? Math.min(100, (input.length / text.length) * 100) : 0

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── 实时统计栏 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <StatBadge label="WPM" value={started ? String(stats.wpm) : '--'} highlight />
          <StatBadge label="准确率" value={started ? `${stats.accuracy}%` : '--'} />
          <StatBadge label="用时" value={started ? formatTime(elapsed) : '--'} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] select-none">
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text-dim)]">
            Tab
          </kbd>
          <span>重置</span>
        </div>
      </div>

      {/* ── 进度条 ── */}
      <div className="h-px w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── 打字显示区 ── */}
      <div
        role="button"
        tabIndex={-1}
        onClick={handleTextClick}
        onKeyDown={(e) => e.key === 'Enter' && handleTextClick()}
        className={cn(
          'relative rounded-[var(--radius-lg)] px-6 py-5 cursor-text select-none',
          'bg-[var(--color-surface)] border border-[var(--color-border)]',
          'transition-all duration-200',
          isFocused
            ? 'border-[var(--color-border-hover)]'
            : 'hover:border-[var(--color-border-hover)]',
          finished && 'border-[var(--color-accent)]',
        )}
      >
        {/* 未聚焦提示 */}
        {!isFocused && !finished && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-lg)] z-10 bg-[var(--color-surface)]/80 backdrop-blur-[2px]">
            <p className="text-sm text-[var(--color-text-dim)]">点击此处，或直接开始打字</p>
          </div>
        )}

        {/* 文字渲染 */}
        <div className="typing-text">
          {chars.map((c, i) => (
            <React.Fragment key={i}>
              {/* 光标：在当前输入位置前插入 */}
              {i === cursorIndex && !finished && (
                <span className={cn('typing-cursor', started && 'typing-cursor-active')} />
              )}
              <span
                className={cn(
                  c.state === 'correct' && 'char-correct',
                  c.state === 'error' && 'char-error',
                  c.state === 'pending' && 'char-pending',
                )}
              >
                {c.char === ' ' ? '\u00A0' : c.char}
              </span>
            </React.Fragment>
          ))}

          {/* 末尾光标（输入超出文本范围或恰好在结尾） */}
          {cursorIndex >= text.length && !finished && (
            <span className={cn('typing-cursor', started && 'typing-cursor-active')} />
          )}

          {/* 多余字符 */}
          {extraChars.map((c, i) => (
            <span key={`extra-${i}`} className="char-extra">
              {c.char}
            </span>
          ))}
        </div>

        {/* 完成遮罩 */}
        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface)]/90 backdrop-blur-[2px] fade-in">
            <p className="text-3xl font-bold font-mono text-[var(--color-accent)] tabular-nums">
              {stats.wpm}
              <span className="text-base font-normal text-[var(--color-text-dim)] ml-1.5">WPM</span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              准确率 {stats.accuracy}% · {formatTime(elapsed)}
            </p>
          </div>
        )}
      </div>

      {/* ── 隐藏输入框 ── */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="sr-only"
        aria-label="打字练习输入区"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-gramm="false"
      />

      {/* ── 操作按钮 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {showReset && (
            <button
              type="button"
              onClick={reset}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)]',
                'text-xs font-medium text-[var(--color-text-muted)]',
                'hover:text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
                'transition-all duration-150 select-none',
              )}
              title="重置（Tab）"
            >
              <RotateCcw size={12} />
              重置
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)]',
                'text-xs font-medium text-[var(--color-text-muted)]',
                'hover:text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
                'transition-all duration-150 select-none',
              )}
            >
              <ChevronRight size={12} />
              下一篇
            </button>
          )}
        </div>

        {/* 错误计数 */}
        {started && stats.errors > 0 && (
          <span className="text-xs text-[var(--color-error)] tabular-nums select-none font-mono">
            {stats.errors} 处错误
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── 统计徽章子组件 ─── */

interface StatBadgeProps {
  label: string
  value: string
  highlight?: boolean
  className?: string
}

function StatBadge({ label, value, highlight = false, className }: StatBadgeProps) {
  return (
    <div className={cn('flex flex-col items-start gap-0', className)}>
      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] select-none font-medium">
        {label}
      </span>
      <span
        className={cn(
          'font-mono font-bold tabular-nums leading-snug text-2xl',
          highlight ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ─── 默认文本选择器（供首页使用） ─── */

export { SAMPLE_TEXTS }
