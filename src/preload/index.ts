import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { FolderHit, FolderSearchOptions } from '../shared/folderSearch'
import type { PandocFormat } from '../shared/pandoc'
import type { RecentEntry } from '../shared/recent'
import type { RecoveryCopy } from '../shared/recovery'

export interface MarkdownFileEntry {
  path: string
  name: string
  relativePath: string
}

export interface OpenedFile {
  path: string
  text: string
  mtimeMs: number
  error?: string
  recent?: RecentEntry[]
}

export interface AppSettingsPayload {
  assetDir: string
  imageMode: 'copy' | 'move'
  userCssPath: string | null
  css: string
  recent: RecentEntry[]
  recentFolders: RecentEntry[]
}

const api = {
  openFile: (): Promise<
    | (OpenedFile & { recent: RecentEntry[] })
    | { error: string }
    | { detached: true; path: null; text: string; mtimeMs: number; recent: RecentEntry[] }
    | null
  > => ipcRenderer.invoke('file:open'),
  openFolder: (): Promise<{ folder: string; files: MarkdownFileEntry[]; recentFolders: RecentEntry[] } | null> =>
    ipcRenderer.invoke('folder:open'),
  openRecentFolder: (folder: string): Promise<{ folder: string; files: MarkdownFileEntry[]; recentFolders: RecentEntry[] }> =>
    ipcRenderer.invoke('folder:reopen', folder),
  openTextBundle: (): Promise<(OpenedFile & { recent: RecentEntry[] }) | null> => ipcRenderer.invoke('bundle:open'),
  saveTextBundle: (
    content: string,
    sourcePath: string | null
  ): Promise<{ path: string; mtimeMs: number; recent: RecentEntry[] } | null> =>
    ipcRenderer.invoke('bundle:save', content, sourcePath),
  readFile: (filePath: string): Promise<OpenedFile & { recent: RecentEntry[] }> =>
    ipcRenderer.invoke('file:read', filePath),
  listFiles: (folder: string): Promise<MarkdownFileEntry[]> => ipcRenderer.invoke('folder:list', folder),
  searchFolder: (folder: string, query: string, options?: FolderSearchOptions): Promise<FolderHit[]> =>
    ipcRenderer.invoke('folder:search', folder, query, options),
  writeFile: (filePath: string, content: string): Promise<{ path: string; mtimeMs: number }> =>
    ipcRenderer.invoke('file:write', filePath, content),
  saveAs: (content: string): Promise<{ path: string; mtimeMs: number; recent: RecentEntry[] } | null> =>
    ipcRenderer.invoke('file:save-as', content),
  stat: (filePath: string): Promise<{ mtimeMs: number }> => ipcRenderer.invoke('file:stat', filePath),
  saveImage: (
    documentPath: string,
    bytes: Uint8Array,
    mime: string
  ): Promise<{ relativePath: string; placed: 'copy' | 'move' }> =>
    ipcRenderer.invoke('image:save', documentPath, bytes, mime),
  importImage: (documentPath: string): Promise<{ relativePath: string; placed: 'copy' | 'move' } | null> =>
    ipcRenderer.invoke('image:import', documentPath),
  placeImage: (
    documentPath: string,
    sourcePath: string
  ): Promise<{ relativePath: string; placed: 'copy' | 'move' }> =>
    ipcRenderer.invoke('image:place', documentPath, sourcePath),
  pathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },
  setImageMode: (imageMode: 'copy' | 'move'): Promise<{ imageMode: 'copy' | 'move' }> =>
    ipcRenderer.invoke('settings:image-mode', imageMode),
  listRecent: (): Promise<RecentEntry[]> => ipcRenderer.invoke('recent:list'),
  openRecent: (filePath: string): Promise<OpenedFile & { recent: RecentEntry[] }> =>
    ipcRenderer.invoke('recent:open', filePath),
  openDropped: (
    filePath: string
  ): Promise<
    | (OpenedFile & { recent: RecentEntry[]; kind: 'markdown' | 'bundle' })
    | { error: string }
    | { detached: true; path: null; text: string; mtimeMs: number; recent: RecentEntry[] }
  > => ipcRenderer.invoke('file:open-dropped', filePath),
  openExternal: (
    filePath: string
  ): Promise<
    | (OpenedFile & { recent: RecentEntry[]; kind: 'markdown' | 'bundle' })
    | { error: string }
    | { detached: true; path: null; text: string; mtimeMs: number; recent: RecentEntry[] }
  > => ipcRenderer.invoke('file:open-external', filePath),
  getSettings: (): Promise<AppSettingsPayload> => ipcRenderer.invoke('settings:get'),
  setAssetDir: (assetDir: string): Promise<{ assetDir: string; userCssPath: string | null }> =>
    ipcRenderer.invoke('settings:asset-dir', assetDir),
  chooseCss: (): Promise<{ path: string; css: string } | null> => ipcRenderer.invoke('css:choose'),
  clearCss: (): Promise<{ path: null; css: string }> => ipcRenderer.invoke('css:clear'),
  exportHtml: (html: string): Promise<{ path: string } | null> => ipcRenderer.invoke('file:export-html', html),
  exportPdf: (html: string): Promise<{ path: string } | null> => ipcRenderer.invoke('file:export-pdf', html),
  printHtml: (html: string): Promise<boolean> => ipcRenderer.invoke('file:print', html),
  exportPandoc: (
    markdown: string,
    format: PandocFormat
  ): Promise<{ path: string } | { missing: true; message: string } | null> =>
    ipcRenderer.invoke('file:export-pandoc', markdown, format),
  acceptRecovery: (filePath: string): Promise<(OpenedFile & { recent: RecentEntry[] }) | null> =>
    ipcRenderer.invoke('recovery:accept', filePath),
  discardRecovery: (filePath: string): Promise<void> => ipcRenderer.invoke('recovery:discard', filePath),
  confirmClose: (): void => {
    ipcRenderer.send('app:close-ok')
  },
  onMenuOpenFile: (callback: () => void): (() => void) => subscribe('menu:open-file', callback),
  onMenuOpenFolder: (callback: () => void): (() => void) => subscribe('menu:open-folder', callback),
  onMenuOpenBundle: (callback: () => void): (() => void) => subscribe('menu:open-bundle', callback),
  onMenuOpenRecent: (callback: (filePath: string) => void): (() => void) => {
    const listener = (_event: unknown, filePath: string): void => callback(filePath)
    ipcRenderer.on('menu:open-recent', listener)
    return () => {
      ipcRenderer.removeListener('menu:open-recent', listener)
    }
  },
  onOpenExternal: (callback: (filePath: string) => void): (() => void) => {
    const listener = (_event: unknown, filePath: string): void => callback(filePath)
    ipcRenderer.on('app:open-external', listener)
    return () => {
      ipcRenderer.removeListener('app:open-external', listener)
    }
  },
  onMenuSave: (callback: () => void): (() => void) => subscribe('menu:save', callback),
  onMenuSaveBundle: (callback: () => void): (() => void) => subscribe('menu:save-bundle', callback),
  onMenuCopyHtml: (callback: () => void): (() => void) => subscribe('menu:copy-html', callback),
  onMenuQuickOpen: (callback: () => void): (() => void) => subscribe('menu:quick-open', callback),
  onMenuFind: (callback: () => void): (() => void) => subscribe('menu:find', callback),
  onMenuSource: (callback: () => void): (() => void) => subscribe('menu:source', callback),
  onMenuExportHtml: (callback: () => void): (() => void) => subscribe('menu:export-html', callback),
  onMenuExportPdf: (callback: () => void): (() => void) => subscribe('menu:export-pdf', callback),
  onMenuExportDocx: (callback: () => void): (() => void) => subscribe('menu:export-docx', callback),
  onMenuExportEpub: (callback: () => void): (() => void) => subscribe('menu:export-epub', callback),
  onMenuExportLatex: (callback: () => void): (() => void) => subscribe('menu:export-latex', callback),
  onMenuPrint: (callback: () => void): (() => void) => subscribe('menu:print', callback),
  onMenuFolderSearch: (callback: () => void): (() => void) => subscribe('menu:folder-search', callback),
  onMenuFocus: (callback: () => void): (() => void) => subscribe('menu:focus', callback),
  onMenuTypewriter: (callback: () => void): (() => void) => subscribe('menu:typewriter', callback),
  onMenuSidebar: (callback: () => void): (() => void) => subscribe('menu:sidebar', callback),
  onMenuZoomIn: (callback: () => void): (() => void) => subscribe('menu:zoom-in', callback),
  onMenuZoomOut: (callback: () => void): (() => void) => subscribe('menu:zoom-out', callback),
  onMenuZoomReset: (callback: () => void): (() => void) => subscribe('menu:zoom-reset', callback),
  onRequestClose: (callback: () => void): (() => void) => subscribe('app:request-close', callback),
  onRecovery: (callback: (recovery: RecoveryCopy) => void): (() => void) => {
    const listener = (_event: unknown, recovery: RecoveryCopy): void => callback(recovery)
    ipcRenderer.on('app:recovery', listener)
    return () => {
      ipcRenderer.removeListener('app:recovery', listener)
    }
  }
}

function subscribe(channel: string, callback: () => void): () => void {
  const listener = (): void => callback()
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type DesktopApi = typeof api
export type { FolderHit, FolderSearchOptions, PandocFormat }
export type { RecentEntry, RecoveryCopy }
