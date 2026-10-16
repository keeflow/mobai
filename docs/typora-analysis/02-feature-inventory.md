# 02 功能清单

范围是本机 Typora 1.14.10 里能够从制品确认的功能。优先级的取舍见 `08-feature-priority.md`。证据等级与 `01-application-architecture.md` 相同。本次没有运行应用，所以没有「已通过运行行为验证」的条目。

## A. 编辑器核心

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| 所见即所得编辑表面 | 已通过代码验证（初始 DOM）+ 行为推测 | `index.html` 与 `html/content.html` 都有 `div#write`，`role="textbox"`、`aria-multiline="true"`、占位文案 “Start writing...”。初始 `contenteditable="false"`，页面脚本很可能在首屏后打开编辑。切换时机未运行验证 |
| 源码模式 | 已通过代码验证 | 二进制字面量 `window.File.toggleSourceMode();`、选择子区域名 `com.typora.view.toggleSourceMode` / `exitSourceMode`、`#typora-source`、`main.js` 中 `sourceMode` 96 次。CodeMirror 模式文件提供 Markdown 列表续行 |
| 标题、段落、列表、强调、引用、分隔线、链接、图片、代码、表格、脚注、数学、图表 | 已通过代码验证（资源与字符串） | `main.js` 计数：`table` 641、`math` 968、`footnote` 151、`diagram` 106、`mermaid` 71。样式与模板 id 包含 `md-mathblock-panel`、`md-rawblock-tooltip`、`md-htmlblock-panel`、`table-insert-dialog`。具体语法子集未逐条执行 |
| 数学公式 | 已通过代码验证 | `index.html` 延迟加载 `lib/MathJax4/tex-svg-full.js`，另有 `extensions/xypic.js`。`main.js` 另有少量 `KaTeX` 字符串（2 次），不能据此认为 KaTeX 是当前渲染器 |
| Mermaid / ZenUML | 已通过代码验证 | 样式表直接引用 `lib/diagram/css/mermaid.css` 与 `mermaid-zenuml.css`，脚本为 `mermaid.min.js`（3.1MB）与 `mermaid-zenuml.min.js` |
| 撤销 / 重做 | 基于现象推测 | `main.js` 中 `undo` 1125 次、`redo` 290 次。没有方法体证明它用的是 DOM undo、自有历史栈，还是两者叠加 |
| 快捷键 | 已通过代码验证（存在菜单命令） | 原生命令类 `CommandsBase`、`MenuCommands`、`WordCommands`、`ClipboardCommands`、`ContextMenuCommands`。具体键位在 nib / 菜单里，本次没有展开 nib 动作表 |
| 表情搜索 | 已通过代码验证 | `appsrc/editor/EmojiSearchMap.js` |
| HTML 块、视频占位 | 已通过代码验证 | 模板 `md-html-iframe-preload-temp`、`md-htmlblock-panel-novideo-templ`、`md-htmlblock-panel-nohtml-templ` |
| 字数统计 | 已通过代码验证 | 类 `WordCountButton`、`WordCountPopover`，以及 `_wordCountButton` 约束字符串 |

## B. 文件管理

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| 打开 / 编辑 Markdown 与纯文本 | 已通过代码验证 | `Info.plist` 文档类型。扩展名包括 `md`、`markdown`、`mmd`、`mdown`、`mkd`、`mdwn`、`mdtxt`、`mdtext`、`rmarkdown`、`rmd`、`apib`、`qmd`、`mdx`，以及 `txt` / `text`。文件夹类型角色是 Viewer |
| TextBundle / TextPack | 已通过代码验证 | 类 `TextBundleDocument`，UTI 字符串 `org.textbundle.package`、`io.typora.textbundle`。`main.js` 中 `textbundle` 138 次。`finder-worker.js` 也列出这两种扩展名 |
| 自动保存 | 已通过代码验证（Cocoa API 选择子） | 二进制含 `autosavesInPlace`、`autosaveWithImplicitCancellability:completionHandler:`、`hasUnautosavedChanges`。`main.js` 中 `autosave` 39 次。触发间隔与是否总是原地保存，未运行验证 |
| 最近文件与最近文件夹 | 已通过代码验证 | 字符串 `quickOpen.cacheRecentFiles`、`quickOpen.setRecentFiles`、`quickOpen.setRecentFolders`、`recentFolder`。类 `QuickOpenCommands` |
| 文件树 / 文库 | 已通过代码验证 | `index.html` 有 `#file-library`、`#file-library-tree`、`#file-library-list`、`#switch-to-tree-on-oversize`。类 `LibraryCommands`、`TyFilesOp` |
| 文件搜索 | 已通过代码验证 | 侧栏搜索框支持大小写、整词、正则（`filesearch-case-option-btn` 等）。随包 `lib/bin/arm/rg` 与 `x64/rg`。`main.js` 有 1 处 `ripgrep` |
| 外部修改检测 | 已通过代码验证（类存在） | `DocumentFileWatcher`、`FileChanges`、`DocumentSnap`。比较策略与提示文案的触发条件未反编译 |
| 关闭队列 | 已通过代码验证 | 类 `FileCloseQueue` |
| 快速打开 | 已通过代码验证 | 模板 `typora-quick-open-item-templ`，类 `QuickOpenCommands` |

## C. 编辑体验

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| 实时渲染与源码标记显隐 | 基于现象推测 | `#write` 是富文本角色，源码模式是独立切换。标记在光标处显示、离开后隐藏的具体规则没有运行观察 |
| 聚焦模式、打字机模式 | 已通过代码验证 | 原生直接调用 `toggleFocusMode` / `toggleTypeWriterMode`。设置字符串 `isFocusMode`、`isTypeWriterMode`、`noWarnigForFocusMode`、`noWarnigForTypeWriterMode`。存在退出两者的脚本字面量 |
| 大纲 | 已通过代码验证 | 侧栏标签 `#info-panel-tab-outline`、`#outline-content`、`#toc-content`、`#pin-outline-btn`。原生调用 `togglePanel('outline')`。设置项 `can_collapse_outline_panel` |
| 查找替换 | 已通过代码验证 | `content.html` 有查找图标：大小写、整词、正则 |
| 表格插入对话框 | 已通过代码验证 | `#table-insert-dialog`、`#table-insert-col`、`#table-insert-row` |
| 图片粘贴、复制、移动、缩放、上传 | 已通过代码验证 | 类 `ImageCommands`、`IPicBridge`、`iPicUploader`。字符串包括 `insertLocalImage`、`clipboard.readImage`、`clipboard.writeImage`、`imageStorageFolder`、`copyAllImages`、`moveAllImages`、`zoomImage`。上传前有确认文案，并指向支持文档的 per-document YAML 设置 |
| 粘贴 / 拖放 | 已通过代码验证（字符串密度） | `main.js` 中 `paste` 107 次、`drop` 125 次，另有 `clipboard.processClipboardHTML`。路径重写规则未运行验证 |
| 缩放提示 | 已通过代码验证 | `#zoom-hint` 及 in/out/reset |
| 拼写检查 | 已通过代码验证 | `#write` 带 `spellcheck="true"` |

## D. 外观

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| 内置主题 | 已通过代码验证 | `style/themes/` 下 github、gothic、newsprint、night、pixyll、whitey。night 另有 `codeblock.dark.css`、`sourcemode.dark.css`、`mermaid.dark.css` |
| 自定义 CSS | 已通过代码验证 | 空 link `#base_user_css`、`#theme_user_css`。主题 Readme 指向自定义 CSS 与主题安装说明，并写明内置 CSS 会在更新时被替换 |
| 深色源码/代码块样式 | 已通过代码验证 | `night/sourcemode.dark.css`、`night/codeblock.dark.css` 文件存在。是否只在 night 主题加载，未运行验证 |
| 编辑宽度、字体、macOS 窗口控件 | 基于现象推测 | 有 `style/mac.css`、`style/base.css`、`style/window.css`。具体设置项在偏好设置包里，该包语义图不完整 |
| 偏好设置窗口 | 已通过代码验证 | 类 `Setting`、`SettingCommands`、`WKPreferenceController`。页面 `page-dist/setting.html` 加载 `Preferences.*.js`（294KB） |

## E. 导入与导出

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| PDF | 已通过代码验证 | 类 `TyPDFEngine`。导入 `PDFDocument`、`PDFOutline`、`PDFDestination`，以及一组 `CGPDFContext*`。字符串含 `Typora, macOS, Quartz PDFContext`、`pdfHeader`、`pdfFooter`、`exportPDF.noRewriteHttpLink` |
| HTML | 已通过代码验证 | 菜单字符串 “HTML (without styles)”、`copyAsSemanticHTML`、`copyAsHTMLSource`、`html-plain`、`%u.html` |
| Word、LaTeX、EPUB | 已通过代码验证（依赖外部 Pandoc） | 菜单字符串 “MS Word (.docx)”、“LaTeX (.latex, .tex, .ltx)”、“EPUB (.epub)”。另有 `epub2`、`epub3`、`latex-pdf`。提示 “Pandoc is needed for importing these file formats”，以及 `pandocPath`、`which pandoc`、`updatePandocPath` |
| Pandoc Markdown 方言片段 | 已通过代码验证 | 字面量 `gfm-smart+tex_math_dollars-fenced_divs-bracketed_spans-raw_html` |
| RTF | 基于现象推测 | `main.js` 中 `rtf` 24 次。没有对应的原生菜单字符串被抽到，不能确认它是导出格式还是粘贴板格式 |
| 导入面板 | 已通过代码验证 | 类 `ImportPanelAccessoryView` |
| 打印 | 已通过代码验证 | `PrintPanelAccessory.nib`、类 `PrintPanelAccessoryController`，以及 PDF 上下文字符串 |

## F. 更新、许可与平台集成

| 功能 | 证据等级 | 依据 |
| --- | --- | --- |
| Sparkle 自动更新 | 已通过代码验证 | Podfile、`SUUpdater`、`SUFeedURL` = `https://typora.io/releases/macos.xml`、`SUEnableAutomaticChecks` true。类 `Updater` |
| 许可证 | 已通过代码验证 | `LicenseManager`、`LicenseWindowController`，页面 `page-dist/license.html` |
| 触控栏 | 已通过代码验证 | `TyTouchBar`、`TouchbarCommands`，以及 `MockNSTouchBar` |
| AppleScript | 已通过代码验证 | `NSAppleScriptEnabled` 为 1。可脚本化的命令表未读 |
| 任意网络加载 | 已通过代码验证 | `NSAllowsArbitraryLoads` true |
| 第三方图床 iPic | 已通过代码验证 | `IPicBridge`、`iPicUploader`、`images.doSetImageCopyToIPic` |

## 暂时无法确认

- 每个 Markdown 构造在光标进入/离开时标记如何显隐。
- 大文档是否虚拟化，滚动时大纲如何节流。
- 自动保存的秒数、冲突副本的命名。
- `frame.js` 在 macOS 上是否被加载。它与 `main.js` 哈希不同，`index.html` 只引用 `main.js`。
- 偏好设置里每一项的默认值。设置包已解析，语义图被堆限制截断。
