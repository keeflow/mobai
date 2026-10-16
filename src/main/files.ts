import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { matchFolderLines, type FolderHit, type FolderSearchOptions } from '../shared/folderSearch'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'

const LIBRARY_EXTENSIONS = new Set(['.md', '.markdown', '.mmd', '.mdown', '.mkd', '.mdwn', '.mdtxt', '.mdtext', '.rmarkdown', '.rmd', '.qmd'])
const MARKDOWN_EXTENSIONS = new Set([...LIBRARY_EXTENSIONS, '.txt', '.text', '.apib', '.mdx'])

export function markdownDialogExtensions(): string[] {
  return [...MARKDOWN_EXTENSIONS].map((extension) => extension.slice(1))
}

export function isLibraryFile(filePath: string): boolean {
  return LIBRARY_EXTENSIONS.has(extname(filePath).toLowerCase())
}
const SKIP_DIRECTORIES = new Set(['node_modules', '.git', 'assets'])

export function isMarkdownFile(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(extname(filePath).toLowerCase())
}

export function decodeUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { ok: true, text: text.replace(/^\uFEFF/, '') }
  } catch {
    return { ok: false, error: '这个文件不是有效的 UTF-8，已停止打开，避免写坏内容。' }
  }
}

export function isInsideRoot(root: string, target: string): boolean {
  const base = resolve(root)
  const full = resolve(target)
  return full === base || full.startsWith(base + sep)
}

export async function writeAtomic(filePath: string, content: string): Promise<number> {
  const directory = dirname(filePath)
  await mkdir(directory, { recursive: true })
  const temporary = join(directory, `.${basename(filePath)}.${process.pid}.tmp`)
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, filePath)
  const info = await stat(filePath)
  return info.mtimeMs
}

export interface MarkdownFileEntry {
  path: string
  name: string
  relativePath: string
}

export async function listMarkdownFiles(
  root: string,
  depth = 8,
  extraSkip: string[] = []
): Promise<MarkdownFileEntry[]> {
  const entries: MarkdownFileEntry[] = []

  async function walk(directory: string, remaining: number, skip: Set<string>): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true })
    for (const child of children) {
      if (child.name.startsWith('.')) continue
      const full = join(directory, child.name)
      if (child.isDirectory()) {
        if (skip.has(child.name) || remaining <= 0) continue
        await walk(full, remaining - 1, skip)
        continue
      }
      if (child.isFile() && isLibraryFile(child.name)) {
        entries.push({
          path: full,
          name: child.name,
          relativePath: relative(root, full)
        })
      }
    }
  }

  const skip = new Set([...SKIP_DIRECTORIES, ...extraSkip])
  await walk(resolve(root), depth, skip)
  entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh'))
  return entries
}

export function safeImageExtension(mimeOrName: string): 'png' | 'jpg' | 'gif' | 'webp' | null {
  const value = mimeOrName.toLowerCase()
  if (value.includes('png')) return 'png'
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg'
  if (value.includes('gif')) return 'gif'
  if (value.includes('webp')) return 'webp'
  return null
}

export async function saveImageAsset(
  documentPath: string,
  bytes: Uint8Array,
  extension: 'png' | 'jpg' | 'gif' | 'webp',
  assetDir = 'assets'
): Promise<string> {
  const assetDirectory = join(dirname(documentPath), assetDir)
  await mkdir(assetDirectory, { recursive: true })
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  await writeFile(join(assetDirectory, filename), bytes)
  return `${assetDir}/${filename}`
}

export async function placeImageFile(options: {
  documentPath: string
  sourcePath: string
  assetDir: string
  mode: 'copy' | 'move'
}): Promise<{ relativePath: string; placed: 'copy' | 'move' }> {
  const extension = safeImageExtension(options.sourcePath)
  if (!extension) throw new Error('只支持 PNG、JPEG、GIF 和 WebP 图片。')
  const assetDirectory = join(dirname(options.documentPath), options.assetDir)
  await mkdir(assetDirectory, { recursive: true })
  const filename = imageFileName(options.sourcePath, extension)
  if (resolve(options.sourcePath) === resolve(join(assetDirectory, filename))) {
    return { relativePath: `${options.assetDir}/${filename}`, placed: 'copy' }
  }
  const destination = await uniqueDestination(assetDirectory, filename)
  if (options.mode === 'move') {
    try {
      await rename(options.sourcePath, destination)
    } catch {
      await copyFile(options.sourcePath, destination)
      await rm(options.sourcePath)
    }
    return { relativePath: `${options.assetDir}/${basename(destination)}`, placed: 'move' }
  }
  await copyFile(options.sourcePath, destination)
  return { relativePath: `${options.assetDir}/${basename(destination)}`, placed: 'copy' }
}

function imageFileName(sourcePath: string, extension: string): string {
  const name = basename(sourcePath)
  if (/^[\w.\-\u4e00-\u9fff]+$/.test(name) && name.length <= 80) return name
  return `${Date.now()}.${extension}`
}

async function uniqueDestination(directory: string, filename: string): Promise<string> {
  const extension = extname(filename)
  const stem = basename(filename, extension)
  let candidate = join(directory, filename)
  let index = 1
  while (await fileExists(candidate)) {
    candidate = join(directory, `${stem}-${index}${extension}`)
    index += 1
  }
  return candidate
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

export async function searchMarkdownFolder(
  root: string,
  query: string,
  extraSkip: string[] = [],
  options: FolderSearchOptions = {}
): Promise<FolderHit[]> {
  const needle = query.trim()
  if (!needle) return []
  const files = await listMarkdownFiles(root, 8, extraSkip)
  const hits: FolderHit[] = []
  for (const file of files) {
    if (hits.length >= 80) break
    const info = await stat(file.path)
    if (info.size > 1_000_000) continue
    const decoded = decodeUtf8(await readFile(file.path))
    if (!decoded.ok) continue
    for (const hit of matchFolderLines(decoded.text, needle, options)) {
      hits.push({ ...file, line: hit.line, text: hit.text })
      if (hits.length >= 80) break
    }
  }
  return hits
}

export async function readUtf8File(filePath: string): Promise<{ text: string; mtimeMs: number }> {
  const bytes = await readFile(filePath)
  const decoded = decodeUtf8(bytes)
  if (!decoded.ok) throw new Error(decoded.error)
  const info = await stat(filePath)
  return { text: decoded.text, mtimeMs: info.mtimeMs }
}
