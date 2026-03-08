# PicknPrompt

一个面向 `Edge / Chrome` 的 AI 对话扩展：用户可在网页中选中文本或图片，加入暂存区，再从暂存区勾选上下文发起对话。

## 技术栈

- `WXT + React + TypeScript + Manifest V3`
- `antd + @ant-design/x + @ant-design/x-markdown`
- `Zustand + Dexie + chrome.storage.local`
- `OpenAI Responses API` 兼容通信

## 已实现的 v1 能力

- 模型配置：本地保存多个 OpenAI 兼容模型配置，支持连通性测试
- 助手配置：支持默认助手与快捷助手
- 暂存区：支持文本与图片采集、筛选、多选、导出
- 对话区：支持上下文勾选、流式返回、Markdown 渲染
- 快捷助手：网页内一键开始对话，自动打开侧栏并发起首轮请求
- 会话导入导出：支持 `Markdown + YAML frontmatter`，带图片时导出为 ZIP

## 目录结构

- `entrypoints/`：扩展入口（background / content / sidepanel / options）
- `src/shared/`：领域类型、仓储、存储、网关、导入导出
- `src/sidepanel/`：侧栏 UI
- `src/options/`：管理页 UI
- `src/content/`：网页内浮条采集 UI
- `src/background/`：后台消息与右键菜单

## 本地开发

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck
npm run test:run
npm run build
```

## 加载扩展

开发模式或构建完成后，将以下目录作为“已解压扩展”加载：

- 开发：WXT dev 输出目录
- 生产构建：`.output/chrome-mv3`

## 注意事项

- 图片上下文仅在所选模型声明 `supportsVision = true` 时允许发送
- 浏览器内建页、扩展商店页等受限页面不会注入内容脚本
- 所有数据默认仅保存在本地浏览器存储中
