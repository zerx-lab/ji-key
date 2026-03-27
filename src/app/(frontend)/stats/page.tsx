import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import config from '@payload-config'
import { BarChart2, Zap, Target, Clock, TrendingUp, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TypingSession, Article } from '@/payload-types'
import { WpmChart, type ChartDataPoint } from './StatsCharts'

export const metadata = {
  title: '统计 · Ji-Key',
  description: '查看你的打字练习统计数据',
}

/* ─── 辅助函数 ─── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h > 0) return `${h}h ${rem}m`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${mins}`
}

function computeStreak(sessions: TypingSession[]): number {
  if (sessions.length === 0) return 0
  const sessionDates = new Set(
    sessions.map((s) => {
      const d = new Date(s.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }),
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (sessionDates.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

/* ─── 主页面 ─── */

export default async function StatsPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  const sessionsResult = await payload.find({
    collection: 'typing-sessions',
    where: {
      user: { equals: user.id },
    },
    limit: 500,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: false,
    user,
  })

  const sessions = sessionsResult.docs as TypingSession[]
  const totalSessions = sessions.length

  /* ── 统计计算 ── */
  const bestWpm = totalSessions > 0 ? Math.max(...sessions.map((s) => s.wpm)) : 0
  const avgAccuracy =
    totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions)
      : 0
  const totalMinutes = Math.floor(sessions.reduce((sum, s) => sum + s.duration, 0) / 60)
  const avgWpm =
    totalSessions > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / totalSessions) : 0
  const bestAccuracy = totalSessions > 0 ? Math.max(...sessions.map((s) => s.accuracy)) : 0
  const streak = computeStreak(sessions)

  // 最近 30 条，反转为旧→新排列（供图表使用）
  const last30: ChartDataPoint[] = sessions
    .slice(0, 30)
    .reverse()
    .map((s) => ({
      wpm: s.wpm,
      accuracy: s.accuracy,
      date: s.createdAt,
    }))

  // 准确率分布
  const accDist = [
    { label: '95%~100%', count: sessions.filter((s) => s.accuracy >= 95).length },
    {
      label: '85%~94%',
      count: sessions.filter((s) => s.accuracy >= 85 && s.accuracy < 95).length,
    },
    {
      label: '70%~84%',
      count: sessions.filter((s) => s.accuracy >= 70 && s.accuracy < 85).length,
    },
    { label: '<70%', count: sessions.filter((s) => s.accuracy < 70).length },
  ]
  const maxAccCount = Math.max(...accDist.map((d) => d.count), 1)

  // 最近 10 条记录
  interface RecentSession {
    id: number
    articleTitle: string
    articleId: number | null
    chapterTitle: string
    chapterIndex: number
    wpm: number
    accuracy: number
    duration: number
    completed: boolean | null
    createdAt: string
  }

  const recentSessions: RecentSession[] = sessions.slice(0, 10).map((s) => {
    const isPopulated = typeof s.article === 'object' && s.article !== null
    const articleTitle = isPopulated ? (s.article as Article).title : '未知文章'
    const articleId = isPopulated
      ? (s.article as Article).id
      : typeof s.article === 'number'
        ? s.article
        : null
    return {
      id: s.id,
      articleTitle,
      articleId,
      chapterTitle: s.chapterTitle ?? '',
      chapterIndex: s.chapterIndex,
      wpm: s.wpm,
      accuracy: s.accuracy,
      duration: s.duration,
      completed: s.completed ?? null,
      createdAt: s.createdAt,
    }
  })

  // 用户名（邮箱 @ 前部分）
  const username = user.email.split('@')[0]

  // 总练习时长格式化值
  const thours = Math.floor(totalMinutes / 60)
  const tmins = totalMinutes % 60
  const totalMinutesFormatted = totalMinutes < 60 ? `${totalMinutes}` : `${thours}h${tmins}m`

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-10">
      {/* 页头 */}
      <div className="flex flex-col gap-1 slide-up">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-[var(--color-accent)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">统计数据</h1>
        </div>
        <p className="text-sm text-[var(--color-text-dim)]">
          欢迎回来，<span className="text-[var(--color-text)]">{username}</span>
        </p>
      </div>

      {totalSessions === 0 ? (
        /* ── 空状态 ── */
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)]',
            'p-12 flex flex-col items-center gap-3 text-center fade-in',
          )}
        >
          <Clock size={32} className="text-[var(--color-text-muted)]" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--color-text-dim)]">还没有练习记录</p>
            <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed">
              浏览书库选择一篇文章开始练习，你的成绩将自动保存在这里。
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
            浏览书库
          </Link>
        </div>
      ) : (
        <>
          {/* ── 概览卡片 ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in">
            <OverviewCard
              label="总练习次数"
              value={String(totalSessions)}
              unit="次"
              icon={<BarChart2 size={14} />}
            />
            <OverviewCard
              label="最高 WPM"
              value={String(bestWpm)}
              unit="字/分钟"
              icon={<Zap size={14} />}
              accent
            />
            <OverviewCard
              label="平均准确率"
              value={`${avgAccuracy}%`}
              unit="正确率"
              icon={<Target size={14} />}
            />
            <OverviewCard
              label="总练习时长"
              value={totalMinutesFormatted}
              unit="分钟"
              icon={<Clock size={14} />}
            />
          </div>

          {/* ── 图表区 ── */}
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
                <span className="text-xs text-[var(--color-text-muted)] select-none">
                  最近 30 次
                </span>
              </div>

              <WpmChart data={last30} avgWpm={avgWpm} />

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>平均 WPM</span>
                <span className="font-mono font-bold text-[var(--color-accent)]">{avgWpm}</span>
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

              <div className="flex flex-col gap-2 mt-1">
                {accDist.map((range) => (
                  <div key={range.label} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] w-20 shrink-0 select-none">
                      {range.label}
                    </span>
                    <div className="flex-1 h-4 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${(range.count / maxAccCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] w-6 text-right tabular-nums select-none">
                      {range.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mt-auto">
                <span>平均准确率</span>
                <span className="font-mono font-bold text-[var(--color-accent)]">
                  {avgAccuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* ── 个人最佳 ── */}
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
              <PersonalBest label="最高 WPM" value={String(bestWpm)} unit="字/分钟" accent />
              <PersonalBest label="最高准确率" value={`${bestAccuracy}%`} unit="正确率" />
              <PersonalBest label="平均 WPM" value={String(avgWpm)} unit="字/分钟" />
              <PersonalBest label="连续练习" value={String(streak)} unit="天" />
            </div>
          </div>

          {/* ── 最近练习 ── */}
          {recentSessions.length > 0 && (
            <div
              className={cn(
                'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]',
                'p-5 flex flex-col gap-4 fade-in',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-[var(--color-accent)]" />
                  <h2 className="text-sm font-semibold text-[var(--color-text)]">最近练习</h2>
                </div>
                <Link
                  href="/history"
                  className={cn(
                    'flex items-center gap-0.5 text-xs',
                    'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]',
                    'transition-colors duration-150',
                  )}
                >
                  查看全部
                  <ChevronRight size={12} />
                </Link>
              </div>

              <div className="flex flex-col divide-y divide-[var(--color-border)]">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {/* WPM 大号数字 */}
                    <div className="w-16 shrink-0 flex items-baseline gap-0.5">
                      <span className="font-mono font-bold text-xl tabular-nums text-[var(--color-accent)]">
                        {session.wpm}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] select-none">
                        wpm
                      </span>
                    </div>

                    {/* 文章 + 章节名 */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0">
                      <span className="text-sm font-medium text-[var(--color-text)] truncate">
                        {session.articleTitle}
                      </span>
                      {session.chapterTitle && (
                        <span className="text-xs text-[var(--color-text-muted)] truncate">
                          {session.chapterTitle}
                        </span>
                      )}
                    </div>

                    {/* 准确率 + 用时 */}
                    <div className="shrink-0 flex flex-col items-end gap-0">
                      <span className="text-xs font-medium text-[var(--color-text-dim)]">
                        {session.accuracy}%
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatDuration(session.duration)}
                      </span>
                    </div>

                    {/* 日期（sm 以上显示） */}
                    <div className="hidden sm:block shrink-0 w-24 text-right">
                      <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── OverviewCard 组件 ─── */

interface OverviewCardProps {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  accent?: boolean
}

function OverviewCard({ label, value, unit, icon, accent = false }: OverviewCardProps) {
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

/* ─── PersonalBest 组件 ─── */

interface PersonalBestProps {
  label: string
  value: string
  unit: string
  accent?: boolean
}

function PersonalBest({ label, value, unit, accent = false }: PersonalBestProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium select-none">
        {label}
      </span>
      <span
        className={cn(
          'font-mono font-bold text-xl tabular-nums',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-[var(--color-text-muted)]">{unit}</span>
    </div>
  )
}
