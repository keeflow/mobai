<script setup lang="ts">
import type { ImagePlacement } from '@shared/settings'
import type { EditorFont, EditorMeasure } from '@shared/view'
import { nextTick, ref, watch } from 'vue'
import ToolIcon from './ToolIcon.vue'

const measure = defineModel<EditorMeasure>('measure', { required: true })
const font = defineModel<EditorFont>('font', { required: true })
const imageMode = defineModel<ImagePlacement>('imageMode', { required: true })
const assetDir = defineModel<string>('assetDir', { required: true })

const emit = defineEmits<{
  saveImageMode: [mode: ImagePlacement]
  saveAssetDir: []
  chooseCss: []
  clearCss: []
}>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  if (!open.value) return
  open.value = false
  void nextTick(() => trigger.value?.focus())
}

function onImageMode(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  if (value !== 'copy' && value !== 'move') return
  imageMode.value = value
  emit('saveImageMode', value)
}

function focusable(): HTMLElement[] {
  if (!dialog.value) return []
  return [...dialog.value.querySelectorAll<HTMLElement>('button, input, select, textarea')].filter((el) => !el.hasAttribute('disabled'))
}

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusable()
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialog.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  document.getElementById('image-mode')?.focus()
})
</script>

<template>
  <div class="sidebar-prefs border-t">
    <button
      ref="trigger"
      class="tool prefs-button"
      type="button"
      title="偏好设置"
      aria-label="偏好设置"
      aria-haspopup="dialog"
      aria-controls="prefs-dialog"
      :aria-expanded="open"
      @click="toggle"
    >
      <ToolIcon name="settings" />
    </button>
  </div>
  <Teleport to="body">
    <div v-if="open" class="prefs-layer" @mousedown.self="close">
      <div
        id="prefs-dialog"
        ref="dialog"
        class="prefs-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prefs-title"
        @keydown="onDialogKeydown"
      >
        <div class="prefs-head">
          <h2 id="prefs-title">偏好</h2>
          <button class="tool prefs-close" type="button" aria-label="关闭" @click="close">
            <ToolIcon name="close" />
          </button>
        </div>
        <label class="muted" for="image-mode">插入图片</label>
        <select id="image-mode" :value="imageMode" class="asset-input mt-1" @change="onImageMode">
          <option value="copy">复制到图片目录</option>
          <option value="move">移动到图片目录</option>
        </select>
        <label class="muted mt-2 block" for="editor-measure">栏宽</label>
        <select id="editor-measure" v-model="measure" class="asset-input mt-1">
          <option value="narrow">窄</option>
          <option value="normal">标准</option>
          <option value="wide">宽</option>
        </select>
        <label class="muted mt-2 block" for="editor-font">字体</label>
        <select id="editor-font" v-model="font" class="asset-input mt-1">
          <option value="serif">衬线</option>
          <option value="sans">无衬线</option>
        </select>
        <label class="muted mt-2 block" for="asset-dir">图片目录</label>
        <div class="mt-1 flex gap-2">
          <input id="asset-dir" v-model="assetDir" class="asset-input" type="text" />
          <button class="sidebar-button" type="button" @click="emit('saveAssetDir')">设置</button>
        </div>
        <div class="mt-2 flex gap-2">
          <button class="sidebar-button" type="button" @click="emit('chooseCss')">用户样式</button>
          <button class="sidebar-button" type="button" @click="emit('clearCss')">清除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar-prefs {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0.35rem 0.5rem 0.45rem;
}

.prefs-button {
  padding: 0.38rem;
  color: var(--tool);
}

.prefs-button[aria-expanded='true'],
.prefs-button:hover,
.prefs-close:hover {
  background: var(--hover);
}

.prefs-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 28%);
}

.prefs-dialog {
  width: min(22rem, calc(100vw - 2rem));
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 16px 40px rgb(0 0 0 / 18%);
  padding: 0.85rem 1rem 1rem;
  font-size: 0.8rem;
}

.prefs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.prefs-head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
}

.prefs-close {
  padding: 0.28rem;
}

.prefs-dialog .sidebar-button {
  flex-shrink: 0;
  white-space: nowrap;
}

.prefs-dialog :focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  outline-offset: 1px;
}
</style>
