export interface AppCommand {
  id: string
  label: string
  menu: 'file' | 'edit' | 'view'
  channel: string
  accelerator?: string
}

/** 墨白自己的命令。这是静态列表，不加载第三方插件。 */
export const appCommands: readonly AppCommand[] = [
  { id: 'file.open', label: '打开…', menu: 'file', channel: 'menu:open-file', accelerator: 'CmdOrCtrl+O' },
  { id: 'file.open-folder', label: '打开文件夹…', menu: 'file', channel: 'menu:open-folder', accelerator: 'CmdOrCtrl+Shift+O' },
  { id: 'file.open-bundle', label: '打开 TextBundle…', menu: 'file', channel: 'menu:open-bundle' },
  { id: 'file.open-recent', label: '打开最近的文件', menu: 'file', channel: 'menu:open-recent' },
  { id: 'file.save', label: '保存', menu: 'file', channel: 'menu:save', accelerator: 'CmdOrCtrl+S' },
  { id: 'file.save-bundle', label: '保存为 TextBundle…', menu: 'file', channel: 'menu:save-bundle' },
  { id: 'file.export-html', label: '导出 HTML…', menu: 'file', channel: 'menu:export-html' },
  { id: 'file.export-pdf', label: '导出 PDF…', menu: 'file', channel: 'menu:export-pdf' },
  { id: 'file.print', label: '打印…', menu: 'file', channel: 'menu:print', accelerator: 'CmdOrCtrl+P' },
  { id: 'file.export-docx', label: '导出 Word…', menu: 'file', channel: 'menu:export-docx' },
  { id: 'file.export-epub', label: '导出 EPUB…', menu: 'file', channel: 'menu:export-epub' },
  { id: 'file.export-latex', label: '导出 LaTeX…', menu: 'file', channel: 'menu:export-latex' },
  { id: 'edit.copy-html', label: '复制 HTML', menu: 'edit', channel: 'menu:copy-html' },
  { id: 'edit.quick-open', label: '快速打开', menu: 'edit', channel: 'menu:quick-open', accelerator: 'CmdOrCtrl+Shift+P' },
  { id: 'edit.find', label: '查找', menu: 'edit', channel: 'menu:find', accelerator: 'CmdOrCtrl+F' },
  { id: 'edit.folder-search', label: '在文件夹中查找', menu: 'edit', channel: 'menu:folder-search', accelerator: 'CmdOrCtrl+Shift+F' },
  { id: 'edit.source', label: '源码模式', menu: 'edit', channel: 'menu:source', accelerator: 'CmdOrCtrl+E' },
  { id: 'view.focus', label: '聚焦', menu: 'view', channel: 'menu:focus' },
  { id: 'view.typewriter', label: '打字机', menu: 'view', channel: 'menu:typewriter' },
  { id: 'view.sidebar', label: '侧栏', menu: 'view', channel: 'menu:sidebar', accelerator: 'CmdOrCtrl+Shift+L' },
  { id: 'view.zoom-in', label: '放大', menu: 'view', channel: 'menu:zoom-in', accelerator: 'CmdOrCtrl+=' },
  { id: 'view.zoom-out', label: '缩小', menu: 'view', channel: 'menu:zoom-out', accelerator: 'CmdOrCtrl+-' },
  { id: 'view.zoom-reset', label: '实际大小', menu: 'view', channel: 'menu:zoom-reset', accelerator: 'CmdOrCtrl+0' }
]

export function appCommand(id: string): AppCommand {
  const command = appCommands.find((item) => item.id === id)
  if (!command) throw new Error(`未知命令：${id}`)
  return command
}
