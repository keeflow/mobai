# 06 界面与交互外观

## 总体布局

已通过 `index.html` 的结构验证。主窗口是一条编辑器，左侧是可切换的信息栏。

信息栏分段：

- 文件：`#info-panel-tab-file`、`#file-library`
- 大纲：`#info-panel-tab-outline`、`#outline-content`
- 搜索：`#info-panel-tab-search`，可返回 `#info-panel-tab-search-back`
- 显示/隐藏：`#switch-sidebar-icon`、`#hide-sidebar-btn`
- 大纲可固定：`#pin-outline-btn`

编辑区中心是 `#write`。源码层 `#typora-source` 默认不占视觉层级。查找、表格、图片文件夹确认、缩放提示都是叠在编辑区上的控件，定义在 `content.html` / `index.html` 的模板里。

设置、欢迎、许可证不在主编辑页里。它们是 `page-dist` 的独立 HTML，由 `WKPreferenceController`、`WelcomeWindowController`、`LicenseWindowController` 打开。设置页查询参数带 `os=mac`。

## 视觉系统

已通过代码验证：

| 层 | 文件 | 作用 |
| --- | --- | --- |
| 基础排版 | `style/base.css`、`style/base-control.css` | 编辑器与控件 |
| 窗口 | `style/window.css`、`style/mac.css` | macOS 窗口与交通灯附近的布局 |
| 菜单/侧栏 | `style/megamenu.css` | 大菜单 |
| 源码 | `style/codemirror.css` | CodeMirror |
| 图标 | Font Awesome 4.1、Ionicons 2.0.1、`typora-icon`、`typora-file-icon` | 界面图标与文件图标 |
| 主题 | `style/themes/*.css` | 可切换的文档外观 |
| 用户覆盖 | `#base_user_css`、`#theme_user_css` | 初始 href 为空 |

内置主题：github、gothic、newsprint、night、pixyll、whitey。night 额外拆出代码块、源码模式和 Mermaid 的暗色表。

主题 Readme 写明：内置 CSS 会在更新或重装时被替换；修改应使用自定义 CSS；新主题单独安装。这是资源文件中的原文说明，不是运行实验。

设置页还链接 `typora://app/userData/themes/current-theme.css`，并有 `#os-theme`。基于现象推测：文档主题与系统明暗是两条链路。`#os-theme` 初始为空，由页面或原生填入。

`page-dist/electron.css` 与 `cocoa.css` 并列。当前 macOS 包会用 cocoa 这套；electron 样式留给另一宿主。本次没有看到 macOS 二进制加载 `electron.css`。

## 编辑体验相关的界面状态

已通过代码验证的界面能力：

- 聚焦模式、打字机模式有独立开关，也有同时退出的路径。进入时可以弹出警告，并允许以后不再提示。
- 大纲可以收起（`can_collapse_outline_panel`）。
- 文件列表过大时提供切到树的控件。
- 字数是标题栏或工具区按钮：`WordCountButton`，弹出 `WordCountPopover`。
- 源码模式按钮出现在自动布局字符串里：`_sourceModeButton`，与字数、大纲、侧栏按钮排在一起。
- 触控栏类 `TyTouchBar` 存在。具体按钮未反编译。
- 缩放有 in / out / reset 提示条。

基于现象推测：默认界面把格式工具从常驻工具栏拿掉，改由菜单、快捷键和光标附近的块控件完成。证据是主页面没有一组常驻的加粗/标题按钮 id，而有大量块级模板（数学、HTML、表格、图片）。这是页面结构观察，不是完整菜单普查。

## macOS 集成

已通过代码验证：

- 主 nib `MainMenu`，所以菜单栏是 AppKit，不是 HTML 菜单。
- 标题栏附件控制器：`TitlebarLeftAccessoryViewController`、`TitlebarRightAccessoryViewController`。
- 交通灯与标题栏布局由原生窗口管，WebView 画内容区。
- 打印使用系统打印面板加 `PrintPanelAccessory.nib`。
- 更新走 Sparkle，Feed 为 `https://typora.io/releases/macos.xml`。
- 支持 AppleScript 开关已打开。字典内容未读。

## 设置信息架构

`page-dist/setting.html` 是一个挂载到 `#root` 的打包页面，脚本约 294KB。REA 解析了该包，语义分析因堆限制中断，所以不能列出每一个设置项的组件树。

已经从原生格式字符串里看到的设置组：

- 图片：保存位置、上传器、自动上传、按 YAML 上传、Web/本地搬移
- Pandoc：路径、安装引导
- 视图：聚焦模式、打字机模式、对应的「不再警告」
- 大纲：是否允许收起
- 导出：`preLinebreakOnExport`

偏好页与主编辑器分离，避免把设置 DOM 放进文档滚动区域。个人编辑器可以采用同样的分离。

## 可访问性与文案

已通过代码验证：

- `#write` 使用 `role="textbox"`、`aria-multiline`、`aria-placeholder`、`spellcheck`、`tabindex="-1"`。
- 部分脚本标记了 `aria-hidden="true"`。
- `locales/` 下有 40 个区域目录，包含 `zh-Hans` 与 `zh-Hant`。
- 应用 `CFBundleDevelopmentRegion` 为 `en`。

`tabindex="-1"` 加上初始 `contenteditable="false"` 说明：在脚本完成前，这个节点不是键盘编辑目标。基于现象推测：脚本就绪后会自己管理焦点，避免 WebView 与原生标题栏抢第一次 Tab。

## 对个人编辑器界面的约束

从这套界面能归纳出的产品特征，而不是要复制的像素：

1. 一个居中的阅读/书写栏，控件默认退后。
2. 文件与大纲共用一个窄侧栏，而不是同时展开两列。
3. 主题是文档 CSS，不是把整个应用壳重绘成另一套组件库。
4. 源码模式是明确的模式开关，不是左右分屏。
5. 设置、欢迎、许可证是独立窗口或独立页。
6. 危险操作（批量上传图片、进入会改变滚动的模式）有确认或可关闭的说明。

商标、图标字体文件、主题 CSS 正文和 `typora://` 协议名都属于 Typora 的资源。个人编辑器应使用自己的名字、自己的主题和自己的协议或本地文件 URL。
