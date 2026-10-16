export interface TextSpan {
  from: number
  to: number
}

export interface FindOptions {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

export interface FindHit {
  matches: TextSpan[]
  error?: string
}

interface ReadableText {
  isText: boolean
  text?: string | null
}

interface ReadableDoc {
  descendants(callback: (node: ReadableText, pos: number) => boolean | void): void
}

export function searchText(text: string, options: FindOptions): FindHit {
  if (!options.query) return { matches: [] }
  let pattern: RegExp
  try {
    const source = options.regex ? options.query : escapeRegExp(options.query)
    const body = options.wholeWord ? `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])` : source
    pattern = new RegExp(body, options.caseSensitive ? 'gu' : 'giu')
  } catch {
    return { matches: [], error: '正则表达式无效' }
  }

  const matches: TextSpan[] = []
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined || match[0].length === 0) continue
    matches.push({ from: match.index, to: match.index + match[0].length })
  }
  return { matches }
}

export function searchDocument(doc: ReadableDoc, options: FindOptions): FindHit {
  const plain = documentPlainText(doc)
  const found = searchText(plain.text, options)
  if (found.error) return found
  const matches: TextSpan[] = []
  for (const match of found.matches) {
    const from = plain.positions[match.from]
    const end = plain.positions[match.to - 1]
    if (from === undefined || end === undefined || from < 0 || end < 0) continue
    matches.push({ from, to: end + 1 })
  }
  return { matches }
}

function documentPlainText(doc: ReadableDoc): { text: string; positions: number[] } {
  let text = ''
  const positions: number[] = []
  let lastEnd = -1
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    if (positions.length > 0 && pos !== lastEnd) {
      text += '\n'
      positions.push(-1)
    }
    for (let index = 0; index < node.text.length; index += 1) {
      text += node.text[index]
      positions.push(pos + index)
    }
    lastEnd = pos + node.text.length
  })
  return { text, positions }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
