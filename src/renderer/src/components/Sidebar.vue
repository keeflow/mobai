<script setup lang="ts">
import { collectDocumentFilesFromDataTransfer } from '@shared/documents'
import type { FindOptions } from '@shared/find'
import type { FolderHit, FolderSearchOptions } from '@shared/folderSearch'
import { folderSearchError } from '@shared/folderSearch'
import { dataTransferHasFiles } from '@shared/images'
import { outlineFromMarkdown } from '@shared/outline'
import type { RecentEntry } from '@shared/recent'
import type { ImagePlacement } from '@shared/settings'
import type { EditorFont, EditorMeasure } from '@shared/view'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { MarkdownFileEntry } from '../../../preload'
import logoUrl from '../assets/logo.png'
import { ancestorFolderIds } from '../fileTree'
import type { ThemePreference } from '../theme'
import FilePanel from './FilePanel.vue'
import ToolIcon from './ToolIcon.vue'
import OutlinePanel from './OutlinePanel.vue'
import RecentPanel from './RecentPanel.vue'
import SearchPanel from './SearchPanel.vue'
import SidebarPrefs from './SidebarPrefs.vue'

type SidePanel = 'files' | 'outline' | 'recent' | 'search'

const props = defineProps<{
  visible: boolean
  folder: string | null
  files: MarkdownFileEntry[]
  path: string | null
  title: string | undefined
  markdown: string
  outlineIndex: number
  recent: RecentEntry[]
  recentFolders: RecentEntry[]
  preference: ThemePreference
  measure: EditorMeasure
  font: EditorFont
  imageMode: ImagePlacement
  assetDir: string
}>()

const emit = defineEmits<{
  'update:measure': [value: EditorMeasure]
  'update:font': [value: EditorFont]
  'update:imageMode': [value: ImagePlacement]
  'update:assetDir': [value: string]
  toggleTheme: []
  collapse: []
  openFile: []
  openFolder: []
  openListed: [file: MarkdownFileEntry]
  openRecent: [path: string]
  openRecentFolder: [path: string]
  showHeading: [index: number]
  openFolderHit: [payload: { hit: FolderHit; options: FindOptions }]
  notice: [message: string]
  dropFile: [file: File, more: boolean]
  saveImageMode: [mode: ImagePlacement]
  saveAssetDir: []
  chooseCss: []
  clearCss: []
}>()

function readPanel(): SidePanel {
  const value = localStorage.getItem('mobai-panel')
  if (value === 'files' || value === 'outline' || value === 'recent' || value === 'search') return value
  return 'files'
}

const SIDEBAR_MIN = 220
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 288

function readWidth(): number {
  const stored = localStorage.getItem('mobai-sidebar-width')
  const value = Number(stored)
  if (!stored || !Number.isFinite(value)) return SIDEBAR_DEFAULT
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)))
}

const panel = ref<SidePanel>(readPanel())
const width = ref(readWidth())
const resizing = ref(false)
const draggingDocument = ref(false)
let dragMove: ((event: PointerEvent) => void) | null = null
let dragEnd: ((event: PointerEvent) => void) | null = null
const fileQuery = ref('')
const collapsedDirs = ref(new Set<string>())
const outlineQuery = ref('')
const folderQuery = ref('')
const folderHits = ref<FolderHit[]>([])
const folderSearched = ref(false)
const folderCase = ref(false)
const folderWhole = ref(false)
const folderRegex = ref(false)
const headings = computed(() => outlineFromMarkdown(props.markdown))
const themeIcon = computed(() => (props.preference === 'dark' ? 'moon' : props.preference === 'system' ? 'display' : 'sun'))
const themeLabel = computed(() => (props.preference === 'dark' ? '跟随系统' : props.preference === 'system' ? '切换到浅色' : '切换到深色'))
const folderCaption = computed(() => {
  if (!props.folder) return '个人 Markdown'
  return props.folder.split(/[/\\]/).filter(Boolean).pop() || props.folder
})
const measureModel = computed({
  get: () => props.measure,
  set: (value: EditorMeasure) => emit('update:measure', value)
})
const fontModel = computed({
  get: () => props.font,
  set: (value: EditorFont) => emit('update:font', value)
})
const imageModeModel = computed({
  get: () => props.imageMode,
  set: (value: ImagePlacement) => emit('update:imageMode', value)
})
const assetDirModel = computed({
  get: () => props.assetDir,
  set: (value: string) => emit('update:assetDir', value)
})

function setWidth(next: number): void {
  width.value = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(next)))
  localStorage.setItem('mobai-sidebar-width', String(width.value))
}

function stopResize(): void {
  if (dragMove) window.removeEventListener('pointermove', dragMove)
  if (dragEnd) {
    window.removeEventListener('pointerup', dragEnd)
    window.removeEventListener('pointercancel', dragEnd)
  }
  dragMove = null
  dragEnd = null
  resizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function startResize(event: PointerEvent): void {
  if (event.button !== 0) return
  event.preventDefault()
  stopResize()
  resizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  const startX = event.clientX
  const startWidth = width.value
  dragMove = (move) => {
    width.value = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(startWidth + move.clientX - startX)))
  }
  dragEnd = () => {
    setWidth(width.value)
    stopResize()
  }
  window.addEventListener('pointermove', dragMove)
  window.addEventListener('pointerup', dragEnd)
  window.addEventListener('pointercancel', dragEnd)
}

function nudgeWidth(event: KeyboardEvent): void {
  const step = event.shiftKey ? 32 : 16
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    setWidth(width.value - step)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    setWidth(width.value + step)
  }
}

function selectPanel(next: SidePanel): void {
  panel.value = next
  localStorage.setItem('mobai-panel', next)
  draggingDocument.value = false
  if (next === 'search') requestAnimationFrame(() => document.getElementById('folder-query')?.focus())
}

function dragStartsOnSidebar(event: DragEvent): boolean {
  return panel.value === 'files' && dataTransferHasFiles(event.dataTransfer)
}

function onDocumentDragEnter(event: DragEvent): void {
  if (!dragStartsOnSidebar(event)) return
  draggingDocument.value = true
}

function onDocumentDragOver(event: DragEvent): void {
  if (!dragStartsOnSidebar(event)) return
  event.preventDefault()
  draggingDocument.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDocumentDragLeave(event: DragEvent): void {
  const host = event.currentTarget
  const next = event.relatedTarget
  if (host instanceof Node && next instanceof Node && host.contains(next)) return
  draggingDocument.value = false
}

function onDocumentDrop(event: DragEvent): void {
  const accept = dragStartsOnSidebar(event)
  draggingDocument.value = false
  if (!dataTransferHasFiles(event.dataTransfer)) return
  event.preventDefault()
  if (!accept) {
    emit('notice', '请先切到「文件」，再把 Markdown 拖到侧栏打开。')
    return
  }
  const documents = collectDocumentFilesFromDataTransfer(event.dataTransfer)
  const file = documents[0]
  if (!file) {
    emit('notice', '只能把 Markdown 文档拖到文件栏打开。')
    return
  }
  emit('dropFile', file, documents.length > 1)
}

function toggleDir(id: string): void {
  const next = new Set(collapsedDirs.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedDirs.value = next
}

async function runFolderSearch(): Promise<void> {
  if (!folderQuery.value.trim()) {
    folderHits.value = []
    folderSearched.value = false
    emit('notice', '请输入要查找的文字。')
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
    folderSearched.value = false
    emit('notice', invalid)
    return
  }
  if (!props.folder) {
    emit('notice', '先打开一个文件夹，再搜索其中的 Markdown。')
    return
  }
  if (!window.api?.searchFolder) {
    emit('notice', '文件夹搜索要在桌面窗口里使用。')
    return
  }
  try {
    folderHits.value = await window.api.searchFolder(props.folder, folderQuery.value, options)
    folderSearched.value = true
    emit('notice', folderHits.value.length ? `找到 ${folderHits.value.length} 处` : '没有匹配的内容。')
  } catch (error) {
    emit('notice', error instanceof Error ? error.message : '无法搜索文件夹')
  }
}

function openHit(hit: FolderHit): void {
  emit('openFolderHit', {
    hit,
    options: {
      query: folderQuery.value,
      caseSensitive: folderCase.value,
      wholeWord: folderWhole.value,
      regex: folderRegex.value
    }
  })
}

function revealOutline(index: number): void {
  const current = document.querySelector(`.sidebar [data-outline="${index}"]`)
  if (!(current instanceof HTMLElement)) return
  const scroller = current.closest('.sidebar-body')
  if (!(scroller instanceof HTMLElement)) return
  const item = current.getBoundingClientRect()
  const box = scroller.getBoundingClientRect()
  if (item.top < box.top) scroller.scrollTop -= box.top - item.top + 8
  else if (item.bottom > box.bottom) scroller.scrollTop += item.bottom - box.bottom + 8
}

watch(
  () => props.folder,
  () => {
    fileQuery.value = ''
    collapsedDirs.value = new Set()
    folderHits.value = []
    folderSearched.value = false
  }
)

watch(
  () => [props.outlineIndex, panel.value, props.visible] as const,
  async ([index, currentPanel, open]) => {
    if (!open || currentPanel !== 'outline' || index < 0) return
    await nextTick()
    revealOutline(index)
  }
)

watch(
  () => props.path,
  async (path) => {
    if (!path) return
    const file = props.files.find((item) => item.path === path)
    if (!file) return
    const next = new Set(collapsedDirs.value)
    let changed = false
    for (const id of ancestorFolderIds(file.relativePath)) {
      if (next.delete(id)) changed = true
    }
    if (changed) collapsedDirs.value = next
    if (panel.value !== 'files' || !props.visible) return
    await nextTick()
    document.querySelector('.sidebar [data-current="yes"]')?.scrollIntoView({ block: 'nearest' })
  }
)

onBeforeUnmount(stopResize)

defineExpose({ selectPanel })
</script>

<template>
  <aside
    class="sidebar flex shrink-0 flex-col border-r"
    :style="{ width: `${width}px` }"
    :data-resizing="resizing ? 'yes' : 'no'"
    :data-dropping="draggingDocument ? 'yes' : 'no'"
    @dragenter="onDocumentDragEnter"
    @dragover="onDocumentDragOver"
    @dragleave="onDocumentDragLeave"
    @drop="onDocumentDrop"
  >
    <div class="sidebar-brand">
      <img class="brand-logo" :src="logoUrl" width="32" height="32" alt="" />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold tracking-wide">墨白</div>
        <div class="truncate text-xs muted" :title="folder || ''">{{ folderCaption }}</div>
      </div>
      <button class="tool icon-tool" type="button" :title="themeLabel" :aria-label="themeLabel" @click="emit('toggleTheme')">
        <ToolIcon :name="themeIcon" />
      </button>
      <button class="tool icon-tool" type="button" title="收起侧栏" aria-label="收起侧栏" @click="emit('collapse')">
        <ToolIcon name="sidebar-collapse" />
      </button>
    </div>
    <div class="sidebar-tabs" role="tablist" aria-label="侧栏">
      <button class="sidebar-tab" role="tab" type="button" :aria-selected="panel === 'files'" :class="{ active: panel === 'files' }" @click="selectPanel('files')">
        文件
      </button>
      <button
        class="sidebar-tab"
        role="tab"
        type="button"
        :aria-selected="panel === 'outline'"
        :class="{ active: panel === 'outline' }"
        @click="selectPanel('outline')"
      >
        大纲
      </button>
      <button
        class="sidebar-tab"
        role="tab"
        type="button"
        :aria-selected="panel === 'recent'"
        :class="{ active: panel === 'recent' }"
        @click="selectPanel('recent')"
      >
        最近
      </button>
      <button
        class="sidebar-tab"
        role="tab"
        type="button"
        :aria-selected="panel === 'search'"
        :class="{ active: panel === 'search' }"
        @click="selectPanel('search')"
      >
        搜索
      </button>
    </div>
    <p class="sidebar-meta">
      <template v-if="panel === 'files'">{{ folder ? `${files.length} 个文件` : '尚未打开文件夹' }}</template>
      <template v-else-if="panel === 'outline'">{{ headings.length }} 个标题</template>
      <template v-else-if="panel === 'recent'">{{ recent.length }} 个文件 · {{ recentFolders.length }} 个文件夹</template>
      <template v-else>{{ folderSearched ? `${folderHits.length} 条结果` : '在当前文件夹中查找' }}</template>
    </p>
    <FilePanel
      v-if="panel === 'files'"
      :folder="folder"
      :files="files"
      :path="path"
      :title="title"
      :file-query="fileQuery"
      :collapsed="collapsedDirs"
      @update:file-query="fileQuery = $event"
      @open-file="emit('openFile')"
      @open-folder="emit('openFolder')"
      @open-listed="emit('openListed', $event)"
      @toggle-dir="toggleDir"
    />
    <OutlinePanel
      v-else-if="panel === 'outline'"
      :headings="headings"
      :outline-index="outlineIndex"
      :query="outlineQuery"
      @update:query="outlineQuery = $event"
      @show="emit('showHeading', $event)"
    />
    <SearchPanel
      v-else-if="panel === 'search'"
      :folder="folder"
      :query="folderQuery"
      :hits="folderHits"
      :searched="folderSearched"
      :case-sensitive="folderCase"
      :whole-word="folderWhole"
      :regex="folderRegex"
      @update:query="folderQuery = $event"
      @update:case-sensitive="folderCase = $event"
      @update:whole-word="folderWhole = $event"
      @update:regex="folderRegex = $event"
      @search="runFolderSearch"
      @open="openHit"
    />
    <RecentPanel
      v-else
      :recent="recent"
      :recent-folders="recentFolders"
      :path="path"
      :folder="folder"
      @open-recent="emit('openRecent', $event)"
      @open-recent-folder="emit('openRecentFolder', $event)"
    />
    <div v-if="draggingDocument" class="sidebar-drop-hint">放开以打开 Markdown</div>
    <div
      class="sidebar-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整侧栏宽度"
      :aria-valuenow="width"
      :aria-valuemin="SIDEBAR_MIN"
      :aria-valuemax="SIDEBAR_MAX"
      tabindex="0"
      @pointerdown="startResize"
      @keydown="nudgeWidth"
    />
    <SidebarPrefs
      v-model:measure="measureModel"
      v-model:font="fontModel"
      v-model:image-mode="imageModeModel"
      v-model:asset-dir="assetDirModel"
      @save-image-mode="emit('saveImageMode', $event)"
      @save-asset-dir="emit('saveAssetDir')"
      @choose-css="emit('chooseCss')"
      @clear-css="emit('clearCss')"
    />
  </aside>
</template>

<style scoped>
.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent);
}

.sidebar {
  position: relative;
}

.sidebar[data-dropping='yes'] {
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.sidebar-drop-hint {
  pointer-events: none;
  position: absolute;
  inset: 0.55rem;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed color-mix(in srgb, var(--accent) 70%, transparent);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--paper) 84%, var(--accent));
  color: var(--ink);
  font-size: 0.92rem;
  letter-spacing: 0.02em;
}

.icon-tool {
  padding: 0.32rem;
}

.sidebar-resize {
  position: absolute;
  top: 0;
  right: -4px;
  bottom: 0;
  z-index: 3;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}

.sidebar-resize:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  outline-offset: 1px;
}

.sidebar-resize::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2px;
  width: 2px;
  background: transparent;
}

.sidebar-resize:hover::after,
.sidebar[data-resizing='yes'] .sidebar-resize::after,
.sidebar-resize:focus-visible::after {
  background: var(--accent);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem 0.7rem 0.35rem;
}

.sidebar-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0.15rem 0.7rem 0;
  border-bottom: 1px solid var(--line);
}

.sidebar-tab {
  position: relative;
  padding: 0.42rem 0.1rem 0.5rem;
  border: 0;
  border-radius: 0.35rem 0.35rem 0 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
}

.sidebar-tab:hover,
.sidebar-tab.active {
  color: var(--ink);
}

.sidebar-tab.active {
  font-weight: 650;
}

.sidebar-tab.active::after {
  content: '';
  position: absolute;
  right: 0.55rem;
  bottom: -1px;
  left: 0.55rem;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
}

.sidebar-meta {
  margin: 0;
  padding: 0.45rem 0.9rem 0;
  color: var(--muted);
  font-size: 0.72rem;
}
</style>
