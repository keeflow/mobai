import { canonicalMarkdown } from '@shared/editor'
import type { RecentEntry } from '@shared/recent'
import { classifyExternalChange, type ImagePlacement } from '@shared/settings'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { MarkdownFileEntry } from '../../../preload'

const AUTOSAVE_DELAY_MS = 1000

export const useSessionStore = defineStore('session', () => {
  const path = ref<string | null>(null)
  const folder = ref<string | null>(null)
  const files = ref<MarkdownFileEntry[]>([])
  const markdown = ref('')
  const savedMarkdown = ref('')
  const mtimeMs = ref<number | null>(null)
  const notice = ref('')
  const saving = ref(false)
  const documentKey = ref(0)
  const editing = ref<'write' | 'source'>('write')
  const recent = ref<RecentEntry[]>([])
  const imageMode = ref<ImagePlacement>('copy')
  const bodyText = ref('')
  const recentFolders = ref<RecentEntry[]>([])
  const outlineIndex = ref(-1)
  let saveTimer = 0
  let applying = false
  let seenExternalMtime: number | null = null

  const dirty = computed(() => markdown.value !== savedMarkdown.value)
  const title = computed(() => (path.value ? path.value.split(/[/\\]/).pop() : '未命名'))

  function setNotice(message: string): void {
    notice.value = message
  }

  function replaceDocument(next: { path: string | null; text: string; mtimeMs: number | null }): void {
    applying = true
    savedMarkdown.value = canonicalMarkdown(next.text)
    markdown.value = savedMarkdown.value
    path.value = next.path
    mtimeMs.value = next.mtimeMs
    documentKey.value += 1
    seenExternalMtime = null
    applying = false
  }

  function adoptRecent(entries: RecentEntry[] | undefined): void {
    if (entries) recent.value = entries
  }

  function showOpened(opened: { path: string; text: string; mtimeMs: number; recent?: RecentEntry[] }, message = ''): void {
    replaceDocument(opened)
    adoptRecent(opened.recent)
    setNotice(message)
  }

  function rememberBody(text: string): void {
    bodyText.value = text
  }

  function noteEditorMarkdown(value: string): void {
    if (applying) return
    markdown.value = canonicalMarkdown(value)
    scheduleAutosave()
  }

  function scheduleAutosave(): void {
    window.clearTimeout(saveTimer)
    if (!path.value || !dirty.value || !window.api) return
    saveTimer = window.setTimeout(() => {
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }

  async function flush(): Promise<boolean> {
    if (!window.api || !path.value || markdown.value === savedMarkdown.value) return true
    const snapshot = markdown.value
    saving.value = true
    try {
      const result = await window.api.writeFile(path.value, snapshot)
      if (markdown.value === snapshot) {
        savedMarkdown.value = snapshot
        mtimeMs.value = result.mtimeMs
        setNotice('已保存')
      } else {
        scheduleAutosave()
      }
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
      return false
    } finally {
      saving.value = false
    }
  }

  async function save(): Promise<void> {
    window.clearTimeout(saveTimer)
    if (!window.api) {
      setNotice('打开和保存需要在桌面窗口里使用。')
      return
    }
    if (!path.value) {
      const result = await window.api.saveAs(markdown.value)
      if (!result) return
      path.value = result.path
      savedMarkdown.value = markdown.value
      mtimeMs.value = result.mtimeMs
      adoptRecent(result.recent)
      setNotice('已保存')
      return
    }
    await flush()
  }

  async function openFile(): Promise<void> {
    if (!window.api) {
      setNotice('打开和保存需要在桌面窗口里使用。')
      return
    }
    if (!(await prepareToLeave())) return
    const opened = await window.api.openFile()
    if (!opened) return
    if ('detached' in opened && opened.detached) {
      replaceDocument({ path: null, text: opened.text, mtimeMs: null })
      adoptRecent(opened.recent)
      setNotice('已从 TextPack 读入。保存时会另存为文档。')
      return
    }
    if (!('text' in opened)) {
      setNotice(opened.error)
      return
    }
    replaceDocument(opened)
    adoptRecent(opened.recent)
    setNotice('')
  }

  async function openTextBundle(): Promise<void> {
    if (!window.api?.openTextBundle) {
      setNotice('打开 TextBundle 需要在桌面窗口里使用。')
      return
    }
    if (!(await prepareToLeave())) return
    const opened = await window.api.openTextBundle()
    if (!opened) return
    replaceDocument(opened)
    adoptRecent(opened.recent)
    setNotice('已打开 TextBundle。')
  }

  async function saveTextBundle(): Promise<void> {
    if (!window.api?.saveTextBundle) {
      setNotice('保存 TextBundle 需要在桌面窗口里使用。')
      return
    }
    const saved = await window.api.saveTextBundle(markdown.value, path.value)
    if (!saved) return
    path.value = saved.path
    savedMarkdown.value = markdown.value
    mtimeMs.value = saved.mtimeMs
    adoptRecent(saved.recent)
    setNotice('已保存为 TextBundle。')
  }

  async function openFolder(): Promise<void> {
    if (!window.api) {
      setNotice('打开文件夹需要在桌面窗口里使用。')
      return
    }
    const opened = await window.api.openFolder()
    if (!opened) return
    folder.value = opened.folder
    files.value = opened.files
    recentFolders.value = opened.recentFolders
  }

  async function openRecentFolder(folderPath: string): Promise<void> {
    if (!window.api?.openRecentFolder) {
      setNotice('打开文件夹需要在桌面窗口里使用。')
      return
    }
    try {
      const opened = await window.api.openRecentFolder(folderPath)
      folder.value = opened.folder
      files.value = opened.files
      recentFolders.value = opened.recentFolders
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法打开文件夹')
    }
  }

  async function openListedFile(file: MarkdownFileEntry): Promise<void> {
    if (!window.api) return
    if (file.path === path.value) return
    if (!(await prepareToLeave())) return
    try {
      const opened = await window.api.readFile(file.path)
      if (opened.error) {
        setNotice(opened.error)
        return
      }
      replaceDocument(opened)
      adoptRecent(opened.recent)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法打开文件')
    }
  }

  async function openFromSystem(filePath: string): Promise<void> {
    if (!window.api?.openExternal) {
      setNotice('从系统打开文件需要在桌面窗口里使用。')
      return
    }
    if (filePath === path.value) return
    if (!(await prepareToLeave())) return
    try {
      const opened = await window.api.openExternal(filePath)
      if ('detached' in opened && opened.detached) {
        replaceDocument({ path: null, text: opened.text, mtimeMs: null })
        adoptRecent(opened.recent)
        setNotice('已从 TextPack 读入。保存时会另存为文档。')
        return
      }
      if (!('text' in opened)) {
        setNotice(opened.error)
        return
      }
      replaceDocument(opened)
      adoptRecent(opened.recent)
      setNotice('kind' in opened && opened.kind === 'bundle' ? '已打开 TextBundle。' : '')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法打开文件')
    }
  }

  async function openRecent(filePath: string): Promise<void> {
    if (!window.api) {
      setNotice('最近文件需要在桌面窗口里打开。')
      return
    }
    if (filePath === path.value) return
    if (!(await prepareToLeave())) return
    try {
      const opened = await window.api.openRecent(filePath)
      replaceDocument(opened)
      adoptRecent(opened.recent)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法打开最近文件')
    }
  }

  async function checkExternal(): Promise<void> {
    if (!window.api || !path.value || saving.value) return
    try {
      const info = await window.api.stat(path.value)
      const kind = classifyExternalChange(mtimeMs.value, info.mtimeMs, dirty.value)
      if (kind === 'unchanged' || seenExternalMtime === info.mtimeMs) return
      const reload = window.confirm(
        kind === 'conflict'
          ? '这个文件在磁盘上被改过，而且当前还有未保存的修改。重新载入会丢掉这些修改。'
          : '这个文件在磁盘上被改过。要重新载入吗？'
      )
      if (!reload) {
        seenExternalMtime = info.mtimeMs
        return
      }
      const opened = await window.api.readFile(path.value)
      if (opened.error) {
        setNotice(opened.error)
        return
      }
      replaceDocument(opened)
      adoptRecent(opened.recent)
      setNotice('已重新载入磁盘上的版本。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法检查文件是否被修改')
    }
  }

  async function prepareToLeave(): Promise<boolean> {
    if (!dirty.value) return true
    if (path.value) return flush()
    return window.confirm('当前文档还没有保存。离开后，未保存的内容会丢失。')
  }

  async function requestClose(): Promise<void> {
    if (!window.api) return
    if (dirty.value && path.value) {
      const ok = await flush()
      if (!ok) return
    } else if (dirty.value && !window.confirm('文档还没有保存。确定关闭并丢弃这些内容吗？')) {
      return
    }
    window.api.confirmClose()
  }

  function refuseUnsavedImage(): boolean {
    if (window.api && path.value) return false
    setNotice('请先保存文档，再粘贴或插入图片。未保存的文档不能使用相对路径。')
    return true
  }

  function diskPathOf(file: File): string {
    const legacy = (file as File & { path?: string }).path
    if (legacy && legacy.trim()) return legacy.trim()
    return window.api?.pathForFile?.(file)?.trim() ?? ''
  }

  async function insertImageFile(file: File): Promise<string | null> {
    if (refuseUnsavedImage() || !window.api || !path.value) return null
    const diskPath = diskPathOf(file)
    if (diskPath && window.api.placeImage) {
      try {
        const saved = await window.api.placeImage(path.value, diskPath)
        setNotice(saved.placed === 'move' ? `已移动到 ${saved.relativePath}` : `已复制到 ${saved.relativePath}`)
        return saved.relativePath
      } catch {
        // 路径不可用时再按文件内容复制。
      }
    }
    try {
      const buffer = await file.arrayBuffer()
      if (buffer.byteLength === 0) {
        setNotice('读不到这张图片的内容。')
        return null
      }
      const saved = await window.api.saveImage(path.value, new Uint8Array(buffer), file.type || file.name)
      setNotice(
        imageMode.value === 'move'
          ? '剪贴板或网页里的图片已复制。移动只适用于从本机文件拖入或选择的图片。'
          : `已复制到 ${saved.relativePath}`
      )
      return saved.relativePath
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法保存图片')
      return null
    }
  }

  async function importImageFromDialog(): Promise<string | null> {
    if (refuseUnsavedImage() || !window.api || !path.value) return null
    const saved = await window.api.importImage(path.value)
    if (!saved) return null
    setNotice(saved.placed === 'move' ? `已移动到 ${saved.relativePath}` : `已复制到 ${saved.relativePath}`)
    return saved.relativePath
  }

  return {
    path,
    folder,
    files,
    markdown,
    dirty,
    title,
    notice,
    saving,
    mtimeMs,
    documentKey,
    editing,
    recent,
    recentFolders,
    outlineIndex,
    imageMode,
    bodyText,
    setNotice,
    setEditing: (next: 'write' | 'source'): void => {
      editing.value = next
    },
    setRecent: (entries: RecentEntry[]): void => {
      recent.value = entries
    },
    setRecentFolders: (entries: RecentEntry[]): void => {
      recentFolders.value = entries
    },
    setOutlineIndex: (index: number): void => {
      outlineIndex.value = index
    },
    showOpened,
    noteEditorMarkdown,
    rememberBody,
    save,
    openFile,
    openFolder,
    openRecentFolder,
    openTextBundle,
    saveTextBundle,
    openListedFile,
    openFromSystem,
    openRecent,
    checkExternal,
    requestClose,
    setImageMode: (mode: ImagePlacement): void => {
      imageMode.value = mode
    },
    insertImageFile,
    importImageFromDialog,
    flush
  }
})
