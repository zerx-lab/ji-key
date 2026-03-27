import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'

/* ────────────────────────────────────────────
   类型
──────────────────────────────────────────── */

export interface ParsedChapter {
  chapterTitle: string
  content: string
  order: number
}

export interface ParsedBook {
  title: string
  author: string
  language: string
  description: string
  chapters: ParsedChapter[]
}

/* ────────────────────────────────────────────
   HTML → 纯文本
   去除 <title> 防止书名重复出现在正文
──────────────────────────────────────────── */

function stripHtml(html: string): string {
  return (
    html
      // 先删 head 区块，防止 <title> 内容混入正文
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      // 删除 epub pagebreak span（含页码数字）
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*\/>/gi, '')
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*>[\s\S]*?<\/span>/gi, '')
      // 删除 style / script
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // 所有块级元素、br、hr → 单个空格（打字练习不需要换行，纯流式文本）
      .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote|section|article|hr|br)[^>]*\/?>/gi, ' ')
      // 去掉所有剩余标签
      .replace(/<[^>]+>/g, '')
      // HTML 实体（含直接出现的 \u00A0 Non-Breaking Space）
      .replace(/\u00A0/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#\d+;/g, '')
      .replace(/&[a-z]+;/gi, '')
      // 智能引号/破折号等排版字符 → ASCII 等价（用户键盘无法直接输入）
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // 左右单引号
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // 左右双引号
      .replace(/[\u2013\u2014\u2015]/g, '-') // en-dash, em-dash
      .replace(/[\u2010\u2011\u2012]/g, '-') // hyphen 变体
      .replace(/\u2026/g, '...') // 省略号
      .replace(/[\u2000-\u200B]/g, ' ') // 各种特殊空格
      // 折叠所有连续空白（含换行）为单个空格
      // 注意：\s 不匹配 \u00A0，上面已单独处理
      .replace(/\s+/g, ' ')
      // 再次清除残留 \u00A0
      .replace(/\u00A0/g, ' ')
      .replace(/  +/g, ' ')
      .trim()
  )
}

/* ────────────────────────────────────────────
   跳过封面/目录/版权等无意义页面
──────────────────────────────────────────── */

const SKIP_TITLE_RE =
  /^(cover|toc|contents?$|table[\s-]?of[\s-]?contents?|copyright|crt[\s-]|dedication$|ded[\s-]|前言附注|版权|目录|封面|扉页|blank|also[\s-]by|about[\s-]the|index$|bibliography|acknowledgments?$|ack[\s-]|notes?$|end[\s-]?notes?|next[\s-]read|what[\u2019']?s[\s-]next|next[\s-]reads?)/i

const MIN_CHARS = 80

function shouldSkip(title: string, text: string): boolean {
  if (SKIP_TITLE_RE.test(title.trim())) return true
  if (text.replace(/\s/g, '').length < MIN_CHARS) return true
  return false
}

/* ────────────────────────────────────────────
   拆分过长章节（每段 ≤ MAX_CHARS）
──────────────────────────────────────────── */

const MAX_CHAPTER_CHARS = 600

function splitLong(title: string, content: string, startOrder: number): ParsedChapter[] {
  if (content.length <= MAX_CHAPTER_CHARS) {
    return [{ chapterTitle: title, content: content.trim(), order: startOrder }]
  }

  const chunks: ParsedChapter[] = []
  const paras = content.split(/\n\n+/)
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

  for (const para of paras) {
    const candidate = current ? `${current}\n\n${para}` : para
    if (candidate.length > MAX_CHAPTER_CHARS && current.length > 0) {
      flush()
      current = para
    } else {
      current = candidate
    }
  }
  flush()

  return chunks
}

/* ────────────────────────────────────────────
   从 xml2js 解析结果里安全取字符串值
   xml2js 对有属性的文本节点会输出 { _: 'text', $: {...} }
   对纯文本节点直接输出字符串
──────────────────────────────────────────── */

function xmlText(raw: unknown): string {
  if (!raw) return ''
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === 'string') return first.trim()
  if (typeof first === 'object' && first !== null) {
    const obj = first as Record<string, unknown>
    if (typeof obj['_'] === 'string') return obj['_'].trim()
  }
  return String(first ?? '').trim()
}

/* ────────────────────────────────────────────
   解析 NCX，返回 filename -> title 映射
──────────────────────────────────────────── */

interface NcxNavPoint {
  navLabel?: Array<{ text?: string[] }>
  content?: Array<{ $: { src: string } }>
  navPoint?: NcxNavPoint[]
}

function parseNcxTitles(ncxXml: string): Record<string, string> {
  const titles: Record<string, string> = {}

  // 用正则快速提取，避免 xml2js 异步
  const navPointRe =
    /<navLabel[^>]*>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content[\s\S]*?src="([^"#]+)/gi
  let m: RegExpExecArray | null
  while ((m = navPointRe.exec(ncxXml)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, '').trim()
    const filename = m[2].trim().split('/').pop() ?? ''
    if (label && filename) titles[filename] = label
  }

  return titles
}

/* ────────────────────────────────────────────
   主解析函数：Buffer → ParsedBook
   依赖：adm-zip（epub2 已有）+ xml2js（epub2 已有）
   不依赖 epub2 的任何 API，完全绕开其 Node 24 bug
──────────────────────────────────────────── */

export async function parseEpub(buffer: Buffer): Promise<ParsedBook> {
  /* 1. 打开 ZIP */
  let zip: AdmZip
  try {
    zip = new AdmZip(buffer)
  } catch (e) {
    throw new Error(`无法解压 EPUB 文件，文件可能已损坏：${(e as Error).message}`)
  }

  /* 2. container.xml → OPF 路径 */
  const containerXml = zip.readAsText('META-INF/container.xml')
  if (!containerXml) throw new Error('无效的 EPUB：缺少 META-INF/container.xml')

  const container = await parseStringPromise(containerXml)
  const opfPath: string = container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path']
  if (!opfPath) throw new Error('无效的 EPUB：找不到 OPF 文件路径')

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : ''

  /* 3. 解析 OPF */
  const opfXml = zip.readAsText(opfPath)
  if (!opfXml) throw new Error(`无法读取 OPF 文件：${opfPath}`)

  const opf = await parseStringPromise(opfXml)
  const pkg = opf?.package

  if (!pkg) throw new Error('OPF 文件格式无法识别')

  /* 4. 元数据 */
  const meta = pkg.metadata?.[0] ?? {}
  const title = xmlText(meta['dc:title']) || '未命名书籍'
  const author = xmlText(meta['dc:creator']) || ''
  const langRaw = xmlText(meta['dc:language'])
  const language = langRaw.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const description = stripHtml(xmlText(meta['dc:description']))

  /* 5. manifest: id → href */
  const manifestItems: Record<string, { href: string; mediaType: string }> = {}
  const items: Array<{ $: Record<string, string> }> = pkg.manifest?.[0]?.item ?? []
  for (const item of items) {
    const id = item.$?.id ?? ''
    const href = item.$?.href ?? ''
    const mediaType = item.$?.['media-type'] ?? ''
    if (id && href) manifestItems[id] = { href, mediaType }
  }

  /* 6. spine → 有序 href 列表 */
  const itemrefs: Array<{ $: Record<string, string> }> = pkg.spine?.[0]?.itemref ?? []
  const spineHrefs: string[] = itemrefs
    .filter((r) => (r.$?.linear ?? 'yes') !== 'no')
    .map((r) => manifestItems[r.$?.idref ?? '']?.href)
    .filter((h): h is string => Boolean(h))

  if (spineHrefs.length === 0) {
    throw new Error('EPUB spine 为空，无法确定阅读顺序')
  }

  /* 7. NCX 标题映射（filename → title） */
  const ncxHref = Object.values(manifestItems).find((m) => m.href.endsWith('.ncx'))?.href
  let ncxTitles: Record<string, string> = {}
  if (ncxHref) {
    const ncxPath = opfDir ? `${opfDir}/${ncxHref}` : ncxHref
    try {
      const ncxXml = zip.readAsText(ncxPath)
      if (ncxXml) ncxTitles = parseNcxTitles(ncxXml)
    } catch {
      // NCX 解析失败不影响主流程
    }
  }

  /* 8. 按 spine 顺序提取章节文本 */
  const allChapters: ParsedChapter[] = []
  let orderCounter = 0

  for (const href of spineHrefs) {
    const fullPath = opfDir ? `${opfDir}/${href}` : href

    let html: string
    try {
      html = zip.readAsText(fullPath)
    } catch {
      continue
    }
    if (!html) continue

    const text = stripHtml(html)
    if (text.replace(/\s/g, '').length < MIN_CHARS) continue

    /* 章节标题优先级：HTML <h1-4> > NCX > 文件名
     * NCX 降级是因为它经常存储页码（iv / viii / 204）而非章节名 */
    const filename = href.split('/').pop() ?? ''
    const ncxTitle = ncxTitles[filename] ?? ''

    // 从 HTML 提取标题（先删 pagebreak span 防止页码混入）
    const htmlForTitle = html
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*\/>/gi, '')
      .replace(/<span[^>]+epub:type="pagebreak"[^>]*>[\s\S]*?<\/span>/gi, '')
    const headingMatch = htmlForTitle.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)
    const headingTitle = headingMatch
      ? headingMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : ''

    // 过滤掉「纯页码」标题：只含数字或罗马数字的字符串不是真正的章节标题
    const PAGE_LIKE = /^[ivxlcdmIVXLCDM\d\s]+$/
    const validHeading = headingTitle && !PAGE_LIKE.test(headingTitle) ? headingTitle : ''
    const validNcx = ncxTitle && !PAGE_LIKE.test(ncxTitle) ? ncxTitle : ''

    const filenameTitle = filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/^\d+\s*/, '')
      .trim()
    const chapterTitle = validHeading || validNcx || filenameTitle || `Chapter ${orderCounter + 1}`

    if (shouldSkip(chapterTitle, text)) continue

    const chunks = splitLong(chapterTitle, text, orderCounter)
    allChapters.push(...chunks)
    orderCounter += chunks.length
  }

  if (allChapters.length === 0) {
    throw new Error('未能从 EPUB 中提取到有效章节内容，请检查文件是否损坏或加密。')
  }

  return { title, author, language, description, chapters: allChapters }
}
