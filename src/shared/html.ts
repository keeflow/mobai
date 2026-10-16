const FORBIDDEN_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'style'])

const BLOCK_TAG =
  'address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|iframe|main|nav|ol|p|pre|section|script|style|table|textarea|ul'

export const htmlBlockLine = new RegExp(
  `^[ \\t]{0,3}<(?:!--|\\?|!\\[CDATA\\[|\\/?(?:${BLOCK_TAG})\\b)`,
  'i'
)

export function sanitizeHtml(source: string): string {
  const document = new DOMParser().parseFromString(source, 'text/html')
  cleanElement(document.body)
  return document.body.innerHTML
}

function cleanElement(element: Element): void {
  for (const child of [...element.children]) {
    if (FORBIDDEN_TAGS.has(child.tagName.toLowerCase())) {
      child.remove()
      continue
    }
    for (const attribute of [...child.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') {
        child.removeAttribute(attribute.name)
        continue
      }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        child.removeAttribute(attribute.name)
      }
    }
    cleanElement(child)
  }
}

export function readHtmlBlock(src: string): { raw: string; text: string } | undefined {
  if (!htmlBlockLine.test(src)) return undefined
  const lines = src.split('\n')
  const first = (lines[0] ?? '').trim()
  const special = /^<(script|style|pre|textarea)\b/i.exec(first)
  let end = lines.length
  if (special) {
    const closer = new RegExp(`</${special[1]}\\s*>`, 'i')
    const found = lines.findIndex((line) => closer.test(line))
    end = found === -1 ? lines.length : found + 1
  } else if (first.startsWith('<!--')) {
    const found = lines.findIndex((line) => line.includes('-->'))
    end = found === -1 ? lines.length : found + 1
  } else {
    const blank = lines.findIndex((line, index) => index > 0 && line.trim() === '')
    end = blank === -1 ? lines.length : blank
  }
  const text = lines.slice(0, end).join('\n').replace(/\n$/, '')
  if (!text.trim()) return undefined
  const consumed = lines.slice(0, end).join('\n')
  const raw = end < lines.length || src.endsWith('\n') ? `${consumed}\n` : consumed
  return { raw, text }
}
