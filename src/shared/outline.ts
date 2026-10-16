export interface OutlineHeading {
  level: number
  text: string
  line: number
  index: number
}

export function outlineFromMarkdown(markdown: string): OutlineHeading[] {
  const headings: OutlineHeading[] = []
  let inFence = false
  const lines = markdown.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (/^( {0,3})(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match?.[1] || !match[2]) continue
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      line: index + 1,
      index: headings.length
    })
  }
  return headings
}
