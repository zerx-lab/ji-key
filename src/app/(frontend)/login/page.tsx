'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Keyboard, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.errors?.[0]?.message ?? data?.message ?? '登录失败，请检查邮箱和密码。')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('网络错误，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-56px-57px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]',
              'bg-[var(--color-accent)]',
            )}
          >
            <Keyboard size={20} strokeWidth={2.5} className="text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--color-text)] tracking-tight">
              欢迎回来
            </h1>
            <p className="text-sm text-[var(--color-text-dim)] mt-1">登录你的 Ji-Key 账号</p>
          </div>
        </div>

        {/* 卡片 */}
        <div
          className={cn(
            'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
            'bg-[var(--color-surface)] p-6',
          )}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* 邮箱 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[var(--color-text-dim)] select-none"
              >
                邮箱
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className={cn(
                    'w-full h-10 pl-9 pr-3 py-2',
                    'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                    'rounded-[var(--radius-md)] text-sm text-[var(--color-text)]',
                    'placeholder:text-[var(--color-text-muted)]',
                    'hover:border-[var(--color-border-hover)]',
                    'focus:outline-none focus:border-[var(--color-accent)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-150',
                  )}
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--color-text-dim)] select-none"
                >
                  密码
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className={cn(
                    'w-full h-10 pl-9 pr-10 py-2',
                    'bg-[var(--color-surface-2)] border border-[var(--color-border)]',
                    'rounded-[var(--radius-md)] text-sm text-[var(--color-text)]',
                    'placeholder:text-[var(--color-text-muted)]',
                    'hover:border-[var(--color-border-hover)]',
                    'focus:outline-none focus:border-[var(--color-accent)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-150',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-dim)] transition-colors duration-150"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div
                className={cn(
                  'rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-bg)]',
                  'px-3 py-2.5 text-sm text-[var(--color-error)]',
                )}
              >
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={cn(
                'w-full h-10 rounded-[var(--radius-md)]',
                'text-sm font-semibold',
                'bg-[var(--color-accent)] text-black',
                'hover:bg-[var(--color-accent-dim)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150 select-none',
                'flex items-center justify-center gap-2',
              )}
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  登录中…
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>
        </div>

        {/* 注册跳转 */}
        <p className="text-center text-sm text-[var(--color-text-muted)] mt-5">
          还没有账号？{' '}
          <Link
            href="/register"
            className="text-[var(--color-text-dim)] hover:text-[var(--color-accent)] font-medium transition-colors duration-150"
          >
            立即注册
          </Link>
        </p>

        {/* 游客提示 */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-3">
          <Link
            href="/"
            className="hover:text-[var(--color-text-dim)] transition-colors duration-150"
          >
            ← 不登录，继续免费练习
          </Link>
        </p>
      </div>
    </div>
  )
}
