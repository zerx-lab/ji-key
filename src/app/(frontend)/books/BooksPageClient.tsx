'use client'

import React, { useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportBookDialog } from '@/components/ui/ImportBookDialog'

interface BooksPageClientProps {
  /** 空状态时显示的是大按钮而非图标按钮 */
  emptyState?: boolean
}

export function BooksPageClient({ emptyState = false }: BooksPageClientProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {emptyState ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)]',
            'text-sm font-semibold',
            'bg-[var(--color-accent)] text-white',
            'hover:bg-[var(--color-accent-hover)] transition-colors duration-150 select-none',
          )}
        >
          <Upload size={14} />
          导入书籍
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]',
            'text-sm font-medium',
            'border border-[var(--color-border)] bg-[var(--color-surface)]',
            'text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-all duration-150 select-none',
          )}
        >
          <Upload size={14} />
          导入书籍
        </button>
      )}

      <ImportBookDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
