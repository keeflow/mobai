<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps(nodeViewProps)
const host = ref<HTMLElement | null>(null)
const error = ref('')
const themeName = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const themeObserver = new MutationObserver(() => {
  themeName.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
})

async function render(): Promise<void> {
  await nextTick()
  error.value = ''
  if (props.selected || !host.value) return
  const source = String(props.node.attrs.source ?? '').trim()
  if (!source) {
    error.value = '选中后可以编辑这张图。'
    return
  }
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: themeName.value === 'dark' ? 'dark' : 'default'
    })
    const id = `mobai-diagram-${Math.random().toString(36).slice(2, 10)}`
    const result = await mermaid.render(id, source)
    host.value.innerHTML = result.svg
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '这张图无法渲染'
  }
}

watch(() => [props.selected, props.node.attrs.source, themeName.value], () => {
  void render()
})

onMounted(() => {
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  void render()
})

onBeforeUnmount(() => {
  themeObserver.disconnect()
})

function onInput(event: Event): void {
  props.updateAttributes({ source: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <node-view-wrapper class="diagram-block">
    <textarea v-if="selected" class="diagram-source" rows="6" :value="node.attrs.source" @input="onInput"></textarea>
    <div v-else ref="host" class="diagram-render"></div>
    <p v-if="!selected && error" class="diagram-error">{{ error }}</p>
  </node-view-wrapper>
</template>
