# 09 补充分析

这次只补证据，没有开始实现编辑器。Typora 安装文件和用户已有文档都没有改。临时脚本切片已删除。

## 分析器限制

`main.js` 为 1,692,606 字节、1 行、88 个 `System.registerDynamic` 模块，无可用的本地 source map（注释指向 `http://typora/appsrc/main.js.map`）。上次整包语义分析在堆上限处中断。本次没有重跑那次分析。

当前 REA 的 `analyze_javascript_application` 没有 `source_paths`，输入格式只有目录、asar 或自动判断。因此把 15 个相关模块抽成临时目录再分析：`3c`、`13`、`30`、`4b`、`48`、`1e`、`60`、`4d`、`51`、`16`、`3d`、`31`、`61`、`38`、`2a`。合计约 339KB。

已通过静态分析验证：

- 15 个文件全部解析，0 个语法失败，访问 86831 个 AST 节点。证据 `ev_a0a9dd1e81ffaa36055c0c3234c5be1a7309d7402b7a85f97c7a35b7be1925e2`，父记录 `ev_938d935ae8fb628bf284fe23b5153db877444b8552329d3d7fad5bb29bbb97fe`。
- 父结果预算约 2GB 用尽。`mod_3c.js`、`mod_48.js`、`mod_4b.js`、`mod_4d.js`、`mod_51.js`、`mod_60.js` 的语义图被截断，静态事实保留。
- `autoSaveTimer` 的 feature trace 为 `no-match`。证据 `ev_974ba19946795c172d6dc634686167a87376f95a1fbbcb47897208be856ba399`。这不表示源码里没有该字符串；字符串位置是用文本偏移核对的。

没有提高 `max_heap_mb` 再试。原因是这次失败已经是结果体积上限，而任务要求出现内存问题后停止重试。

原生方法体仍然没有反编译：Ghidra、Hopper、IDA 都不可用。没有安装它们。

## 标记显隐

### 已通过静态分析验证

标记不是靠把 `**` 插进同一个文本节点再删掉，而是独立元素加 CSS：

- `.md-meta` 默认 `display:none`（`style/base-control.css`）。
- `.md-expand .md-meta` 与 `.md-expand-on-selection .md-meta` 改为 `display:inline`。前者对应光标所在的展开节点，后者对应选区。
- 模块 `61`（`main.js` 偏移 1612946）在 `focusCid` 上 `addClass("md-focus")`，并在最近的 `.md-image` 上增减 `md-expand`。
- 同一模块在文档未锁定时把 `writingArea` 设为 `contenteditable=true`（偏移 1617872）。这解释了 HTML 初始值为什么是 false。
- 模块 `30`（偏移 850386）构造带 `md-meta`、`md-before` 的行内结构。
- h3–h6 在 `.md-focus` 下用 CSS `content` 显示 `h3` 到 `h6`，不是把井号写回标题文本。

### 已通过运行时测试验证

只验证了测试未能进入编辑器：

1. 写入 `/tmp/typora-rea-runtime/marker-test.md`，内容为标题、加粗、斜体、链接、行内代码、列表。
2. Typora 打开该文件后出现激活窗口。辅助功能文本是「激活 Typora」和「您的试用还有 0 天到期」。按钮为「购买」「退出」「输入序列号」。证据 `ev_d92fbea9da8ac4aadf0c9100f9a78da545f01525b18da620e9dcfdd5340f1242`。
3. 文档窗口的辅助功能树只有标题 `marker-test.md`，没有正文 WebView。证据 `ev_b96668c23df859f072d2ebac3723052eb6f34fbe4bcba7f24e4d61e248384712`。
4. 屏幕录制权限被拒绝，没有截图。
5. 按下「退出」后进程结束。证据 `ev_aea1b3afa7af1c56134f0767ab9aed4a14a40da2be487976f18f067787e59fb6`。文件修改时间未变。

没有输入序列号，也没有绕过试用限制。

### 基于现象推测

加粗、斜体、链接、行内代码、列表把标记放在 `.md-meta` 中。光标进入时加 `.md-expand`，离开时移除；选中时加 `.md-expand-on-selection`。`.md-focus` 表示当前块，并供聚焦模式降低其他块的对比度。移动光标只改类名，不改 Markdown 结构。

### 尚未确认

标题、加粗、斜体、链接、行内代码、列表在真实光标下是否表现一致；部分选中时标记范围；光标移动是否偶尔改写文档字节。这些需要许可证允许编辑之后，用临时文件再测。

## 自动保存

### 已通过静态分析验证

- Cocoa 选择子 `autosavesInPlace`、`autosaveWithImplicitCancellability:completionHandler:`、`hasUnautosavedChanges` 仍在原生二进制中。
- 页面定时器在模块 `3c`：仅当 `window.reqnode` 存在。间隔字面量 600000 毫秒。`autoSaveTimer` 的默认值 `3` 没有作为 `setInterval` 的延迟。
- 4 小时定时器只清空恢复列表。
- 显式写文件在模块 `38` 的 `writeFileSync`，与保存对话框、文本包有关。
- macOS 可执行文件没有 `reqnode` 字符串。

### 已通过运行时测试验证

`/tmp/typora-rea-runtime/autosave-test.md` 已创建但未打开。标记测试文件被打开后应用就退出了，两个文件的大小和修改时间都保持创建时的值。打开未伴随写盘。输入、连续输入、停止、切换窗口、关闭和退出提示都没有执行到。

### 基于现象推测

macOS 编辑写盘走 `NSDocument`，不走页面里那个 10 分钟的 Node 定时器。页面通过 `document.setContent` 和 `document.addSnap` 把文本交给原生。

### 尚未确认

Cocoa 自动保存的实际间隔，停止输入、切换窗口、关闭文档是否各自触发写盘，以及未保存时退出是否弹窗。

## 开发建议

值得参考的行为：

- 标记与正文分成节点，显隐用类和 CSS，而不是来回改字符串。
- 光标展开（`.md-expand`）和选区展开（`.md-expand-on-selection`）分开。
- 块焦点（`.md-focus`）与标记显隐分开，聚焦模式只改对比度。
- 保存以序列化后的 Markdown 为准，图片使用相对路径，写盘用临时文件替换。

可以用 Milkdown 实现的部分：

- 标题、段落、强调、链接、行内代码、列表的所见即所得和 Markdown 往返。Milkdown 以 remark 为中心，适合 P0 的普通语法。
- 源码模式仍建议另接 CodeMirror 6，不把 Milkdown 当成源码编辑器。

需要自定义 ProseMirror 插件的部分：

- 光标进入才显示标记、离开就隐藏。Milkdown 默认不会按 `.md-meta` 这套 CSS 工作，要在节点视图或 decoration 里维护「当前节点」和「选区覆盖节点」。
- 选中半段文字时只展开选区碰到的标记。
- 标题焦点标签与原始 `#` 风格分开保存。若要保住 `*` / `_` 和空行，要在节点 attrs 里记原始标记，不能只靠 remark 再打印。
- 表格往返和单元格内的行内标记。

可以用 Electron API 的部分：

- 打开、保存、另存为：`dialog` 与 `fs`。
- 自动保存：自行防抖后原子替换。不要照搬 10 分钟，也不要依赖尚未测到的 Cocoa 间隔。个人编辑器可以用 1 秒量级的空闲写盘，并在关闭时再写一次。
- 外部修改：`fs.watch` 或比对 mtime。
- 最近文件：应用自己的 JSON。
- PDF：`webContents.printToPDF`。
- 窗口失焦时保存：`BrowserWindow` 的 `blur`。

不必继续逆向、直接自行设计的部分：

- 许可证、更新、iPic、AppleScript、触控栏。
- Pandoc 参数的完整列表。需要 Word/EPUB 时检测用户机器上的 `pandoc` 即可。
- `main.js` 剩余 70 多个模块的语义图。标记类和保存分叉已经够用。
- 原生 `Document` 方法体。在 Electron 里用自己的脏标记和写盘，不需要复现 Cocoa 自动保存。

仍建议在许可证允许编辑后，用临时文件补一次光标和写盘实验。在那之前，不要把「10 分钟」或「3」写成 macOS 版的保存间隔。
