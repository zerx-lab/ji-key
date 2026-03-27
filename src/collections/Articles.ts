import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'language', 'category', 'updatedAt'],
    group: '内容管理',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
    },
    {
      name: 'author',
      label: '作者',
      type: 'text',
    },
    {
      name: 'language',
      label: '语言',
      type: 'select',
      required: true,
      defaultValue: 'zh',
      options: [
        { label: '中文', value: 'zh' },
        { label: 'English', value: 'en' },
        { label: '中英混合', value: 'mixed' },
      ],
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      defaultValue: 'prose',
      options: [
        { label: '小说', value: 'fiction' },
        { label: '散文', value: 'prose' },
        { label: '诗歌', value: 'poetry' },
        { label: '技术', value: 'tech' },
        { label: '哲学', value: 'philosophy' },
        { label: '历史', value: 'history' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      name: 'coverImage',
      label: '封面图',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      label: '简介',
      type: 'textarea',
    },
    {
      name: 'chapters',
      label: '章节列表',
      type: 'array',
      minRows: 1,
      admin: {
        description: '每个章节对应一段练习文本，按顺序排列',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'chapterTitle',
          label: '章节标题',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          label: '正文内容',
          type: 'textarea',
          required: true,
          admin: {
            description: '供打字练习的原文，建议每章 200~600 字符',
            rows: 8,
          },
        },
        {
          name: 'order',
          label: '排序',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: '数字越小越靠前',
          },
        },
      ],
    },
    {
      name: 'featured',
      label: '推荐展示',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: '勾选后出现在首页推荐区域',
        position: 'sidebar',
      },
    },
    {
      name: 'difficulty',
      label: '难度',
      type: 'select',
      defaultValue: 'medium',
      admin: {
        position: 'sidebar',
      },
      options: [
        { label: '入门', value: 'beginner' },
        { label: '中等', value: 'medium' },
        { label: '进阶', value: 'advanced' },
      ],
    },
    {
      name: 'totalChars',
      label: '总字符数（自动统计）',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: '保存时自动计算',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // 自动统计所有章节总字符数
        if (Array.isArray(data.chapters)) {
          const total = (data.chapters as { content?: string }[]).reduce(
            (sum, ch) => sum + (ch.content?.length ?? 0),
            0,
          )
          return { ...data, totalChars: total }
        }
        return data
      },
    ],
  },
}
