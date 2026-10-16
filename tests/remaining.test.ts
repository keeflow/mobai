import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { searchEmoji } from '../src/shared/emoji'
import { folderSearchError, matchFolderLines } from '../src/shared/folderSearch'
import { roundTripMarkdown } from '../src/shared/editor'
import { markdownNameInBundle } from '../src/shared/textbundle'
import { clampZoom } from '../src/shared/view'
import { isMarkdownFile } from '../src/main/files'
import { readTextBundle, writeTextBundle } from '../src/main/textbundle'

describe('remaining writing syntax', () => {
  it('keeps strike, highlight, a rule and front matter', () => {
    const source = ['---', 'title: 墨白', '---', '', '~~删除~~ 和 ==高亮==', '', '---', '', '正文'].join('\n')
    const once = roundTripMarkdown(source)
    expect(roundTripMarkdown(once)).toBe(once)
    expect(once).toContain('title: 墨白')
    expect(once).toContain('~~删除~~')
    expect(once).toContain('==高亮==')
    expect(once).toContain('正文')
    expect(once).toContain('---')
  })
})

describe('search and view helpers', () => {
  it('filters emoji, folder matches and zoom', () => {
    expect(searchEmoji('赞')).toContain('👍')
    expect(searchEmoji('')).toContain('😀')
    expect(folderSearchError('(', { regex: true })).toBe('正则表达式无效')
    expect(matchFolderLines('Cat\ncat', 'Cat', { caseSensitive: true })).toEqual([
      { line: 1, text: 'Cat' }
    ])
    expect(clampZoom(400)).toBe(160)
    expect(clampZoom(Number.NaN)).toBe(100)
    expect(isMarkdownFile('notes.txt')).toBe(true)
    expect(isMarkdownFile('notes.png')).toBe(false)
    expect(markdownNameInBundle(['info.json', 'text.md'])).toBe('text.md')
  })
})

describe('textbundle', () => {
  it('writes info.json and reads the markdown back', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mobai-bundle-'))
    try {
      const markdownPath = await writeTextBundle(join(directory, '文章'), '你好\n')
      const info = await readFile(join(directory, '文章.textbundle', 'info.json'), 'utf8')
      expect(info).toContain('net.daringfireball.markdown')
      const loaded = await readTextBundle(join(directory, '文章.textbundle'))
      expect(loaded.path).toBe(markdownPath)
      expect(loaded.text).toContain('你好')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
