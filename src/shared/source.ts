export function unclosedFenceLine(markdown: string): number | null {
  const lines = markdown.split('\n')
  let openLine: number | null = null
  let marker = ''
  let size = 0
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(lines[index] ?? '')
    if (!match?.[2]) continue
    const fence = match[2]
    const info = match[3] ?? ''
    if (openLine === null) {
      openLine = index + 1
      marker = fence[0] ?? '`'
      size = fence.length
      continue
    }
    if ((fence[0] ?? '') === marker && fence.length >= size && info.trim() === '') {
      openLine = null
      marker = ''
      size = 0
    }
  }
  return openLine
}

const markdownLine =
  /^(\s*)((?:>\s+)*)(?:((?:[-+*]|\d+[.)])\s+)(\[[ xX]\]\s+)?)?(.*)$/

export function continueMarkdownLine(line: string, cursor: number): { text: string; cursor: number } | null {
  const match = markdownLine.exec(line)
  if (!match) return null
  const indent = match[1] ?? ''
  const quote = match[2] ?? ''
  const marker = match[3] ?? ''
  const task = match[4] ?? ''
  if (!quote && !marker) return null
  const prefix = `${indent}${quote}${marker}${task}`
  if (cursor < prefix.length) return null
  const before = line.slice(0, cursor)
  const after = line.slice(cursor)
  if (!before.slice(prefix.length).trim() && !after.trim()) return { text: '', cursor: 0 }
  const nextMarker = /^\d+/.test(marker) ? marker.replace(/^\d+/, (value) => String(Number(value) + 1)) : marker
  const nextPrefix = `${indent}${quote}${nextMarker}${task ? '[ ] ' : ''}`
  return { text: `${before}\n${nextPrefix}${after}`, cursor: before.length + 1 + nextPrefix.length }
}
