import type { Editor } from '@tiptap/core'

export function centerCaret(editor: Editor): void {
  const view = editor.view
  const coords = view.coordsAtPos(view.state.selection.head)
  let parent: HTMLElement | null = view.dom.parentElement
  while (parent && parent.scrollHeight <= parent.clientHeight + 1) parent = parent.parentElement
  if (!parent) return
  const box = parent.getBoundingClientRect()
  const middle = (coords.top + coords.bottom) / 2
  parent.scrollTop += middle - (box.top + box.height / 2)
}
