# QuietCV

QuietCV 是一个安静、克制、面向 AI 时代的 Markdown 简历工作台。左侧编写结构化 Markdown，右侧预览面向招聘者的 A4 简历，并支持打印或导出 PDF。
<img width="3824" height="2008" alt="image" src="https://github.com/user-attachments/assets/ec3884b5-5ff4-4619-877b-da1ce0733cee" />


## 产品定位

QuietCV 不是传统的在线简历编辑器，而是一个长期自用的职业展示工作台：

- **Markdown 优先**：简历源内容保持可迁移、可维护。
- **招聘者视角**：排版、层级和留白服务于快速阅读与建立信任。
- **A4 分页**：内容超出一页时自然生成多页，而不是强行压缩到一页。
- **单页聚焦**：预览默认只展示当前页，多页时通过底部翻页按钮切换。
- **低干扰 UI**：编辑器和工具栏都尽量安静，让内容成为视觉中心。

## 功能概览

- 左侧：Markdown 简历编辑器。
- 右侧：A4 简历预览。
- 多页：底部显示页码和翻页按钮。
- 导出：右侧工具栏支持打印和导出 PDF。
- 保存：简历内容保存在浏览器 `localStorage`。

## 默认简历模板

默认 Markdown 模板只有一个可信来源：

- `data/default-resume.ts`

该文件导出 `DEFAULT_RESUME_MARKDOWN`，在没有本地保存内容时由 `app/page.tsx` 加载。项目不再保留单独的 `.md` 模板副本，避免两份模板内容漂移。

## 本地开发

```bash
pnpm install
pnpm dev
```

打开：

```text
http://localhost:3000
```

## 发版检查

```bash
pnpm typecheck
pnpm build
```

## 生产运行

```bash
pnpm start
```

## 目录说明

- `app/`：Next.js App Router 页面与全局样式。
- `components/editor/`：Markdown 编辑器。
- `components/preview/`：简历预览与工具栏。
- `components/templates/`：A4 简历渲染模板。
- `data/default-resume.ts`：隐私安全的默认简历内容。
- `lib/parse-resume.ts`：Markdown/frontmatter 解析逻辑。
- `types/resume.ts`：简历数据结构与默认视觉配置。
