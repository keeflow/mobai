import { describe, expect, it } from 'vitest'
import { markerPlan } from '../src/renderer/src/markers'
import { canonicalMarkdown, createMarkdownEditor } from '../src/shared/editor'

function editorAt(markdown: string, needle: string) {
  const editor = createMarkdownEditor(markdown)
  let position = 1
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text?.includes(needle)) return
    position = pos + node.text.indexOf(needle) + 1
    return false
  })
  editor.commands.setTextSelection(position)
  return editor
}

describe('cursor markers', () => {
  it('shows marks under the caret and hides them outside, without rewriting markdown', () => {
    const source = '### 第三节\n\n**粗体** 和 *斜体* 与 `代码`。\n\n- 一项'
    const inside = editorAt(source, '粗')
    const shown = markerPlan(inside.state)
    expect(shown.spans.map((span) => span.syntax)).toContain('bold')
    expect(shown.spans.every((span) => span.kind === 'caret')).toBe(true)
    expect(shown.currentBlock?.name).toBe('paragraph')
    const before = canonicalMarkdown(inside.getMarkdown())

    inside.commands.setTextSelection(1)
    const heading = markerPlan(inside.state)
    expect(heading.currentBlock).toMatchObject({ name: 'heading', level: 3 })
    expect(heading.spans.some((span) => span.syntax === 'bold')).toBe(false)
    expect(canonicalMarkdown(inside.getMarkdown())).toBe(before)
    inside.destroy()
  })

  it('marks only the inline syntax a selection touches', () => {
    const editor = editorAt('看 *斜体* 结束', '斜')
    const from = editor.state.selection.from
    editor.commands.setTextSelection({ from, to: from + 1 })
    const plan = markerPlan(editor.state)
    expect(plan.spans).toEqual([expect.objectContaining({ syntax: 'italic', kind: 'selection' })])
    editor.destroy()
  })

  it('labels the list item that contains the caret', () => {
    const editor = editorAt('- 一项\n- 二项', '二')
    const plan = markerPlan(editor.state)
    expect(plan.spans).toEqual([expect.objectContaining({ syntax: 'bullet', label: '- ', kind: 'caret' })])
    editor.destroy()
  })
})