import { Mark, Node, mergeAttributes } from '@tiptap/core'
import CodeBlock from '@tiptap/extension-code-block'
import type { MarkdownParseHelpers, MarkdownToken } from '@tiptap/core'
import { htmlBlockLine, readHtmlBlock, sanitizeHtml } from './html'

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      tex: { default: '' }
    }
  },
  markdownTokenName: 'mathInline',
  markdownTokenizer: {
    name: 'mathInline',
    level: 'inline',
    start: (src) => src.indexOf('$'),
    tokenize: (src) => {
      const match = /^\$(?!\$)([^$\n]+?)\$/.exec(src)
      if (!match) return
      return { type: 'mathInline', raw: match[0], text: match[1] ?? '' }
    }
  },
  parseMarkdown: (token, helpers) => helpers.createNode('mathInline', { tex: token.text ?? '' }),
  renderMarkdown: (node) => `$${node.attrs?.tex ?? ''}$`,
  parseHTML: () => [{ tag: 'span[data-type="math-inline"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'span',
    mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline', 'data-tex': node.attrs.tex }),
    String(node.attrs.tex ?? '')
  ]
})

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      tex: { default: '' }
    }
  },
  markdownTokenName: 'mathBlock',
  markdownTokenizer: {
    name: 'mathBlock',
    level: 'block',
    start: (src) => (src.startsWith('$$') ? 0 : -1),
    tokenize: (src) => {
      const fenced = /^\$\$[^\S\n]*\n([\s\S]*?)\n\$\$[^\S\n]*(?:\n|$)/.exec(src)
      const single = fenced ? null : /^\$\$([^$\n]+)\$\$[^\S\n]*(?:\n|$)/.exec(src)
      const match = fenced ?? single
      if (!match) return
      return { type: 'mathBlock', raw: match[0], text: (match[1] ?? '').trim() }
    }
  },
  parseMarkdown: (token, helpers) => helpers.createNode('mathBlock', { tex: token.text ?? '' }),
  renderMarkdown: (node) => `$$\n${node.attrs?.tex ?? ''}\n$$`,
  parseHTML: () => [{ tag: 'div[data-type="math-block"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-type': 'math-block', 'data-tex': node.attrs.tex }),
    String(node.attrs.tex ?? '')
  ]
})

export const Diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      source: { default: '' }
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="diagram"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-type': 'diagram' }),
    String(node.attrs.source ?? '')
  ],
  renderMarkdown: (node) => `\`\`\`mermaid\n${String(node.attrs?.source ?? '').replace(/\n$/, '')}\n\`\`\``
})

function footnoteLabel(tokenText: string): string {
  return tokenText.trim()
}

export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      label: { default: '' }
    }
  },
  markdownTokenName: 'footnoteReference',
  markdownTokenizer: {
    name: 'footnoteReference',
    level: 'inline',
    start: (src) => src.indexOf('[^'),
    tokenize: (src) => {
      const match = /^\[\^([^\]\n]+)\](?!:)/.exec(src)
      if (!match) return
      return { type: 'footnoteReference', raw: match[0], text: match[1] ?? '' }
    }
  },
  parseMarkdown: (token, helpers) => helpers.createNode('footnoteReference', { label: footnoteLabel(token.text ?? '') }),
  renderMarkdown: (node) => `[^${node.attrs?.label ?? ''}]`,
  parseHTML: () => [{ tag: 'sup[data-type="footnote-ref"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'sup',
    mergeAttributes(HTMLAttributes, { 'data-type': 'footnote-ref' }),
    `[${node.attrs.label ?? ''}]`
  ]
})

export const FootnoteDefinition = Node.create({
  name: 'footnoteDefinition',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      label: { default: '' },
      text: { default: '' }
    }
  },
  markdownTokenName: 'footnoteDefinition',
  markdownTokenizer: {
    name: 'footnoteDefinition',
    level: 'block',
    start: (src) => (/^\[\^[^\]\n]+\]:/.test(src) ? 0 : -1),
    tokenize: (src) => {
      const match = /^\[\^([^\]\n]+)\]:[ \t]*([^\n]*)(?:\n|$)((?:[ \t]+[^\n]*(?:\n|$))*)/.exec(src)
      if (!match) return
      const extra = (match[3] ?? '')
        .split('\n')
        .map((line) => line.replace(/^[ \t]+/, ''))
        .filter((line) => line.length > 0)
      const text = [match[2] ?? '', ...extra].filter((line, index) => index === 0 || line.length > 0).join('\n')
      return { type: 'footnoteDefinition', raw: match[0], text, label: match[1] ?? '' }
    }
  },
  parseMarkdown: (token, helpers) =>
    helpers.createNode('footnoteDefinition', { label: String(token.label ?? ''), text: token.text ?? '' }),
  renderMarkdown: (node) => {
    const label = String(node.attrs?.label ?? '')
    const lines = String(node.attrs?.text ?? '').split('\n')
    const [first, ...rest] = lines
    return [`[^${label}]: ${first ?? ''}`, ...rest.map((line) => (line ? `  ${line}` : ''))].join('\n')
  },
  parseHTML: () => [{ tag: 'section[data-type="footnote-def"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'section',
    mergeAttributes(HTMLAttributes, { 'data-type': 'footnote-def' }),
    `[${node.attrs.label ?? ''}] ${node.attrs.text ?? ''}`
  ]
})

export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      source: { default: '', rendered: false }
    }
  },
  markdownTokenName: 'htmlBlock',
  markdownTokenizer: {
    name: 'htmlBlock',
    level: 'block',
    start: (src) => (htmlBlockLine.test(src) ? 0 : -1),
    tokenize: (src) => {
      const block = readHtmlBlock(src)
      if (!block) return
      return { type: 'htmlBlock', raw: block.raw, text: block.text }
    }
  },
  parseMarkdown: (token, helpers) => helpers.createNode('htmlBlock', { source: token.text ?? '' }),
  renderMarkdown: (node) => String(node.attrs?.source ?? '').replace(/\n$/, ''),
  parseHTML: () => [{ tag: 'div[data-type="html-block"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, {
      'data-type': 'html-block',
      'data-html': encodeURIComponent(sanitizeHtml(String(node.attrs.source ?? '')))
    })
  ]
})

export const Highlight = Mark.create({
  name: 'highlight',
  parseHTML: () => [{ tag: 'mark' }],
  renderHTML: ({ HTMLAttributes }) => ['mark', HTMLAttributes, 0],
  markdownTokenName: 'highlight',
  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src) => src.indexOf('=='),
    tokenize: (src) => {
      const match = /^==([^=\n]+?)==/.exec(src)
      if (!match) return
      return { type: 'highlight', raw: match[0], text: match[1] ?? '' }
    }
  },
  parseMarkdown: (token, helpers) =>
    helpers.applyMark('highlight', helpers.parseInline([{ type: 'text', raw: token.text ?? '', text: token.text ?? '' }])),
  renderMarkdown: (node, helpers) => `==${helpers.renderChildren(node)}==`
})

export const FrontMatter = Node.create({
  name: 'frontMatter',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      source: { default: '', rendered: false }
    }
  },
  markdownTokenName: 'frontMatter',
  markdownTokenizer: {
    name: 'frontMatter',
    level: 'block',
    start: (src) => (src.startsWith('---\n') ? 0 : -1),
    tokenize: (src) => {
      if (!src.startsWith('---\n')) return
      const close = src.indexOf('\n---', 4)
      if (close < 0) return
      const lineEnd = src.indexOf('\n', close + 1)
      const closing = src.slice(close + 1, lineEnd === -1 ? undefined : lineEnd)
      if (closing.trim() !== '---') return
      const end = close + 1 + closing.length
      return {
        type: 'frontMatter',
        raw: src.slice(0, end) + (src[end] === '\n' ? '\n' : ''),
        text: src.slice(4, close)
      }
    }
  },
  parseMarkdown: (token, helpers) => helpers.createNode('frontMatter', { source: token.text ?? '' }),
  renderMarkdown: (node) => `---\n${String(node.attrs?.source ?? '').replace(/\n$/, '')}\n---`,
  parseHTML: () => [{ tag: 'pre[data-type="front-matter"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'pre',
    mergeAttributes(HTMLAttributes, { 'data-type': 'front-matter' }),
    String(node.attrs.source ?? '')
  ]
})

export const DiagramCodeBlock = CodeBlock.extend({
  parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
    if (token.lang === 'mermaid') return helpers.createNode('diagram', { source: token.text ?? '' })
    return this.parent?.(token, helpers) ?? []
  }
})
