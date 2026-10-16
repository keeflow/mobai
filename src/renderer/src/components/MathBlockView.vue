<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import katex from 'katex'
import { computed } from 'vue'
import 'katex/dist/katex.min.css'

const props = defineProps(nodeViewProps)
const html = computed(() =>
  katex.renderToString(String(props.node.attrs.tex ?? ''), { throwOnError: false, displayMode: true })
)

function onInput(event: Event): void {
  props.updateAttributes({ tex: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <node-view-wrapper class="math-block" :data-type="'math-block'">
    <textarea v-if="selected" class="math-source" rows="3" :value="node.attrs.tex" @input="onInput"></textarea>
    <div v-else class="math-rendered" v-html="html"></div>
  </node-view-wrapper>
</template>
