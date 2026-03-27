import { createClient } from '@libsql/client'
import { randomBytes, pbkdf2 } from 'crypto'
import { promisify } from 'util'

const pbkdf2Async = promisify(pbkdf2)

const email = process.argv[2] || '166997982@qq.com'
const newPassword = process.argv[3] || 'admin123456'

const db = createClient({ url: 'file:ji-key.db' })

const saltBuffer = randomBytes(32)
const salt = saltBuffer.toString('hex')

// Payload 使用 sha256，25000 次迭代，512 字节输出
const derivedKey = await pbkdf2Async(newPassword, salt, 25000, 512, 'sha256')
const hash = derivedKey.toString('hex')

const result = await db.execute({
  sql: 'UPDATE users SET salt = ?, hash = ?, login_attempts = 0, lock_until = NULL WHERE email = ?',
  args: [salt, hash, email],
})

if (result.rowsAffected === 0) {
  console.error('❌ User not found:', email)
  process.exit(1)
}

console.log(`✅ Password for ${email} has been reset to: ${newPassword}`)
db.close()
