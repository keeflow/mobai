import { describe, expect, it } from 'vitest'
import { createMarkdownEditor, inspectMarkdown, markdownToPlainHtml } from '../src/shared/editor'
import { searchDocument, searchText } from '../src/shared/find'
import { activeByPosition, outlineFromMarkdown } from '../src/shared/outline'
import { rememberRecent } from '../src/shared/recent'
import { shouldOfferRecovery } from '../src/shared/recovery'
import { classifyExternalChange, sanitizeAssetDir } from '../src/shared/settings'
import { unclosedFenceLine } from '../src/shared/source'

describe('outline, find, and source checks', () => {
  it('lists headings and skips headings inside fences', () => {
    const headings = outlineFromMarkdown('# 开始\n\n```\n# 不是标题\n```\n\n## 第二节')
    expect(headings.map((item) => item.text)).toEqual(['开始', '第二节'])
    expect(headings[1]?.level).toBe(2)
  })

  it('follows the heading that has reached the reading line', () => {
    expect(activeByPosition([100, 400, 800], 420)).toBe(1)
    expect(activeByPosition([100, 400, 800], 50)).toBe(0)
    expect(activeByPosition([100, 400, 800], 900)).toBe(2)
    expect(activeByPosition([], 50)).toBe(-1)
  })

  it('finds case, whole words, and reports a broken regular expression', () => {
    expect(searchText('Cat', { query: 'cat', caseSensitive: true, wholeWord: false, regex: false }).matches).toEqual([])
    const words = searchText('cat catalog', { query: 'cat', caseSensitive: false, wholeWord: true, regex: false })
    expect(words.matches).toEqual([{ from: 0, to: 3 }])
    const broken = searchText('abc', { query: '(', caseSensitive: false, wholeWord: false, regex: true })
    expect(broken.error).toBeTruthy()
    expect(broken.matches).toEqual([])
  })

  it('maps a match inside the editor document', () => {
    const editor = createMarkdownEditor('前面 **墨白** 后面')
    try {
      const found = searchDocument(editor.state.doc, {
        query: '墨白',
        caseSensitive: true,
        wholeWord: false,
        regex: false
      })
      expect(found.matches).toHaveLength(1)
      const span = found.matches[0]
      expect(span).toBeTruthy()
      if (!span) return
      expect(editor.state.doc.textBetween(span.from, span.to)).toBe('墨白')
    } finally {
      editor.destroy()
    }
  })

  it('keeps an unclosed fence on its opening line and accepts ordinary markdown', () => {
    expect(unclosedFenceLine('第一行\n```js\nconst n = 1')).toBe(2)
    expect(unclosedFenceLine('```js\nconst n = 1\n```')).toBeNull()
    expect(inspectMarkdown('# 标题\n\n正文')).toEqual({ ok: true })
  })

  it('exports html without editor class names', () => {
    const html = markdownToPlainHtml('# 标题\n\n一段 **粗体**。')
    expect(html).toContain('标题')
    expect(html).toContain('<strong>')
    expect(html).not.toContain('class=')
  })

  it('keeps twenty recent files and notices external changes', () => {
    let entries: { path: string; name: string; openedAt: number }[] = []
    for (let index = 0; index < 25; index += 1) {
      entries = rememberRecent(entries, { path: `/notes/${index}.md`, name: `${index}.md`, openedAt: index })
    }
    expect(entries).toHaveLength(20)
    expect(entries[0]?.path).toBe('/notes/24.md')
    expect(classifyExternalChange(10, 12, false)).toBe('unchanged')
    expect(classifyExternalChange(10, 30, false)).toBe('updated')
    expect(classifyExternalChange(10, 30, true)).toBe('conflict')
    expect(sanitizeAssetDir('../assets')).toBeNull()
    expect(sanitizeAssetDir('figures')).toBe('figures')
  })

  it('offers a recovery only when the disk copy differs', () => {
    const recovery = { path: '/tmp/a.md', content: '新的\n', savedAt: 20 }
    expect(shouldOfferRecovery(recovery, null)).toBe(true)
    expect(shouldOfferRecovery(recovery, '旧的\n')).toBe(true)
    expect(shouldOfferRecovery(recovery, '新的')).toBe(false)
  })
})