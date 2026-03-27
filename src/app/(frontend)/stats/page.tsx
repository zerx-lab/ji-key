import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import config from '@/payload.config'
import { BarChart2, Zap, Target, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = {
  title: '统计 · Ji-Key',
  description: '查看你的打字练习统计数据',
}

export default async function StatsPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-10">
      {/* 页头 */}
      <div className="flex flex-col gap-1 slide-up">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-[var(--color-accent)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">
            统计数据
          </h1>
        </div>
        <p className="text-sm text-[var(--color-text-dim)]">
          欢迎回来，<span className="text-[var(--color-text)]">{user.email}</span>
        </p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in">
        {OVERVIEW_STATS.map((stat) => (
          <OverviewCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* 图表占位区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
        {/* WPM 趋势 */}
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
            'p-5 flex flex-col gap-3',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">WPM 趋势</h2>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] select-none">最近 30 次</span>
          </div>

          {/* 迷你图占位 */}
          <div
            className={cn(
              'h-32 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)]',
              'flex items-center justify-center',
            )}
          >
            <p className="text-xs text-[var(--color-text-muted)] text-center leading-relaxed">
              完成更多练习后
              <br />
              趋势图将在此展示
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>平均 WPM</span>
            <span className="font-mono font-bold text-[var(--color-accent)]">--</span>
          </div>
        </div>

        {/* 准确率分布 */}
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
            'p-5 flex flex-col gap-3',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">准确率分布</h2>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] select-none">全部记录</span>
          </div>

          {/* 条形图占位 */}
          <div className="flex flex-col gap-2 mt-1">
            {ACCURACY_RANGES.map((range) => (
              <div key={range.label} className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)] w-20 shrink-0 select-none">
                  {range.label}
                </span>
                <div className="flex-1 h-4 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-border-hover)]"
                    style={{ width: '0%' }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-6 text-right tabular-nums select-none">
                  0
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mt-auto">
            <span>平均准确率</span>
            <span className="font-mono font-bold text-[var(--color-accent)]">--</span>
          </div>
        </div>
      </div>

      {/* 个人最佳 */}
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
          'p-5 flex flex-col gap-4 fade-in',
        )}
      >
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-[var(--color-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text)]">个人最佳</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PERSONAL_BESTS.map((pb) => (
            <div key={pb.label} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium select-none">
                {pb.label}
              </span>
              <span className="font-mono font-bold text-xl tabular-nums text-[var(--color-text-dim)]">
                --
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{pb.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 空状态提示 */}
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)]',
          'p-8 flex flex-col items-center gap-3 text-center fade-in',
        )}
      >
        <Clock size={28} className="text-[var(--color-text-muted)]" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-[var(--color-text-dim)]">还没有练习记录</p>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">
            回到首页开始打字练习，你的成绩将自动保存在这里。
          </p>
        </div>
        <a
          href="/"
          className={cn(
            'mt-1 px-4 py-2 rounded-[var(--radius-md)]',
            'text-sm font-medium select-none',
            'bg-[var(--color-accent)] text-black',
            'hover:bg-[var(--color-accent-dim)] transition-colors duration-150',
          )}
        >
          开始练习
        </a>
      </div>
    </div>
  )
}

/* ─── 概览卡片 ─── */

interface OverviewItem {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  accent?: boolean
}

const OVERVIEW_STATS: OverviewItem[] = [
  {
    label: '总练习次数',
    value: '0',
    unit: '次',
    icon: <BarChart2 size={14} />,
  },
  {
    label: '最高 WPM',
    value: '--',
    unit: '字/分钟',
    icon: <Zap size={14} />,
    accent: true,
  },
  {
    label: '平均准确率',
    value: '--%',
    unit: '正确率',
    icon: <Target size={14} />,
  },
  {
    label: '总练习时长',
    value: '0',
    unit: '分钟',
    icon: <Clock size={14} />,
  },
]

function OverviewCard({ label, value, unit, icon, accent = false }: OverviewItem) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 flex flex-col gap-2',
        'hover:border-[var(--color-border-hover)] transition-colors duration-150',
        accent ? 'border-[var(--color-accent)]/40' : 'border-[var(--color-border)]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium select-none',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
        )}
      >
        {icon}
        {label}
      </div>
      <div className="flex flex-col gap-0">
        <span
          className={cn(
            'font-mono font-bold tabular-nums text-2xl leading-tight',
            accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]',
          )}
        >
          {value}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] select-none">{unit}</span>
      </div>
    </div>
  )
}

/* ─── 准确率区间 ─── */

const ACCURACY_RANGES = [
  { label: '95% ~ 100%' },
  { label: '85% ~ 94%' },
  { label: '70% ~ 84%' },
  { label: '< 70%' },
]

/* ─── 个人最佳项 ─── */

const PERSONAL_BESTS = [
  { label: '最高 WPM', unit: '字/分钟' },
  { label: '最高准确率', unit: '%' },
  { label: '最长连续', unit: '天' },
  { label: '最快完成', unit: '秒' },
]
