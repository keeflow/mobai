<script setup lang="ts">
import type { RecentEntry } from '@shared/recent'

defineProps<{
  recent: RecentEntry[]
  recentFolders: RecentEntry[]
  path: string | null
  folder: string | null
}>()

const emit = defineEmits<{
  openRecent: [path: string]
  openRecentFolder: [path: string]
}>()

function parentName(filePath: string): string {
  const parts = filePath.split(/[/\\]/).filter(Boolean)
  return parts.length > 1 ? (parts[parts.length - 2] ?? '') : ''
}
</script>

<template>
  <div class="sidebar-body min-h-0 flex-1 overflow-auto">
    <p class="section-label">文件</p>
    <button
      v-for="item in recent"
      :key="item.path"
      type="button"
      class="nav-row"
      :class="{ 'is-current': item.path === path }"
      :title="item.path"
      @click="emit('openRecent', item.path)"
    >
      <span class="block truncate">{{ item.name }}</span>
      <span v-if="parentName(item.path)" class="block truncate text-xs muted">{{ parentName(item.path) }}</span>
    </button>
    <p v-if="recent.length === 0" class="empty-hint">还没有最近文件。</p>
    <p class="section-label">文件夹</p>
    <button
      v-for="item in recentFolders"
      :key="item.path"
      type="button"
      class="nav-row"
      :class="{ 'is-current': item.path === folder }"
      :title="item.path"
      @click="emit('openRecentFolder', item.path)"
    >
      <span class="block truncate">{{ item.name }}</span>
    </button>
    <p v-if="recentFolders.length === 0" class="empty-hint">还没有最近文件夹。</p>
  </div>
</template>

<style scoped>
.section-label {
  margin: 0.7rem 0.5rem 0.2rem;
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}
</style>
