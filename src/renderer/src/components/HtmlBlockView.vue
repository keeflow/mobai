<script setup lang="ts">
import { sanitizeHtml } from '@shared/html'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)
const source = computed(() => String(props.node.attrs.source ?? ''))
const preview = computed(() => sanitizeHtml(source.value))

function onInput(event: Event): void {
  props.updateAttributes({ source: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <node-view-wrapper class="html-block">
    <textarea v-if="selected" class="html-source" rows="5" :value="source" @input="onInput"></textarea>
    <div v-else-if="preview" class="html-render" v-html="preview"></div>
    <p v-else class="html-note">{{ source ? '预览已去掉这段 HTML 里不能显示的内容。选中后可以编辑源码。' : '选中后可以编辑这段 HTML。' }}</p>
  </node-view-wrapper>
</template>
