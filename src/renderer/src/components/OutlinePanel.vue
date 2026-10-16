<script setup lang="ts">
import type { OutlineHeading } from '@shared/outline'
import { computed } from 'vue'

const props = defineProps<{
  headings: OutlineHeading[]
  outlineIndex: number
  query: string
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  show: [index: number]
}>()

const visibleHeadings = computed(() => {
  const needle = props.query.trim().toLocaleLowerCase()
  return props.headings.filter((item) => !needle || item.text.toLocaleLowerCase().includes(needle))
})
</script>

<template>
  <div class="sidebar-filter">
    <input
      :value="query"
      class="asset-input"
      type="search"
      placeholder="过滤大纲"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      @keydown.esc="emit('update:query', '')"
    />
  </div>
  <div class="sidebar-body min-h-0 flex-1 overflow-auto">
    <button
      v-for="item in visibleHeadings"
      :key="`${item.line}-${item.text}`"
      type="button"
      class="nav-row"
      :data-outline="item.index"
      :class="{ 'is-current': item.index === outlineIndex }"
      :style="{ paddingLeft: `${0.55 + (item.level - 1) * 0.8}rem` }"
      @click="emit('show', item.index)"
    >
      {{ item.text }}
    </button>
    <p v-if="visibleHeadings.length === 0" class="empty-hint">
      {{ query.trim() ? '没有匹配的标题。' : '这篇还没有标题。' }}
    </p>
  </div>
</template>
