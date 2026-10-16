<script setup lang="ts">
import type { FolderHit } from '@shared/folderSearch'

defineProps<{
  folder: string | null
  query: string
  hits: FolderHit[]
  searched: boolean
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:caseSensitive': [value: boolean]
  'update:wholeWord': [value: boolean]
  'update:regex': [value: boolean]
  search: []
  open: [hit: FolderHit]
}>()
</script>

<template>
  <form class="sidebar-filter" @submit.prevent="emit('search')">
    <input
      id="folder-query"
      :value="query"
      class="asset-input"
      type="search"
      placeholder="在文件夹中查找"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    />
    <div class="chip-row">
      <button
        class="chip"
        type="button"
        title="区分大小写"
        :aria-pressed="caseSensitive"
        :class="{ active: caseSensitive }"
        @click="emit('update:caseSensitive', !caseSensitive)"
      >
        大小写
      </button>
      <button
        class="chip"
        type="button"
        title="整词匹配"
        :aria-pressed="wholeWord"
        :class="{ active: wholeWord }"
        @click="emit('update:wholeWord', !wholeWord)"
      >
        整词
      </button>
      <button class="chip" type="button" title="使用正则表达式" :aria-pressed="regex" :class="{ active: regex }" @click="emit('update:regex', !regex)">
        正则
      </button>
      <button class="chip search-go" type="submit">查找</button>
    </div>
  </form>
  <div class="sidebar-body min-h-0 flex-1 overflow-auto">
    <button
      v-for="hit in hits"
      :key="`${hit.path}:${hit.line}`"
      type="button"
      class="nav-row search-hit"
      :title="hit.path"
      @click="emit('open', hit)"
    >
      <span class="block truncate text-xs muted">{{ hit.relativePath }}:{{ hit.line }}</span>
      <span class="block truncate">{{ hit.text }}</span>
    </button>
    <p v-if="hits.length === 0" class="empty-hint">
      {{ searched ? '没有匹配的内容。' : folder ? '输入文字后按回车查找。' : '先打开一个文件夹。' }}
    </p>
  </div>
</template>

<style scoped>
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.45rem;
}

.chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  padding: 0.12rem 0.5rem;
  font-size: 0.72rem;
}

.chip.active,
.chip.search-go {
  color: var(--ink);
  border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
  background: color-mix(in srgb, var(--accent) 14%, var(--panel));
}
</style>
