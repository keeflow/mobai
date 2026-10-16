import { describe, expect, it } from 'vitest'
import { createMarkdownEditor, markdownToPlainHtml, roundTripMarkdown } from '../src/shared/editor'
import { sanitizeHtml } from '../src/shared/html'
import { continueMarkdownLine, unclosedFenceLine } from '../src/shared/source'
import { visibleDocumentText, writingStats } from '../src/shared/stats'

describe('html blocks', () => {
  it('keeps raw html and fenced code after a second save', () => {
    const source = ['前文', '', '<div class="note">你好</div>', '', '<script>alert(1)</script>', '', '```html', '<div>代码里的标签</div>', '```'].join('\n')
    const once = roundTripMarkdown(source)
    expect(roundTripMarkdown(once)).toBe(once)
    expect(once).toContain('<div class="note">你好</div>')
    expect(once).toContain('<script>alert(1)</script>')
    expect(once).toContain('```html')
    expect(once).toContain('<div>代码里的标签</div>')
  })

  it('removes scripts and event handlers from the preview html', () => {
    const cleaned = sanitizeHtml('<div onclick="alert(1)">你好<script>alert(1)</script><a href="javascript:alert(1)">链</a></div>')
    expect(cleaned).toContain('你好')
    expect(cleaned).toContain('链')
    expect(cleaned.toLowerCase()).not.toContain('script')
    expect(cleaned.toLowerCase()).not.toContain('onclick')
    expect(cleaned.toLowerCase()).not.toContain('javascript:')

    const exported = markdownToPlainHtml('<div onclick="alert(1)">你好<script>alert(1)</script></div>')
    expect(exported).toContain('你好')
    expect(exported.toLowerCase()).not.toContain('<script')
    expect(exported.toLowerCase()).not.toContain('onclick')
  })
})

describe('table alignment', () => {
  it('writes the column alignment back into the separator', () => {
    const editor = createMarkdownEditor('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |')
    let position = 1
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || node.text !== '乙') return
      position = pos + 1
      return false
    })
    editor.commands.setTextSelection(position)
    expect(editor.commands.setCellAttribute('align', 'right')).toBe(true)
    const markdown = editor.getMarkdown()
    expect(markdown).toMatch(/-+:/)
    expect(roundTripMarkdown(markdown)).toBe(roundTripMarkdown(roundTripMarkdown(markdown)))
    editor.destroy()
  })
})

describe('source list continuation', () => {
  it('repeats the marker on the next line and clears an empty item', () => {
    expect(continueMarkdownLine('- 一项', 4)).toEqual({ text: '- 一项\n- ', cursor: 7 })
    expect(continueMarkdownLine('1. 一', 4)).toEqual({ text: '1. 一\n2. ', cursor: 8 })
    expect(continueMarkdownLine('- [x] 完成', 8)).toEqual({ text: '- [x] 完成\n- [ ] ', cursor: 15 })
    expect(continueMarkdownLine('  - 内层', 6)).toEqual({ text: '  - 内层\n  - ', cursor: 11 })
    expect(continueMarkdownLine('> 引用', 4)).toEqual({ text: '> 引用\n> ', cursor: 7 })
    expect(continueMarkdownLine('- ', 2)).toEqual({ text: '', cursor: 0 })
    expect(continueMarkdownLine('普通', 2)).toBeNull()
    expect(unclosedFenceLine('```ts\n- 一项')).toBe(1)
  })
})

describe('writing stats', () => {
  it('counts characters and mixes words with Han characters', () => {
    expect(writingStats('hello 墨白')).toEqual({ characters: 7, words: 3 })
    expect(writingStats('')).toEqual({ characters: 0, words: 0 })
    const editor = createMarkdownEditor('<div>\n内容\n</div>')
    expect(writingStats(visibleDocumentText(editor.state.doc))).toEqual({ characters: 2, words: 2 })
    editor.destroy()
  })
})
