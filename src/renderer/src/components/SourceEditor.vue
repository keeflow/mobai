<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, drawSelection, keymap, lineNumbers, type DecorationSet } from '@codemirror/view'
import { searchText, type FindOptions, type TextSpan } from '@shared/find'
import { outlineFromMarkdown } from '@shared/outline'
import { continueMarkdownLine, unclosedFenceLine } from '@shared/source'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  text: string
  generation: number
}>()

const emit = defineEmits<{
  change: [value: string]
}>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let applying = false

const setErrorLine = StateEffect.define<number | null>()
const errorLine = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setErrorLine)) continue
      if (!effect.value) return Decoration.none
      const lineNo = Math.min(Math.max(effect.value, 1), transaction.state.doc.lines)
      const line = transaction.state.doc.line(lineNo)
      return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(line.from)])
    }
    return decorations
  },
  provide: (field) => EditorView.decorations.from(field)
})

onMounted(() => {
  if (!host.value) return
  applying = true
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.text,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        markdown(),
        keymap.of([
          {
            key: 'Enter',
            run(editorView) {
              const range = editorView.state.selection.main
              if (!range.empty) return false
              const line = editorView.state.doc.lineAt(range.head)
              if (unclosedFenceLine(editorView.state.doc.sliceString(0, line.from)) !== null) return false
              const next = continueMarkdownLine(line.text, range.head - line.from)
              if (!next) return false
              editorView.dispatch({
                changes: { from: line.from, to: line.to, insert: next.text },
                selection: { anchor: line.from + next.cursor }
              })
              return true
            }
          },
          ...defaultKeymap,
          ...historyKeymap
        ]),
        errorLine,
        EditorView.contentAttributes.of({ spellcheck: 'true' }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || applying) return
          emit('change', update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--ink)' },
          '.cm-scroller': { fontFamily: 'SF Mono, ui-monospace, Menlo, monospace', fontSize: '14px', lineHeight: '1.7' },
          '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--muted)', border: 'none' },
          '&.cm-focused': { outline: 'none' }
        })
      ]
    })
  })
  applying = false
})

watch(
  () => props.generation,
  () => {
    if (!view) return
    applying = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: props.text },
      effects: setErrorLine.of(null)
    })
    applying = false
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

function getText(): string {
  return view?.state.doc.toString() ?? props.text
}

function markLine(line: number): void {
  if (!view) return
  const lineNo = Math.min(Math.max(line, 1), view.state.doc.lines)
  const resolved = view.state.doc.line(lineNo)
  view.dispatch({
    effects: setErrorLine.of(lineNo),
    selection: { anchor: resolved.from },
    scrollIntoView: true
  })
  view.focus()
}

function search(options: FindOptions) {
  return searchText(getText(), options)
}

function reveal(span: TextSpan): void {
  view?.dispatch({ selection: { anchor: span.from, head: span.to }, scrollIntoView: true })
  view?.focus()
}

function replaceOne(span: TextSpan, text: string): void {
  view?.dispatch({ changes: { from: span.from, to: span.to, insert: text } })
}

function replaceAllMatches(options: FindOptions, text: string): { count: number; error?: string } {
  const found = search(options)
  if (found.error || !view) return { count: 0, error: found.error }
  if (found.matches.length) {
    view.dispatch({ changes: found.matches.map((span) => ({ from: span.from, to: span.to, insert: text })) })
  }
  return { count: found.matches.length }
}

function focusHeading(index: number): void {
  const heading = outlineFromMarkdown(getText())[index]
  if (!heading) return
  markLine(heading.line)
}

defineExpose({ getText, markLine, search, reveal, replaceOne, replaceAllMatches, focusHeading })
</script>

<template>
  <div ref="host" class="source-host"></div>
</template>

<style scoped>
.source-host {
  height: 100%;
  min-height: 70vh;
}
</style>
