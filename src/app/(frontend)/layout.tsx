import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Navbar } from '@/components/ui/Navbar'
import './styles.css'

export const metadata = {
  title: 'Ji-Key · 打字练习',
  description: '通过阅读经典文学提升打字速度与准确率。',
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)]">
          <Navbar user={user ? { email: user.email } : null} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--color-border)] py-5 mt-auto">
            <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)] select-none font-[var(--font-sans)]">
                Ji-Key &copy; {new Date().getFullYear()}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] select-none font-[var(--font-sans)]">
                以文学为舟，渡至流畅之境
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
