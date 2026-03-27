import React from 'react'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { BookOpen, Zap, BarChart2, ArrowRight, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-4xl px-6 pt-12 sm:pt-20 pb-10 sm:pb-16 flex flex-col items-center text-center gap-6">
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded-full',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-xs font-medium text-[var(--color-text-dim)] select-none',
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
          通过经典文学，打磨打字技艺
        </div>

        <h1
          className={cn(
            'text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text)]',
            'leading-[1.15]',
          )}
        >
          以文学为媒，
          <br />
          <span className="text-[var(--color-accent)]">键入流畅之境</span>
        </h1>

        <p className="text-base text-[var(--color-text-dim)] max-w-md leading-relaxed">
          从经典书目中选取章节，逐字打出每一个词句。 实时 WPM 统计，逐字高亮纠错，让练习有迹可循。
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Link
            href="/books"
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)]',
              'bg-[var(--color-accent)] text-white font-semibold text-sm',
              'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
            )}
          >
            <BookOpen size={15} />
            浏览书库
            <ArrowRight size={14} />
          </Link>
          {!user && (
            <Link
              href="/login"
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)]',
                'border border-[var(--color-border)] bg-[var(--color-surface)]',
                'text-sm font-medium text-[var(--color-text-dim)]',
                'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                'transition-all duration-150 select-none',
              )}
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </section>

      {/* ── 预览区（打字示意） ── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
            'bg-[var(--color-surface)] px-4 sm:px-8 py-5 sm:py-7',
          )}
        >
          {/* 顶部模拟统计栏 */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-8 mb-3 sm:mb-5 pb-4 border-b border-[var(--color-border)]">
            <MockStat label="WPM" value="68" accent />
            <MockStat label="准确率" value="97%" />
            <MockStat label="用时" value="1:24" />
            <div className="ml-auto">
              <div className="h-1 w-20 sm:w-32 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: '42%' }}
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-right select-none">
                第 3 章 · 42%
              </p>
            </div>
          </div>

          {/* 模拟打字文本 */}
          <div className="typing-text select-none leading-[1.85]">
            <span className="char-correct">I</span>
            <span className="char-correct">t</span>
            <span className="char-correct"> </span>
            <span className="char-correct">w</span>
            <span className="char-correct">a</span>
            <span className="char-correct">s</span>
            <span className="char-correct"> </span>
            <span className="char-correct">t</span>
            <span className="char-correct">h</span>
            <span className="char-correct">e</span>
            <span className="char-correct"> </span>
            <span className="char-correct">b</span>
            <span className="char-correct">e</span>
            <span className="char-correct">s</span>
            <span className="char-correct">t</span>
            <span className="char-correct"> </span>
            <span className="char-correct">o</span>
            <span className="char-correct">f</span>
            <span className="char-correct"> </span>
            <span className="char-correct">t</span>
            <span className="char-correct">i</span>
            <span className="char-correct">m</span>
            <span className="char-correct">e</span>
            <span className="char-correct">s</span>
            <span className="char-correct">,</span>
            <span className="char-correct"> </span>
            <span className="char-correct">i</span>
            <span className="char-correct">t</span>
            <span className="char-correct"> </span>
            <span className="char-correct">w</span>
            <span className="char-correct">a</span>
            <span className="char-correct">s</span>
            <span className="char-correct"> </span>
            <span className="char-correct">t</span>
            <span className="char-correct">h</span>
            <span className="char-correct">e</span>
            <span className="char-correct"> </span>
            <span className="char-error">b</span>
            <span className="char-error">e</span>
            <span className="char-error">a</span>
            <span className="typing-cursor typing-cursor-active" />
            <span className="char-pending">s</span>
            <span className="char-pending">t</span>
            <span className="char-pending"> </span>
            <span className="char-pending">o</span>
            <span className="char-pending">f</span>
            <span className="char-pending"> </span>
            <span className="char-pending">t</span>
            <span className="char-pending">i</span>
            <span className="char-pending">m</span>
            <span className="char-pending">e</span>
            <span className="char-pending">s</span>
            <span className="char-pending">.</span>
          </div>

          <p className="mt-4 text-xs text-[var(--color-text-muted)] select-none">
            《双城记》· Charles Dickens · 第一章
          </p>
        </div>
      </section>

      {/* ── 特性介绍 ── */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className={cn(
          'border-t border-[var(--color-border)] bg-[var(--color-surface)]',
          'py-10 sm:py-14',
        )}
      >
        <div className="mx-auto max-w-xl px-6 flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight">
            准备好开始了吗？
          </h2>
          <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
            {user
              ? '继续练习，追踪进步轨迹。'
              : '注册账号，记录每一次练习，追踪进步轨迹。 或者直接浏览书库，立即开始。'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href="/books"
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)]',
                'bg-[var(--color-accent)] text-white font-semibold text-sm',
                'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
              )}
            >
              立即开始
              <ArrowRight size={14} />
            </Link>
            {!user && (
              <Link
                href="/register"
                className={cn(
                  'px-5 py-2.5 rounded-[var(--radius-md)]',
                  'border border-[var(--color-border)]',
                  'text-sm font-medium text-[var(--color-text-dim)]',
                  'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                  'transition-all duration-150 select-none',
                )}
              >
                免费注册
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─── 模拟统计数据 ─── */
function MockStat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-0">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] font-medium select-none">
        {label}
      </span>
      <span
        className={cn(
          'font-mono font-bold tabular-nums text-xl leading-snug',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ─── 特性卡片 ─── */
interface Feature {
  icon: React.ReactNode
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  {
    icon: <Zap size={16} strokeWidth={2} />,
    title: '实时 WPM 统计',
    desc: '每次按键即时计算速度，精准反映当前节奏。',
  },
  {
    icon: <Crosshair size={16} strokeWidth={2} />,
    title: '逐字纠错高亮',
    desc: '错误字符即时标红，帮你发现和改正薄弱点。',
  },
  {
    icon: <BarChart2 size={16} strokeWidth={2} />,
    title: '历史记录追踪',
    desc: '登录后自动保存每次成绩，以数据见证成长。',
  },
]

function FeatureCard({ icon, title, desc }: Feature) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
        'px-5 py-4 flex flex-col gap-2.5',
        'hover:border-[var(--color-border-hover)] transition-colors duration-150',
      )}
    >
      <div className="flex items-center gap-2 text-[var(--color-accent)]">
        {icon}
        <span className="text-sm font-semibold text-[var(--color-text)]">{title}</span>
      </div>
      <p className="text-xs text-[var(--color-text-dim)] leading-relaxed">{desc}</p>
    </div>
  )
}
