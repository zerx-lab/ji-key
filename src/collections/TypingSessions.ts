import type { CollectionConfig } from 'payload'

export const TypingSessions: CollectionConfig = {
  slug: 'typing-sessions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'article', 'chapterIndex', 'wpm', 'accuracy', 'createdAt'],
    group: '练习数据',
  },
  access: {
    // 只有登录用户本人可读自己的记录，admin 可读全部
    read: ({ req: { user } }) => {
      if (!user) return false
      const typedUser = user as { role?: string; id: number }
      if (typedUser.role === 'admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: () => false,
    delete: ({ req: { user } }) => {
      if (!user) return false
      const typedUser = user as { role?: string }
      return typedUser.role === 'admin'
    },
  },
  fields: [
    {
      name: 'user',
      label: '用户',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'article',
      label: '文章',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      index: true,
    },
    {
      name: 'chapterIndex',
      label: '章节序号',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: '对应 article.chapters 数组的下标（从 0 开始）',
      },
    },
    {
      name: 'chapterTitle',
      label: '章节标题（快照）',
      type: 'text',
      admin: {
        description: '保存时冗余存储，防止文章被删后丢失数据',
      },
    },
    {
      name: 'wpm',
      label: 'WPM（字/分钟）',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'accuracy',
      label: '准确率（%）',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
    },
    {
      name: 'duration',
      label: '练习时长（秒）',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'correctChars',
      label: '正确字符数',
      type: 'number',
      min: 0,
    },
    {
      name: 'errorChars',
      label: '错误字符数',
      type: 'number',
      min: 0,
    },
    {
      name: 'totalChars',
      label: '总字符数',
      type: 'number',
      min: 0,
    },
    {
      name: 'completed',
      label: '是否完整完成',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: '未完整打完整章节时为 false',
      },
    },
  ],
  timestamps: true,
}
