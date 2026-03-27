'use client'

import { useId, useState } from 'react'

import { cn } from '@/lib/utils'

export interface ChartDataPoint {
  wpm: number
  accuracy: number
  date: string
}

interface WpmChartProps {
  data: ChartDataPoint[]
  avgWpm: number
  className?: string
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const PAD = 8
const W = 300
const H = 80
const CHART_W = W - PAD * 2 // 284
const CHART_H = H - PAD * 2 // 64

export function WpmChart({ data, avgWpm, className }: WpmChartProps) {
  const uid = useId()
  const gradientId = `wg${uid.replace(/[^a-zA-Z0-9]/g, '')}`
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center gap-1', className)}
        style={{ height: '7rem' }}
      >
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>完成更多练习后</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>趋势图将在此展示</p>
      </div>
    )
  }

  const wpms = data.map((d) => d.wpm)
  const minWpm = Math.min(...wpms)
  const maxWpm = Math.max(...wpms)
  const range = maxWpm - minWpm || 1

  const toX = (i: number): number =>
    data.length === 1 ? PAD + CHART_W / 2 : PAD + (i / (data.length - 1)) * CHART_W

  const toY = (wpm: number): number => PAD + CHART_H - ((wpm - minWpm) / range) * CHART_H

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.wpm) }))

  const polylinePoints = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

  const areaD = [
    `M ${points[0].x.toFixed(2)},${(PAD + CHART_H).toFixed(2)}`,
    ...points.map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`),
    `L ${points[points.length - 1].x.toFixed(2)},${(PAD + CHART_H).toFixed(2)}`,
    'Z',
  ].join(' ')

  const avgY = Math.max(PAD, Math.min(PAD + CHART_H, toY(avgWpm)))

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null

  return (
    <div className={cn('relative', className)}>
      {hoveredIdx !== null && hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '0.7rem',
            lineHeight: 1.6,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {hoveredPoint.wpm} wpm
          </div>
          <div style={{ color: 'var(--color-text-dim)' }}>准确率 {hoveredPoint.accuracy}%</div>
          <div style={{ color: 'var(--color-text-muted)' }}>{formatDate(hoveredPoint.date)}</div>
        </div>
      )}

      <svg
        viewBox="0 0 300 80"
        className="w-full"
        style={{ height: '7rem' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 填充区域 */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* 平均线 */}
        <line
          x1={PAD}
          y1={avgY}
          x2={W - PAD}
          y2={avgY}
          stroke="var(--color-border-hover)"
          strokeWidth={1}
          strokeDasharray="3,2"
        />

        {/* 折线 */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 数据点（可见圆点） */}
        {points.map((p, i) => {
          const isHovered = hoveredIdx === i
          const isLast = i === data.length - 1
          let r: number
          if (isHovered) r = 3.5
          else if (isLast) r = 2.5
          else if (data.length <= 10) r = 2
          else r = 0

          return r > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={r} fill="var(--color-accent)" />
          ) : null
        })}

        {/* 透明悬浮命中区域 */}
        {points.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={p.x}
            cy={p.y}
            r={6}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoveredIdx(i)}
          />
        ))}
      </svg>
    </div>
  )
}
