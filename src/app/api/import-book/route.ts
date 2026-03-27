export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { parseEpub } from '@/lib/parsers/epub'
import { parseTxt } from '@/lib/parsers/txt'

/* ────────────────────────────────────────────
   允许的 MIME / 扩展名
──────────────────────────────────────────── */

const ALLOWED_TYPES: Record<string, string> = {
  'application/epub+zip': 'epub',
  'application/epub': 'epub',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/octet-stream': 'auto', // 浏览器有时对 epub 报这个类型
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

/* ────────────────────────────────────────────
   POST /api/import-book
   Content-Type: multipart/form-data
   字段：
     file        - 书籍文件（必须）
     category    - 分类 slug（可选，默认 prose）
     difficulty  - 难度（可选，默认 medium）
     featured    - '1' 表示推荐（可选）
──────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  /* ── 1. 鉴权：仅 admin ── */
  const headersList = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return NextResponse.json({ error: '未登录，请先登录。' }, { status: 401 })
  }

  const typedUser = user as { role?: string }
  if (typedUser.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可导入书籍。' }, { status: 403 })
  }

  /* ── 2. 解析 FormData ── */
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: '请求格式错误，请使用 multipart/form-data。' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: '未收到文件，请选择要上传的文件。' }, { status: 400 })
  }

  const category = (formData.get('category') as string) || 'prose'
  const difficulty = (formData.get('difficulty') as string) || 'medium'
  const featured = formData.get('featured') === '1'

  /* ── 3. 校验文件类型 ── */
  const ext = getExtension(file.name)
  const mimeAllowed = ALLOWED_TYPES[file.type] !== undefined
  const extAllowed = ['epub', 'txt', 'md'].includes(ext)

  if (!mimeAllowed && !extAllowed) {
    return NextResponse.json(
      { error: `不支持的文件格式：${file.type || ext}。支持 .epub、.txt、.md。` },
      { status: 400 },
    )
  }

  // 文件大小限制 50MB
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)} MB），最大允许 50 MB。` },
      { status: 400 },
    )
  }

  /* ── 4. 读取为 Buffer ── */
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  /* ── 5. 解析文件 ── */
  let parsed: Awaited<ReturnType<typeof parseEpub>> | Awaited<ReturnType<typeof parseTxt>>

  try {
    if (ext === 'epub' || file.type.includes('epub')) {
      parsed = await parseEpub(buffer)
    } else {
      // txt / md
      parsed = parseTxt(buffer, file.name)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '文件解析失败'
    return NextResponse.json({ error: `解析失败：${message}` }, { status: 422 })
  }

  /* ── 6. 校验解析结果 ── */
  if (!parsed.chapters || parsed.chapters.length === 0) {
    return NextResponse.json({ error: '未能从文件中提取到任何章节，请检查文件内容。' }, { status: 422 })
  }

  /* ── 7. 写入 articles collection ── */
  const totalChars = parsed.chapters.reduce((sum, ch) => sum + ch.content.length, 0)

  let articleId: number
  try {
    const created = await payload.create({
      collection: 'articles',
      data: {
        title: parsed.title,
        author: parsed.author || '',
        language: (parsed.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en',
        category: category as
          | 'fiction'
          | 'prose'
          | 'poetry'
          | 'tech'
          | 'philosophy'
          | 'history'
          | 'other',
        difficulty: difficulty as 'beginner' | 'medium' | 'advanced',
        featured,
        description: 'description' in parsed ? (parsed.description ?? '') : '',
        chapters: parsed.chapters.map((ch) => ({
          chapterTitle: ch.chapterTitle,
          content: ch.content,
          order: ch.order,
        })),
        totalChars,
      },
      overrideAccess: false,
      user,
    })
    articleId = created.id
  } catch (err) {
    const message = err instanceof Error ? err.message : '数据库写入失败'
    return NextResponse.json({ error: `保存失败：${message}` }, { status: 500 })
  }

  /* ── 8. 返回结果 ── */
  return NextResponse.json({
    success: true,
    article: {
      id: articleId,
      title: parsed.title,
      author: parsed.author || '',
      language: parsed.language,
      chapterCount: parsed.chapters.length,
      totalChars,
    },
    message: `《${parsed.title}》导入成功，共 ${parsed.chapters.length} 个章节，${totalChars.toLocaleString()} 字符。`,
  })
}
