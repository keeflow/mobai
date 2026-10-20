const LIBRARY_EXTENSION_LIST = [
  '.md',
  '.markdown',
  '.mmd',
  '.mdown',
  '.mkd',
  '.mdwn',
  '.mdtxt',
  '.mdtext',
  '.rmarkdown',
  '.rmd',
  '.qmd'
] as const

const EXTRA_MARKDOWN_EXTENSION_LIST = ['.txt', '.text', '.apib', '.mdx'] as const
const BUNDLE_EXTENSION_LIST = ['.textpack', '.textbundle'] as const

export const LIBRARY_EXTENSIONS = new Set<string>(LIBRARY_EXTENSION_LIST)
export const MARKDOWN_EXTENSIONS = new Set<string>([...LIBRARY_EXTENSION_LIST, ...EXTRA_MARKDOWN_EXTENSION_LIST])
export const OPENABLE_DOCUMENT_EXTENSIONS = new Set<string>([
  ...MARKDOWN_EXTENSIONS,
  ...BUNDLE_EXTENSION_LIST
])

/** 与 node:path 的 extname 一致：点在开头时不算扩展名。 */
export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot).toLowerCase()
}

export function isOpenableDocumentName(name: string): boolean {
  return OPENABLE_DOCUMENT_EXTENSIONS.has(fileExtension(name))
}

export function collectDocumentFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return []
  return Array.from(list).filter((file) => isOpenableDocumentName(file.name))
}

export function collectDocumentFilesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return []
  const fromFiles = collectDocumentFiles(data.files)
  if (fromFiles.length > 0) return fromFiles
  const fromItems: File[] = []
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file && isOpenableDocumentName(file.name)) fromItems.push(file)
  }
  return fromItems
}
