# 墨白

个人用的 Markdown 桌面编辑器。本地打开、编辑、整理 `.md` 文件，不依赖云端，也不加载第三方插件。

## 能做什么

- **双模式编辑**：所见即所得（Tiptap）与源码模式（CodeMirror）随时切换
- **本地文件**：打开单个 Markdown、打开文件夹、最近文件 / 最近文件夹
- **侧栏**：文件列表、大纲跳转、最近记录、文件夹内搜索（区分大小写 / 整词 / 正则）
- **常用语法**：标题、加粗 / 斜体 / 删除线、高亮 `==…==`、列表、待办、引用、代码块、表格、链接、脚注、Front Matter
- **公式与图**：行内 / 块级 KaTeX（`$…$` / `$$…$$`）、Mermaid 图
- **图片**：拖放、粘贴或选择插入；PNG / JPEG / GIF / WebP；可复制或移动到文档旁的资源目录
- **写作辅助**：聚焦模式、打字机模式、查找替换、快速打开、字数统计、浅色 / 深色主题、用户 CSS
- **导出**：HTML、PDF、打印；Word / EPUB / LaTeX（需本机 [Pandoc](https://pandoc.org/installing.html)）
- **TextBundle**：打开 / 保存 TextBundle，也可打开 `.textpack`
- **稳妥保存**：原子写入、自动保存、外部修改检测、崩溃恢复

文档需先保存到磁盘后，才能把图片落到相对路径；未安装 Pandoc 时，Word / EPUB / LaTeX 导出不可用（应用不会自带 Pandoc）。

## 技术栈

Electron · Vue 3 · Pinia · Tiptap · CodeMirror · KaTeX · Mermaid · Vite（electron-vite）· Tailwind CSS · TypeScript · Vitest

## 开发

需要 [Node.js](https://nodejs.org/) 与 [pnpm](https://pnpm.io/)。

```bash
pnpm install
pnpm dev
```

其它常用命令：

```bash
pnpm test        # 单元测试
pnpm typecheck   # 类型检查
pnpm build       # 构建到 out/
pnpm preview     # 预览构建结果
pnpm dist:mac    # 打包 macOS arm64 .dmg 到 release/
pnpm site        # 本地预览宣传官网（website/）
```

## 安装包

```bash
pnpm dist:mac
```

产物在 `release/`，例如 `mobai-0.3.0-arm64.dmg`（未公证；本机可右键「打开」或在系统设置中允许）。

## 宣传官网

静态站点在 `website/`，可直接打开 `website/index.html`，或运行 `pnpm site` 本地预览。

线上地址（GitHub Pages）：[https://keeflow.github.io/mobai/](https://keeflow.github.io/mobai/)

推送 `website/` 或手动触发 Actions workflow `Deploy GitHub Pages` 即可更新站点。安装包通过 [GitHub Releases](https://github.com/keeflow/mobai/releases) 分发，不放进 Pages。

## 目录结构

```
src/
  main/        Electron 主进程（文件、库、导出、IPC）
  preload/     预加载桥接
  renderer/    Vue 界面与编辑器
  shared/      主进程与渲染进程共用逻辑
resources/     图标与品牌资源
website/       宣传官网
build/         打包图标等资源
tests/         Vitest 测试
docs/          设计与分析笔记（非运行时）
```

## 说明

- 命令与菜单是静态列表，**不加载 Typora 式第三方插件**
- 图片相对路径通过 `media://` 协议读取，且限制在已打开文件 / 文件夹的允许根目录内
- HTML 块预览会去掉不安全内容；Mermaid 使用严格安全级别
- 仅支持 UTF-8 文本；非 UTF-8 文件会拒绝打开

## 许可

私人项目，暂未声明开源许可证。
