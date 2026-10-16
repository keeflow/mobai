import { describe, expect, it } from 'vitest'
import { canonicalMarkdown, createMarkdownEditor, roundTripMarkdown } from '../src/shared/editor'

const cases: Record<string, string> = {
  empty: '',
  headings: '# 标题\n\n这是一段正文。\n\n## 第二节\n\n另一段。',
  lists: '- 外层\n  - 内层\n- [ ] 待办\n- [x] 完成',
  quote: '> 引用里的话\n>\n> - 引用中的列表',
  inline: '看 [示例](https://example.com/rea) 和 `行内代码`。',
  code: '```ts\nconst value = 1\n```',
  table: '| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |',
  tableMarks: '| 名称 | 说明 |\n| --- | --- |\n| **粗体** | `代码` |',
  image: '![示意图](assets/diagram.png)',
  mixed: '# 开始\n\n一段话。\n\n- 一\n- 二\n\n```js\nconsole.log(1)\n```\n\n| A | B |\n| --- | --- |\n| 左 | 右 |',
  blanks: '第一行\n\n\n第二行\n\n末尾  '
}

describe('markdown round trip', () => {
  for (const [name, source] of Object.entries(cases)) {
    it(`keeps ${name} stable after a second save`, () => {
      const once = roundTripMarkdown(source)
      const twice = roundTripMarkdown(once)
      expect(twice).toBe(once)
    })
  }

  it('keeps heading, link, code and table cell text', () => {
    const mixed = roundTripMarkdown(cases.mixed)
    expect(mixed).toContain('# 开始')
    expect(mixed).toContain('console.log(1)')
    expect(mixed).toContain('左')
    expect(mixed).toContain('右')

    const inline = roundTripMarkdown(cases.inline)
    expect(inline).toContain('https://example.com/rea')
    expect(inline).toContain('行内代码')

    const table = roundTripMarkdown(cases.table)
    expect(table).toContain('甲')
    expect(table).toContain('乙')
    expect(table).toContain('1')
    expect(table).toContain('2')

    const image = roundTripMarkdown(cases.image)
    expect(image).toContain('assets/diagram.png')

    const lists = roundTripMarkdown(cases.lists)
    expect(lists).toContain('[ ]')
    expect(lists).toContain('[x]')
    expect(lists).toContain('待办')
    expect(lists).toContain('完成')
  })

  it('undoes typed text without dropping the previous paragraph', () => {
    const editor = createMarkdownEditor('第一段')
    editor.commands.focus('end')
    editor.commands.insertContent('\n\n第二段')
    expect(canonicalMarkdown(editor.getMarkdown())).toContain('第二段')
    editor.commands.undo()
    const after = canonicalMarkdown(editor.getMarkdown())
    expect(after).toContain('第一段')
    expect(after).not.toContain('第二段')
    editor.destroy()
  })
})
