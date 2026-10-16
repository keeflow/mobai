<script setup lang="ts">
import { Diagram, FootnoteDefinition, FootnoteReference, FrontMatter, HtmlBlock, MathBlock, MathInline } from '@shared/blocks'
import { editorExtensions } from '@shared/editor'
import { searchDocument, type FindOptions, type TextSpan } from '@shared/find'
import { activeByPosition } from '@shared/outline'
import { collectImageFiles, collectImageFilesFromDataTransfer, dataTransferHasFiles, dataTransferHasImage } from '@shared/images'
import type { Editor } from '@tiptap/core'
import { visibleDocumentText } from '@shared/stats'
import Image from '@tiptap/extension-image'
import { EditorContent, useEditor, VueNodeViewRenderer } from '@tiptap/vue-3'
import { onBeforeUnmount, ref, watch } from 'vue'
import DiagramView from './DiagramView.vue'
import FrontMatterView from './FrontMatterView.vue'
import HtmlBlockView from './HtmlBlockView.vue'
import FootnoteDefinitionView from './FootnoteDefinitionView.vue'
import FootnoteReferenceView from './FootnoteReferenceView.vue'
import MathBlockView from './MathBlockView.vue'
import MathInlineView from './MathInlineView.vue'
import { useSessionStore } from '../stores/session'
import { markerExtension } from '../markers'
import { centerCaret } from '../writingMode'

const props = defineProps<{ typewriter: boolean }>()
const zoomedImage = ref('')
const draggingImage = ref(false)
const dropHandledAt = ref(0)
const session = useSessionStore()
let outlineFrame = 0
let outlineScroller: HTMLElement | null = null
const emit = defineEmits<{
  ready: []
}>()

const LocalImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src ?? '')
    const display = resolveImageSrc(src)
    return ['img', { ...HTMLAttributes, src: display }]
  }
})

function resolveImageSrc(src: string): string {
  if (!src || src.startsWith('http:') || src.startsWith('https:') || src.startsWith('media:')) return src
  if (!session.path || !window.api) return src
  const directory = session.path.replace(/[/\\][^/\\]+$/, '')
  const separator = session.path.includes('\\') ? '\\' : '/'
  const absolute = `${directory}${separator}${src}`
  return `media://image/?path=${encodeURIComponent(absolute)}`
}

const editor = useEditor({
  extensions: [
    ...editorExtensions().filter(
      (extension) =>
        !['image', 'mathInline', 'mathBlock', 'diagram', 'footnoteReference', 'footnoteDefinition', 'htmlBlock', 'frontMatter'].includes(
          extension.name
        )
    ),
    markerExtension(),
    LocalImage.configure({ allowBase64: false, inline: false }),
    MathInline.extend({
      addNodeView() {
        return VueNodeViewRenderer(MathInlineView)
      }
    }),
    MathBlock.extend({
      addNodeView() {
        return VueNodeViewRenderer(MathBlockView)
      }
    }),
    Diagram.extend({
      addNodeView() {
        return VueNodeViewRenderer(DiagramView)
      }
    }),
    FootnoteReference.extend({
      addNodeView() {
        return VueNodeViewRenderer(FootnoteReferenceView)
      }
    }),
    FootnoteDefinition.extend({
      addNodeView() {
        return VueNodeViewRenderer(FootnoteDefinitionView)
      }
    }),
    HtmlBlock.extend({
      addNodeView() {
        return VueNodeViewRenderer(HtmlBlockView)
      }
    }),
    FrontMatter.extend({
      addNodeView() {
        return VueNodeViewRenderer(FrontMatterView)
      }
    })
  ],
  content: session.markdown,
  contentType: 'markdown',
  editorProps: {
    attributes: {
      spellcheck: 'true'
    },
    handleDOMEvents: {
      dragenter(_view, event) {
        if (!dataTransferHasImage(event.dataTransfer)) return false
        draggingImage.value = true
        event.preventDefault()
        return true
      },
      dragover(_view, event) {
        if (!dataTransferHasImage(event.dataTransfer)) return false
        draggingImage.value = true
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        return true
      },
      dragleave(view, event) {
        const next = event.relatedTarget
        if (next instanceof Node && view.dom.contains(next)) return false
        draggingImage.value = false
        return false
      },
      drop() {
        draggingImage.value = false
        return false
      }
    },
    handlePaste(_view, event) {
      const images = collectImageFiles(event.clipboardData?.files)
      if (images.length === 0) return false
      event.preventDefault()
      void insertImages(images)
      return true
    },
    handleDoubleClick(_view, _pos, event) {
      const target = event.target
      if (!(target instanceof HTMLImageElement)) return false
      zoomedImage.value = target.currentSrc || target.src
      return true
    },
    handleDrop(view, event, _slice, moved) {
      if (moved) return false
      if (!dataTransferHasFiles(event.dataTransfer)) return false
      const images = collectImageFilesFromDataTransfer(event.dataTransfer)
      draggingImage.value = false
      dropHandledAt.value = Date.now()
      event.preventDefault()
      if (images.length === 0) {
        session.setNotice('只支持拖入 PNG、JPEG、GIF 或 WebP 图片。')
        return true
      }
      const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
      void insertImages(images, coords?.pos)
      return true
    }
  },
  onCreate: ({ editor: current }) => {
    session.rememberBody(visibleDocumentText(current.state.doc))
    outlineScroller = current.view.dom.closest('.editor-scroll')
    outlineScroller?.addEventListener('scroll', scheduleOutlineSync, { passive: true })
    scheduleOutlineSync()
  },
  onUpdate: ({ editor: current }) => {
    session.noteEditorMarkdown(current.getMarkdown())
    session.rememberBody(visibleDocumentText(current.state.doc))
  },
  onSelectionUpdate: ({ editor: current }) => {
    session.setOutlineIndex(headingIndex(current))
    if (props.typewriter) requestAnimationFrame(() => centerCaret(current))
  }
})

watch(
  () => props.typewriter,
  (enabled) => {
    if (enabled && editor.value) requestAnimationFrame(() => editor.value && centerCaret(editor.value))
  }
)

watch(
  () => session.documentKey,
  () => {
    load(session.markdown)
  }
)

function scheduleOutlineSync(): void {
  cancelAnimationFrame(outlineFrame)
  outlineFrame = requestAnimationFrame(() => {
    const current = editor.value
    if (current) syncOutline(current)
  })
}

function syncOutline(current: Editor): void {
  const scroller = outlineScroller ?? current.view.dom.closest('.editor-scroll')
  if (!(scroller instanceof HTMLElement)) return
  const box = scroller.getBoundingClientRect()
  const atBottom = scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
  const marker = props.typewriter ? box.top + box.height / 2 : atBottom ? box.bottom - 8 : box.top + 72
  const tops: number[] = []
  current.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const dom = current.view.nodeDOM(pos)
    const element = dom instanceof HTMLElement ? dom : dom?.parentElement
    if (element instanceof HTMLElement) tops.push(element.getBoundingClientRect().top)
  })
  if (tops.length === 0) return
  const index = activeByPosition(tops, marker)
  if (index !== session.outlineIndex) session.setOutlineIndex(index)
}

function headingIndex(current: Editor): number {
  let index = -1
  let seen = -1
  const position = current.state.selection.from
  current.state.doc.descendants((node, nodePos) => {
    if (node.type.name !== 'heading') return
    seen += 1
    if (nodePos <= position) index = seen
  })
  return index
}

function load(markdown: string): void {
  const current = editor.value
  if (!current) return
  current.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false })
  session.rememberBody(visibleDocumentText(current.state.doc))
  scheduleOutlineSync()
}

const IMAGE_NAME_CLEAN = /\.(png|jpe?g|gif|webp)$/i

async function insertImages(files: File[], at?: number): Promise<void> {
  const current = editor.value
  if (!current || files.length === 0) return
  let position = at
  for (const file of files) {
    const relativePath = await session.insertImageFile(file)
    if (!relativePath || !editor.value) continue
    const chain = editor.value.chain().focus()
    if (position !== undefined) chain.setTextSelection(position)
    const before = editor.value.state.selection.from
    const alt = file.name.replace(IMAGE_NAME_CLEAN, '') || '图片'
    chain.setImage({ src: relativePath, alt }).run()
    position = editor.value.state.selection.to || before + 1
  }
}

function onShellDragEnter(event: DragEvent): void {
  if (!dataTransferHasImage(event.dataTransfer)) return
  draggingImage.value = true
}

function onShellDragOver(event: DragEvent): void {
  if (!dataTransferHasImage(event.dataTransfer)) return
  draggingImage.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onShellDragLeave(event: DragEvent): void {
  const host = event.currentTarget
  const next = event.relatedTarget
  if (!(host instanceof Node) || (next instanceof Node && host.contains(next))) return
  draggingImage.value = false
}

function onShellDrop(event: DragEvent): void {
  draggingImage.value = false
  if (Date.now() - dropHandledAt.value < 300) return
  if (!dataTransferHasFiles(event.dataTransfer)) return
  const images = collectImageFilesFromDataTransfer(event.dataTransfer)
  dropHandledAt.value = Date.now()
  if (images.length === 0) {
    session.setNotice('只支持拖入 PNG、JPEG、GIF 或 WebP 图片。')
    return
  }
  const view = editor.value?.view
  const coords = view?.posAtCoords({ left: event.clientX, top: event.clientY })
  void insertImages(images, coords?.pos)
}

function search(options: FindOptions) {
  const current = editor.value
  if (!current) return { matches: [] }
  return searchDocument(current.state.doc, options)
}

function reveal(span: TextSpan): void {
  editor.value?.chain().focus().setTextSelection(span).scrollIntoView().run()
}

function replaceOne(span: TextSpan, text: string): void {
  const current = editor.value
  if (!current) return
  current.view.dispatch(current.state.tr.insertText(text, span.from, span.to))
}

function replaceAllMatches(options: FindOptions, text: string): { count: number; error?: string } {
  const current = editor.value
  if (!current) return { count: 0 }
  const found = searchDocument(current.state.doc, options)
  if (found.error) return { count: 0, error: found.error }
  const transaction = current.state.tr
  for (const span of [...found.matches].reverse()) transaction.insertText(text, span.from, span.to)
  if (found.matches.length) current.view.dispatch(transaction)
  return { count: found.matches.length }
}

function focusHeading(index: number): void {
  const current = editor.value
  if (!current) return
  let seen = 0
  let target: number | null = null
  current.state.doc.descendants((node, pos) => {
    if (target !== null) return false
    if (node.type.name !== 'heading') return
    if (seen === index) target = pos + 1
    seen += 1
  })
  if (target === null) return
  current.chain().focus().setTextSelection(target).scrollIntoView().run()
  const dom = current.view.domAtPos(target).node
  const element = dom instanceof HTMLElement ? dom : dom.parentElement
  element?.scrollIntoView({ block: 'start' })
}

onBeforeUnmount(() => {
  outlineScroller?.removeEventListener('scroll', scheduleOutlineSync)
  cancelAnimationFrame(outlineFrame)
})

defineExpose({ editor, search, reveal, replaceOne, replaceAllMatches, focusHeading })
emit('ready')
</script>

<template>
  <div
    class="editor-drop"
    :class="{ 'is-dragging': draggingImage }"
    @dragenter.prevent="onShellDragEnter"
    @dragover.prevent="onShellDragOver"
    @dragleave="onShellDragLeave"
    @drop.prevent="onShellDrop"
  >
    <EditorContent v-if="editor" :editor="editor" class="editor-column mx-auto w-full px-8 py-10" />
    <div v-if="draggingImage" class="editor-drop-hint">放开以插入图片</div>
  </div>
  <button v-if="zoomedImage" class="image-zoom" type="button" @click="zoomedImage = ''">
    <img :src="zoomedImage" alt="" />
  </button>
</template>
