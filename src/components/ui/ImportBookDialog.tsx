'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Upload, X, FileText, BookOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ────────────────────────────────────────────
   类型
──────────────────────────────────────────── */

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

interface ImportResult {
  title: string
  author: string
  chapterCount: number
  totalChars: number
  id: number
}

interface ImportBookDialogProps {
  open: boolean
  onClose: () => void
}

/* ────────────────────────────────────────────
   常量
──────────────────────────────────────────── */

const CATEGORY_OPTIONS = [
  { value: 'fiction', label: '小说' },
  { value: 'prose', label: '散文' },
  { value: 'poetry', label: '诗歌' },
  { value: 'tech', label: '技术' },
  { value: 'philosophy', label: '哲学' },
  { value: 'history', label: '历史' },
  { value: 'other', label: '其他' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: '入门' },
  { value: 'medium', label: '中等' },
  { value: 'advanced', label: '进阶' },
]

const ACCEPT = '.epub,.txt,.md'
const MAX_SIZE_MB = 50

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return <BookOpen size={18} className="text-[var(--color-accent)]" />
  return <FileText size={18} className="text-[var(--color-text-muted)]" />
}

/* ────────────────────────────────────────────
   主组件
──────────────────────────────────────────── */

export function ImportBookDialog({ open, onClose }: ImportBookDialogProps) {
  const router = useRouter()

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState('prose')
  const [difficulty, setDifficulty] = useState('medium')
  const [featured, setFeatured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 重置状态 ── */
  const resetState = useCallback(() => {
    setUploadState('idle')
    setSelectedFile(null)
    setError(null)
    setResult(null)
    setProgress('')
    setCategory('prose')
    setDifficulty('medium')
    setFeatured(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  /* ── 文件校验 ── */
  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['epub', 'txt', 'md'].includes(ext ?? '')) {
      return `不支持的格式：.${ext}，请选择 .epub、.txt 或 .md 文件。`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `文件过大（${formatFileSize(file.size)}），最大允许 ${MAX_SIZE_MB} MB。`
    }
    if (file.size === 0) {
      return '文件为空，请选择有效的文件。'
    }
    return null
  }

  /* ── 选择文件 ── */
  const handleFileSelect = useCallback((file: File) => {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setUploadState('error')
      setSelectedFile(null)
      return
    }
    setError(null)
    setUploadState('idle')
    setSelectedFile(file)
    setResult(null)
  }, [])

  /* ── input change ── */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      // 清空 input，允许重复选择同一文件
      e.target.value = ''
    },
    [handleFileSelect],
  )

  /* ── 拖拽事件 ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState('dragging')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState('idle')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setUploadState('idle')
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  /* ── 提交上传 ── */
  const handleSubmit = useCallback(async () => {
    if (!selectedFile) return

    setUploadState('uploading')
    setError(null)
    setProgress('正在读取文件…')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)
    formData.append('difficulty', difficulty)
    formData.append('featured', featured ? '1' : '0')

    try {
      setProgress(selectedFile.name.endsWith('.epub') ? '正在解析 EPUB 结构…' : '正在解析文本内容…')

      const res = await fetch('/api/import-book', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '导入失败，请稍后重试。')
        setUploadState('error')
        return
      }

      setResult(data.article)
      setUploadState('success')
      // 刷新书库页数据
      router.refresh()
    } catch {
      setError('网络错误，请检查连接后重试。')
      setUploadState('error')
    } finally {
      setProgress('')
    }
  }, [selectedFile, category, difficulty, featured, router])

  // 挂载到 body 后才渲染，避免 SSR 不匹配
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    /* ── 遮罩 ── */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="导入书籍"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden
      />

      {/* 对话框 */}
      <div
        className={cn(
          'relative w-full max-w-lg',
          'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] shadow-xl shadow-black/10',
          'flex flex-col fade-in',
        )}
      >
        {/* ── 头部 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">导入书籍</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)]',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              'hover:bg-[var(--color-surface-2)] transition-colors duration-150',
            )}
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── 主体 ── */}
        <div className="flex flex-col gap-4 px-6 py-5">
          {uploadState === 'success' && result ? (
            /* ── 成功状态 ── */
            <SuccessPanel result={result} onImportAnother={resetState} onClose={handleClose} />
          ) : (
            <>
              {/* 拖拽上传区 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-3',
                  'h-36 rounded-[var(--radius-lg)] border-2 border-dashed',
                  'cursor-pointer transition-all duration-150 select-none',
                  uploadState === 'dragging'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : selectedFile
                      ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent-light)]/40'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-hover)]',
                  uploadState === 'uploading' && 'pointer-events-none opacity-60',
                )}
              >
                {uploadState === 'uploading' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="text-[var(--color-accent)] animate-spin" />
                    <p className="text-xs text-[var(--color-text-dim)]">{progress || '处理中…'}</p>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedFile.name)}
                      <span className="text-sm font-medium text-[var(--color-text)] max-w-[240px] truncate">
                        {selectedFile.name}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatFileSize(selectedFile.size)} · 点击更换文件
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={22} className="text-[var(--color-text-muted)]" />
                    <div className="text-center">
                      <p className="text-sm text-[var(--color-text-dim)]">
                        拖放文件到此，或{' '}
                        <span className="text-[var(--color-accent)] font-medium">点击选择</span>
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        支持 .epub · .txt · .md，最大 {MAX_SIZE_MB} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleInputChange}
                className="sr-only"
                aria-label="选择书籍文件"
              />

              {/* 错误提示 */}
              {uploadState === 'error' && error && (
                <div
                  className={cn(
                    'flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)]',
                    'border border-[var(--color-error)]/40 bg-[var(--color-error-bg)]',
                    'text-sm text-[var(--color-error)]',
                  )}
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 选项：分类 / 难度 / 推荐 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 分类 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-dim)] select-none">
                    分类
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={uploadState === 'uploading'}
                    className={cn(
                      'h-9 px-2.5 rounded-[var(--radius-md)] text-sm',
                      'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                      'text-[var(--color-text)]',
                      'hover:border-[var(--color-border-hover)]',
                      'focus:outline-none focus:border-[var(--color-accent)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-150',
                    )}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 难度 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-dim)] select-none">
                    难度
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={uploadState === 'uploading'}
                    className={cn(
                      'h-9 px-2.5 rounded-[var(--radius-md)] text-sm',
                      'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                      'text-[var(--color-text)]',
                      'hover:border-[var(--color-border-hover)]',
                      'focus:outline-none focus:border-[var(--color-accent)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-150',
                    )}
                  >
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 推荐勾选 */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    disabled={uploadState === 'uploading'}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded-[3px] border transition-all duration-150 flex items-center justify-center',
                      featured
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-2)] group-hover:border-[var(--color-border-hover)]',
                    )}
                  >
                    {featured && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-[var(--color-text-dim)]">在书库首页推荐展示</span>
              </label>

              {/* 格式说明 */}
              <div
                className={cn(
                  'px-3 py-2.5 rounded-[var(--radius-md)]',
                  'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                )}
              >
                <p className="text-xs font-medium text-[var(--color-text-dim)] mb-1.5 select-none">
                  格式说明
                </p>
                <ul className="text-xs text-[var(--color-text-muted)] space-y-1 leading-relaxed">
                  <li>
                    <span className="font-mono font-medium text-[var(--color-accent)]">.epub</span>{' '}
                    — 自动提取书名、作者、章节，推荐使用
                  </li>
                  <li>
                    <span className="font-mono font-medium text-[var(--color-text-dim)]">.txt</span>{' '}
                    — 支持 UTF-8 / GBK 编码，自动识别章节标题
                  </li>
                  <li>
                    <span className="font-mono font-medium text-[var(--color-text-dim)]">.md</span>{' '}
                    — Markdown 文件，# 标题自动分章
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* ── 底部操作 ── */}
        {uploadState !== 'success' && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadState === 'uploading'}
              className={cn(
                'px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium',
                'border border-[var(--color-border)] text-[var(--color-text-dim)]',
                'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150 select-none',
              )}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || uploadState === 'uploading'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold',
                'bg-[var(--color-accent)] text-white',
                'hover:bg-[var(--color-accent-hover)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150 select-none',
              )}
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  导入中…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  开始导入
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ────────────────────────────────────────────
   成功面板
──────────────────────────────────────────── */

function SuccessPanel({
  result,
  onImportAnother,
  onClose,
}: {
  result: ImportResult
  onImportAnother: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center fade-in">
      <CheckCircle2 size={40} className="text-[var(--color-accent)]" />

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--color-text)]">导入成功</h3>
        <p className="text-sm text-[var(--color-text-dim)]">《{result.title}》已加入书库</p>
      </div>

      {/* 统计信息 */}
      <div
        className={cn(
          'w-full grid grid-cols-3 gap-0 divide-x divide-[var(--color-border)]',
          'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
          'bg-[var(--color-surface-2)]',
        )}
      >
        <StatCell label="章节数" value={String(result.chapterCount)} />
        <StatCell label="总字符" value={result.totalChars.toLocaleString()} />
        <StatCell label="作者" value={result.author || '未知'} />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 w-full pt-1 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onImportAnother}
          className={cn(
            'flex-1 py-2 rounded-[var(--radius-md)] text-sm font-medium',
            'border border-[var(--color-border)] text-[var(--color-text-dim)]',
            'hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]',
            'transition-all duration-150 select-none',
          )}
        >
          再导入一本
        </button>
        <a
          href={`/practice/${result.id}/0`}
          onClick={onClose}
          className={cn(
            'flex-1 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-center',
            'bg-[var(--color-accent)] text-white',
            'hover:bg-[var(--color-accent-hover)]',
            'transition-colors duration-150 select-none',
          )}
        >
          立即练习
        </a>
      </div>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 px-2">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] select-none">
        {label}
      </span>
      <span className="font-mono font-bold text-sm tabular-nums text-[var(--color-text)] truncate max-w-full">
        {value}
      </span>
    </div>
  )
}
