import { readFile, rm, stat, writeFile } from 'node:fs/promises'
import { appCommand } from '../shared/commands'
import { PANDOC_INSTALL_HINT, pandocExtension, pandocLabel, type PandocFormat } from '../shared/pandoc'
import type { FolderSearchOptions } from '../shared/folderSearch'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol } from 'electron'
import {
  isInsideRoot,
  isMarkdownFile,
  markdownDialogExtensions,
  listMarkdownFiles,
  readUtf8File,
  searchMarkdownFolder,
  safeImageExtension,
  placeImageFile,
  saveImageAsset,
  writeAtomic
} from './files'
import {
  clearRecovery,
  keepRecovery,
  listRecent,
  listRecentFolders,
  pendingRecoveries,
  readSettings,
  readUserCss,
  touchRecent,
  touchRecentFolder,
  writeSettings
} from './library'
import { copyBundleAssets, readTextBundle, unpackTextPack, writeTextBundle } from './textbundle'
import type { RecoveryCopy } from '../shared/recovery'
import { convertWithPandoc, lookForPandoc } from './pandoc'
import type { RecentEntry } from '../shared/recent'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
])

const allowedRoots = new Set<string>()
const systemOpenPaths = new Set<string>()
const pendingOpens: string[] = []
let mainWindow: BrowserWindow | null = null
let allowClose = false
let windowReady = false
let recoveries: RecoveryCopy[] = []

function allowPath(filePath: string): void {
  allowedRoots.add(resolve(dirname(filePath)))
}

function allowRoot(folder: string): void {
  allowedRoots.add(resolve(folder))
}

async function saveMarkdown(filePath: string, content: string): Promise<number> {
  const text = content.endsWith('\n') ? content : `${content}\n`
  await keepRecovery(filePath, text)
  const mtimeMs = await writeAtomic(filePath, text)
  await clearRecovery(filePath)
  return mtimeMs
}

function publishRecovery(): void {
  const next = recoveries[0]
  if (!next || !mainWindow) return
  allowPath(next.path)
  mainWindow.webContents.send('app:recovery', next)
}

function assertAllowed(filePath: string): string {
  const full = resolve(filePath)
  for (const root of allowedRoots) {
    if (isInsideRoot(root, full)) return full
  }
  throw new Error('这个路径不在当前打开的文件或文件夹里。')
}

function createWindow(): void {
  windowReady = false
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    title: '墨白',
    icon: resolve(fileURLToPath(new URL('../../resources/icon.png', import.meta.url))),
    backgroundColor: '#f6f4ef',
    webPreferences: {
      preload: fileURLToPath(new URL('../preload/index.js', import.meta.url)),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('close', (event) => {
    if (allowClose) return
    event.preventDefault()
    mainWindow?.webContents.send('app:request-close')
  })

  mainWindow.on('closed', () => {
    windowReady = false
    mainWindow = null
  })

  const created = mainWindow
  created.webContents.on('did-finish-load', () => {
    void pendingRecoveries().then((pending) => {
      if (created.isDestroyed() || mainWindow !== created) return
      recoveries = pending
      windowReady = true
      if (pendingOpens.length === 0) publishRecovery()
      flushOpens()
    })
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(fileURLToPath(new URL('../renderer/index.html', import.meta.url)))
  }

  void applyApplicationMenu()
}

function recentMenuLabel(entry: RecentEntry, entries: RecentEntry[]): string {
  return entries.filter((item) => item.name === entry.name).length > 1 ? entry.path : entry.name
}

async function noteRecent(filePath: string): Promise<RecentEntry[]> {
  const recent = await touchRecent(filePath)
  void applyApplicationMenu()
  return recent
}

async function applyApplicationMenu(): Promise<void> {
  const recent = await listRecent()
  const send = (id: string): void => {
    const command = appCommand(id)
    mainWindow?.webContents.send(command.channel)
  }
  const item = (id: string) => {
    const command = appCommand(id)
    return { label: command.label, accelerator: command.accelerator, click: () => send(id) }
  }
  const recentItems =
    recent.length === 0
      ? [{ label: '还没有最近文件', enabled: false }]
      : recent.map((entry) => ({
          label: recentMenuLabel(entry, recent),
          click: () => mainWindow?.webContents.send('menu:open-recent', entry.path)
        }))

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: '墨白',
        submenu: [
          { role: 'about', label: '关于墨白' },
          { type: 'separator' },
          { role: 'quit', label: '退出墨白' }
        ]
      },
      {
        label: '文件',
        submenu: [
          item('file.open'),
          item('file.open-folder'),
          item('file.open-bundle'),
          { label: '打开最近的文件', submenu: recentItems },
          item('file.save'),
          item('file.save-bundle'),
          { type: 'separator' },
          item('file.export-html'),
          item('file.export-pdf'),
          item('file.print'),
          item('file.export-docx'),
          item('file.export-epub'),
          item('file.export-latex')
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectAll', label: '全选' },
          { type: 'separator' },
          item('edit.copy-html'),
          item('edit.quick-open'),
          item('edit.find'),
          item('edit.folder-search'),
          item('edit.source')
        ]
      },
      {
        label: '视图',
        submenu: [
          item('view.focus'),
          item('view.typewriter'),
          item('view.sidebar'),
          { type: 'separator' },
          item('view.zoom-in'),
          item('view.zoom-out'),
          item('view.zoom-reset')
        ]
      }
    ])
  )
}

function enqueueOpen(filePath: string): void {
  const full = resolve(filePath)
  systemOpenPaths.add(full)
  if (pendingOpens[pendingOpens.length - 1] !== full) pendingOpens.push(full)
  if (app.isReady() && (!mainWindow || mainWindow.isDestroyed())) createWindow()
  flushOpens()
}

function flushOpens(): void {
  const target = mainWindow
  if (!windowReady || !target || target.isDestroyed() || pendingOpens.length === 0) return
  if (target.isMinimized()) target.restore()
  target.show()
  target.focus()
  for (const filePath of pendingOpens.splice(0)) target.webContents.send('app:open-external', filePath)
}

async function loadChosenPath(
  filePath: string,
  unsupported: string
): Promise<
  | { detached: true; path: null; text: string; mtimeMs: number; recent: RecentEntry[] }
  | { path: string; text: string; mtimeMs: number; recent: RecentEntry[]; kind: 'markdown' | 'bundle' }
  | { error: string }
> {
  const full = resolve(filePath)
  try {
    if (full.toLowerCase().endsWith('.textpack')) {
      const unpacked = await unpackTextPack(full, join(app.getPath('temp'), `mobai-pack-${Date.now()}`))
      return { detached: true, path: null, text: unpacked.text, mtimeMs: unpacked.mtimeMs, recent: await listRecent() }
    }
    if (full.toLowerCase().endsWith('.textbundle')) {
      allowRoot(full)
      const loaded = await readTextBundle(full)
      allowPath(loaded.path)
      const recent = await noteRecent(loaded.path)
      return { ...loaded, recent, kind: 'bundle' }
    }
    if (!isMarkdownFile(full)) return { error: unsupported }
    allowPath(full)
    const loaded = await readUtf8File(full)
    const recent = await noteRecent(full)
    return { path: full, ...loaded, recent, kind: 'markdown' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '无法打开这个文件。' }
  }
}

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  enqueueOpen(filePath)
})

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    if (!filePath) return new Response('missing path', { status: 400 })
    try {
      const full = assertAllowed(filePath)
      return net.fetch(pathToFileURL(full).href)
    } catch {
      return new Response('forbidden', { status: 403 })
    }
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开 Markdown',
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: markdownDialogExtensions() },
      { name: 'TextPack', extensions: ['textpack'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  if (!filePath) return null
  return loadChosenPath(filePath, '请选择 Markdown 文件。')
})

ipcMain.handle('file:open-external', async (_event, filePath: string) => {
  if (typeof filePath !== 'string' || filePath.trim() === '') return { error: '缺少文件路径。' }
  const full = resolve(filePath)
  if (!systemOpenPaths.has(full)) return { error: '这个文件不是从系统打开的。' }
  return loadChosenPath(full, '墨白只能打开 Markdown、纯文本、TextPack 或 TextBundle。')
})

ipcMain.handle('file:open-dropped', async (_event, filePath: string) => {
  if (typeof filePath !== 'string' || filePath.trim() === '') return { error: '缺少文件路径。' }
  return loadChosenPath(filePath, '只能打开 Markdown 文档。')
})

ipcMain.handle('folder:open', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开文件夹',
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const folder = result.filePaths[0]
  if (!folder) return null
  allowRoot(folder)
  const settings = await readSettings()
  const files = await listMarkdownFiles(folder, 8, [settings.assetDir])
  const recentFolders = await touchRecentFolder(folder)
  return { folder, files, recentFolders }
})

ipcMain.handle('file:read', async (_event, filePath: string) => {
  const full = assertAllowed(filePath)
  if (!isMarkdownFile(full)) throw new Error('只能读取 Markdown 文件。')
  const loaded = await readUtf8File(full)
  const recent = await noteRecent(full)
  return { path: full, ...loaded, recent }
})

ipcMain.handle('folder:search', async (_event, folder: string, query: string, options?: FolderSearchOptions) => {
  const root = assertAllowed(folder)
  const settings = await readSettings()
  return searchMarkdownFolder(root, query, [settings.assetDir], options ?? {})
})

ipcMain.handle('bundle:open', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开 TextBundle',
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const folder = result.filePaths[0]
  if (!folder) return null
  allowRoot(folder)
  const loaded = await readTextBundle(folder)
  allowPath(loaded.path)
  const recent = await noteRecent(loaded.path)
  return { ...loaded, recent }
})

ipcMain.handle('bundle:save', async (_event, content: string, sourcePath: string | null) => {
  const result = await dialog.showSaveDialog({
    title: '保存为 TextBundle',
    defaultPath: '未命名.textbundle'
  })
  if (result.canceled || !result.filePath) return null
  const markdownPath = await writeTextBundle(result.filePath, content)
  const settings = await readSettings()
  if (sourcePath && isMarkdownFile(sourcePath)) await copyBundleAssets(sourcePath, markdownPath, settings.assetDir)
  allowPath(markdownPath)
  allowRoot(dirname(markdownPath))
  const info = await stat(markdownPath)
  const recent = await noteRecent(markdownPath)
  return { path: markdownPath, mtimeMs: info.mtimeMs, recent }
})

ipcMain.handle('folder:reopen', async (_event, folder: string) => {
  const recent = await listRecentFolders()
  if (!recent.some((item) => item.path === folder)) throw new Error('这个文件夹不在最近列表里。')
  allowRoot(folder)
  const settings = await readSettings()
  const files = await listMarkdownFiles(folder, 8, [settings.assetDir])
  return { folder, files, recentFolders: await touchRecentFolder(folder) }
})

ipcMain.handle('folder:list', async (_event, folder: string) => {
  const full = assertAllowed(folder)
  return listMarkdownFiles(full)
})

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  const full = assertAllowed(filePath)
  if (!isMarkdownFile(full)) throw new Error('只能保存为 Markdown 文件。')
  const mtimeMs = await saveMarkdown(full, content)
  return { path: full, mtimeMs }
})

ipcMain.handle('file:save-as', async (_event, content: string) => {
  const result = await dialog.showSaveDialog({
    title: '保存 Markdown',
    defaultPath: '未命名.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (result.canceled || !result.filePath) return null
  const filePath = result.filePath.endsWith('.md') ? result.filePath : `${result.filePath}.md`
  allowPath(filePath)
  const mtimeMs = await saveMarkdown(filePath, content)
  const recent = await noteRecent(filePath)
  return { path: filePath, mtimeMs, recent }
})

ipcMain.handle('file:stat', async (_event, filePath: string) => {
  const full = assertAllowed(filePath)
  const info = await stat(full)
  return { mtimeMs: info.mtimeMs }
})

ipcMain.handle(
  'image:save',
  async (_event, documentPath: string, bytes: Uint8Array | ArrayBuffer | number[], mime: string) => {
    const full = assertAllowed(documentPath)
    const extension = safeImageExtension(mime)
    if (!extension) throw new Error('只支持 PNG、JPEG、GIF 和 WebP 图片。')
    const settings = await readSettings()
    const payload =
      bytes instanceof Uint8Array
        ? bytes
        : bytes instanceof ArrayBuffer
          ? new Uint8Array(bytes)
          : Uint8Array.from(bytes)
    if (payload.byteLength === 0) throw new Error('读不到这张图片的内容。')
    const relativePath = await saveImageAsset(full, payload, extension, settings.assetDir)
    return { relativePath, placed: 'copy' as const }
  }
)

ipcMain.handle('image:import', async (_event, documentPath: string) => {
  const full = assertAllowed(documentPath)
  const settings = await readSettings()
  const picked = await dialog.showOpenDialog({
    title: settings.imageMode === 'move' ? '移动图片到文档' : '复制图片到文档',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  })
  const sourcePath = picked.filePaths[0]
  if (picked.canceled || !sourcePath) return null
  return placeImageFile({
    documentPath: full,
    sourcePath,
    assetDir: settings.assetDir,
    mode: settings.imageMode
  })
})

ipcMain.handle('image:place', async (_event, documentPath: string, sourcePath: string) => {
  const full = assertAllowed(documentPath)
  if (!sourcePath || typeof sourcePath !== 'string') throw new Error('缺少图片路径。')
  const settings = await readSettings()
  return placeImageFile({
    documentPath: full,
    sourcePath,
    assetDir: settings.assetDir,
    mode: settings.imageMode
  })
})

ipcMain.handle('settings:image-mode', async (_event, imageMode: 'copy' | 'move') => writeSettings({ imageMode }))

ipcMain.handle('recent:list', () => listRecent())

ipcMain.handle('recent:open', async (_event, filePath: string) => {
  const recent = await listRecent()
  if (!recent.some((item) => item.path === filePath)) throw new Error('这个文件不在最近列表里。')
  if (!isMarkdownFile(filePath)) throw new Error('只能打开 Markdown 文件。')
  allowPath(filePath)
  const loaded = await readUtf8File(filePath)
  const next = await noteRecent(filePath)
  return { path: filePath, ...loaded, recent: next }
})

ipcMain.handle('settings:get', async () => {
  const settings = await readSettings()
  const css = await readUserCss()
  return { ...settings, css: css.css, recent: await listRecent(), recentFolders: await listRecentFolders() }
})

ipcMain.handle('settings:asset-dir', async (_event, assetDir: string) => writeSettings({ assetDir }))

ipcMain.handle('css:choose', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择用户样式',
    properties: ['openFile'],
    filters: [{ name: 'CSS', extensions: ['css'] }]
  })
  const filePath = result.filePaths[0]
  if (result.canceled || !filePath) return null
  const css = await readFile(filePath, 'utf8')
  await writeSettings({ userCssPath: filePath })
  return { path: filePath, css }
})

ipcMain.handle('css:clear', async () => {
  await writeSettings({ userCssPath: null })
  return { path: null, css: '' }
})

ipcMain.handle('file:export-html', async (_event, html: string) => {
  const result = await dialog.showSaveDialog({
    title: '导出 HTML',
    defaultPath: '未命名.html',
    filters: [{ name: 'HTML', extensions: ['html'] }]
  })
  if (result.canceled || !result.filePath) return null
  const filePath = result.filePath.endsWith('.html') ? result.filePath : `${result.filePath}.html`
  await writeFile(filePath, html, 'utf8')
  return { path: filePath }
})

ipcMain.handle('file:export-pdf', async (_event, html: string) => {
  const result = await dialog.showSaveDialog({
    title: '导出 PDF',
    defaultPath: '未命名.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return null
  const filePath = result.filePath.endsWith('.pdf') ? result.filePath : `${result.filePath}.pdf`
  const preview = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  const temp = join(app.getPath('temp'), `mobai-export-${process.pid}.html`)
  const wrapped = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:"Songti SC","Iowan Old Style",serif;line-height:1.7;padding:48px;color:#1c1917}pre{background:#f5f5f4;padding:12px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}</style></head><body>${html}</body></html>`
  await writeFile(temp, wrapped, 'utf8')
  try {
    await preview.loadFile(temp)
    const pdf = await preview.webContents.printToPDF({ printBackground: true })
    await writeFile(filePath, pdf)
  } finally {
    preview.destroy()
    await rm(temp, { force: true })
  }
  return { path: filePath }
})

ipcMain.handle('file:print', async (_event, html: string) => {
  const preview = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  const temp = join(app.getPath('temp'), `mobai-print-${process.pid}.html`)
  const wrapped = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:"Songti SC","Iowan Old Style",serif;line-height:1.7;padding:48px;color:#1c1917}pre{background:#f5f5f4;padding:12px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}</style></head><body>${html}</body></html>`
  await writeFile(temp, wrapped, 'utf8')
  try {
    await preview.loadFile(temp)
    const printed = await new Promise<boolean>((resolve, reject) => {
      preview.webContents.print({ printBackground: true }, (success, reason) => {
        if (!success && reason && reason !== 'cancelled') reject(new Error(reason))
        else resolve(success)
      })
    })
    return printed
  } finally {
    preview.destroy()
    await rm(temp, { force: true })
  }
})

ipcMain.handle('file:export-pandoc', async (_event, markdown: string, format: PandocFormat) => {
  if (!(await lookForPandoc())) return { missing: true as const, message: PANDOC_INSTALL_HINT }
  const extension = pandocExtension(format)
  const label = pandocLabel(format)
  const result = await dialog.showSaveDialog({
    title: `导出 ${label}`,
    defaultPath: `未命名.${extension}`,
    filters: [{ name: label, extensions: [extension] }]
  })
  if (result.canceled || !result.filePath) return null
  const filePath = result.filePath.endsWith(`.${extension}`) ? result.filePath : `${result.filePath}.${extension}`
  const temp = join(app.getPath('temp'), `mobai-pandoc-${process.pid}.md`)
  await writeFile(temp, markdown, 'utf8')
  try {
    await convertWithPandoc(temp, filePath, format)
  } finally {
    await rm(temp, { force: true })
  }
  return { path: filePath }
})

ipcMain.handle('recovery:accept', async (_event, filePath: string) => {
  const item = recoveries.find((recovery) => recovery.path === filePath)
  if (!item) return null
  allowPath(item.path)
  const mtimeMs = await saveMarkdown(item.path, item.content)
  const recent = await noteRecent(item.path)
  recoveries = recoveries.filter((recovery) => recovery.path !== filePath)
  publishRecovery()
  return { path: item.path, text: item.content, mtimeMs, recent }
})

ipcMain.handle('recovery:discard', async (_event, filePath: string) => {
  await clearRecovery(filePath)
  recoveries = recoveries.filter((recovery) => recovery.path !== filePath)
  publishRecovery()
})

ipcMain.on('app:close-ok', () => {
  allowClose = true
  mainWindow?.close()
})
