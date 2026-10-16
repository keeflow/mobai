export interface FolderHit {
  path: string
  name: string
  relativePath: string
  line: number
  text: string
}

export interface FolderSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
}

export function folderSearchError(query: string, options: FolderSearchOptions = {}): string | null {
  if (!options.regex || !query.trim()) return null
  try {
    const source = options.wholeWord ? `(?<![\\p{L}\\p{N}_])(?:${query})(?![\\p{L}\\p{N}_])` : query
    new RegExp(source, options.caseSensitive ? 'u' : 'iu')
    return null
  } catch {
    return '正则表达式无效'
  }
}

export function matchFolderLines(text: string, query: string, options: FolderSearchOptions = {}): { line: number; text: string }[] {
  const needle = query.trim()
  if (!needle) return []
  const invalid = folderSearchError(needle, options)
  const pattern = invalid ? null : folderPattern(needle, options)
  const hits: { line: number; text: string }[] = []
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const matched = pattern ? pattern.test(line) : line.toLocaleLowerCase().includes(needle.toLocaleLowerCase())
    if (pattern) pattern.lastIndex = 0
    if (!matched) continue
    const trimmed = line.trim()
    hits.push({
      line: index + 1,
      text: trimmed.length > 180 ? `${trimmed.slice(0, 180)}…` : trimmed
    })
    if (hits.length >= 20) break
  }
  return hits
}

function folderPattern(query: string, options: FolderSearchOptions): RegExp | null {
  if (!options.caseSensitive && !options.wholeWord && !options.regex) return null
  const source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const body = options.wholeWord ? `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])` : source
  return new RegExp(body, options.caseSensitive ? 'gu' : 'giu')
}
