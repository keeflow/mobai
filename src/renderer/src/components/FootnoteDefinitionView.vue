<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

function onLabel(event: Event): void {
  props.updateAttributes({ label: (event.target as HTMLInputElement).value })
}

function onText(event: Event): void {
  props.updateAttributes({ text: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <node-view-wrapper class="footnote-def">
    <div v-if="selected" class="footnote-editor">
      <input class="math-source footnote-label" :value="node.attrs.label" @input="onLabel" />
      <textarea class="math-source" rows="3" :value="node.attrs.text" @input="onText"></textarea>
    </div>
    <p v-else><sup>[{{ node.attrs.label }}]</sup> {{ node.attrs.text }}</p>
  </node-view-wrapper>
</template>
