<script setup lang="ts">
import { inspectMarkdown, markdownToPlainHtml } from '@shared/editor'
import { writingStats } from '@shared/stats'
import type { FindOptions, TextSpan } from '@shared/find'
import type { FolderHit } from '@shared/folderSearch'
import { outlineFromMarkdown } from '@shared/outline'
import { searchEmoji } from '@shared/emoji'
import type { FolderSearchOptions } from '@shared/folderSearch'
import { folderSearchError } from '@shared/folderSearch'
import { PANDOC_INSTALL_HINT, pandocLabel, type PandocFormat } from '@shared/pandoc'
import { clampZoom, editorFont, editorMeasure, type EditorFont, type EditorMeasure } from '@shared/view'
import { unclosedFenceLine } from '@shared/source'
import { getMarkRange } from '@tiptap/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import FindBar from './components/FindBar.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import SourceEditor from './components/SourceEditor.vue'
import ToolIcon from './components/ToolIcon.vue'
import { useSessionStore } from './stores/session'
import { applyUserCss, useTheme } from './theme'
import logoUrl from './assets/logo.png'

const session = useSessionStore()
const { theme, toggle } = useTheme()
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const sourceRef = ref<InstanceType<typeof SourceEditor> | null>(null)
const findBarRef = ref<InstanceType<typeof FindBar> | null>(null)
const panel = ref<'files' | 'outline' | 'recent' | 'search'>('files')
const focusMode = ref(localStorage.getItem('mobai-focus') === 'on')
const typewriter = ref(localStorage.getItem('mobai-typewriter') === 'on')
const folderQuery = ref('')
const folderHits = ref<FolderHit[]>([])
const findOpen = ref(false)
const linkOpen = ref(false)
const linkText = ref('')
const linkHref = ref('https://')
const linkRange = ref<{ from: number; to: number } | null>(null)
const findError = ref('')
const matches = ref<TextSpan[]>([])
const matchIndex = ref(0)
const findOptions = ref<FindOptions>({ query: '', caseSensitive: false, wholeWord: false, regex: false })
const assetDir = ref('assets')
const sidebar = ref(localStorage.getItem('mobai-sidebar') !== 'off')
const zoom = ref(clampZoom(Number(localStorage.getItem('mobai-zoom') ?? '100')))
const measure = ref<EditorMeasure>(editorMeasure(localStorage.getItem('mobai-measure') ?? 'normal'))
const font = ref<EditorFont>(editorFont(localStorage.getItem('mobai-font') ?? 'serif'))
const outlineQuery = ref('')
const folderCase = ref(false)
const folderWhole = ref(false)
const folderRegex = ref(false)
const emojiOpen = ref(false)
const emojiQuery = ref('')
const quickOpen = ref(false)
const quickQuery = ref('')
const emojiChoices = computed(() => searchEmoji(emojiQuery.value))
const visibleHeadings = computed(() => {
  const needle = outlineQuery.value.trim().toLocaleLowerCase()
  return headings.value.filter((item) => !needle || item.text.toLocaleLowerCase().includes(needle))
})
const quickHits = computed(() => {
  const needle = quickQuery.value.trim().toLocaleLowerCase()
  const files = session.files.map((file) => ({ path: file.path, name: file.relativePath }))
  const recent = session.recent
    .filter((item) => !files.some((file) => file.path === item.path))
    .map((item) => ({ path: item.path, name: item.name }))
  return [...files, ...recent].filter((item) => !needle || item.name.toLocaleLowerCase().includes(needle)).slice(0, 20)
})
const editorStyle = computed(() => ({
  '--editor-size': String(zoom.value / 100),
  '--editor-measure': measure.value === 'narrow' ? '36rem' : measure.value === 'wide' ? '64rem' : '48rem'
}))
const imageMode = ref<'copy' | 'move'>('copy')
const headings = computed(() => outlineFromMarkdown(session.markdown))
const status = computed(() => {
  if (session.saving) return '正在保存…'
  if (session.notice) return session.notice
  if (session.dirty) return '未保存'
  return session.path ? '已保存' : '未命名'
})
const stats = computed(() => writingStats(session.bodyText))
const tableOpen = ref(false)
const tableRows = ref(3)
const tableCols = ref(3)

function surface() {
  return session.editing === 'source' ? sourceRef.value : editorRef.value
}

function run(
  command: 'toggleBold' | 'toggleItalic' | 'toggleStrike' | 'toggleBulletList' | 'toggleTaskList' | 'toggleCodeBlock' | 'toggleBlockquote'
): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus()[command]().run()
}

function heading(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().toggleHeading({ level: 1 }).run()
}

function table(): void {
  if (session.editing !== 'write') return
  tableOpen.value = !tableOpen.value
}

function clampCount(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(limit, Math.max(1, Math.trunc(value)))
}

function writingChain() {
  const editor = editorRef.value?.editor
  if (!editor || session.editing !== 'write') return null
  const chain = editor.chain().focus()
  if ('node' in editor.state.selection) chain.setTextSelection(editor.state.selection.to)
  return chain
}

function insertTable(): void {
  const chain = writingChain()
  if (!chain) return
  const rows = clampCount(tableRows.value, 12)
  const cols = clampCount(tableCols.value, 8)
  tableRows.value = rows
  tableCols.value = cols
  chain.insertTable({ rows, cols, withHeaderRow: true }).run()
  tableOpen.value = false
}

function alignCell(align: 'left' | 'center' | 'right'): void {
  const editor = editorRef.value?.editor
  if (!editor || session.editing !== 'write') return
  const applied = editor.chain().focus().setCellAttribute('align', align).run()
  if (!applied) session.setNotice('先把光标放进表格。')
}

function addTableRow(): void {
  const editor = editorRef.value?.editor
  if (!editor || session.editing !== 'write') return
  if (!editor.chain().focus().addRowAfter().run()) session.setNotice('先把光标放进表格。')
}

function removeTableRow(): void {
  const editor = editorRef.value?.editor
  if (!editor || session.editing !== 'write') return
  if (!editor.chain().focus().deleteRow().run()) session.setNotice('先把光标放进表格。')
}

function insertHtmlBlock(): void {
  writingChain()
    ?.insertContent({ type: 'htmlBlock', attrs: { source: '<div>\n内容\n</div>' } })
    .run()
}

async function copyHtml(): Promise<void> {
  const html = markdownToPlainHtml(session.markdown)
  try {
    await navigator.clipboard.writeText(html)
  } catch {
    const area = document.createElement('textarea')
    area.value = html
    area.setAttribute('readonly', '')
    document.body.append(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    session.setNotice(copied ? '已复制 HTML' : '无法写入剪贴板。')
    return
  }
  session.setNotice('已复制 HTML')
}

function link(): void {
  if (session.editing !== 'write') return
  const editor = editorRef.value?.editor
  if (!editor) return
  let { from, to } = editor.state.selection
  if ('node' in editor.state.selection) from = to
  if (from === to) {
    const marked = getMarkRange(editor.state.doc.resolve(from), editor.schema.marks.link)
    if (marked) {
      from = marked.from
      to = marked.to
    }
  }
  linkRange.value = { from, to }
  linkText.value = editor.state.doc.textBetween(from, to, '')
  const href = editor.getAttributes('link').href
  linkHref.value = typeof href === 'string' && href ? href : 'https://'
  linkOpen.value = true
  requestAnimationFrame(() => {
    const field = document.getElementById(linkText.value ? 'link-href' : 'link-text')
    if (!(field instanceof HTMLInputElement)) return
    field.focus()
    field.select()
  })
}

function usableLink(href: string): boolean {
  const value = href.trim()
  return value !== '' && value !== 'https://' && value !== 'http://' && !/^javascript:/i.test(value)
}

function applyLink(): void {
  const editor = editorRef.value?.editor
  const range = linkRange.value
  if (!editor || !range || session.editing !== 'write') return
  const href = linkHref.value.trim()
  if (!usableLink(href)) {
    session.setNotice('请填写链接地址。')
    return
  }
  const current = editor.state.doc.textBetween(range.from, range.to, '')
  const text = linkText.value.trim() || href
  let chain = editor.chain().focus()
  if (range.from === range.to || text !== current) {
    chain = chain.insertContentAt({ from: range.from, to: range.to }, { type: 'text', text })
  }
  const applied = chain.setTextSelection({ from: range.from, to: range.from + text.length }).setLink({ href }).run()
  if (!applied) {
    session.setNotice('这个地址不能作为链接。')
    return
  }
  linkOpen.value = false
  session.setNotice('')
}

function removeLink(): void {
  const editor = editorRef.value?.editor
  const range = linkRange.value
  if (!editor || !range) return
  if (range.from !== range.to) editor.chain().focus().setTextSelection(range).unsetLink().run()
  linkOpen.value = false
}

function undo(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().undo().run()
}

function redo(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().redo().run()
}

async function chooseImage(): Promise<void> {
  if (session.editing !== 'write') return
  const relativePath = await session.importImageFromDialog()
  if (!relativePath) return
  editorRef.value?.editor?.chain().focus().setImage({ src: relativePath, alt: '' }).run()
}

function insertMath(display: boolean): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor
    ?.chain()
    .focus()
    .insertContent(display ? { type: 'mathBlock', attrs: { tex: 'x^2' } } : { type: 'mathInline', attrs: { tex: 'E=mc^2' } })
    .run()
}

function insertFootnote(): void {
  if (session.editing !== 'write') return
  const editor = editorRef.value?.editor
  if (!editor) return
  editor.chain().focus().insertContent({ type: 'footnoteReference', attrs: { label: '注' } }).run()
  const reference = editor.state.selection.from
  editor
    .chain()
    .insertContentAt(
      editor.state.doc.content.size,
      { type: 'footnoteDefinition', attrs: { label: '注', text: '说明' } },
      { updateSelection: false }
    )
    .setTextSelection(reference)
    .run()
}

function toggleFocus(): void {
  focusMode.value = !focusMode.value
  localStorage.setItem('mobai-focus', focusMode.value ? 'on' : 'off')
}

function toggleTypewriter(): void {
  typewriter.value = !typewriter.value
  localStorage.setItem('mobai-typewriter', typewriter.value ? 'on' : 'off')
}

function toggleSidebar(): void {
  sidebar.value = !sidebar.value
  localStorage.setItem('mobai-sidebar', sidebar.value ? 'on' : 'off')
}

function setZoom(next: number): void {
  zoom.value = clampZoom(next)
  localStorage.setItem('mobai-zoom', String(zoom.value))
}

function rememberMeasure(): void {
  localStorage.setItem('mobai-measure', measure.value)
}

function rememberFont(): void {
  localStorage.setItem('mobai-font', font.value)
}

function horizontalRule(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().setHorizontalRule().run()
}

function highlightMark(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().toggleMark('highlight').run()
}

function insertEmoji(emoji: string): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor?.chain().focus().insertContent(emoji).run()
  emojiOpen.value = false
}

function openQuick(): void {
  quickOpen.value = true
  quickQuery.value = ''
  requestAnimationFrame(() => document.getElementById('quick-query')?.focus())
}

async function chooseQuick(path: string): Promise<void> {
  quickOpen.value = false
  const listed = session.files.find((file) => file.path === path)
  if (listed) {
    await session.openListedFile(listed)
    return
  }
  await session.openRecent(path)
}

function openFolderSearch(): void {
  panel.value = 'search'
  requestAnimationFrame(() => document.getElementById('folder-query')?.focus())
}

async function runFolderSearch(): Promise<void> {
  if (!folderQuery.value.trim()) {
    folderHits.value = []
    session.setNotice('请输入要查找的文字。')
    return
  }
  const options: FolderSearchOptions = {
    caseSensitive: folderCase.value,
    wholeWord: folderWhole.value,
    regex: folderRegex.value
  }
  const invalid = folderSearchError(folderQuery.value, options)
  if (invalid) {
    folderHits.value = []
    session.setNotice(invalid)
    return
  }
  if (!session.folder) {
    session.setNotice('先打开一个文件夹，再搜索其中的 Markdown。')
    return
  }
  if (!window.api?.searchFolder) {
    session.setNotice('文件夹搜索要在桌面窗口里使用。')
    return
  }
  try {
    folderHits.value = await window.api.searchFolder(session.folder, folderQuery.value, options)
    session.setNotice(folderHits.value.length ? `找到 ${folderHits.value.length} 处` : '没有匹配的内容。')
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : '无法搜索文件夹')
  }
}

async function openFolderHit(hit: FolderHit): Promise<void> {
  await session.openListedFile({ path: hit.path, name: hit.name, relativePath: hit.relativePath })
  await nextTick()
  const found = surface()?.search({
    query: folderQuery.value,
    caseSensitive: folderCase.value,
    wholeWord: folderWhole.value,
    regex: folderRegex.value
  })
  const span = found?.matches[0]
  if (span) surface()?.reveal(span)
}

function insertDiagram(): void {
  if (session.editing !== 'write') return
  editorRef.value?.editor
    ?.chain()
    .focus()
    .insertContent({ type: 'diagram', attrs: { source: 'graph TD\n  A[开始] --> B[结束]' } })
    .run()
}

function openFind(): void {
  findOpen.value = true
  requestAnimationFrame(() => findBarRef.value?.focusQuery())
}

function applySearch(options: FindOptions, revealMatch: boolean): void {
  findOptions.value = options
  const current = surface()
  if (!current || !options.query) {
    matches.value = []
    findError.value = ''
    matchIndex.value = 0
    return
  }
  const found = current.search(options)
  findError.value = found.error ?? ''
  matches.value = found.matches
  if (!matches.value.length) return
  matchIndex.value = Math.min(matchIndex.value, matches.value.length - 1)
  const span = matches.value[matchIndex.value]
  if (revealMatch && span) current.reveal(span)
}

function stepFind(direction: number): void {
  if (!matches.value.length) {
    applySearch(findOptions.value, true)
    return
  }
  matchIndex.value = (matchIndex.value + direction + matches.value.length) % matches.value.length
  const span = matches.value[matchIndex.value]
  if (span) surface()?.reveal(span)
}

function replaceCurrent(text: string): void {
  const span = matches.value[matchIndex.value]
  const current = surface()
  if (!span || !current) return
  current.replaceOne(span, text)
  applySearch(findOptions.value, true)
}

function replaceAll(text: string): void {
  const result = surface()?.replaceAllMatches(findOptions.value, text)
  if (result?.error) findError.value = result.error
  else session.setNotice(result ? `已替换 ${result.count} 处` : '')
  applySearch(findOptions.value, false)
}

function onSourceChange(value: string): void {
  session.noteEditorMarkdown(value)
  session.rememberBody(value)
}

function toggleSource(): void {
  if (session.editing === 'write') {
    session.rememberBody(session.markdown)
    session.setEditing('source')
    session.setNotice('')
    return
  }
  const text = sourceRef.value?.getText() ?? session.markdown
  const fence = unclosedFenceLine(text)
  if (fence) {
    session.setNotice(`第 ${fence} 行的代码围栏没有闭合，仍留在源码模式。`)
    sourceRef.value?.markLine(fence)
    return
  }
  const parsed = inspectMarkdown(text)
  if (!parsed.ok) {
    session.setNotice(`${parsed.message}，仍留在源码模式。`)
    sourceRef.value?.markLine(parsed.line)
    return
  }
  session.noteEditorMarkdown(text)
  session.setEditing('write')
  session.setNotice('')
}

function showHeading(index: number): void {
  surface()?.focusHeading(index)
}

async function exportPandoc(format: PandocFormat): Promise<void> {
  if (!window.api?.exportPandoc) {
    session.setNotice('导出需要在桌面窗口里使用。')
    return
  }
  const text = session.editing === 'source' ? (sourceRef.value?.getText() ?? session.markdown) : session.markdown
  try {
    const saved = await window.api.exportPandoc(text, format)
    if (!saved) return
    if ('missing' in saved) {
      session.setNotice(saved.message || PANDOC_INSTALL_HINT)
      return
    }
    session.setNotice(`已导出 ${pandocLabel(format)}`)
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : '导出失败')
  }
}

async function exportDocument(kind: 'html' | 'pdf'): Promise<void> {
  if (!window.api) {
    session.setNotice('导出需要在桌面窗口里使用。')
    return
  }
  const text = session.editing === 'source' ? (sourceRef.value?.getText() ?? session.markdown) : session.markdown
  const html = markdownToPlainHtml(text)
  const saved = kind === 'html' ? await window.api.exportHtml(html) : await window.api.exportPdf(html)
  if (saved) session.setNotice(kind === 'html' ? '已导出 HTML' : '已导出 PDF')
}

async function printDocument(): Promise<void> {
  if (!window.api?.printHtml) {
    session.setNotice('打印需要在桌面窗口里使用。')
    return
  }
  const text = session.editing === 'source' ? (sourceRef.value?.getText() ?? session.markdown) : session.markdown
  try {
    const printed = await window.api.printHtml(markdownToPlainHtml(text))
    if (printed) session.setNotice('已发送到打印。')
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : '无法打印')
  }
}

async function saveImageMode(): Promise<void> {
  session.setImageMode(imageMode.value)
  if (!window.api) return
  try {
    const next = await window.api.setImageMode(imageMode.value)
    imageMode.value = next.imageMode
    session.setImageMode(next.imageMode)
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : '无法保存图片方式')
  }
}

async function saveAssetDir(): Promise<void> {
  if (!window.api) {
    session.setNotice('图片目录要在桌面窗口里设置。')
    return
  }
  try {
    const next = await window.api.setAssetDir(assetDir.value)
    assetDir.value = next.assetDir
    session.setNotice(`图片会保存到 ${next.assetDir} 目录。`)
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : '无法保存图片目录')
  }
}

async function chooseCss(): Promise<void> {
  if (!window.api) {
    session.setNotice('用户样式要在桌面窗口里选择。')
    return
  }
  const chosen = await window.api.chooseCss()
  if (!chosen) return
  applyUserCss(chosen.css)
  session.setNotice('已使用这份用户样式。')
}

async function clearCss(): Promise<void> {
  if (!window.api) return
  await window.api.clearCss()
  applyUserCss('')
  session.setNotice('已清除用户样式。')
}

function onKeydown(event: KeyboardEvent): void {
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return
  const key = event.key.toLowerCase()
  if (key === 's') {
    event.preventDefault()
    void session.save()
    return
  }
  if (key === 'p' && event.shiftKey) {
    event.preventDefault()
    openQuick()
    return
  }
  if (key === 'p') {
    event.preventDefault()
    void printDocument()
    return
  }
  if (key === 'l' && event.shiftKey) {
    event.preventDefault()
    toggleSidebar()
    return
  }
  if (key === '=' || key === '+') {
    event.preventDefault()
    setZoom(zoom.value + 10)
    return
  }
  if (key === '-' || key === '_') {
    event.preventDefault()
    setZoom(zoom.value - 10)
    return
  }
  if (key === '0') {
    event.preventDefault()
    setZoom(100)
    return
  }
  if (key === 'f' && event.shiftKey) {
    event.preventDefault()
    openFolderSearch()
    return
  }
  if (key === 'f') {
    event.preventDefault()
    openFind()
    return
  }
  if (key === 'e') {
    event.preventDefault()
    toggleSource()
    return
  }
  if (key === 'g' && findOpen.value) {
    event.preventDefault()
    stepFind(event.shiftKey ? -1 : 1)
    return
  }
  if (session.editing !== 'write') return
  if (event.altKey && key === '1') {
    event.preventDefault()
    heading()
  }
  if (event.shiftKey && key === '8') {
    event.preventDefault()
    run('toggleBulletList')
  }
}

const externalTimer = window.setInterval(() => {
  void session.checkExternal()
}, 4000)

function onFocus(): void {
  void session.checkExternal()
}

function onBlur(): void {
  void session.flush()
}

function allowWindowFileDrop(event: DragEvent): void {
  event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)
  window.addEventListener('dragover', allowWindowFileDrop)
  window.addEventListener('drop', allowWindowFileDrop)

  const api = window.api
  if (!api) return
  api.onMenuOpenFile(() => {
    void session.openFile()
  })
  api.onMenuOpenFolder(() => {
    void session.openFolder()
  })
  api.onMenuOpenRecent?.((filePath) => {
    void session.openRecent(filePath)
  })
  let systemOpenQueue = Promise.resolve()
  api.onOpenExternal?.((filePath) => {
    systemOpenQueue = systemOpenQueue.then(() => session.openFromSystem(filePath)).catch(() => undefined)
  })
  api.onMenuSave(() => {
    void session.save()
  })
  api.onMenuFind?.(() => openFind())
  api.onMenuSource?.(() => toggleSource())
  api.onMenuExportHtml?.(() => {
    void exportDocument('html')
  })
  api.onMenuExportPdf?.(() => {
    void exportDocument('pdf')
  })
  api.onMenuExportDocx?.(() => {
    void exportPandoc('docx')
  })
  api.onMenuExportEpub?.(() => {
    void exportPandoc('epub')
  })
  api.onMenuFolderSearch?.(() => openFolderSearch())
  api.onMenuFocus?.(() => toggleFocus())
  api.onMenuTypewriter?.(() => toggleTypewriter())
  api.onMenuOpenBundle?.(() => {
    void session.openTextBundle()
  })
  api.onMenuSaveBundle?.(() => {
    void session.saveTextBundle()
  })
  api.onMenuQuickOpen?.(() => openQuick())
  api.onMenuPrint?.(() => {
    void printDocument()
  })
  api.onMenuExportLatex?.(() => {
    void exportPandoc('latex')
  })
  api.onMenuSidebar?.(() => toggleSidebar())
  api.onMenuZoomIn?.(() => setZoom(zoom.value + 10))
  api.onMenuZoomOut?.(() => setZoom(zoom.value - 10))
  api.onMenuZoomReset?.(() => setZoom(100))
  api.onMenuCopyHtml?.(() => {
    void copyHtml()
  })
  api.onRequestClose(() => {
    void session.requestClose()
  })
  api.onRecovery?.((recovery) => {
    const name = recovery.path.split(/[/\\]/).pop() ?? recovery.path
    const accept = window.confirm(`发现「${name}」有一份未完成的保存。恢复这份内容吗？`)
    if (accept) {
      void api.acceptRecovery(recovery.path).then((opened) => {
        if (!opened) return
        session.showOpened(opened, '已恢复上次未完成的保存。')
      })
    } else {
      void api.discardRecovery(recovery.path)
    }
  })
  void api.getSettings?.().then((settings) => {
    assetDir.value = settings.assetDir
    imageMode.value = settings.imageMode
    session.setImageMode(settings.imageMode)
    session.setRecent(settings.recent)
    session.setRecentFolders?.(settings.recentFolders ?? [])
    if (settings.css) applyUserCss(settings.css)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('focus', onFocus)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('dragover', allowWindowFileDrop)
  window.removeEventListener('drop', allowWindowFileDrop)
  window.clearInterval(externalTimer)
})
</script>

<template>
  <div
    class="app-shell flex h-full"
    :data-focus="focusMode ? 'on' : 'off'"
    :data-typewriter="typewriter ? 'on' : 'off'"
    :data-font="font"
    :style="editorStyle"
  >
    <button v-if="!sidebar" class="tool absolute left-3 top-3 z-10" type="button" @click="toggleSidebar">侧栏</button>
    <aside v-show="sidebar" class="sidebar flex w-64 shrink-0 flex-col border-r">
      <div class="flex items-center justify-between px-4 py-4">
        <div class="flex items-center gap-2.5">
          <img class="brand-logo" :src="logoUrl" width="36" height="36" alt="" />
          <div>
            <div class="text-sm font-semibold tracking-wide">墨白</div>
            <div class="text-xs muted">个人 Markdown</div>
          </div>
        </div>
        <div class="flex gap-1">
          <button class="tool" type="button" @click="toggleSidebar">隐藏</button>
          <button class="tool" type="button" @click="toggle">{{ theme === 'dark' ? '浅色' : '深色' }}</button>
        </div>
      </div>
      <div class="flex gap-1 px-3">
        <button class="sidebar-button" :class="{ selected: panel === 'files' }" type="button" @click="panel = 'files'">文件</button>
        <button class="sidebar-button" :class="{ selected: panel === 'outline' }" type="button" @click="panel = 'outline'">大纲</button>
        <button class="sidebar-button" :class="{ selected: panel === 'recent' }" type="button" @click="panel = 'recent'">最近</button>
        <button class="sidebar-button" :class="{ selected: panel === 'search' }" type="button" @click="openFolderSearch">搜索</button>
      </div>
      <div v-if="panel === 'files'" class="mt-3 flex gap-2 px-3">
        <button class="sidebar-button" type="button" @click="session.openFile()">打开</button>
        <button class="sidebar-button" type="button" @click="session.openFolder()">文件夹</button>
      </div>
      <div class="mt-4 min-h-0 flex-1 overflow-auto px-2 pb-4">
        <template v-if="panel === 'files'">
          <button
            v-for="file in session.files"
            :key="file.path"
            type="button"
            class="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
            :class="file.path === session.path ? 'selected-row' : 'muted'"
            @click="session.openListedFile(file)"
          >
            {{ file.relativePath }}
          </button>
          <p v-if="session.folder && session.files.length === 0" class="px-2 text-sm muted">这个文件夹里没有 Markdown 文件。</p>
        </template>
        <template v-else-if="panel === 'outline'">
          <input v-model="outlineQuery" class="asset-input mb-2" type="text" placeholder="过滤大纲" />
          <button
            v-for="item in visibleHeadings"
            :key="`${item.line}-${item.text}`"
            type="button"
            class="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
            :class="item.index === session.outlineIndex ? 'selected-row' : ''"
            :style="{ paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem` }"
            @click="showHeading(item.index)"
          >
            {{ item.text }}
          </button>
          <p v-if="visibleHeadings.length === 0" class="px-2 text-sm muted">
            {{ outlineQuery.trim() ? '没有匹配的标题。' : '这篇还没有标题。' }}
          </p>
        </template>
        <template v-else-if="panel === 'search'">
          <form class="px-2" @submit.prevent="runFolderSearch">
            <input id="folder-query" v-model="folderQuery" class="asset-input" type="text" placeholder="在文件夹中查找" />
            <label class="mt-2 flex items-center gap-2 text-xs"><input v-model="folderCase" type="checkbox" />区分大小写</label>
            <label class="mt-1 flex items-center gap-2 text-xs"><input v-model="folderWhole" type="checkbox" />整词</label>
            <label class="mt-1 flex items-center gap-2 text-xs"><input v-model="folderRegex" type="checkbox" />正则</label>
            <button class="sidebar-button mt-2" type="submit">查找</button>
          </form>
          <button
            v-for="hit in folderHits"
            :key="`${hit.path}:${hit.line}`"
            type="button"
            class="mt-1 block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
            @click="openFolderHit(hit)"
          >
            <span class="muted">{{ hit.relativePath }}:{{ hit.line }}</span>
            <span class="block truncate">{{ hit.text }}</span>
          </button>
          <p v-if="folderHits.length === 0" class="px-2 pt-3 text-sm muted">搜索当前打开的文件夹。</p>
        </template>
        <template v-else>
          <button
            v-for="item in session.recent"
            :key="item.path"
            type="button"
            class="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
            :class="item.path === session.path ? 'selected-row' : 'muted'"
            @click="session.openRecent(item.path)"
          >
            {{ item.name }}
          </button>
          <p v-if="session.recent.length === 0" class="px-2 text-sm muted">还没有最近文件。</p>
          <p class="px-2 pb-1 pt-4 text-xs muted">文件夹</p>
          <button
            v-for="item in session.recentFolders"
            :key="item.path"
            type="button"
            class="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
            :class="item.path === session.folder ? 'selected-row' : 'muted'"
            @click="session.openRecentFolder(item.path)"
          >
            {{ item.name }}
          </button>
          <p v-if="session.recentFolders.length === 0" class="px-2 text-sm muted">还没有最近文件夹。</p>
        </template>
      </div>
      <div class="border-t px-3 py-3 text-xs">
        <label class="muted" for="image-mode">插入图片</label>
        <select id="image-mode" v-model="imageMode" class="asset-input mt-1" @change="saveImageMode">
          <option value="copy">复制到图片目录</option>
          <option value="move">移动到图片目录</option>
        </select>
        <label class="muted mt-2 block" for="editor-measure">栏宽</label>
        <select id="editor-measure" v-model="measure" class="asset-input mt-1" @change="rememberMeasure">
          <option value="narrow">窄</option>
          <option value="normal">标准</option>
          <option value="wide">宽</option>
        </select>
        <label class="muted mt-2 block" for="editor-font">字体</label>
        <select id="editor-font" v-model="font" class="asset-input mt-1" @change="rememberFont">
          <option value="serif">衬线</option>
          <option value="sans">无衬线</option>
        </select>
        <label class="muted mt-2 block" for="asset-dir">图片目录</label>
        <div class="mt-1 flex gap-2">
          <input id="asset-dir" v-model="assetDir" class="asset-input" type="text" />
          <button class="sidebar-button" type="button" @click="saveAssetDir">设置</button>
        </div>
        <div class="mt-2 flex gap-2">
          <button class="sidebar-button" type="button" @click="chooseCss">用户样式</button>
          <button class="sidebar-button" type="button" @click="clearCss">清除</button>
        </div>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <header class="toolbar border-b px-3 py-2">
        <div class="toolbar-head">
          <div class="min-w-0 truncate text-sm muted">{{ session.title }}</div>
          <section class="tool-group" aria-label="文档">
            <span class="tool-group-label">文档</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" @click="openFind"><ToolIcon name="search" />查找</button>
              <button class="tool" type="button" @click="toggleSource">
                <ToolIcon :name="session.editing === 'source' ? 'preview' : 'source'" />
                {{ session.editing === 'source' ? '预览' : '源码' }}
              </button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="undo"><ToolIcon name="undo" />撤销</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="redo"><ToolIcon name="redo" />重做</button>
              <button class="tool" type="button" @click="session.save()"><ToolIcon name="save" />保存</button>
            </div>
          </section>
        </div>
        <div class="tool-groups">
          <section class="tool-group" aria-label="格式">
            <span class="tool-group-label">格式</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleBold')"><ToolIcon name="bold" />加粗</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleItalic')"><ToolIcon name="italic" />斜体</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleStrike')"><ToolIcon name="strike" />删除线</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="highlightMark"><ToolIcon name="highlight" />高亮</button>
            </div>
          </section>
          <section class="tool-group" aria-label="结构">
            <span class="tool-group-label">结构</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="heading"><ToolIcon name="heading" />标题</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleBulletList')"><ToolIcon name="list" />列表</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleTaskList')"><ToolIcon name="task" />待办</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleBlockquote')"><ToolIcon name="quote" />引用</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="run('toggleCodeBlock')"><ToolIcon name="code" />代码</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="horizontalRule"><ToolIcon name="rule" />分隔线</button>
            </div>
          </section>
          <section class="tool-group" aria-label="视图">
            <span class="tool-group-label">视图</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" :class="{ selected: focusMode }" @click="toggleFocus"><ToolIcon name="focus" />聚焦</button>
              <button class="tool" type="button" :class="{ selected: typewriter }" @click="toggleTypewriter"><ToolIcon name="typewriter" />打字机</button>
            </div>
          </section>
          <section class="tool-group" aria-label="插入">
            <span class="tool-group-label">插入</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" :class="{ selected: linkOpen }" :disabled="session.editing !== 'write'" @click="link"><ToolIcon name="link" />链接</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="chooseImage"><ToolIcon name="image" />图片</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="table"><ToolIcon name="table" />表格</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="insertHtmlBlock"><ToolIcon name="html" />HTML</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="insertMath(false)"><ToolIcon name="math" />公式</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="insertMath(true)"><ToolIcon name="math-block" />公式块</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="insertDiagram"><ToolIcon name="diagram" />图</button>
              <button class="tool" type="button" :disabled="session.editing !== 'write'" @click="insertFootnote"><ToolIcon name="footnote" />脚注</button>
              <button class="tool" type="button" :class="{ selected: emojiOpen }" :disabled="session.editing !== 'write'" @click="emojiOpen = !emojiOpen"><ToolIcon name="emoji" />表情</button>
            </div>
          </section>
          <section class="tool-group" aria-label="导出">
            <span class="tool-group-label">导出</span>
            <div class="tool-group-actions">
              <button class="tool" type="button" @click="copyHtml"><ToolIcon name="copy" />复制 HTML</button>
              <button class="tool" type="button" @click="exportPandoc('docx')"><ToolIcon name="word" />Word</button>
              <button class="tool" type="button" @click="exportPandoc('epub')"><ToolIcon name="epub" />EPUB</button>
              <button class="tool" type="button" @click="exportPandoc('latex')"><ToolIcon name="latex" />LaTeX</button>
              <button class="tool" type="button" @click="printDocument"><ToolIcon name="print" />打印</button>
            </div>
          </section>
        </div>
      </header>
      <form v-if="linkOpen" class="find-bar" @submit.prevent="applyLink">
        <label>文字 <input id="link-text" v-model="linkText" class="find-input" type="text" placeholder="显示的文字" /></label>
        <label>地址 <input id="link-href" v-model="linkHref" class="find-input link-input" type="text" placeholder="https://" /></label>
        <button type="submit">确定</button>
        <button type="button" @click="removeLink">去掉链接</button>
        <button type="button" @click="linkOpen = false">取消</button>
      </form>
      <FindBar
        v-if="findOpen"
        ref="findBarRef"
        :error="findError"
        :count="matches.length"
        :index="matchIndex"
        @search="applySearch($event, true)"
        @next="stepFind(1)"
        @previous="stepFind(-1)"
        @replace="replaceCurrent"
        @replace-all="replaceAll"
        @close="findOpen = false"
      />
      <div v-if="tableOpen" class="find-bar">
        <label>行 <input v-model.number="tableRows" class="count-input" type="number" min="1" max="12" /></label>
        <label>列 <input v-model.number="tableCols" class="count-input" type="number" min="1" max="8" /></label>
        <button type="button" @click="insertTable">插入</button>
        <button type="button" @click="alignCell('left')">左对齐</button>
        <button type="button" @click="alignCell('center')">居中</button>
        <button type="button" @click="alignCell('right')">右对齐</button>
        <button type="button" @click="addTableRow">加一行</button>
        <button type="button" @click="removeTableRow">删除行</button>
        <button type="button" @click="tableOpen = false">关闭</button>
      </div>
      <div v-if="emojiOpen" class="find-bar">
        <input v-model="emojiQuery" class="find-input" type="text" placeholder="搜索表情，例如 笑、赞、火" />
        <button v-for="emoji in emojiChoices" :key="emoji" type="button" @click="insertEmoji(emoji)">{{ emoji }}</button>
        <button type="button" @click="emojiOpen = false">关闭</button>
      </div>
      <div class="editor-scroll min-h-0 flex-1 overflow-auto" :class="{ 'typewriter-pad': typewriter && session.editing === 'write' }">
        <MarkdownEditor v-if="session.editing === 'write'" ref="editorRef" :typewriter="typewriter" />
        <SourceEditor
          class="editor-column mx-auto w-full px-8 py-10"
          v-else
          ref="sourceRef"
          :text="session.markdown"
          :generation="session.documentKey"
          @change="onSourceChange"
        />
      </div>
      <footer class="status-bar flex items-center justify-between border-t px-4 py-2 text-xs">
        <span>{{ status }}</span>
        <span class="flex items-center gap-2">
          <button class="tool" type="button" @click="setZoom(zoom - 10)">缩小</button>
          <button class="tool" type="button" @click="setZoom(100)">{{ zoom }}%</button>
          <button class="tool" type="button" @click="setZoom(zoom + 10)">放大</button>
          <span>{{ stats.characters }} 字 · {{ stats.words }} 词</span>
        </span>
      </footer>
      <form v-if="quickOpen" class="quick-open" @submit.prevent="quickHits[0] && chooseQuick(quickHits[0].path)">
        <input id="quick-query" v-model="quickQuery" class="asset-input" type="text" placeholder="快速打开文件" />
        <button
          v-for="item in quickHits"
          :key="item.path"
          type="button"
          class="mt-1 block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
          @click="chooseQuick(item.path)"
        >
          {{ item.name }}
        </button>
        <button class="sidebar-button mt-2" type="button" @click="quickOpen = false">关闭</button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.toolbar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.tool-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.4rem;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.12rem 0.28rem 0.12rem 0;
  border: 1px solid var(--line);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--panel) 62%, transparent);
}

.tool-group-label {
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 0.55rem;
  border-right: 1px solid var(--line);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--muted);
  white-space: nowrap;
}

.tool-group-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.05rem;
  min-width: 0;
}

.tool,
.sidebar-button {
  border-radius: 0.4rem;
  padding: 0.3rem 0.55rem;
  font-size: 0.8rem;
  color: var(--tool);
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.tool:hover,
.sidebar-button:hover {
  background: var(--hover);
}

.tool:disabled {
  opacity: 0.4;
}

.sidebar-button,
.selected {
  background: var(--panel);
  border: 1px solid var(--line);
}

.asset-input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 0.4rem;
  background: var(--panel);
  color: var(--ink);
  padding: 0.3rem 0.45rem;
}
</style>
