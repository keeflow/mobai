import { Editor, type Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { Diagram, DiagramCodeBlock, FootnoteDefinition, FootnoteReference, FrontMatter, Highlight, HtmlBlock, MathBlock, MathInline } from './blocks'

export function editorExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        autolink: true
      },
      codeBlock: false
    }),
    DiagramCodeBlock,
    MathInline,
    MathBlock,
    Diagram,
    FootnoteReference,
    FootnoteDefinition,
    HtmlBlock,
    FrontMatter,
    Highlight,
    Table.configure({
      resizable: false
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    Image.configure({
      allowBase64: false,
      inline: false
    }),
    Placeholder.configure({
      placeholder: '开始写…'
    }),
    Markdown.configure({
      indentation: { style: 'space', size: 2 }
    })
  ]
}

export function canonicalMarkdown(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '')
}

export function createMarkdownEditor(content = ''): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: editorExtensions(),
    content,
    contentType: 'markdown'
  })
}

export function roundTripMarkdown(markdown: string): string {
  const editor = createMarkdownEditor(markdown)
  try {
    return canonicalMarkdown(editor.getMarkdown())
  } finally {
    editor.destroy()
  }
}

export function inspectMarkdown(markdown: string): { ok: true } | { ok: false; line: number; message: string } {
  const editor = createMarkdownEditor('')
  try {
    editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法解析这段 Markdown'
    const lineMatch = /line\s+(\d+)/i.exec(message)
    return { ok: false, line: lineMatch ? Number(lineMatch[1]) : 1, message }
  } finally {
    editor.destroy()
  }
}

export function markdownToPlainHtml(markdown: string): string {
  const editor = createMarkdownEditor(markdown)
  try {
    return editor
      .getHTML()
      .replace(/<div\b(?=[^>]*\bdata-type="html-block")(?=[^>]*\bdata-html="([^"]*)")[^>]*>\s*<\/div>/gi, (_match, encoded: string) => {
        try {
          return decodeURIComponent(encoded)
        } catch {
          return ''
        }
      })
      .replace(/\s(?:class|style|contenteditable|start)="[^"]*"/gi, '')
      .replace(/\sdata-[\w-]+="[^"]*"/gi, '')
  } finally {
    editor.destroy()
  }
}
