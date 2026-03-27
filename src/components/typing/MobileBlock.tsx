import React from 'react'
import Link from 'next/link'
import { Monitor, BookOpen, BarChart2, History, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBlockProps {
  articleId: string
  articleTitle: string
  chapterTitle: string
}

export function MobileBlock({ articleId, articleTitle, chapterTitle }: MobileBlockProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
      {/* 图标 */}
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)]',
          'bg-[var(--color-surface)] border border-[var(--color-border)]',
        )}
      >
        <Monitor size={28} className="text-[var(--color-text-muted)]" />
      </div>

      {/* 文案 */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">
          请在桌面端使用打字练习
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] leading-relaxed max-w-xs">
          打字练习需要实体键盘，移动端暂不支持。
          <br />
          请在电脑上打开此页面继续练习。
        </p>

        {/* 当前章节信息 */}
        <div
          className={cn(
            'mt-2 px-4 py-2.5 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-left w-full max-w-xs',
          )}
        >
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
            当前章节
          </p>
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{articleTitle}</p>
          <p className="text-xs text-[var(--color-text-dim)] truncate">{chapterTitle}</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link
          href={`/books/${articleId}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-sm font-medium text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-all duration-150',
          )}
        >
          <BookOpen size={15} className="text-[var(--color-accent)] shrink-0" />
          查看书籍章节
        </Link>

        <Link
          href="/stats"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-sm font-medium text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-all duration-150',
          )}
        >
          <BarChart2 size={15} className="text-[var(--color-accent)] shrink-0" />
          查看我的统计
        </Link>

        <Link
          href="/history"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-sm font-medium text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-all duration-150',
          )}
        >
          <History size={15} className="text-[var(--color-accent)] shrink-0" />
          查看历史记录
        </Link>
      </div>

      {/* 返回书库 */}
      <Link
        href="/books"
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]',
          'transition-colors duration-150',
        )}
      >
        <ChevronLeft size={13} />
        返回书库
      </Link>
    </div>
  )
}
