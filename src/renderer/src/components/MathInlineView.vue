<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import katex from 'katex'
import { computed } from 'vue'
import 'katex/dist/katex.min.css'

const props = defineProps(nodeViewProps)
const html = computed(() =>
  katex.renderToString(String(props.node.attrs.tex ?? ''), { throwOnError: false, displayMode: false })
)

function onInput(event: Event): void {
  props.updateAttributes({ tex: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <node-view-wrapper as="span" class="math-inline">
    <input v-if="selected" class="math-source" :value="node.attrs.tex" @input="onInput" />
    <span v-else class="math-rendered" v-html="html"></span>
  </node-view-wrapper>
</template>
