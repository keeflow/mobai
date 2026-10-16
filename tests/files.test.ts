import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { matchFolderLines } from '../src/shared/folderSearch'
import { PANDOC_INSTALL_HINT } from '../src/shared/pandoc'
import { decodeUtf8, documentExtensions, isInsideRoot, listMarkdownFiles, placeImageFile, saveImageAsset, searchMarkdownFolder, writeAtomic } from '../src/main/files'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function tempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'mobai-'))
  directories.push(directory)
  return directory
}

describe('file helpers', () => {
  it('registers the same document types the packaged app advertises', async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      build: {
        fileAssociations: Array<{ ext: string | string[]; role?: string; rank?: string; isPackage?: boolean }>
        mac: { extendInfo: { CFBundleDocumentTypes: unknown; UTImportedTypeDeclarations: unknown } }
      }
    }
    const declared = pkg.build.fileAssociations.flatMap((item) => (Array.isArray(item.ext) ? item.ext : [item.ext]))
    expect(declared.sort()).toEqual([...documentExtensions()].sort())
    const bundle = pkg.build.fileAssociations.find((item) => (Array.isArray(item.ext) ? item.ext : [item.ext]).includes('textbundle'))
    expect(bundle?.isPackage).toBe(true)
    expect(pkg.build.fileAssociations.every((item) => item.role === 'Editor' && item.rank === 'Alternate')).toBe(true)
    const imported = pkg.build.mac.extendInfo.UTImportedTypeDeclarations as Array<{
      UTTypeIdentifier: string
      UTTypeTagSpecification: { 'public.filename-extension': string[] }
    }>
    expect(imported.map((item) => item.UTTypeIdentifier)).toContain('net.daringfireball.markdown')
    const contentTypes = (pkg.build.mac.extendInfo.CFBundleDocumentTypes as Array<{ LSItemContentTypes?: string[] }>).flatMap(
      (item) => item.LSItemContentTypes ?? []
    )
    expect(contentTypes).toContain('net.daringfireball.markdown')
  })

  it('rejects invalid utf-8 and accepts chinese text', () => {
    expect(decodeUtf8(Uint8Array.from([0xff, 0xfe, 0xfd])).ok).toBe(false)
    const decoded = decodeUtf8(new TextEncoder().encode('墨白\n'))
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.text).toBe('墨白\n')
  })

  it('writes by replacing a temporary file', async () => {
    const directory = await tempDir()
    const file = join(directory, 'note.md')
    const mtime = await writeAtomic(file, '第一版\n')
    expect(await readFile(file, 'utf8')).toBe('第一版\n')
    const next = await writeAtomic(file, '第二版\n')
    expect(next).toBeGreaterThanOrEqual(mtime)
    expect(await readFile(file, 'utf8')).toBe('第二版\n')
    const info = await stat(file)
    expect(info.isFile()).toBe(true)
  })

  it('lists markdown files and stores images beside the document', async () => {
    const directory = await tempDir()
    await writeFile(join(directory, 'a.md'), '# A')
    await writeFile(join(directory, 'skip.txt'), 'no')
    const nested = join(directory, 'notes')
    await mkdir(nested)
    await writeFile(join(nested, 'b.markdown'), '# B')
    const files = await listMarkdownFiles(directory)
    expect(files.map((file) => file.relativePath).sort()).toEqual(['a.md', 'notes/b.markdown'].sort())

    const relative = await saveImageAsset(join(directory, 'a.md'), Uint8Array.from([1, 2, 3]), 'png')
    expect(relative.startsWith('assets/')).toBe(true)
    expect(relative.endsWith('.png')).toBe(true)
    expect(isInsideRoot(directory, join(directory, relative))).toBe(true)
    expect(isInsideRoot(directory, '/etc/passwd')).toBe(false)
  })

  it('copies an image and can move another into the asset directory', async () => {
    const directory = await tempDir()
    const document = join(directory, 'note.md')
    await writeFile(document, '# 图\n')
    const copied = join(directory, 'shot.png')
    const moved = join(directory, 'other.png')
    await writeFile(copied, 'png')
    await writeFile(moved, 'png')
    const copy = await placeImageFile({ documentPath: document, sourcePath: copied, assetDir: 'figures', mode: 'copy' })
    expect(copy).toEqual({ relativePath: 'figures/shot.png', placed: 'copy' })
    expect(await readFile(copied, 'utf8')).toBe('png')
    const move = await placeImageFile({ documentPath: document, sourcePath: moved, assetDir: 'figures', mode: 'move' })
    expect(move).toEqual({ relativePath: 'figures/other.png', placed: 'move' })
    await expect(stat(moved)).rejects.toThrow()
    await expect(
      placeImageFile({ documentPath: document, sourcePath: join(directory, 'note.md'), assetDir: 'figures', mode: 'copy' })
    ).rejects.toThrow('只支持')
  })

  it('searches markdown in a folder without matching other files', async () => {
    const directory = await tempDir()
    await writeFile(join(directory, 'a.md'), '第一行\n墨白搜索\n')
    await writeFile(join(directory, 'skip.txt'), '墨白搜索')
    const hits = await searchMarkdownFolder(directory, '墨白')
    expect(hits).toEqual([
      { path: join(directory, 'a.md'), name: 'a.md', relativePath: 'a.md', line: 2, text: '墨白搜索' }
    ])
    expect(matchFolderLines('Cat\ncatalog', 'cat')).toEqual([
      { line: 1, text: 'Cat' },
      { line: 2, text: 'catalog' }
    ])
    expect(matchFolderLines('Cat', '   ')).toEqual([])
    expect(PANDOC_INSTALL_HINT).toContain('不会自带 Pandoc')
  })
})
