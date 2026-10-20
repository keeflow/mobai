<script setup lang="ts">
import { inspectMarkdown, markdownToPlainHtml } from '@shared/editor'
import type { FindOptions, TextSpan } from '@shared/find'
import type { FolderHit } from '@shared/folderSearch'
import { PANDOC_INSTALL_HINT, pandocLabel, type PandocFormat } from '@shared/pandoc'
import { writingStats } from '@shared/stats'
import { unclosedFenceLine } from '@shared/source'
import { clampZoom, editorFont, editorMeasure, type EditorFont, type EditorMeasure } from '@shared/view'
import type { ImagePlacement } from '@shared/settings'
import { getMarkRange } from '@tiptap/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EmojiBar from './components/EmojiBar.vue'
import FindBar from './components/FindBar.vue'
import LinkBar from './components/LinkBar.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import QuickOpen from './components/QuickOpen.vue'
import Sidebar from './components/Sidebar.vue'
import SourceEditor from './components/SourceEditor.vue'
import StatusBar from './components/StatusBar.vue'
import TableBar from './components/TableBar.vue'
import Toolbar from './components/Toolbar.vue'
import { useSessionStore } from './stores/session'
import { applyUserCss, useTheme } from './theme'

const session = useSessionStore()
const { preference, toggle } = useTheme()
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const sourceRef = ref<InstanceType<typeof SourceEditor> | null>(null)
const findBarRef = ref<InstanceType<typeof FindBar> | null>(null)
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null)
const quickOpenRef = ref<InstanceType<typeof QuickOpen> | null>(null)
const focusMode = ref(localStorage.getItem('mobai-focus') === 'on')
const typewriter = ref(localStorage.getItem('mobai-typewriter') === 'on')
const linkOpen = ref(false)
const linkText = ref('')
const linkHref = ref('https://')
const linkRange = ref<{ from: number; to: number } | null>(null)
const findOpen = ref(false)
const findError = ref('')
const matches = ref<TextSpan[]>([])
const matchIndex = ref(0)
const findOptions = ref<FindOptions>({ query: '', caseSensitive: false, wholeWord: false, regex: false })
const assetDir = ref('assets')
const sidebar = ref(localStorage.getItem('mobai-sidebar') !== 'off')
const zoom = ref(clampZoom(Number(localStorage.getItem('mobai-zoom') ?? '100')))
const measure = ref<EditorMeasure>(editorMeasure(localStorage.getItem('mobai-measure') ?? 'normal'))
const font = ref<EditorFont>(editorFont(localStorage.getItem('mobai-font') ?? 'serif'))
const imageMode = ref<ImagePlacement>('copy')
const emojiOpen = ref(false)
const emojiQuery = ref('')
const tableOpen = ref(false)
const tableRows = ref(3)
const tableCols = ref(3)
const editorStyle = computed(() => ({
  '--editor-size': String(zoom.value / 100),
  '--editor-measure': measure.value === 'narrow' ? '36rem' : measure.value === 'wide' ? '64rem' : '48rem'
}))
const status = computed(() => {
  if (session.saving) return '正在保存…'
  if (session.notice) return session.notice
  if (session.dirty) return '未保存'
  return session.path ? '已保存' : '未命名'
})
const stats = computed(() => writingStats(session.bodyText))

watch(measure, (value) => {
  localStorage.setItem('mobai-measure', value)
})

watch(font, (value) => {
  localStorage.setItem('mobai-font', value)
})

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
  quickOpenRef.value?.show()
}

async function chooseQuick(path: string): Promise<void> {
  const listed = session.files.find((file) => file.path === path)
  if (listed) {
    await session.openListedFile(listed)
    return
  }
  await session.openRecent(path)
}

function openFolderSearch(): void {
  if (!sidebar.value) toggleSidebar()
  sidebarRef.value?.selectPanel('search')
}

async function openFolderHit(payload: { hit: FolderHit; options: FindOptions }): Promise<void> {
  const { hit, options } = payload
  await session.openListedFile({ path: hit.path, name: hit.name, relativePath: hit.relativePath })
  await nextTick()
  const found = surface()?.search(options)
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

async function saveImageMode(mode: ImagePlacement): Promise<void> {
  imageMode.value = mode
  session.setImageMode(mode)
  if (!window.api) return
  try {
    const next = await window.api.setImageMode(mode)
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

function toggleEmoji(): void {
  emojiOpen.value = !emojiOpen.value
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
    <Sidebar
      v-show="sidebar"
      ref="sidebarRef"
      :visible="sidebar"
      :folder="session.folder"
      :files="session.files"
      :path="session.path"
      :title="session.title"
      :markdown="session.markdown"
      :outline-index="session.outlineIndex"
      :recent="session.recent"
      :recent-folders="session.recentFolders"
      :preference="preference"
      v-model:measure="measure"
      v-model:font="font"
      v-model:image-mode="imageMode"
      v-model:asset-dir="assetDir"
      @toggle-theme="toggle"
      @collapse="toggleSidebar"
      @open-file="session.openFile()"
      @open-folder="session.openFolder()"
      @open-listed="session.openListedFile($event)"
      @open-recent="session.openRecent($event)"
      @open-recent-folder="session.openRecentFolder($event)"
      @drop-file="(file, more) => session.openDropped(file, more)"
      @show-heading="showHeading"
      @open-folder-hit="openFolderHit"
      @notice="session.setNotice($event)"
      @save-image-mode="saveImageMode"
      @save-asset-dir="saveAssetDir"
      @choose-css="chooseCss"
      @clear-css="clearCss"
    />

    <main class="flex min-w-0 flex-1 flex-col">
      <Toolbar
        :sidebar-open="sidebar"
        :title="session.title"
        :editing="session.editing"
        :focus-mode="focusMode"
        :typewriter="typewriter"
        :link-open="linkOpen"
        :emoji-open="emojiOpen"
        @toggle-sidebar="toggleSidebar"
        @open-find="openFind"
        @toggle-source="toggleSource"
        @undo="undo"
        @redo="redo"
        @save="session.save()"
        @bold="run('toggleBold')"
        @italic="run('toggleItalic')"
        @strike="run('toggleStrike')"
        @highlight="highlightMark"
        @heading="heading"
        @bullet-list="run('toggleBulletList')"
        @task-list="run('toggleTaskList')"
        @blockquote="run('toggleBlockquote')"
        @code-block="run('toggleCodeBlock')"
        @horizontal-rule="horizontalRule"
        @toggle-focus="toggleFocus"
        @toggle-typewriter="toggleTypewriter"
        @link="link"
        @image="chooseImage"
        @table="table"
        @html="insertHtmlBlock"
        @math="insertMath(false)"
        @math-block="insertMath(true)"
        @diagram="insertDiagram"
        @footnote="insertFootnote"
        @toggle-emoji="toggleEmoji"
        @copy-html="copyHtml"
        @export-docx="exportPandoc('docx')"
        @export-epub="exportPandoc('epub')"
        @export-latex="exportPandoc('latex')"
        @print="printDocument"
      />
      <LinkBar v-if="linkOpen" v-model:text="linkText" v-model:href="linkHref" @submit="applyLink" @remove="removeLink" @cancel="linkOpen = false" />
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
      <TableBar
        v-if="tableOpen"
        v-model:rows="tableRows"
        v-model:cols="tableCols"
        @insert="insertTable"
        @align="alignCell"
        @add-row="addTableRow"
        @remove-row="removeTableRow"
        @close="tableOpen = false"
      />
      <EmojiBar v-if="emojiOpen" v-model:query="emojiQuery" @insert="insertEmoji" @close="emojiOpen = false" />
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
      <StatusBar :status="status" :zoom="zoom" :characters="stats.characters" :words="stats.words" @zoom="setZoom" />
      <QuickOpen ref="quickOpenRef" :files="session.files" :recent="session.recent" @choose="chooseQuick" />
    </main>
  </div>
</template>
