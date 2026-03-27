/**
 * 一次性 epub 导入脚本（直接使用 adm-zip + xml2js，不经过 HTTP）
 * 用法：node scripts/import-epub.mjs <epub文件路径> [分类] [难度]
 * 示例：node scripts/import-epub.mjs ~/Downloads/book.epub fiction medium
 */

import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const fp = process.argv[2]
const category = process.argv[3] || 'prose'
const difficulty = process.argv[4] || 'medium'

if (!fp) {
  console.error('Usage: node scripts/import-epub.mjs <epub-path> [category] [difficulty]')
  process.exit(1)
}

/* ────────────────────────────────────────────
   normalizeContent：与 page.tsx 保持完全一致
──────────────────────────────────────────── */

function normalizeContent(raw) {
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

/* ────────────────────────────────────────────
   stripHtml
──────────────────────────────────────────── */

function stripHtml(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<span[^>]+epub:type="pagebreak"[^>]*\/>/gi, '')
    .replace(/<span[^>]+epub:type="pagebreak"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|section|article|hr|br)[^>]*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/gi, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2010\u2011\u2012]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2000-\u200B]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/  +/g, ' ')
    .trim()
}

/* ────────────────────────────────────────────
   xmlText helper
──────────────────────────────────────────── */

function xmlText(raw) {
  if (!raw) return ''
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === 'string') return first.trim()
  if (typeof first === 'object' && first !== null) {
    if (typeof first._ === 'string') return first._.trim()
  }
  return String(first ?? '').trim()
}

/* ────────────────────────────────────────────
   NCX 标题映射
──────────────────────────────────────────── */

function parseNcxTitles(ncxXml) {
  const titles = {}
  const re = /<navLabel[^>]*>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content[\s\S]*?src="([^"#]+)/gi
  let m
  while ((m = re.exec(ncxXml)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, '').trim()
    const filename = m[2].trim().split('/').pop()
    if (label && filename) titles[filename] = label
  }
  return titles
}

/* ────────────────────────────────────────────
   跳过规则
──────────────────────────────────────────── */

const SKIP_TITLE_RE =
  /^(cover|toc|contents?$|table[\s-]?of[\s-]?contents?|copyright|crt[\s-]|dedication$|ded[\s-]|前言附注|版权|目录|封面|扉页|blank|also[\s-]by|about[\s-]the|index$|bibliography|acknowledgments?$|ack[\s-]|notes?$|end[\s-]?notes?|next[\s-]read|what[\u2019']?s[\s-]next|next[\s-]reads?)/i

const MIN_CHARS = 80
const MAX_CHAPTER_CHARS = 600

function shouldSkip(title, text) {
  if (SKIP_TITLE_RE.test(title.trim())) return true
  if (text.replace(/\s/g, '').length < MIN_CHARS) return true
  return false
}

/* ────────────────────────────────────────────
   章节切分
──────────────────────────────────────────── */

function splitLong(title, content, startOrder) {
  if (content.length <= MAX_CHAPTER_CHARS) {
    return [{ chapterTitle: title, content: content.trim(), order: startOrder }]
  }

  const sentences = content.match(/[^。！？!?…]+[。！？!?…]*/g) ?? [content]
  const chunks = []
  let current = ''
  let part = 1

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed.replace(/\s/g, '').length >= MIN_CHARS) {
      chunks.push({
        chapterTitle: part === 1 ? title : `${title}（${part}）`,
        content: trimmed,
        order: startOrder + chunks.length,
      })
      part++
    }
    current = ''
  }

  for (const sentence of sentences) {
    const candidate = current ? `${current}${sentence}` : sentence
    if (candidate.length > MAX_CHAPTER_CHARS && current.length > 0) {
      flush()
      current = sentence
    } else {
      current = candidate
    }
  }
  flush()

  return chunks
}

/* ────────────────────────────────────────────
   页码标题过滤
──────────────────────────────────────────── */

const PAGE_LIKE = /^[ivxlcdmIVXLCDM\d\s]+$/

/* ────────────────────────────────────────────
   主解析逻辑
──────────────────────────────────────────── */

async function parseEpub(buffer) {
  const zip = new AdmZip(buffer)

  // container.xml → OPF path
  const containerXml = zip.readAsText('META-INF/container.xml')
  if (!containerXml) throw new Error('缺少 META-INF/container.xml')

  const container = await parseStringPromise(containerXml)
  const opfPath = container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path']
  if (!opfPath) throw new Error('找不到 OPF 路径')

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : ''

  // 解析 OPF
  const opfXml = zip.readAsText(opfPath)
  const opf = await parseStringPromise(opfXml)
  const pkg = opf?.package
  if (!pkg) throw new Error('OPF 格式无法识别')

  // 元数据
  const meta = pkg.metadata?.[0] ?? {}
  const title = xmlText(meta['dc:title']) || '未命名书籍'
  const author = xmlText(meta['dc:creator']) || ''
  const langRaw = xmlText(meta['dc:language'])
  const language = langRaw.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const description = stripHtml(xmlText(meta['dc:description']))

  // manifest
  const manifestItems = {}
  const items = pkg.manifest?.[0]?.item ?? []
  for (const item of items) {
    const id = item.$?.id ?? ''
    const href = item.$?.href ?? ''
    const mediaType = item.$?.['media-type'] ?? ''
    if (id && href) manifestItems[id] = { href, mediaType }
  }

  // spine
  const itemrefs = pkg.spine?.[0]?.itemref ?? []
  const spineHrefs = itemrefs
    .filter(r => (r.$?.linear ?? 'yes') !== 'no')
    .map(r => manifestItems[r.$?.idref ?? '']?.href)
    .filter(Boolean)

  if (spineHrefs.length === 0) throw new Error('spine 为空')

  // NCX 标题
  const ncxHref = Object.values(manifestItems).find(m => m.href.endsWith('.ncx'))?.href
  let ncxTitles = {}
  if (ncxHref) {
    try {
      const ncxPath = opfDir ? `${opfDir}/${ncxHref}` : ncxHref
      const ncxXml = zip.readAsText(ncxPath)
      if (ncxXml) ncxTitles = parseNcxTitles(ncxXml)
    } catch {}
  }

  // 提取章节
  const allChapters = []
  let orderCounter = 0

  for (const href of spineHrefs) {
    const fullPath = opfDir ? `${opfDir}/${href}` : href
    let html
    try { html = zip.readAsText(fullPath) } catch { continue }
    if (!html) continue

    const text = stripHtml(html)
    if (text.replace(/\s/g, '').length < MIN_CHARS) continue

    const filename = href.split('/').pop() ?? ''
    const ncxTitle = ncxTitles[filename] ?? ''
    const htmlForTitle = html
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*\/>/gi, '')
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*>[\s\S]*?<\/span>/gi, '')
    const headingMatch = htmlForTitle.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)
    const headingTitle = headingMatch
      ? headingMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : ''

    const validHeading = headingTitle && !PAGE_LIKE.test(headingTitle) ? headingTitle : ''
    const validNcx = ncxTitle && !PAGE_LIKE.test(ncxTitle) ? ncxTitle : ''
    const filenameTitle = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/^\d+\s*/, '').trim()
    const chapterTitle = validHeading || validNcx || filenameTitle || `Chapter ${orderCounter + 1}`

    if (shouldSkip(chapterTitle, text)) {
      console.log(`  skip: ${chapterTitle}`)
      continue
    }

    // 应用 normalizeContent
    const normalizedText = normalizeContent(text)
    const chunks = splitLong(chapterTitle, normalizedText, orderCounter)
    allChapters.push(...chunks)
    orderCounter += chunks.length
  }

  if (allChapters.length === 0) throw new Error('未提取到有效章节')

  return { title, author, language, description, chapters: allChapters }
}

/* ────────────────────────────────────────────
   写入数据库（通过 Payload Local API）
──────────────────────────────────────────── */

async function main() {
  console.log('读取文件:', fp)
  const buffer = readFileSync(fp)

  console.log('解析 EPUB...')
  const parsed = await parseEpub(buffer)

  console.log(`书名: ${parsed.title}`)
  console.log(`作者: ${parsed.author}`)
  console.log(`语言: ${parsed.language}`)
  console.log(`章节数: ${parsed.chapters.length}`)

  // 动态加载 payload（ESM）
  console.log('\n连接数据库...')
  const { default: config } = await import('../src/payload.config.ts', { with: { type: 'module' } }).catch(async () => {
    // 如果 .ts 不能直接 import，用编译后的
    return await import('../src/payload.config.js').catch(() => ({ default: null }))
  })

  if (!config) {
    // fallback：直接用 sqlite3 写入
    console.log('Payload config 加载失败，使用直接 SQL 写入...')
    await insertViaSql(parsed)
    return
  }

  const { getPayload } = await import('payload')
  const payload = await getPayload({ config: await config })

  const totalChars = parsed.chapters.reduce((s, c) => s + c.content.length, 0)

  const created = await payload.create({
    collection: 'articles',
    data: {
      title: parsed.title,
      author: parsed.author,
      language: parsed.language,
      category,
      difficulty,
      featured: false,
      description: parsed.description,
      chapters: parsed.chapters.map(ch => ({
        chapterTitle: ch.chapterTitle,
        content: ch.content,
        order: ch.order,
      })),
      totalChars,
    },
    overrideAccess: true,
  })

  console.log(`\n✅ 导入成功！Article ID: ${created.id}`)
  console.log(`章节数: ${parsed.chapters.length}，总字符: ${totalChars.toLocaleString()}`)
  process.exit(0)
}

/* ────────────────────────────────────────────
   fallback：直接 SQL 插入
──────────────────────────────────────────── */

async function insertViaSql(parsed) {
  // 用 better-sqlite3 或 sqlite3 直接写
  let db
  try {
    const Database = require('better-sqlite3')
    db = new Database('./ji-key.db')
  } catch {
    try {
      const sqlite3 = require('sqlite3')
      console.error('请改用 better-sqlite3，或通过导入界面上传文件')
      process.exit(1)
    } catch {
      console.error('找不到 sqlite3 驱动，请通过 Web 界面导入')
      process.exit(1)
    }
  }

  const totalChars = parsed.chapters.reduce((s, c) => s + c.content.length, 0)
  const now = new Date().toISOString()

  const insertArticle = db.prepare(`
    INSERT INTO articles (title, author, language, category, difficulty, featured, description, total_chars, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `)

  const result = insertArticle.run(
    parsed.title, parsed.author, parsed.language,
    category, difficulty, parsed.description,
    totalChars, now, now,
  )
  const articleId = result.lastInsertRowid

  const insertChapter = db.prepare(`
    INSERT INTO articles_chapters (_parent_id, _order, chapter_title, content, "order")
    VALUES (?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((chapters) => {
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      insertChapter.run(articleId, i + 1, ch.chapterTitle, ch.content, ch.order)
    }
  })

  insertMany(parsed.chapters)

  console.log(`\n✅ SQL 直接写入成功！Article ID: ${articleId}`)
  console.log(`章节数: ${parsed.chapters.length}，总字符: ${totalChars.toLocaleString()}`)
  db.close()
  process.exit(0)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  console.error(e.stack)
  process.exit(1)
})
