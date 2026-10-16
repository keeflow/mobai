import { spawn } from 'node:child_process'
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { TEXTBUNDLE_INFO, bundleDirectoryName, markdownNameInBundle } from '../shared/textbundle'
import { readUtf8File } from './files'

export async function writeTextBundle(directory: string, markdown: string): Promise<string> {
  const bundle = bundleDirectoryName(directory)
  await mkdir(bundle, { recursive: true })
  await writeFile(join(bundle, 'info.json'), `${JSON.stringify(TEXTBUNDLE_INFO, null, 2)}\n`, 'utf8')
  const markdownPath = join(bundle, 'text.md')
  await writeFile(markdownPath, markdown, 'utf8')
  return markdownPath
}

export async function readTextBundle(directory: string): Promise<{ path: string; text: string; mtimeMs: number }> {
  const names = await readdir(directory)
  const markdownName = markdownNameInBundle(names)
  if (!markdownName) throw new Error('这个 TextBundle 里没有 text.md。')
  const markdownPath = join(directory, markdownName)
  const loaded = await readUtf8File(markdownPath)
  return { path: markdownPath, ...loaded }
}

export async function copyBundleAssets(fromDocument: string, bundleFile: string, assetDir: string): Promise<void> {
  const source = join(dirname(fromDocument), assetDir)
  try {
    const info = await stat(source)
    if (!info.isDirectory()) return
  } catch {
    return
  }
  const target = join(dirname(bundleFile), assetDir)
  if (source === target) return
  await cp(source, target, { recursive: true })
}

export function packTextBundle(bundle: string, packPath: string): Promise<void> {
  return runDitto(['-c', '-k', '--keepParent', bundle, packPath])
}

export async function unpackTextPack(packPath: string, destination: string): Promise<{ path: string; text: string; mtimeMs: number }> {
  await mkdir(destination, { recursive: true })
  await runDitto(['-x', '-k', packPath, destination])
  const markdownPath = await findMarkdown(destination)
  if (!markdownPath) throw new Error('这个 TextPack 里没有 text.md。')
  const loaded = await readUtf8File(markdownPath)
  return { path: markdownPath, ...loaded }
}

async function findMarkdown(directory: string, depth = 2): Promise<string | null> {
  const names = await readdir(directory)
  const direct = markdownNameInBundle(names)
  if (direct && names.includes('info.json')) return join(directory, direct)
  if (depth <= 0) return null
  for (const name of names) {
    const child = join(directory, name)
    try {
      if (!(await stat(child)).isDirectory()) continue
    } catch {
      continue
    }
    const found = await findMarkdown(child, depth - 1)
    if (found) return found
  }
  return null
}

function runDitto(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ditto', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let errorText = ''
    child.stderr.on('data', (chunk: Buffer) => {
      errorText += chunk.toString('utf8')
    })
    child.on('error', () => reject(new Error('系统里没有 ditto，无法读写 TextPack。')))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(errorText.trim() || 'TextPack 处理失败'))
    })
  })
}

export async function readInfo(directory: string): Promise<string> {
  return readFile(join(directory, 'info.json'), 'utf8')
}
