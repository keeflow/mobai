# 01 应用架构

分析对象：`/Applications/Typora.app`  
版本：Typora 1.14.10（`CFBundleVersion` 7786）  
Bundle ID：`abnerworks.Typora`  
最低系统：macOS 11.0  
编译 SDK：macOS 26.5（`DTSDKBuild` 25F70，Xcode 26.6.0 / `DTXcode` 2660）

本文件只记录已检查制品能支持的结构。没有启动 Typora，也没有反编译方法体。

## 证据等级

| 等级 | 含义 |
| --- | --- |
| 已通过代码验证 | 来自 REA 对制品的解析、Mach-O 符号、Info.plist、HTML/JS 字面量或文件清单 |
| 已通过运行行为验证 | 本次没有运行 Typora，本报告不使用这一等级 |
| 基于现象推测 | 多个静态事实拼出的合理结构，调用顺序未验证 |
| 暂时无法确认 | 静态分析没有覆盖到 |

## 结论

本机 Typora 是 **Cocoa 文档应用 + WebKit 编辑页**，不是 Electron 应用。

已通过代码验证：

- 可执行文件是通用 Mach-O，含 `x86_64` 与 `arm64` 两个切片。REA `open_binary` 绑定的是 arm64 切片，SHA-256 `71aebecaac7b21965c541113b6e0d9b792a095f44aa487a0a6366f224fcbb83a`。证据 `ev_e9790b623690673e1632297bf9f820022aea26e08d3bf0a8ce43a7193fc79b1e`。
- `Info.plist` 声明 `NSPrincipalClass` 为 `TyApplication`，文档类为 `Document`，主 nib 为 `MainMenu`。证据 `ev_63eedf32e0c5b7622fb873d77d5afd4b9ba6007b8464f267e05d90b6b6b2a0b9`。
- 动态库依赖包含 Cocoa、AppKit、WebKit、PDFKit、Sparkle、Carbon、CoreText、UniformTypeIdentifiers、zlib。依赖列表由 `inspect_macho` 完整返回。
- 导入符号同时包含现代 `WKWebView`、`WKWebViewConfiguration`、`WKUserContentController`、`WKUserScript`、`WKProcessPool`、`WKWebsiteDataStore`，以及旧 `WebView`、`WebPreferences`、`WebArchive`。
- 二进制内有本应用 Objective-C 类：`TyApplication`、`TyWindowController`、`Document`、`DocumentController`、`DocWebView`、`WKCommonWebView`、`WKWebViewJavascriptBridge`、`WebViewJavascriptBridge`。
- 资源目录没有 `app.asar`、Electron Framework 或 Chromium Framework。`Contents/Frameworks` 只有 `Sparkle.framework`。
- `Resources/Podfile` 只声明 CocoaPods 依赖 `Sparkle`，平台 `:osx, '10.15'`。
- REA 对 `TypeMark/appsrc` 与 `TypeMark/page-dist` 的 JavaScript 图中，Electron 的 BrowserWindow、preload、contextBridge、IPC 计数都是 0。证据 `ev_37429e32cca31563f057ad8121eea4fb000e52f346c42c573a27f0e0f69c36aa`、`ev_694af96bfdd575531ce4e515ff2895dcd145835a68f6d7d43c56a1ea6b300042`。

`page-dist/electron.css` 与 `page-dist/cocoa.css` 同时存在。这只说明设置页样式按宿主分成两套，不能说明当前进程是 Electron。

## 进程与窗口

已通过代码验证的本地类把职责拆开了：

| 类 | 从名字和相邻符号能确定的职责 |
| --- | --- |
| `TyApplication` / `TyApplicationDelegate` | 应用入口与委托 |
| `TyWindowController` / `TTWindow` | 文档窗口 |
| `Document` / `DocumentController` | Cocoa 文档模型。`Info.plist` 的 `NSDocumentClass` 就是 `Document` |
| `DocWebView` / `WKCommonWebView` / `WKWebViewWindow` | 承载编辑页的 Web 视图 |
| `WKWebViewJavascriptBridge` / `WebViewJavascriptBridge` / `CommandBridge` / `JSEventHelper` | 原生与页面之间的消息桥。两套 Bridge 类对应两套 WebView API |
| `WKPreferenceController` | 偏好设置窗口，页面来自 `TypeMark/page-dist/setting.html` |
| `WelcomeWindowController` / `LicenseWindowController` | 欢迎页与许可证页 |
| `TyPDFEngine` / `TyExport` / `PandocBridge` | 导出 |
| `DocumentFileWatcher` / `FileChanges` | 外部文件变化 |
| `SpawnTask` | 启动外部进程。二进制里有 `which pandoc` 与 `TypeMark/lib/bin/{arm,x64}/rg` |

基于现象推测：主窗口打开 `TypeMark/index.html`，由 `WKWebView` 加载；原生菜单通过桥调用页面里的 `window.File` / `window.File.editor`。依据是二进制中的路径字面量 `TypeMark/index.html`，以及这些可执行的 JavaScript 字面量：

- `window.File.toggleSourceMode();`
- `window.File.editor.toggleFocusMode();`
- `window.File.editor.toggleTypeWriterMode();`
- `window.File.editor.library.togglePanel('outline')`
- `window.File.editor.imgEdit.insertLocalImage()`

这些字符串证明原生侧准备了这些调用。本次没有在运行中的 WebView 里执行它们。

## 资源布局

`Contents/Resources/TypeMark` 约 30MB，是编辑器的 Web 资源：

| 路径 | 规模 | 作用（已通过文件清单与引用验证） |
| --- | --- | --- |
| `index.html` | 76KB | 主编辑壳。侧栏、大纲、文件树、主题 link、`#write` |
| `html/content.html` | 23KB | 另一份编辑表面，同样有 `#write` 与 `#typora-source` |
| `appsrc/main.js` | 1.6MB | `index.html` 以 `defer` 加载的主脚本 |
| `appsrc/window/frame.js` | 1.6MB | 与 `main.js` 哈希不同的另一份大包。`index.html` 没有直接引用它 |
| `appsrc/finder-worker.js` | 9.4KB | Node 风格文件监视 worker，`require("fs-extra")`、`require("chokidar")` |
| `appsrc/editor/EmojiSearchMap.js` | 49KB | 表情搜索表 |
| `page-dist/` | 1.3MB | 欢迎、设置、许可证、本地设置页。入口 HTML 指向带内容哈希的 JS |
| `lib/MathJax4/tex-svg-full.js` | 1.5MB | `index.html` 延迟加载 |
| `lib/diagram/` | 4.4MB | `mermaid.min.js`、`diagram.min.js`、`mermaid-zenuml.min.js` |
| `lib/codemirror/mode.min.js` | 568KB | CodeMirror Markdown 模式，含列表续行命令 |
| `lib/bin/{arm,x64}/rg` | 6.0MB / 4.4MB | 随包 ripgrep |
| `style/themes/` | 六个内置主题 | github、gothic、newsprint、night、pixyll、whitey |
| `locales/` | 40 个 `.lproj` | 界面文案 |

`index.html` 还预留了三个空的样式槽：`#theme_css`、`#base_user_css`、`#theme_user_css`。设置页使用自定义协议 `typora://app/userData/themes/current-theme.css`。

## JavaScript 模块

REA `analyze_javascript_application` 解析了 `appsrc` 的 4 个脚本（约 3.4MB 文本，991846 个 AST 节点，0 个解析失败），以及 `page-dist` 的 7 个脚本。

覆盖限制：

- `main.js` 与 `window/frame.js` 在语义分析阶段耗尽隔离 worker 堆（上限约 2GiB）。语法解析完成，模块展开和语义图不完整。
- `page-dist` 里四个较大的设置/欢迎包同样在语义阶段耗尽堆。
- 因此「图里没有某个字符串」不能当成功能不存在。对 `mermaid` 的 feature trace 就是 `no-match`，而 `main.js` 文本里 `mermaid` 出现 71 次。证据 `ev_648720cb58355b81fc6fd64a17ddfbac299e97e34742c70b21062c2d92b3e6fa`。

`finder-worker.js` 的语义图只保留了未解析的外部模块 `path`。同一文件的 `require` 字面量还有 `fs-extra`、`chokidar`、`fs-plus`、`module`，并列出 markdown 扩展名与 `textbundle` / `textpack`。原生二进制里没有 `finder-worker`、`chokidar`、`frame.js` 这些字符串。基于现象推测：这个 worker 属于另一套 Node/Electron 宿主，被放进了同一份 TypeMark 资源；当前 macOS 进程用 `DocumentFileWatcher` 做文件监视。是否在某种模式下仍启动该 worker，暂时无法确认。

## 原生与页面的边界

已通过代码验证的桥接面：

- 选择子 `WKScriptMessageHandler`，方法签名对应 `userContentController:didReceiveScriptMessage:`。
- 选择子 `evaluateJavaScript:`、`evaluateJavaScript:completionHandler:`，以及应用自己的 `evaluateJavaScriptImpl:`、`evaluateJavaScriptSync:`。
- `index.html` 中出现一次 `webkit.messageHandlers`。`main.js` 中该字符串计数为 0，`postMessage` 出现 14 次，`typora://` 出现 2 次。
- 类 `WebViewProxy`、`WebViewProxyURLProtocol`、`DocWebViewURLHandler`、`WVPRequestMatcher` 说明存在自定义 URL 加载。设置页的 `typora://` 与此相符。

基于现象推测：菜单、自动保存、图片和导出在原生侧；光标、Markdown 块和实时排版在页面侧。两边用 Bridge 同步，而不是 Electron IPC。

## 本次无法覆盖的部分

| 缺口 | 原因 | 替代方式 |
| --- | --- | --- |
| 方法级调用顺序、WebView 配置默认值 | Ghidra 未安装，Hopper 不在 `/Applications`，IDA 未配置。通用 Mach-O 也不能直接交给当前 Ghidra provider | 抽出 arm64 薄切片后用 Ghidra 12.1 打开 `Document`、`DocWebView`、`CommandBridge` |
| `main.js` 内部模块边界 | 语义分析堆耗尽，当前 REA schema 不能按 `source_paths` 只分析片段 | 把堆调到 8–16GiB 重跑，或先做只读分块再分析 |
| 运行时谁先加载 `content.html`、`contenteditable` 何时变为 true | 只看了初始 HTML。`#write` 初始是 `contenteditable="false"` | 用临时文档打开 Typora，观察 DOM 与桥消息 |

没有把这些缺口写成已验证行为。
