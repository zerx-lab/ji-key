import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let createdArticleId: string | number | null = null

describe('Payload Local API 集成测试', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  afterAll(async () => {
    // 清理测试数据
    if (createdArticleId !== null) {
      await payload.delete({
        collection: 'articles',
        id: createdArticleId,
      })
    }
  })

  describe('用户集合', () => {
    it('应该能查询用户列表', async () => {
      const users = await payload.find({ collection: 'users' })
      expect(users).toBeDefined()
      expect(users.docs).toBeInstanceOf(Array)
      expect(typeof users.totalDocs).toBe('number')
    })
  })

  describe('文章集合', () => {
    it('应该能查询文章列表', async () => {
      const articles = await payload.find({ collection: 'articles' })
      expect(articles).toBeDefined()
      expect(articles.docs).toBeInstanceOf(Array)
    })

    it('应该能创建文章并自动计算 totalChars', async () => {
      const article = await payload.create({
        collection: 'articles',
        data: {
          title: '集成测试文章',
          language: 'zh',
          chapters: [
            {
              chapterTitle: '第一章',
              content: '这是一段测试内容，用于验证集成测试功能是否正常工作。',
              order: 0,
            },
          ],
        },
      })

      expect(article).toBeDefined()
      expect(article.title).toBe('集成测试文章')
      expect(article.chapters?.length).toBe(1)
      // beforeChange hook 应该自动计算 totalChars
      expect(article.totalChars).toBeGreaterThan(0)

      createdArticleId = article.id
    })

    it('应该能按 ID 查询文章', async () => {
      if (createdArticleId === null) return
      const article = await payload.findByID({
        collection: 'articles',
        id: createdArticleId,
      })
      expect(article).toBeDefined()
      expect(article.id).toBe(createdArticleId)
    })
  })

  describe('打字记录集合', () => {
    it('应该有正确的字段结构', async () => {
      // 在没有用户的情况下，集合查询应该返回空（因为访问控制）
      // 这里仅测试集合可访问
      const sessions = await payload.find({
        collection: 'typing-sessions',
        limit: 1,
      })
      expect(sessions).toBeDefined()
      expect(sessions.docs).toBeInstanceOf(Array)
    })
  })
})
