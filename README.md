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
- **可商用开源字体**：编辑、预览和打印统一使用随项目自托管的 Google Noto 开源字体。

## 功能概览

- 左侧：Markdown 简历编辑器。
- 右侧：A4 简历预览。
- 多页：底部显示页码和翻页按钮。
- 导出：右侧工具栏支持打印和导出 PDF。
- 保存：简历内容保存在浏览器 `localStorage`。
- 备份：支持导出、导入和清空本地数据。

## 数据与安全

- 简历正文、排版设置和上传照片仅保存在当前浏览器的 `localStorage`，不会上传到服务端。
- Markdown 预览只支持有限的 inline 格式；链接仅允许 `http`、`https`、`mailto` 和 `tel` 协议。
- 上传照片限制为 JPG、PNG 或 WebP，单张不超过 5MB。
- 简历照片仅允许上传后的 `data:image/*` 或站内 `/public` 静态资源，不加载远程图片 URL。
- 生产部署会通过 `_headers` 设置基础安全响应头，包括 CSP、Referrer-Policy、Permissions-Policy 和 frame 防护。

## 字体策略

QuietCV 自托管 Google Noto 字体，统一中文编辑、预览和打印效果：

- 编辑器：英文与代码符号优先使用 `Noto Sans Mono`，中文 fallback 到 `Noto Sans SC`。
- 简历预览：根据简历 `language` 自动调整字体候选；中文简历只展示思源黑体、思源宋体，海外简历只展示 Noto Sans、Noto Serif 和 Noto Sans Mono。
- 字体来源：使用项目已自托管的 `Noto Sans SC`、`Noto Serif SC`、`Noto Sans`、`Noto Serif` 和 `Noto Sans Mono`，不引用微软雅黑、苹方等系统/商业字体名。
- 授权：字体文件使用 SIL Open Font License 1.1，适合开源与商业使用；授权文本见 `public/fonts/OFL.txt`。

## AI 功能方向

后续 AI 能力会围绕简历写作工作流逐步扩展，优先保持内容可控、可回滚、可解释：

- 基于岗位 JD 的简历匹配分析与改写建议。
- 中文/英文版本互译与语气统一。
- 经历 bullet 的 STAR/结果导向改写。
- ATS 关键词覆盖检查。
- 多版本简历管理与差异对比。

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
pnpm check
```

等价于：

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
