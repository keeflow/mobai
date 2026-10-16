import type { Node as ProseNode } from '@tiptap/pm/model'

export interface WritingStats {
  characters: number
  words: number
}

export function visibleDocumentText(doc: ProseNode): string {
  const parts: string[] = []
  doc.descendants((node) => {
    if (node.isText) {
      parts.push(node.text ?? '')
      return
    }
    if (!node.isAtom) return
    const extra = [node.attrs.source, node.attrs.tex, node.attrs.text, node.attrs.label]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join('\n')
    if (extra) parts.push(extra.replace(/<[^>]*>/g, ''))
  })
  return parts.join('\n')
}

export function writingStats(text: string): WritingStats {
  const characters = [...text.replace(/\s/g, '')].length
  const words = text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?|[\u3400-\u9FFF\uF900-\uFAFF]/g)?.length ?? 0
  return { characters, words }
}
