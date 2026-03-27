import chardet from 'chardet'
import iconv from 'iconv-lite'

/* ────────────────────────────────────────────
   类型
──────────────────────────────────────────── */

export interface ParsedChapter {
  chapterTitle: string
  content: string
  order: number
}

export interface ParsedTextBook {
  title: string
  author: string
  language: string
  chapters: ParsedChapter[]
}

/* ────────────────────────────────────────────
   工具：检测并解码 Buffer → 字符串
──────────────────────────────────────────── */

function decodeBuffer(buffer: Buffer): string {
  const detected = chardet.detect(buffer)
  const encoding = detected ?? 'UTF-8'
  let text: string
  if (iconv.encodingExists(encoding)) {
    text = iconv.decode(buffer, encoding)
  } else {
    text = buffer.toString('utf-8')
  }
  // 把 Non-Breaking Space (\u00A0) 统一替换为普通空格，防止打字匹配失败
  return text.replace(/\u00A0/g, ' ')
}

/* ────────────────────────────────────────────
   检测语言（中文字符占比）
──────────────────────────────────────────── */

function detectLanguage(text: string): string {
  const sample = text.slice(0, 500)
  const chineseChars = (sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length
  const ratio = chineseChars / Math.max(sample.replace(/\s/g, '').length, 1)
  return ratio > 0.3 ? 'zh' : 'en'
}

/* ────────────────────────────────────────────
   章节标题正则
──────────────────────────────────────────── */

const CHAPTER_PATTERNS = [
  /^第\s*[零一二三四五六七八九十百千\d]+\s*[章节回部篇卷]/,
  /^Chapter\s+\d+/i,
  /^CHAPTER\s+\d+/,
  /^[一二三四五六七八九十]+[、.．。]\s*.{1,30}$/,
  /^\d+[.、．]\s*.{1,40}$/,
  /^#{1,2}\s+.+/,
  /^[【\[].{1,20}[】\]]/,
]

function isChapterTitle(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length === 0 || trimmed.length > 60) return false
  return CHAPTER_PATTERNS.some((re) => re.test(trimmed))
}

/* ────────────────────────────────────────────
   从正文首行推断书名/作者
──────────────────────────────────────────── */

function inferTitle(lines: string[], filename: string): { title: string; author: string } {
  const nonEmpty = lines.filter((l) => l.trim().length > 0).slice(0, 5)
  if (nonEmpty.length === 0) return { title: filename, author: '' }

  const first = nonEmpty[0].trim()
  if (first.length <= 40 && !isChapterTitle(first)) {
    const second = nonEmpty[1]?.trim() ?? ''
    const authorMatch = second.match(/^(?:作者[：:]|著[：:]?|Author[：:]?)\s*(.+)$/i)
    if (authorMatch) return { title: first, author: authorMatch[1].trim() }
    if (second.length > 0 && second.length <= 20 && !isChapterTitle(second)) {
      return { title: first, author: second }
    }
    return { title: first, author: '' }
  }

  const nameWithoutExt = filename.replace(/\.[^.]+$/, '').trim()
  return { title: nameWithoutExt || '未命名', author: '' }
}

/* ────────────────────────────────────────────
   把文本按句子边界切成不超过 MAX_CHARS 的片段
   输入必须是已折叠空白的单行文本（无 \n）
──────────────────────────────────────────── */

const MAX_CHAPTER_CHARS = 600
const MIN_CHAPTER_CHARS = 80

function splitFlat(title: string, flat: string, startOrder: number): ParsedChapter[] {
  if (flat.length <= MAX_CHAPTER_CHARS) {
    return [{ chapterTitle: title, content: flat, order: startOrder }]
  }

  // 按中英文句末标点切分，保留标点
  const sentences = flat.match(/[^。！？!?…]+[。！？!?…]*/g) ?? [flat]

  const chunks: ParsedChapter[] = []
  let current = ''
  let part = 1

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed.replace(/\s/g, '').length >= MIN_CHAPTER_CHARS) {
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
   把一个 section 内容（可能含 \n）转成纯流文本后切片
──────────────────────────────────────────── */

function splitLongContent(title: string, content: string, startOrder: number): ParsedChapter[] {
  const flat = content.replace(/\s+/g, ' ').trim()
  return splitFlat(title, flat, startOrder)
}

/* ────────────────────────────────────────────
   按章节标题切割全文
──────────────────────────────────────────── */

interface RawSection {
  title: string
  lines: string[]
}

function splitIntoSections(lines: string[]): RawSection[] {
  const sections: RawSection[] = []
  let current: RawSection | null = null

  for (const line of lines) {
    if (isChapterTitle(line)) {
      if (current) sections.push(current)
      current = { title: line.trim().replace(/^#+\s*/, ''), lines: [] }
    } else {
      if (!current) current = { title: '前言', lines: [] }
      current.lines.push(line)
    }
  }

  if (current) sections.push(current)
  return sections
}

/* ────────────────────────────────────────────
   无章节标题时，按段落聚合再按字数切片
──────────────────────────────────────────── */

function autoSplit(text: string, bookTitle: string): ParsedChapter[] {
  // 先把全文段落化（双换行分段），每段内部换行折叠成空格
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const chapters: ParsedChapter[] = []
  let current = ''
  let partIdx = 1

  const flush = (text: string) => {
    const trimmed = text.replace(/\s+/g, ' ').trim()
    if (trimmed.replace(/\s/g, '').length >= MIN_CHAPTER_CHARS) {
      chapters.push({
        chapterTitle: `${bookTitle} · ${partIdx}`,
        content: trimmed,
        order: chapters.length,
      })
      partIdx++
    }
  }

  for (const para of paragraphs) {
    const candidate = current ? `${current} ${para}` : para
    if (candidate.length > MAX_CHAPTER_CHARS && current.length >= MIN_CHAPTER_CHARS) {
      flush(current)
      current = para
    } else {
      current = candidate
    }
  }
  flush(current)

  return chapters
}

/* ────────────────────────────────────────────
   主解析函数：解析 .txt / .md Buffer
──────────────────────────────────────────── */

export function parseTxt(buffer: Buffer, filename: string): ParsedTextBook {
  const raw = decodeBuffer(buffer)
  const text = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const language = detectLanguage(text)
  const lines = text.split('\n')
  const { title, author } = inferTitle(lines, filename)

  const sections = splitIntoSections(lines)
  const hasRealChapters = sections.some(
    (s) => s.title !== '前言' && s.lines.join('').replace(/\s/g, '').length >= MIN_CHAPTER_CHARS,
  )

  let chapters: ParsedChapter[] = []

  if (hasRealChapters) {
    let orderCounter = 0
    for (const section of sections) {
      // 把行合并成空格分隔的流文本
      const content = section.lines.join(' ').replace(/\s+/g, ' ').trim()

      if (content.replace(/\s/g, '').length < MIN_CHAPTER_CHARS) continue

      const chunks = splitLongContent(section.title, content, orderCounter)
      chapters.push(...chunks)
      orderCounter += chunks.length
    }
  } else {
    chapters = autoSplit(text, title)
  }

  if (chapters.length === 0) {
    throw new Error('未能从文件中提取到有效文本内容，请确认文件不为空。')
  }

  return { title, author, language, chapters }
}
