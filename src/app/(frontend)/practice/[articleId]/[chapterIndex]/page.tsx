import React from 'react'
import { notFound } from 'next/navigation'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Article } from '@/payload-types'
import { TypingConsole } from '@/components/typing/TypingConsole'
import { MobileBlock } from '@/components/typing/MobileBlock'

/**
 * 在服务端统一规范化 content：
 * - \u00A0 → 普通空格（HTML &nbsp; 直接编码残留）
 * - 智能引号/破折号 → ASCII 等价（用户键盘无法直接输入弯引号）
 * - 所有空白折叠为单个空格
 * SSR 和 CSR 拿到相同字符串，不会出现 hydration 不匹配。
 */
function normalizeContent(raw: string): string {
  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2010\u2011\u2012]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2000-\u200B]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Props {
  params: Promise<{ articleId: string; chapterIndex: string }>
}

export async function generateMetadata({ params }: Props) {
  const { articleId, chapterIndex } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const article = await payload
    .findByID({
      collection: 'articles',
      id: Number(articleId),
      overrideAccess: true,
    })
    .catch(() => null)

  if (!article) return { title: 'Ji-Key' }

  const chapters = (article as Article).chapters ?? []
  const idx = Number(chapterIndex)
  const chapter = chapters[idx]

  return {
    title: chapter
      ? `${chapter.chapterTitle} · ${article.title} · Ji-Key`
      : `${article.title} · Ji-Key`,
  }
}

export default async function PracticePage({ params }: Props) {
  const { articleId, chapterIndex } = await params
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const headers = await getHeaders()

  const { user } = await payload.auth({ headers })

  const article = await payload
    .findByID({
      collection: 'articles',
      id: Number(articleId),
      overrideAccess: true,
    })
    .catch(() => null)

  if (!article) notFound()

  const typedArticle = article as Article
  const chapters = typedArticle.chapters ?? []
  const idx = Number(chapterIndex)

  if (idx < 0 || idx >= chapters.length) notFound()

  const chapter = chapters[idx]
  const totalChapters = chapters.length

  const normalizedChapterContent = normalizeContent(chapter.content ?? '')

  return (
    <>
      {/* 移动端拦截：sm 以下显示提示，隐藏打字区 */}
      <div className="sm:hidden flex-1 flex flex-col">
        <MobileBlock
          articleId={articleId}
          articleTitle={typedArticle.title}
          chapterTitle={chapter.chapterTitle}
        />
      </div>

      {/* 桌面端正常显示 */}
      <div className="hidden sm:flex flex-1 flex-col min-h-0">
        <TypingConsole
          articleId={Number(articleId)}
          articleTitle={typedArticle.title}
          chapterIndex={idx}
          totalChapters={totalChapters}
          chapterTitle={chapter.chapterTitle}
          content={normalizedChapterContent}
          allChapters={chapters.map((c, i) => ({ index: i, title: c.chapterTitle }))}
          user={user ? { id: user.id, email: user.email } : null}
        />
      </div>
    </>
  )
}
