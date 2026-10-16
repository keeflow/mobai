# 03 编辑交互

这里回答提示词里的 8 个交互问题。能从制品直接读到的写成已验证；需要运行才能看见的写成推测或未知。

## 1. 输入之后编辑器如何更新

已通过代码验证的表面：

- 编辑根节点是 `div#write`。初始类名含 `ty-before-first-render`，角色是多行 textbox，占位文案是 “Start writing...”。
- 初始属性是 `contenteditable="false"`。同页另有若干 `contenteditable="false"` 的数学/原始块面板。
- 主逻辑在 `appsrc/main.js`（1,692,606 字节，SHA-256 `8e716a084097a976ab9ed8ea06d8f0b505f14a8dc0c022b3dc1a09a741225e16`）。`index.html` 用 `defer` 加载它。

基于现象推测：首屏脚本去掉 `ty-before-first-render` 后把 `#write` 设为可编辑。输入进的是 DOM，而不是一个隐藏的 Markdown textarea。源码模式才切到 `#typora-source` 里的 CodeMirror。

暂时无法确认：每次按键是就地改 DOM，还是先改一份 Markdown 模型再整段重绘。`main.js` 的语义图在堆耗尽时中断，没有恢复出输入事件到渲染函数的调用链。

## 2. Markdown 源码与可视化内容如何转换

已通过代码验证：

- 存在独立源码模式。原生菜单调用 `window.File.toggleSourceMode()`，退出时调用 `window.updateUIAfterExitSourceMode`。
- `#typora-source` 初始 `z-index:-1`，源码层默认藏在可视层下面。
- `lib/codemirror/mode.min.js` 注册了 `newlineAndIndentContinueMarkdownList`，正则覆盖引用、任务列表、无序列表和有序列表。
- `main.js` 含 `marked` 49 次、`DOMPurify` 12 次，没有 `markdown-it`、`turndown`、`highlight.js`、`prism`。
- 数学由页面延迟加载的 MathJax 4 `tex-svg-full.js` 承担。图表资源是 Mermaid。

基于现象推测：可视模式把 Markdown 保持在块级 DOM 上，序列化回 Markdown 时走自有 writer，而不是把整页 HTML 交给 Turndown。`marked` 更像解析或粘贴入口。DOMPurify 用于不可信 HTML。这是字符串共现，不是调用图。

暂时无法确认：往返是否保留原始空行、引用样式（`*` 与 `_`）、表格对齐和未知 HTML。

## 3. 修改标题、列表、表格时如何保持结构

已通过代码验证：

- 表格有插入对话框 `#table-insert-dialog`，字段为列数与行数。
- CodeMirror Markdown 模式把列表标记和缩进写进续行命令，说明源码模式会延续列表结构。
- `main.js` 里表格与列表相关字符串密度很高，但 REA 没有抽出对应函数。

基于现象推测：可视模式按块维护结构（标题块、列表块、表格块）。在块内回车时，编辑器改 DOM 结构，而不是让浏览器自由拆文本节点。表格的行列操作走专门对话框和命令，而不是手改 Markdown 管道符。

暂时无法确认：嵌套列表、松散列表、表格单元格里的多行内容如何序列化。

## 4. 光标如何在标记与渲染内容之间切换

已通过代码验证的只有模式开关，没有光标状态机：

- 可视层 `#write` 与源码层 `#typora-source` 是两套节点。
- 设置里存在 `fromSourceMode`、`exitFocusAndTypewriterMode`。
- 聚焦模式和打字机模式由 `File.editor.updateFocusMode` / `setTypeWriterMode` 更新。原生在某些路径会把两者都关掉。

基于现象推测：Typora 式「光标所在块显示 Markdown 标记，离开后只留渲染结果」发生在 `#write` 内部，不需要进入完整源码模式。源码模式是整篇切换。

暂时无法确认：选区跨块、IME 组字、表格单元格之间的光标移动。这些必须在运行中的页面里看 selection 与块 class。

## 5. 图片粘贴后如何处理路径

已通过代码验证的原生字符串：

- `clipboard.readImage`、`clipboard.writeImage`
- `window.File.editor.imgEdit.insertLocalImage()`
- `images.doSetImageCopyToFolder`、`images.doRemoveImageCopyToFolder`、`images.doSetImageRootPath`
- `image_save_location`、`defaultImageStorage`、`custom_image_save_location`
- 提示文案：会把新插入的图片复制到所选相对路径，因此需要先保存文件
- `applyImageMoveForWeb`、`no_image_move_for_local`、`apply_image_move_for_web`
- iPic：`images.doSetImageCopyToIPic`，类 `IPicBridge`
- 上传前确认第三方程序会拿到本地图片路径

基于现象推测：粘贴图片时原生侧先把位图写入临时文件或目标文件夹，再让页面插入带相对路径的图片节点。未保存文档不能解析相对目录，所以会先要求保存。Web 导出与本地文档用不同的「是否搬移图片」开关。

暂时无法确认：默认文件夹名、重名时的后缀、以及拖入已有文件时是复制还是引用。

## 6. 自动保存如何触发

已通过代码验证：

- Cocoa 文档选择子 `autosavesInPlace`、`autosaveWithImplicitCancellability:completionHandler:`、`hasUnautosavedChanges`。
- 页面脚本里也有 `autosave` 字符串（39 次）。

页面里另有一套定时器，只在 `window.reqnode` 存在时以 600000 毫秒运行。macOS 二进制没有这个符号。基于现象推测：macOS 写盘走 `NSDocument`，页面负责把当前 DOM 序列化后交给文档对象。细节在 `05-file-management.md` 与 `09-supplement-runtime-and-modules.md`。

尚未确认：Cocoa 自动保存的秒数、失去焦点是否强制保存、自动保存与用户「保存」是否同一路径。本次运行被许可证对话框挡住，没有测到写盘。

## 7. 外部文件修改

已通过代码验证：

- 类 `DocumentFileWatcher`、`FileChanges`、`DocumentSnap`、`FileCloseQueue`。
- 资源里另有 `finder-worker.js`，用 `chokidar` 监听 `add` / `change` / `unlink` / `addDir` / `unlinkDir`。原生二进制没有 `finder-worker` 或 `chokidar` 字符串。

基于现象推测：当前 macOS 进程用 `DocumentFileWatcher` 监视已打开文件。`DocumentSnap` 可能保存打开时的快照，用来区分本地未保存修改和外部修改。Node worker 属于同一资源树里的另一宿主。

暂时无法确认：冲突时是提示重新加载、自动合并，还是生成副本。

## 8. 大纲与正文定位

已通过代码验证：

- 侧栏分段控件在文件与大纲之间切换：`#sidepanel-segmented-input-files`、`#sidepanel-segmented-input-outline`。
- 大纲容器 `#outline-content`、`#toc-content`，可固定 `#pin-outline-btn`，可过滤 `#close-outline-filter-btn`。
- 原生调用 `File.editor.library.togglePanel('outline')`。
- 设置字符串 `can_collapse_outline_panel`。

基于现象推测：大纲从标题块生成，点击条目滚动 `#write`。过滤是前端对大纲 DOM 的筛选。没有虚拟列表的证据。

暂时无法确认：滚动正文时当前标题如何高亮，以及代码块里的 `#` 会不会被算进大纲。

## 其他已见到的交互

| 交互 | 等级 | 说明 |
| --- | --- | --- |
| 查找替换 | 已通过代码验证 | 大小写、整词、正则三个图标 |
| 复制为 HTML | 已通过代码验证 | `copyAsSemanticHTML` 与 `copyAsHTMLSource` 是两个命令 |
| 缩放 | 已通过代码验证 | `#zoom-hint-in/out/reset` |
| 进入模式警告 | 已通过代码验证 | 模板 `ty-enter-mode-warning-temp`，可抑制。与聚焦/打字机的 `noWarnig*` 设置对应（制品里的拼写就是 `Warnig`） |
| 快速打开 | 已通过代码验证 | 最近文件缓存命令 `quickOpen.cacheRecentFiles` |

## 补充：标记显隐的静态机制

已通过静态分析验证。位置都在 `appsrc/main.js`（1,692,606 字节，单行，88 个 `System.registerDynamic` 模块）。没有重跑整文件语义分析。

| 现象 | 位置 | 证据 |
| --- | --- | --- |
| 标记字符放在 `.md-meta` 节点里，默认 `display:none` | `style/base-control.css` 规则 `.md-meta` | 样式表属性，不是运行截图 |
| 带 `.md-expand` 或 `.md-expand-on-selection` 时，`.md-meta` 变为 `display:inline` | 同文件中 `.md-empty .md-meta, .md-expand .md-meta` 与 `.md-expand-on-selection .md-meta` | 光标展开和选区展开是两套类 |
| 聚焦块使用 `.md-focus`，并记录 `focusCid` | 模块 `61`，文件偏移 1612946；`md-focus` 的 `hasClass` / `addClass` 在偏移 1625160、1625465 | 聚焦类和标记显隐类不是同一个 |
| 图片在最近的 `.md-image` 上切换 `.md-expand` | 模块 `61`，偏移 1636565 附近 | 只证明图片有这套类，不证明标题、加粗相同 |
| 未锁定时 `#write` 对应的 `writingArea` 被设为 `contenteditable=true`，子节点先被设为 false | 模块 `61`，偏移 1617872 | 初始 HTML 里的 `contenteditable="false"` 会被脚本改写 |
| 行内标记的 DOM 骨架包含 `md-meta`、`md-before` | 模块 `30`，偏移 850386；`md-meta` 约 50 次 | 标记是独立节点，不是同一文本节点里的字符 |
| h3–h6 获得 `.md-focus` 时，用 CSS `content` 显示 `h3` 这类标签，而不是把 `#` 写回文本 | `base-control.css` 中 `h3.md-focus:before` 等 | 标题的「标记」至少有一部分是焦点标签 |

基于现象推测：加粗、斜体、链接、行内代码也把 `*`、`_`、`[]()`、反引号放进 `.md-meta`，光标进入时给该节点加 `.md-expand`，离开时去掉。选区则加 `.md-expand-on-selection`。这个类名机制已验证，每种节点是否都走同一函数尚未从调用图证明。模块 `61` 的语义图因结果体积上限被截断。

## 补充：运行时测试没有进入编辑器

已通过运行时测试验证的只有许可证门和「打开未写盘」：

1. 在 `/tmp/typora-rea-runtime/marker-test.md` 写入标题、加粗、斜体、链接、行内代码和列表。该文件不是用户文档。
2. 用 Typora 打开它。进程启动后，窗口 12986 的辅助功能树是「激活 Typora」，正文为「您的试用还有 0 天到期」，按钮只有「购买」「退出」「输入序列号」。证据 `ev_d92fbea9da8ac4aadf0c9100f9a78da545f01525b18da620e9dcfdd5340f1242`。
3. 文档窗口 12987 的辅助功能树只有标题栏 `marker-test.md`，没有 WebView 正文。证据 `ev_b96668c23df859f072d2ebac3723052eb6f34fbe4bcba7f24e4d61e248384712`。
4. 屏幕录制被系统拒绝，无法用截图核对标记。
5. 按下「退出」后进程结束。证据 `ev_aea1b3afa7af1c56134f0767ab9aed4a14a40da2be487976f18f067787e59fb6`。临时文件的修改时间和大小都没有变。

没有绕过许可证。因此下面五项仍未用运行时确认：光标进入时标记是否出现、离开时是否隐藏、部分选中时如何变化、移动光标是否改文档结构、不同节点是否一致。

## 建议的运行观察

许可证可编辑之后，再用临时文件观察。静态分析回答不了光标和保存时序。若进入下一阶段前要补证据，用一份临时 Markdown，而不是用户正在写的文档：

1. 打开后看 `#write` 的 `contenteditable` 是否变为 `true`，`ty-before-first-render` 是否移除。
2. 在标题、列表、表格、图片上移动光标，记录标记 DOM 何时出现。
3. 粘贴一张 PNG，看生成的相对路径和磁盘文件。
4. 等待并切换窗口，确认自动保存是否写回原文件。
5. 用外部程序改同一文件，记录 Typora 的提示。
6. 点大纲条目，确认滚动目标是标题块还是源码行。
