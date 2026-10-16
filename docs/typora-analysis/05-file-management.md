# 05 文件管理

## 文档模型

已通过代码验证：macOS 版使用 Cocoa 文档架构。

- `Info.plist` 中 Markdown 与纯文本的 `NSDocumentClass` 都是 `Document`，文件夹也挂在同一个类上，角色是 Viewer。
- 本地类还有 `DocumentController`、`DocumentPath`、`DocumentCommands`、`DocumentSnap`、`TextBundleDocument`。
- 应用声明自己是 Markdown UTI `io.typora.markdown` 与 `net.daringfireball.markdown` 的 Editor / Owner。
- 同时导入了 daringfireball 的 markdown UTI，扩展名 `markdown`、`md`、`mdown`，MIME `text/markdown`。

基于现象推测：一个窗口对应一个 `Document`。文件夹打开时仍走文档控制器，但内容是文库侧栏，不是把文件夹当成一个 Markdown 字符串。

## 能打开的类型

已通过 plist 与 worker 字面量核对，两处扩展名一致的有：

`md` `markdown` `mmd` `mkd` `mdwn` `mdown` `mdx` `mdtxt` `mdtext` `apib` `rmarkdown` `rmd` `qmd` `txt` `text`

plist 另外把纯文本标成 Alternate handler。worker 还列出 `textbundle` 与 `textpack`。plist 的文档类型数组里没有单独的 textbundle 项；类型字符串 `org.textbundle.package` 与类 `TextBundleDocument` 在原生二进制里。暂时无法确认 TextBundle 是文档类型声明遗漏在已读 plist 之外的导出项，还是仅由代码动态注册。本次 plist 证据已完整解析，里面没有 textbundle 键。

## 保存与自动保存

已通过代码验证的 Cocoa 选择子：

- `autosavesInPlace`
- `autosaveWithImplicitCancellability:completionHandler:`
- `hasUnautosavedChanges`

这些选择子属于 `NSDocument` 自动保存。二进制引用了它们，所以应用接入了这套 API。是否所有文档都原地保存、取消是否会丢最后一次击键，需要运行或反编译 `Document` 才能确定。

页面侧 `autosave` 字符串说明 Web 层也参与脏状态或序列化。macOS 写盘仍由 `Document` 承接。页面里另有一套只在 Node 宿主启动的定时器，见下一节。

类 `FileCloseQueue` 说明关闭多个文件时有排队，避免同时弹出多个保存对话框或同时写盘。

## 页面定时器与本次写盘测试

已通过静态分析验证。模块 `3c` 从 `main.js` 偏移 266709 开始，`autoSaveTimer` 在偏移 293582，全文件只出现一次。

- `isNode` 表示 `window.reqnode` 存在。`startAutoSaveAndBackupService` 以及它的 `setInterval` 都在 `isNode` 分支里。
- 间隔字面量是 `6e5`，即 600000 毫秒。回调是同模块较早定义的 `backupVersionWorker`，不读取后面的局部变量。
- `option.autoSaveTimer` 缺失或为 NaN 时会被写成 `3`，但这个数没有传给 `setInterval`。
- 同一分支还有 14400000 毫秒的定时器，只清空 `draftsRecoverList`。
- 该模块对原生的桥调用是 `document.setContent`、`document.addSnap`、`document.getSnap`、`document.setLastSync`。
- `writeFileSync` 在模块 `38`（偏移 203541），和 `showSaveDialog`、文本包保存在一起，属于显式保存路径。

当前 macOS 二进制没有 `reqnode`。基于现象推测，WK 页面不会跑这套 10 分钟定时器，写盘仍走 Cocoa 文档自动保存。拆分后的语义图在 `mod_3c.js` 处因父结果预算用尽而截断，证据 `ev_938d935ae8fb628bf284fe23b5153db877444b8552329d3d7fad5bb29bbb97fe`。没有提高内存重试。

运行时：`/tmp/typora-rea-runtime/` 里准备了独立测试文件。Typora 打开标记测试文件后停在「试用还有 0 天到期」对话框，按钮是购买、退出、输入序列号。按下退出后进程结束。两个临时文件的修改时间和大小都未变。连续输入、停止输入、切换窗口、关闭文档和退出提示都没有测到。打开本身没有写回文件，这只说明退出发生在编辑之前。

## 最近文件

已通过代码验证的命令名：

- `quickOpen.cacheRecentFiles`
- `quickOpen.setRecentFiles`
- `quickOpen.setRecentFolders`
- `recentFolder`

类 `QuickOpenCommands` 与模板 `typora-quick-open-item-templ` 对得上。存储位置（plist、用户目录还是 Web Storage）暂时无法确认。`main.js` 里 `localStorage` 8 次、`indexedDB` 1 次，数量太少，不能把最近文件归因到其中某一个。

## 文库、文件树与搜索

已通过代码验证的界面：

- `#file-library`、`#file-library-tree`、`#file-library-list`
- `#switch-to-tree-on-oversize`：列表过大时可以切到树。阈值未知。
- 侧栏搜索：大小写、整词、正则。
- 随包 ripgrep：`TypeMark/lib/bin/arm/rg` 与 `x64/rg`。二进制包含这两条路径。
- 类 `TyFilesOp`、`LibraryCommands`、`PathCommands`。

基于现象推测：打开文件夹后，原生侧用 ripgrep 做内容搜索，结果画到侧栏。文件名过滤可能在页面里做，因为有单独的文库搜索框 `#file-library-search-input`。两套搜索是否共用正则选项，未验证。

`finder-worker.js` 能做的事（仅该文件自身，已读其 require 与消息名）：

- 依赖 `path`、`fs-extra`、`chokidar`、`fs-plus`
- 消息包括 `initFileCache`、`addInitFiles`、`removeInitFiles`、`queryMatch`、`queryEnd`
- 忽略路径中出现 `node_modules`
- 监听目录的增删改

原生二进制没有引用这个文件名。当前 macOS 应用是否执行它，暂时无法确认。个人编辑器不必实现这个 Node worker。

## 外部修改

已通过代码验证的类：`DocumentFileWatcher`、`FileChanges`、`DocumentSnap`。

基于现象推测：

- `DocumentSnap` 记录打开或上次保存时的内容摘要。
- `DocumentFileWatcher` 收到文件系统事件后读取新内容。
- 若摘要与磁盘、以及与未保存缓冲区三者不一致，则进入冲突路径。

暂时无法确认事件源是 FSEvents、kevent 还是 `NSFilePresenter`。类名不能区分这三者。

## 图片文件

已通过代码验证：

- 新图片可以复制到「相对路径文件夹」，但提示必须先保存当前文件。
- 设置键：`image_save_location`、`defaultImageStorage`、`custom_image_save_location`、`image_uploader`、`customImageUploader`、`allow_image_upload`。
- Web 与本地的搬移开关不同：`apply_image_move_for_web`、`no_image_move_for_local`。
- 批量操作：`copyAllImages`、`moveAllImages`、`prepareUploadAllImagesOnMac`、`deleteImageAction`。
- 上传会启动第三方程序，并把本地图片路径交给它。确认文案写明了这一点。

基于现象推测：Markdown 里保存的是相对路径或用户配置的图床 URL，原图不进文档字符串。TextBundle 则可能把图片放进包内，这与 `TextBundleDocument` 的存在相符，但是否自动采用 textbundle 未知。

## 导入导出涉及的文件

已通过代码验证：

| 路径 | 实现线索 |
| --- | --- |
| 写回 Markdown / 文本 | `Document` + 页面序列化 |
| HTML | 页面命令 `copyAsSemanticHTML`、`copyAsHTMLSource`，以及 “HTML (without styles)”、`%u.html` |
| PDF | `TyPDFEngine` + PDFKit / Quartz PDF context。字符串 `Typora, macOS, Quartz PDFContext` |
| Word / LaTeX / EPUB | 外部 `pandoc`。`pandocPath`、`which pandoc`、`preparePandoc`。未随包附带 pandoc 可执行文件 |
| 导入 | `ImportPanelAccessoryView`，部分格式提示需要 Pandoc |
| 打印 | `PrintPanelAccessory.nib` |

Pandoc 转换时的格式串包含 GFM、smart、美元符号数学、fenced div、bracketed spans，并去掉 raw HTML（`-raw_html`）。这是字面量，不代表每次导出都用同一组参数。

类 `SpawnTask` 是外部进程的可能启动点。没有反编译，不能确认参数数组。

## 自定义协议与用户数据

已通过代码验证：

- 设置页样式 `typora://app/userData/themes/current-theme.css`。
- 类 `DocWebViewURLHandler`、`WebViewProxy`、`WebViewProxyURLProtocol`。
- 欢迎页、设置页、许可证页的路径以查询参数 `os=mac` 打开。

基于现象推测：`typora://` 把用户主题目录映射进 WebView，避免页面直接用 `file://` 读任意路径。映射的根目录和鉴权规则未验证。

## 对个人编辑器的含义

文件层可以全部用公开 API 重做：

| 能力 | 独立做法 |
| --- | --- |
| 打开、保存、脏标记 | Electron `dialog` + `fs`，或原生文档模型。不必使用 Cocoa |
| 自动保存 | 防抖写盘，写临时文件后替换，避免半截文件 |
| 外部修改 | 监视 mtime。本地脏且磁盘也变了就提示 |
| 最近文件 | 应用自己的 JSON，限制条数 |
| 文件夹树与搜索 | 读目录 + 可选 ripgrep。个人工具可以先做文件名过滤 |
| 图片 | 保存到文档旁的资源目录，Markdown 写相对路径 |
| 导出 | HTML 用编辑器自己的序列化；PDF 用系统打印；Word 仅在用户自备 Pandoc 时提供 |

这些是后续实现的边界，不是 Typora 内部已经验证的代码路径。
