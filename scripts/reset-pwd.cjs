const Database = require('better-sqlite3')
const crypto = require('crypto')

const email = process.argv[2] || '166997982@qq.com'
const newPassword = process.argv[3] || 'admin123456'

const db = new Database('./ji-key.db')

const salt = crypto.randomBytes(32).toString('hex')

crypto.pbkdf2(newPassword, salt, 25000, 512, 'sha512', (err, derivedKey) => {
  if (err) {
    console.error('Hash error:', err)
    process.exit(1)
  }
  const hash = derivedKey.toString('hex')
  const stmt = db.prepare('UPDATE users SET salt = ?, hash = ? WHERE email = ?')
  const result = stmt.run(salt, hash, email)
  if (result.changes === 0) {
    console.error('User not found:', email)
    process.exit(1)
  }
  console.log(`Password updated for ${email} -> ${newPassword}`)
  db.close()
})
