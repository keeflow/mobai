# 04 Markdown 渲染

## 渲染架构

已通过代码验证：编辑表面是 DOM，不是终端式逐行着色。

- 可视文档挂在 `#write`。
- 整篇源码挂在 `#typora-source`，默认压到可视层下面。
- 数学、图表、HTML 块各有面板模板，说明这些构造是块级组件，而不是一段纯文本 CSS。
- 净化库字符串是 DOMPurify（`main.js` 12 次）。页面会接收 HTML 块和粘贴的 HTML（`clipboard.processClipboardHTML`）。

基于现象推测的管线：

1. 打开文件时把 Markdown 解析成块 DOM。
2. 可视编辑直接改块 DOM。
3. 保存前把块 DOM 序列化回 Markdown。
4. 源码模式用 CodeMirror 编辑整篇文本，退出时再解析回块 DOM（`updateUIAfterExitSourceMode`）。

第 4 步的函数名是原生二进制里的字面量，调用时机未单步验证。

## 已确认的渲染依赖

这些是 `index.html` 的直接引用或主包里的稳定库名，属于已通过代码验证。

| 依赖 | 位置 | 用途 |
| --- | --- | --- |
| 自有编辑器主包 | `appsrc/main.js` | 块编辑、命令、文件 UI。REA 解析成功，语义图不完整 |
| marked | 主包内字符串，49 次 | 解析相关。不是页面里的独立文件 |
| DOMPurify | 主包内字符串 | HTML 消毒 |
| CodeMirror | `lib/codemirror/mode.min.js`，以及主包 204 次 `CodeMirror` | 源码模式与 Markdown 列表续行。样式 `style/codemirror.css` |
| MathJax 4 | `lib/MathJax4/tex-svg-full.js`，脚本 id `MathJax-script`，延迟加载 | TeX 到 SVG。扩展 `xypic.js` |
| Mermaid | `lib/diagram/mermaid.min.js` | 图表。CSS 由 `index.html` 引入 |
| ZenUML | `lib/diagram/mermaid-zenuml.min.js` | Mermaid 的 ZenUML 扩展 |
| diagram.min.js | `lib/diagram/diagram.min.js` | 图表辅助包。文件头会暂时清空 `window.require`，避免与宿主模块系统冲突 |
| jQuery | 主包 73 次，`index.html` 也有字符串 | UI 辅助。版本号未从语义图恢复 |
| Bootstrap CSS | `lib/bootstrape/css/bootstrap.css` | 注意目录名拼写是 `bootstrape` |

没有发现独立的 `markdown-it`、`turndown`、`highlight.js`、`prism`、ProseMirror 或 Tiptap 文件名。主包里 `React` 3 次、`Vue` 6 次，更像误匹配或设置页共享片段，不能说编辑器核心是 React/Vue。设置页是另一套带内容哈希的打包文件。

KaTeX 在主包只出现 2 次。当前页面实际插入的数学脚本是 MathJax 4。

## 语法与块类型

已在 HTML 模板或原生菜单字符串里出现的块：

| 块 | 证据 |
| --- | --- |
| 普通正文 | `#write` textbox |
| 数学块 | `#md-mathblock-panel-templ`、`#math-inline-preview`、`#inline-math-export-jax` |
| 原始块 | `#md-rawblock-tooltip-templ` |
| HTML 块 | `#md-htmlblock-panel-*`、菜单 “HTML Block” |
| 表格 | `#table-insert-dialog` |
| 图片 | `imgSyntaxHTML`、`imageLink`、`images.zoomImage` |
| 图表 | Mermaid CSS 与脚本 |
| 脚注 | 主包 `footnote` 151 次 |
| 任务列表 / 引用 / 有序列表 | CodeMirror 模式正则，已读到模式文件开头的列表续行实现 |

Pandoc 读写使用的扩展字面量：

`gfm-smart+tex_math_dollars-fenced_divs-bracketed_spans-raw_html`

这是导入导出方言，不等于编辑器内部模型只支持这些扩展。

## 源码模式

已通过代码验证：

- 切换命令 `toggleSourceMode`，退出命令与通知名 `com.typora.view.exitSourceMode`。
- 深色源码样式文件 `style/themes/night/sourcemode.dark.css`。
- CodeMirror 命令 `newlineAndIndentContinueMarkdownList` 用正则识别当前行的列表标记，并在新行重复该标记。这是源码模式的确定行为片段，因为它就写在已加载的模式文件里。该文件是压缩脚本，这里只描述行为，不摘录实现。

基于现象推测：源码模式是整篇文本编辑；可视模式是块编辑。两者通过一次解析/序列化转换，而不是同一个缓冲区的两种皮肤。

## 数学、图表与净化

已通过代码验证：

- MathJax 以 `defer` 加载，另有 `#mathjax-load` 与 `#math-preheat`。预热节点说明会提前初始化，避免第一次出现公式时长时间空白。
- 行内公式有单独预览节点 `#math-inline-preview-content`。
- 导出路径上有 `inline-math-export-jax`，说明导出时数学可能再跑一次排版，而不是只截当前 SVG。
- Mermaid 与 ZenUML 的 CSS 用了 `css-include`，和普通 stylesheet 标签不同，页面脚本会按需收集这些样式。
- DOMPurify 与 HTML iframe 预加载模板同时存在。HTML 块可以被预览，也被净化。净化配置（允许的标签、是否允许脚本）未从语义图恢复。

暂时无法确认：公式是每次编辑都重排，还是失焦后才重排；Mermaid 是否使用沙箱 iframe。

## 主题如何作用到渲染结果

已通过代码验证：

- `#theme_css` 初始 `href` 为空，运行时填入主题。
- 用户 CSS 槽 `#base_user_css`、`#theme_user_css` 同样初始为空。
- 内置主题是纯 CSS 文件。Readme 写明更新会覆盖这些文件，自定义应走用户 CSS 或单独主题。
- night 主题把代码块、源码模式、Mermaid 拆成附加 CSS。

渲染结果的外观主要由 CSS 类决定。编辑器核心不把主题编译进 JS。

## 保真度风险

这些是实现个人编辑器时必须单独验证的点。Typora 的具体策略本次没有运行对照。

| 风险 | 原因 |
| --- | --- |
| 标记字符风格丢失 | 可视 DOM 通常记不住原来用的是 `*` 还是 `_`，除非模型额外保存 |
| 表格对齐与空单元格 | 对话框只收集行列数，序列化规则未知 |
| 数学分隔符 | Pandoc 扩展使用 `tex_math_dollars`，编辑器是否同时接受 `\( \)` 未知 |
| HTML 块被净化改写 | DOMPurify 可能删掉导出时仍想保留的标签 |
| 往返空行 | 块模型很容易把松散列表和紧凑列表写成同一种 |
| 大文档 | 没有虚拟化证据。MathJax 与 Mermaid 都是全量脚本，打开含大量公式的文档会变重 |

## 适合独立实现的渲染分工

后续若自行实现，不必复刻 Typora 的私有主包。公开能力可以这样对应：

| Typora 里观察到的能力 | 可用的独立方案 |
| --- | --- |
| 块级所见即所得 | ProseMirror / Tiptap 的 schema，或 Milkdown |
| Markdown 往返 | 自写 serializer，或 ProseMirror markdown 插件；保真规则要单独测试 |
| 源码模式 | CodeMirror 6 Markdown 模式 |
| 数学 | MathJax 4 或 KaTeX。Typora 当前加载的是 MathJax 4 |
| 图表 | Mermaid |
| HTML 消毒 | DOMPurify，配置写成测试 |
| 代码高亮 | 自选高亮器。Typora 主包里没有 Prism / highlight.js 文件名 |

选择依据放在技术结论文档，不在本文件展开实现。
