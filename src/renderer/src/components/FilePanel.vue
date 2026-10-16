<script setup lang="ts">
import type { MarkdownFileEntry } from '../../../preload'
import { computed } from 'vue'
import { branchIsEmpty, buildFileTree } from '../fileTree'
import FileTree from './FileTree.vue'

const props = defineProps<{
  folder: string | null
  files: MarkdownFileEntry[]
  path: string | null
  title: string | undefined
  fileQuery: string
  collapsed: ReadonlySet<string>
}>()

const emit = defineEmits<{
  'update:fileQuery': [value: string]
  openFile: []
  openFolder: []
  openListed: [file: MarkdownFileEntry]
  toggleDir: [id: string]
}>()

const fileTree = computed(() => buildFileTree(props.files, props.fileQuery))
const filteringFiles = computed(() => props.fileQuery.trim().length > 0)
const treeEmpty = computed(() => branchIsEmpty(fileTree.value))
const orphanDocument = computed(() => Boolean(props.path) && !props.files.some((file) => file.path === props.path))
</script>

<template>
  <div class="sidebar-actions">
    <button class="sidebar-button" type="button" @click="emit('openFile')">打开文件</button>
    <button class="sidebar-button" type="button" @click="emit('openFolder')">打开文件夹</button>
  </div>
  <div v-if="files.length > 0" class="sidebar-filter">
    <input
      :value="fileQuery"
      class="asset-input"
      type="search"
      placeholder="过滤文件名"
      @input="emit('update:fileQuery', ($event.target as HTMLInputElement).value)"
      @keydown.esc="emit('update:fileQuery', '')"
    />
  </div>
  <div class="sidebar-body min-h-0 flex-1 overflow-auto">
    <div v-if="orphanDocument" class="nav-row is-current" :title="path || ''">
      <span class="block truncate">{{ title }}</span>
      <span class="block truncate text-xs muted">当前文档</span>
    </div>
    <FileTree
      v-if="!treeEmpty"
      :branch="fileTree"
      :depth="0"
      :current-path="path"
      :collapsed="collapsed"
      :filtering="filteringFiles"
      @open="emit('openListed', $event)"
      @toggle="emit('toggleDir', $event)"
    />
    <p v-if="folder && files.length === 0" class="empty-hint">这个文件夹里没有 Markdown 文件。</p>
    <p v-else-if="filteringFiles && treeEmpty" class="empty-hint">没有匹配的文件。</p>
    <p v-else-if="!folder" class="empty-hint">打开文件夹后，文件会按目录列在这里。单个文件会记在「最近」。</p>
  </div>
</template>

<style scoped>
.sidebar-actions {
  display: flex;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem 0;
}

.sidebar-actions .sidebar-button {
  flex: 1;
}
</style>
