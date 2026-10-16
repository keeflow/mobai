import { Extension, getMarkRange } from '@tiptap/core'
import type { Mark, Node as ProseNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Selection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const markerKey = new PluginKey('markers')

const INLINE_MARKS = new Set(['bold', 'italic', 'code', 'link', 'strike', 'highlight'])

export interface MarkerSpan {
  from: number
  to: number
  kind: 'caret' | 'selection'
  syntax: 'bold' | 'italic' | 'code' | 'link' | 'strike' | 'highlight' | 'bullet' | 'ordered' | 'task'
  href?: string
  label?: string
}

export interface MarkerPlan {
  currentBlock: { from: number; to: number; name: string; level: number | null } | null
  spans: MarkerSpan[]
}

export function markerPlan(state: EditorState): MarkerPlan {
  const { selection, doc } = state
  return {
    currentBlock: currentBlock(doc, selection),
    spans: [...inlineSpans(doc, selection), ...listSpans(doc, selection)]
  }
}

function currentBlock(doc: ProseNode, selection: Selection): MarkerPlan['currentBlock'] {
  const pos = selection.$from.depth >= 1 ? selection.$from.before(1) : 'node' in selection ? selection.from : null
  if (pos === null) return null
  const node = doc.nodeAt(pos)
  if (!node?.isBlock) return null
  const level = node.type.name === 'heading' ? Number(node.attrs.level ?? 0) : null
  return { from: pos, to: pos + node.nodeSize, name: node.type.name, level }
}

function inlineSpans(doc: ProseNode, selection: Selection): MarkerSpan[] {
  const spans: MarkerSpan[] = []
  const seen = new Set<string>()
  const visit = (mark: Mark, pos: number): void => {
    if (!INLINE_MARKS.has(mark.type.name) || insideCodeBlock(doc, pos)) return
    const range = getMarkRange(doc.resolve(pos), mark.type, mark.attrs)
    if (!range) return
    const id = `${mark.type.name}:${range.from}:${range.to}`
    if (seen.has(id)) return
    seen.add(id)
    spans.push({
      from: range.from,
      to: range.to,
      kind: selection.empty ? 'caret' : 'selection',
      syntax: mark.type.name as MarkerSpan['syntax'],
      href: mark.type.name === 'link' ? String(mark.attrs.href ?? '') : undefined
    })
  }

  if (selection.empty) {
    for (const mark of selection.$from.marks()) visit(mark, selection.from)
    return spans
  }

  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isText) return
    for (const mark of node.marks) visit(mark, Math.min(pos + 1, doc.content.size))
  })
  return spans
}

function listSpans(doc: ProseNode, selection: Selection): MarkerSpan[] {
  const spans: MarkerSpan[] = []
  const seen = new Set<number>()
  const add = (node: ProseNode, pos: number): void => {
    if (seen.has(pos) || (node.type.name !== 'listItem' && node.type.name !== 'taskItem')) return
    if (insideCodeBlock(doc, pos + 1)) return
    seen.add(pos)
    const parent = doc.resolve(pos + 1).parent
    if (node.type.name === 'taskItem') {
      spans.push({
        from: pos,
        to: pos + node.nodeSize,
        kind: selection.empty ? 'caret' : 'selection',
        syntax: 'task',
        label: node.attrs.checked ? '- [x] ' : '- [ ] '
      })
      return
    }
    if (parent.type.name === 'orderedList') {
      const start = Number(parent.attrs.start ?? 1)
      spans.push({
        from: pos,
        to: pos + node.nodeSize,
        kind: selection.empty ? 'caret' : 'selection',
        syntax: 'ordered',
        label: `${start + doc.resolve(pos).index()}. `
      })
      return
    }
    spans.push({
      from: pos,
      to: pos + node.nodeSize,
      kind: selection.empty ? 'caret' : 'selection',
      syntax: 'bullet',
      label: '- '
    })
  }

  if (selection.empty) {
    const { $from } = selection
    for (let depth = $from.depth; depth > 0; depth -= 1) add($from.node(depth), $from.before(depth))
    return spans
  }

  doc.nodesBetween(selection.from, selection.to, (node, pos) => add(node, pos))
  return spans
}

function insideCodeBlock(doc: ProseNode, pos: number): boolean {
  const safe = Math.max(1, Math.min(pos, doc.content.size))
  const resolved = doc.resolve(safe)
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    if (resolved.node(depth).type.name === 'codeBlock') return true
  }
  return false
}

export function markerExtension(): Extension {
  return Extension.create({
    name: 'markers',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: markerKey,
          props: {
            decorations(state) {
              const plan = markerPlan(state)
              const decorations = []
              if (plan.currentBlock) {
                decorations.push(
                  Decoration.node(plan.currentBlock.from, plan.currentBlock.to, { class: 'is-current-block' })
                )
              }
              for (const span of plan.spans) {
                const markerClass = span.kind === 'caret' ? 'marker-caret' : 'marker-selection'
                if (span.syntax === 'link') {
                  decorations.push(
                    Decoration.widget(span.from, () => syntaxChip('['), { side: -1, ignoreSelection: true }),
                    Decoration.widget(span.to, () => syntaxChip(`](${span.href ?? ''})`), { side: 1, ignoreSelection: true })
                  )
                  continue
                }
                if (span.syntax === 'bullet' || span.syntax === 'ordered' || span.syntax === 'task') {
                  decorations.push(
                    Decoration.node(span.from, span.to, {
                      class: `${markerClass} marker-list`,
                      'data-marker': span.label ?? ''
                    })
                  )
                  continue
                }
                decorations.push(Decoration.inline(span.from, span.to, { class: `${markerClass} marker-${span.syntax}` }))
              }
              return decorations.length ? DecorationSet.create(state.doc, decorations) : null
            }
          }
        })
      ]
    }
  })
}

function syntaxChip(text: string): HTMLElement {
  const chip = document.createElement('span')
  chip.className = 'marker-syntax'
  chip.setAttribute('aria-hidden', 'true')
  chip.textContent = text
  return chip
}
