'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  BarChart2,
  History,
  LogIn,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  user?: {
    email: string
  } | null
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  requireAuth?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/books',
    label: '书库',
    icon: <BookOpen size={15} />,
  },
  {
    href: '/stats',
    label: '统计',
    icon: <BarChart2 size={15} />,
    requireAuth: true,
  },
  {
    href: '/history',
    label: '历史',
    icon: <History size={15} />,
    requireAuth: true,
  },
]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/users/logout', { method: 'POST' })
    setUserMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  const visibleItems = navItems.filter((item) => !item.requireAuth || user)

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex items-center gap-2 select-none group"
          onClick={() => setMobileOpen(false)}
        >
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]',
              'bg-[var(--color-accent)] text-white text-xs font-bold tracking-tight',
            )}
          >
            JK
          </span>
          <span className="font-semibold text-[var(--color-text)] text-sm tracking-tight group-hover:text-[var(--color-accent)] transition-colors duration-150">
            Ji-Key
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
                  'text-sm font-medium transition-all duration-150 select-none',
                  isActive
                    ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Desktop Auth ── */}
        <div className="hidden sm:flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
                  'text-sm font-medium text-[var(--color-text-dim)]',
                  'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                  'transition-all duration-150 select-none',
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-[10px] font-bold">
                  {user.email[0].toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.email.split('@')[0]}</span>
                <ChevronDown
                  size={12}
                  className={cn('transition-transform duration-150', userMenuOpen && 'rotate-180')}
                />
              </button>

              {userMenuOpen && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div
                    className={cn(
                      'absolute right-0 top-full mt-1 z-20',
                      'w-48 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
                      'bg-[var(--color-surface)] shadow-lg shadow-black/5',
                      'py-1 fade-in',
                    )}
                  >
                    <div className="px-3 py-2 border-b border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2',
                        'text-sm text-[var(--color-text-dim)]',
                        'hover:text-[var(--color-error)] hover:bg-[var(--color-surface-2)]',
                        'transition-all duration-150 select-none',
                      )}
                    >
                      <LogOut size={13} />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
                  'text-sm font-medium text-[var(--color-text-dim)]',
                  'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                  'transition-all duration-150 select-none',
                )}
              >
                <LogIn size={14} />
                登录
              </Link>
              <Link
                href="/register"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]',
                  'text-sm font-semibold',
                  'bg-[var(--color-accent)] text-white',
                  'hover:bg-[var(--color-accent-hover)]',
                  'transition-all duration-150 select-none',
                )}
              >
                注册
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile menu toggle ── */}
        <button
          type="button"
          className={cn(
            'sm:hidden flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)]',
            'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
            'transition-all duration-150',
          )}
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {/* ── Mobile Dropdown ── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] fade-in">
          <nav className="flex flex-col p-3 gap-0.5">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium transition-all duration-150 select-none',
                    isActive
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                      : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}

            <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex flex-col gap-0.5">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-[10px] font-bold shrink-0">
                      {user.email[0].toUpperCase()}
                    </span>
                    <span className="text-sm text-[var(--color-text-dim)] truncate">
                      {user.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)]',
                      'text-sm font-medium text-[var(--color-text-dim)]',
                      'hover:text-[var(--color-error)] hover:bg-[var(--color-surface-2)]',
                      'transition-all duration-150 select-none',
                    )}
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)]',
                      'text-sm font-medium text-[var(--color-text-dim)]',
                      'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                      'transition-all duration-150 select-none',
                    )}
                  >
                    <LogIn size={14} />
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)]',
                      'text-sm font-semibold',
                      'bg-[var(--color-accent)] text-white',
                      'hover:bg-[var(--color-accent-hover)]',
                      'transition-all duration-150 select-none',
                    )}
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
