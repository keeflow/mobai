<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

function onInput(event: Event): void {
  props.updateAttributes({ label: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <node-view-wrapper as="span" class="footnote-ref">
    <input v-if="selected" class="math-source footnote-label" :value="node.attrs.label" @input="onInput" />
    <sup v-else>[{{ node.attrs.label }}]</sup>
  </node-view-wrapper>
</template>
