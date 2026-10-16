<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)
const source = computed(() => String(props.node.attrs.source ?? ''))

function onInput(event: Event): void {
  props.updateAttributes({ source: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <node-view-wrapper class="front-matter">
    <textarea v-if="selected" class="html-source" rows="4" :value="source" @input="onInput"></textarea>
    <pre v-else class="html-source">{{ source || '前言' }}</pre>
  </node-view-wrapper>
</template>
