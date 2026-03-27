# Ji-Key 开发规范

**项目**：多用户打字练习 Web 应用，单管理员架构。  
**技术栈**：Payload CMS 3.x + Next.js 16 + React 19 + TypeScript 5.7 + SQLite。

---

## 构建 / 开发命令

```bash
pnpm dev                  # 启动开发服务器 (localhost:3000)
pnpm devsafe              # 清除 .next 缓存后启动
pnpm build                # 生产构建
pnpm lint                 # ESLint 检查
tsc --noEmit              # TypeScript 类型检查（修改代码后必须执行）
pnpm generate:types       # 修改 Collection / Global schema 后必须执行
pnpm generate:importmap   # 新增或修改 admin 组件后必须执行
```

**安装依赖必须使用 `bun add`，禁止直接编辑 package.json。**

---

## 测试命令

```bash
pnpm test              # 运行全部测试（集成 + E2E）
pnpm test:int          # 仅运行集成测试（Vitest）
pnpm test:e2e          # 仅运行 E2E 测试（Playwright / Chromium）

# 运行单个集成测试文件
pnpm test:int -- tests/int/api.int.spec.ts

# 运行单个 E2E 测试文件
pnpm test:e2e -- tests/e2e/admin.e2e.spec.ts

# 运行特定测试（按名称过滤）
pnpm test:int -- --reporter=verbose -t "test name pattern"
```

测试文件约定：`*.int.spec.ts`（集成），`*.e2e.spec.ts`（E2E）。  
E2E 测试需要本地已运行 `pnpm dev`（`http://localhost:3000`）。

---

## 项目结构

```
src/
├── app/
│   ├── (frontend)/        # 前台页面（打字练习、统计、用户页）
│   └── (payload)/         # Payload admin 路由（自动生成，勿手动修改）
├── collections/           # Payload Collection 配置（每个集合独立文件）
├── globals/               # Payload Global 配置
├── components/            # 自定义 React 组件
│   ├── ui/                # 通用 UI 原子组件
│   └── typing/            # 打字相关业务组件
├── hooks/                 # Payload Hook 函数
├── access/                # 访问控制函数
└── payload.config.ts      # 主配置（数据库: SQLite，路径别名 @payload-config）
```

路径别名：`@/` → `src/`，`@payload-config` → `src/payload.config.ts`。

---

## 代码风格（Prettier + ESLint）

```
singleQuote: true   trailingComma: all   printWidth: 100   semi: false
```

- **单引号**，**无分号**，**尾随逗号**，**最大行宽 100**
- 保存时自动格式化（VSCode 已配置）
- 前缀 `_` 的变量/参数会被 `no-unused-vars` 规则忽略，例如 `_req`
- 所有 TypeScript 规则为 `warn` 级别（不阻断构建，但必须修复）

---

## TypeScript 规范

- `strict: true`，所有代码必须通过 `tsc --noEmit`
- 从生成的 `src/payload-types.ts` 导入类型，不要手写等效类型
- 使用 `import type` 导入纯类型，与值导入分开
- 禁止使用 `any`（ESLint 会警告），改用 `unknown` + 类型收窄
- 集合 slug 定义后直接使用字符串常量，不使用魔法字符串

```typescript
// ✅ 正确
import type { CollectionConfig, Access } from 'payload'
import type { User } from '@/payload-types'

// ✅ 用户类型
const access: Access = ({ req: { user } }) => {
  const typedUser = user as User | null
  return typedUser?.role === 'admin'
}
```

---

## 命名规范

| 类型              | 规范                         | 示例                                      |
| ----------------- | ---------------------------- | ----------------------------------------- |
| 组件 / 类         | PascalCase                   | `TypingArea`, `ProgressChart`             |
| 函数 / 变量       | camelCase                    | `getWPM`, `isLoggedIn`                    |
| 常量              | SCREAMING_SNAKE 或 camelCase | `MAX_RETRIES`, `defaultTimeout`           |
| Collection slug   | kebab-case 字符串            | `'typing-records'`, `'articles'`          |
| 文件（组件）      | PascalCase.tsx               | `TypingArea.tsx`                          |
| 文件（工具/配置） | camelCase.ts                 | `accessControl.ts`                        |
| Collection 配置   | PascalCase 导出              | `export const Articles: CollectionConfig` |

---

## 安全关键规则（必须遵守）

**1. Local API 访问控制**

```typescript
// ❌ 安全漏洞：即使传了 user，默认绕过访问控制
await payload.find({ collection: 'typing-records', user })

// ✅ 正确：强制执行用户权限
await payload.find({ collection: 'typing-records', user, overrideAccess: false })
```

**2. Hook 中传递 req（事务安全）**

```typescript
// ✅ 始终在 hook 的嵌套操作中传递 req，保证原子性
await req.payload.create({ collection: 'audit-log', data, req })
```

**3. 防止 Hook 无限循环**

```typescript
// ✅ 用 context 标志跳过递归触发
if (context.skipHooks) return
await req.payload.update({ ..., context: { skipHooks: true }, req })
```

---

## 前台 UI 设计规范

- 使用组件库开发（推荐 shadcn/ui 或 Radix UI），通过 `bun add` 安装
- **禁止任何渐变色**（background、border、text 均不允许 CSS gradient）
- 配色方案：精致简洁，遵循 2025/26 设计趋势（高对比度、极简、大字体、充足留白）
- 打字区域、统计图表等组件须保证移动端可用性
- 未登录用户可免费练习，登录后才展示统计数据和历史记录

---

## 业务架构说明

- **用户角色**：`admin`（单一）、`user`（多用户）
- **免登录访问**：前台打字功能完全开放，成绩仅本地暂存
- **登录后**：记录每次练习（WPM、准确率、时长、文章）、提供统计看板
- **文章管理**：后台支持手动录入 + 可选自动爬取，支持中英文
- **Collections 规划**：`users`、`articles`（文章库）、`typing-sessions`（练习记录）、`media`

---

## Payload 关键约定

- **数据库**：SQLite（`@payloadcms/db-sqlite`），本地文件 `ji-key.db`
  - SQLite 默认禁用事务，需要事务时显式配置 `transactionOptions: {}`
  - 不支持 Point 字段类型
- Schema 变更后必须按顺序执行：`pnpm generate:types` → `pnpm generate:importmap`
- Admin 组件路径相对于项目根目录，使用字符串路径而非直接 import
- 后台 (`/admin`) 仅 admin 角色可访问，通过 `users.admin.access` 限制

---

## 参考文档

- Payload 文档：https://payloadcms.com/docs
- `.cursor/rules/` 目录：各模块详细规范（collections、hooks、access-control 等）
- 安全关键规则：`.cursor/rules/security-critical.mdc`
