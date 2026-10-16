# 07 技术结论

## 已验证事实

1. 本机 `/Applications/Typora.app` 版本 1.14.10（build 7786）是通用 macOS 可执行文件，不是 Electron。REA 绑定 arm64 切片，SHA-256 `71aebecaac7b21965c541113b6e0d9b792a095f44aa487a0a6366f224fcbb83a`。
2. 壳是 Cocoa 文档应用：`TyApplication` + `Document` + AppKit 菜单。编辑页是 WebKit（`WKWebView`，同时链接了旧 `WebView`）。
3. 原生与页面通过 `WKWebViewJavascriptBridge` / `WebViewJavascriptBridge`、`WKScriptMessageHandler` 和 `evaluateJavaScript*` 通信。菜单命令以 JavaScript 字面量调用 `window.File`。
4. 编辑 UI 资源在 `Contents/Resources/TypeMark`。主页面 `index.html` 加载 `appsrc/main.js`。可视根是 `#write`，源码根是 `#typora-source`。
5. 数学脚本是 MathJax 4 的 `tex-svg-full.js`。图表脚本是 Mermaid 与 ZenUML。源码续行使用随包 CodeMirror 模式。
6. PDF 由本进程的 `TyPDFEngine` 加 PDFKit/Quartz 生成。Word、LaTeX、EPUB 依赖用户安装的 Pandoc，包内没有 pandoc 二进制。
7. 内容搜索带了 ripgrep（arm 与 x64）。文件监视在原生侧有 `DocumentFileWatcher`。
8. 更新组件是 Sparkle。偏好设置、欢迎和许可证是独立的 `page-dist` 页面。
9. REA 对 `appsrc` 与 `page-dist` 的 JavaScript 解析没有语法失败。两个大包的语义图都因为隔离 worker 堆耗尽而不完整。

## 推测（有静态依据，未运行）

- 可视编辑改的是块 DOM，保存时序列化成 Markdown。`marked` 参与解析或粘贴，DOMPurify 处理 HTML。没有 Turndown / markdown-it 文件名。
- `#write` 初始不可编辑，脚本就绪后才会打开 `contenteditable`。
- 自动保存走 `NSDocument` 原地保存，页面负责提供最新 Markdown。
- macOS 不执行 `finder-worker.js`。该文件是 Node 文件监视器，原生二进制没有引用它。
- `frame.js` 是另一份编辑器包，主页面没有引用它。它可能服务其他窗口形态或其他平台资源布局。

## 未知

- `Document`、`DocWebView`、`CommandBridge` 的方法体。本机没有可用的 Ghidra、Hopper 或 IDA。本次没有安装反编译器，也没有重试。
- 光标进入加粗、斜体、链接、行内代码、列表时，`.md-expand` 是否都会加上。CSS 规则和模块 `61` 的类名已验证，运行时被许可证对话框挡住。
- macOS 上 Cocoa 自动保存的实际秒数。页面里的 10 分钟定时器只在 `window.reqnode` 存在时注册。
- 外部修改冲突策略、图片默认目录名。
- Markdown 往返是否保留标记风格和空行。
- 设置页每个控件的默认值。

## 补充静态分析的边界

`main.js` 仍是 1,692,606 字节的单行包，内有 88 个 `System.registerDynamic` 模块。当前 REA 模式不能按 `source_paths` 挑选文件，也不能把单个 `.js` 当输入格式。为了避免重跑已经失败的整包语义分析，只把与光标、标记和保存相关的 15 个模块抽到临时目录再分析。

结果：15 个文件全部解析成功，0 个语法错误，读入 339,440 字节。父结果预算约 2GB 用尽后，`mod_3c.js`、`mod_48.js`、`mod_4b.js`、`mod_4d.js`、`mod_51.js`、`mod_60.js` 的语义图被截断，静态清单仍保留。证据 `ev_a0a9dd1e81ffaa36055c0c3234c5be1a7309d7402b7a85f97c7a35b7be1925e2`。对 `autoSaveTimer` 的 trace 是 `no-match`，不能当成该字符串不存在。没有第二次提高内存重试。临时切片已删除，仓库里没有 Typora 源码。

## 开源库能覆盖的部分

| 观察到的能力 | 独立实现 |
| --- | --- |
| 窗口、菜单、文件对话框 | Electron |
| 编辑器状态 | Vue 3 + Pinia |
| 界面 | Vite + Tailwind |
| 块级所见即所得与选区 | 见下一节的编辑器内核比较 |
| 源码模式与列表续行 | CodeMirror 6 |
| Markdown 解析辅助 | markdown-it 或 remark，外加自己的序列化测试 |
| HTML 消毒 | DOMPurify |
| 数学 | MathJax 或 KaTeX |
| 图表 | Mermaid |
| 代码高亮 | Shiki 或 highlight.js。Typora 主包没有绑定 Prism |
| 文件夹搜索 | 小型项目可先用文件名过滤；需要内容搜索时再调用系统或随包 ripgrep |
| PDF | Electron 打印到 PDF。不必链接 PDFKit |
| Word / EPUB | 可选调用用户自己的 Pandoc，缺失时隐藏入口 |

必须自己写的部分：

- Markdown 块模型与序列化，尤其是表格、任务列表、脚注和数学分隔符的往返。
- 光标附近显示标记、离开后隐藏的交互。这是体验核心，现成编辑器只提供选区 API，不提供 Typora 的块状态机。
- 图片落到文档相对目录，以及未保存文件时的提示。
- 自动保存、崩溃恢复和外部修改提示。
- 大纲与正文滚动的联动。
- 主题 CSS 的加载槽。主题文件自己编写，不复制 Typora 的 CSS。

不移植的部分：Sparkle 更新、许可证、iPic、AppleScript、触控栏、`typora://` 协议、Typora 图标与文案。

## 编辑器内核比较

比较对象是提示词列出的四个方案。结论服务于个人编辑器，不表示 Typora 内部使用了其中任何一个。Typora 的主包没有 ProseMirror、Tiptap、Milkdown 或 CodeMirror 6 的包名；它使用的是自有 DOM 编辑器和 CodeMirror 5 风格的模式文件。

| 标准 | Tiptap | ProseMirror | Milkdown | CodeMirror 6 |
| --- | --- | --- | --- | --- |
| Markdown 双向转换 | 有官方 Markdown 扩展，序列化要加测试才能保住表格和标记风格 | 同一套文档模型，序列化由自己或社区插件完成，控制力最强 | 以 remark 为中心，Markdown 是一等输入 | 优秀的 Markdown 源码编辑，不是块级所见即所得 |
| 所见即所得 | 高，命令和节点视图清楚 | 高，但是 API 更低级 | 高，插件以 remark 语法为单位 | 低。它是代码编辑器 |
| 光标与选区 | 直接使用 ProseMirror Selection | 最完整 | 间接使用 ProseMirror | 完整，但是文本坐标 |
| 表格 | 官方表格扩展，能合并单元格和键盘操作 | 官方 tables 模块 | 有表格插件，复杂操作较少 | 没有文档表格，只有文本表格 |
| 扩展 | Vue 友好，扩展数量多 | 最稳，但样板多 | 与 remark 生态一致 | 语言模式与装饰很强 |
| 大文档 | 与 ProseMirror 相同，需要自己避免整篇重解析 | 文档结构局部更新，适合大文档 | 多一次 remark AST，大文档更吃解析 | 源码大文档表现好，不能替代块编辑 |
| 格式保真 | 取决于 Markdown 扩展配置，默认会规范化 | 可以在节点 attrs 里保存原始标记，保真最好控制 | remark 往返会规范化 | 保真最好，因为不离开源码 |
| 长期维护 | 版本跟随 ProseMirror，Vue 3 集成成本低 | 维护面最小，学习成本最高 | 项目层数多，排错要跨 Milkdown、ProseMirror、remark | 只适合作为源码模式 |

选择：**Tiptap（底层即 ProseMirror）做可视编辑，CodeMirror 6 做源码模式。**

依据：

- 个人编辑器要求所见即所得、表格和选区。CodeMirror 单独做不到块级编辑。
- 直接用 ProseMirror 能达到同样的保真上限，但命令、历史和 Vue 绑定都要自写。Tiptap 这些已经有稳定封装，底层仍可在保真不够时写入节点 attrs。
- Milkdown 的 remark 往返对空行和标记风格更不透明，出了丢字问题时调用栈更长。
- Typora 本身把源码模式做成另一层。个人编辑器同样把 CodeMirror 留在源码模式，避免强行用一个引擎覆盖两种坐标。

这个选择不复制 Typora 的 `main.js`。

## 建议的技术栈落地

提示词优先的栈可以成立，而且和上面的内核不冲突：

- Electron：文件、窗口、菜单、外部修改监视
- Vue 3 + Pinia：侧栏、大纲、设置、文档状态
- Vite + TypeScript + pnpm
- Tailwind：应用壳。文档排版用单独的编辑器 CSS，避免工具类污染 Markdown 预览
- Tiptap + CodeMirror 6
- DOMPurify、MathJax 或 KaTeX、Mermaid 放到 P1/P2，不放进第一次可保存的闭环

## 分析限制与下一步证据

| 限制 | 补法 |
| --- | --- |
| 无原生反编译器 | 安装 Ghidra 12.1，或安装 Hopper。分析前把通用二进制切成 arm64 薄切片 |
| JS 语义图被 2GiB 堆截断 | 用 `max_heap_mb` 8192 或 16384 重跑 `appsrc`。当前工具不能按文件子集分析，重跑仍会同时处理两个 1.6MB 包 |
| 无运行观察 | 用临时文件打开 Typora，只读检查 DOM 与保存结果 |

在这些补证完成前，实现计划应以本目录已验证的行为为上限，不把推测写成验收条件。
