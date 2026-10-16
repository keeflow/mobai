<script setup lang="ts">
import type { RecentEntry } from '@shared/recent'
import { computed, ref } from 'vue'
import type { MarkdownFileEntry } from '../../../preload'

const props = defineProps<{
  files: MarkdownFileEntry[]
  recent: RecentEntry[]
}>()

const emit = defineEmits<{
  choose: [path: string]
}>()

const visible = ref(false)
const query = ref('')
const hits = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const files = props.files.map((file) => ({ path: file.path, name: file.relativePath }))
  const recent = props.recent
    .filter((item) => !files.some((file) => file.path === item.path))
    .map((item) => ({ path: item.path, name: item.name }))
  return [...files, ...recent].filter((item) => !needle || item.name.toLocaleLowerCase().includes(needle)).slice(0, 20)
})

function show(): void {
  visible.value = true
  query.value = ''
  requestAnimationFrame(() => document.getElementById('quick-query')?.focus())
}

function choose(path: string): void {
  visible.value = false
  emit('choose', path)
}

defineExpose({ show })
</script>

<template>
  <form v-if="visible" class="quick-open" @submit.prevent="hits[0] && choose(hits[0].path)">
    <input id="quick-query" v-model="query" class="asset-input" type="text" placeholder="快速打开文件" />
    <button
      v-for="item in hits"
      :key="item.path"
      type="button"
      class="mt-1 block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/70"
      @click="choose(item.path)"
    >
      {{ item.name }}
    </button>
    <button class="sidebar-button mt-2" type="button" @click="visible = false">关闭</button>
  </form>
</template>
