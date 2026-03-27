# Ji-Key

多用户在线打字练习 Web 应用。未登录用户可直接开始练习，登录后解锁成绩记录与统计看板。

**技术栈**：Payload CMS 3.x · Next.js 16 · React 19 · TypeScript 5.7 · SQLite · Tailwind CSS v4

---

## 功能概览

- **免登录练习** — 任何人可直接访问首页开始打字，成绩本地暂存
- **用户账号** — 注册/登录后，每次练习自动记录 WPM、准确率、时长
- **统计看板** — 可视化历史成绩，追踪进步曲线（登录后可见）
- **文章库** — 管理员在后台维护中英文练习文章，支持手动录入
- **管理后台** — 基于 Payload Admin，仅管理员账号可访问（`/admin`）

---

## 快速开始

**环境要求**：Node ≥ 18.20.2 或 ≥ 20.9.0，pnpm ^9 或 ^10

```bash
# 1. 克隆项目
git clone <repo-url>
cd ji-key

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 PAYLOAD_SECRET 和 DATABASE_URL

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev
```

访问 `http://localhost:3000` 查看前台，`http://localhost:3000/admin` 进入后台。

首次启动后台时，按照引导创建管理员账号。

### 环境变量

| 变量名           | 说明                                 | 示例               |
| ---------------- | ------------------------------------ | ------------------ |
| `PAYLOAD_SECRET` | JWT 签名密钥（至少 32 位随机字符串） | `your-secret-key`  |
| `DATABASE_URL`   | SQLite 文件路径                      | `file:./ji-key.db` |

---

## 开发命令

```bash
pnpm dev                   # 启动开发服务器（localhost:3000）
pnpm devsafe               # 清除 .next 缓存后启动
pnpm build                 # 生产构建
pnpm lint                  # ESLint 检查
tsc --noEmit               # TypeScript 类型检查
pnpm generate:types        # 修改 Collection/Global schema 后执行
pnpm generate:importmap    # 新增或修改 admin 组件后执行
```

### 测试

```bash
pnpm test          # 运行全部测试（集成 + E2E）
pnpm test:int      # 仅 Vitest 集成测试
pnpm test:e2e      # 仅 Playwright E2E 测试（需本地先运行 pnpm dev）
```

E2E 测试使用 Chromium，需要本地开发服务器运行在 `http://localhost:3000`。

### Docker（可选）

```bash
docker-compose up          # 启动容器
docker-compose up -d       # 后台运行
```

---

## 项目结构

```
src/
├── app/
│   ├── (frontend)/        # 前台页面（打字练习、统计、用户页）
│   └── (payload)/         # Payload Admin 路由（自动生成，勿手动修改）
├── collections/           # Payload Collection 配置
├── globals/               # Payload Global 配置
├── components/
│   ├── ui/                # 通用 UI 原子组件（Button / Input / Navbar）
│   └── typing/            # 打字相关业务组件
├── hooks/                 # Payload Hook 函数
├── access/                # 访问控制函数
└── payload.config.ts      # 主配置（数据库 / 集合 / 编辑器）
```

路径别名：`@/` → `src/`，`@payload-config` → `src/payload.config.ts`

---

## 数据模型

| Collection        | 说明                                    |
| ----------------- | --------------------------------------- |
| `users`           | 用户认证（角色：`admin` / `user`）      |
| `articles`        | 练习文章库（中英文，支持富文本）        |
| `typing-sessions` | 练习记录（WPM、准确率、时长、关联文章） |
| `media`           | 媒体文件上传                            |

---

## 设计规范

- **主题**：深色（背景 `#0d0d0d`，表面 `#161616`，强调色金黄 `#e2b714`）
- **字体**：打字区域使用 `JetBrains Mono` 等宽字体，UI 使用 `Inter`
- **禁止渐变**：所有颜色（背景/边框/文字）均不使用 CSS gradient
- **无障碍**：所有交互组件支持键盘操作与 focus-visible 样式

---

## 开发规范

代码风格：单引号、无分号、尾随逗号、最大行宽 100。

详细规范见：

- [`AGENTS.md`](./AGENTS.md) — 完整开发规范（命名、安全、架构）
- [`.cursor/rules/`](./.cursor/rules/) — 各模块专项规范（13 个文档）

**安全关键原则（必须遵守）：**

```typescript
// Local API 必须显式传递 overrideAccess: false
await payload.find({ collection: 'typing-records', user, overrideAccess: false })

// Hook 中始终传递 req，保证事务原子性
await req.payload.create({ collection: 'audit-log', data, req })

// 用 context 标志防止 Hook 无限循环
if (context.skipHooks) return
await req.payload.update({ ..., context: { skipHooks: true }, req })
```

---

## 许可证

MIT
