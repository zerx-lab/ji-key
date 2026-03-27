'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Type, Globe, BookOpen } from 'lucide-react'
import { SAMPLE_TEXTS } from './TypingArea'

type TextMode = 'sample' | 'custom'
type TextLang = 'zh' | 'en' | 'mixed'

interface TextSelectorProps {
  onSelect: (text: string) => void
  currentText: string
}

const LANG_SAMPLES: Record<TextLang, string[]> = {
  zh: [
    '代码如诗，简洁而有力。每一行都蕴含着开发者的思考与智慧，让机器理解人类的意图。',
    '好的代码是自解释的。变量名要清晰，函数要单一职责，注释要说明为什么而不是做什么。',
    '打字是一门手艺，熟能生巧。坚持每天练习，你的速度和准确率都会稳步提升。',
    '技术改变世界，但人文精神让技术有了温度。我们写的不只是代码，而是未来的可能性。',
    '学习编程就像学习一门新语言，需要时间和耐心。但一旦掌握，你就能与机器对话。',
  ],
  en: [
    'The quick brown fox jumps over the lazy dog. Practice makes perfect, keep typing every day.',
    'Speed comes with practice. Focus on accuracy first, then let speed follow naturally over time.',
    'Good code is like a good story. It should be clear, concise, and easy to follow from start to end.',
    'Every expert was once a beginner. The key to mastery is consistent daily practice and patience.',
    'Clean code is not written by following a set of rules. You know it is clean when you read it.',
  ],
  mixed: SAMPLE_TEXTS,
}

const LANG_OPTIONS: { value: TextLang; label: string; icon: React.ReactNode }[] = [
  { value: 'zh', label: '中文', icon: <BookOpen size={13} /> },
  { value: 'en', label: 'English', icon: <Globe size={13} /> },
  { value: 'mixed', label: '混合', icon: <Type size={13} /> },
]

export function TextSelector({ onSelect, currentText }: TextSelectorProps) {
  const [mode, setMode] = useState<TextMode>('sample')
  const [lang, setLang] = useState<TextLang>('zh')
  const [customText, setCustomText] = useState('')
  const [expanded, setExpanded] = useState(false)

  const samples = LANG_SAMPLES[lang]

  const handleSampleSelect = (text: string) => {
    onSelect(text)
    setExpanded(false)
  }

  const handleCustomSubmit = () => {
    const trimmed = customText.trim()
    if (trimmed.length < 10) return
    onSelect(trimmed)
    setExpanded(false)
  }

  const handleRandomPick = () => {
    const pool = LANG_SAMPLES[lang]
    const filtered = pool.filter((t) => t !== currentText)
    const pick = filtered.length > 0 ? filtered : pool
    const random = pick[Math.floor(Math.random() * pick.length)]
    onSelect(random)
    setExpanded(false)
  }

  return (
    <div className="w-full">
      {/* 折叠触发器 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
          'text-xs font-medium text-[var(--color-text-muted)]',
          'hover:text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
          'transition-all duration-150 select-none',
        )}
      >
        <Type size={13} />
        切换文本
        <ChevronDown
          size={13}
          className={cn('transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {/* 展开面板 */}
      {expanded && (
        <div
          className={cn(
            'mt-2 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
            'bg-[var(--color-surface)] p-4 fade-in',
          )}
        >
          {/* 模式切换 */}
          <div className="flex items-center gap-2 mb-4">
            {(['sample', 'custom'] as TextMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-all duration-150 select-none',
                  mode === m
                    ? 'bg-[var(--color-accent)] text-black'
                    : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
                )}
              >
                {m === 'sample' ? '示例文本' : '自定义'}
              </button>
            ))}
          </div>

          {mode === 'sample' ? (
            <>
              {/* 语言切换 */}
              <div className="flex items-center gap-1.5 mb-3">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLang(opt.value)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)]',
                      'text-xs font-medium transition-all duration-150 select-none',
                      lang === opt.value
                        ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border-hover)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]',
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}

                {/* 随机按钮 */}
                <button
                  type="button"
                  onClick={handleRandomPick}
                  className={cn(
                    'ml-auto flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)]',
                    'text-xs font-medium text-[var(--color-text-muted)]',
                    'hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]',
                    'transition-all duration-150 select-none',
                  )}
                >
                  随机
                </button>
              </div>

              {/* 文本列表 */}
              <ul className="flex flex-col gap-1.5">
                {samples.map((text, i) => {
                  const isActive = text === currentText
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => handleSampleSelect(text)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-[var(--radius-md)]',
                          'text-sm transition-all duration-150',
                          'border',
                          isActive
                            ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-text)]'
                            : 'border-transparent text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]',
                        )}
                      >
                        <span className="line-clamp-2 leading-relaxed font-mono text-xs">
                          {text}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            /* 自定义文本区域 */
            <div className="flex flex-col gap-3">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="在此粘贴或输入你想练习的文字（至少 10 个字符）..."
                rows={5}
                className={cn(
                  'w-full resize-none rounded-[var(--radius-md)]',
                  'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                  'text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
                  'px-3 py-2.5 leading-relaxed',
                  'focus:outline-none focus:border-[var(--color-accent)]',
                  'transition-colors duration-150',
                )}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {customText.trim().length} 个字符
                  {customText.trim().length > 0 && customText.trim().length < 10 && (
                    <span className="text-[var(--color-error)] ml-1">（至少需要 10 个）</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={customText.trim().length < 10}
                  className={cn(
                    'px-4 py-1.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium transition-all duration-150 select-none',
                    customText.trim().length >= 10
                      ? 'bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-dim)]'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50',
                  )}
                >
                  使用此文本
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
