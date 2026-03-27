import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Articles } from './collections/Articles'
import { TypingSessions } from './collections/TypingSessions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Articles, TypingSessions],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      // 生产：file:/app/data/ji-key.db（容器 volume）
      // 构建阶段：fallback 到 /tmp 避免找不到文件报错
      url: process.env.DATABASE_URL || 'file:/tmp/build.db',
    },
    // 启动时自动同步 schema（等价于 drizzle push），新部署无需手动迁移
    push: true,
  }),
  sharp,
  plugins: [],
})
