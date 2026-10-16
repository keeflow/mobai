<script setup lang="ts">
import type { FileBranch, TreeFile } from '../fileTree'

defineProps<{
  branch: FileBranch
  depth: number
  currentPath: string | null
  collapsed: ReadonlySet<string>
  filtering: boolean
}>()

const emit = defineEmits<{
  open: [file: TreeFile]
  toggle: [id: string]
}>()

function pad(depth: number, extra = 0): string {
  return `${0.4 + Math.min(depth, 8) * 0.85 + extra}rem`
}

function openFolder(collapsed: ReadonlySet<string>, filtering: boolean, id: string): boolean {
  return filtering || !collapsed.has(id)
}
</script>

<template>
  <template v-for="folder in branch.folders" :key="folder.id">
    <button
      type="button"
      class="tree-row"
      :style="{ paddingLeft: pad(depth) }"
      :aria-expanded="openFolder(collapsed, filtering, folder.id)"
      @click="emit('toggle', folder.id)"
    >
      <span class="chevron" :data-open="openFolder(collapsed, filtering, folder.id) ? 'yes' : 'no'" aria-hidden="true" />
      <span class="truncate">{{ folder.name }}</span>
    </button>
    <FileTree
      v-if="openFolder(collapsed, filtering, folder.id)"
      :branch="folder"
      :depth="depth + 1"
      :current-path="currentPath"
      :collapsed="collapsed"
      :filtering="filtering"
      @open="emit('open', $event)"
      @toggle="emit('toggle', $event)"
    />
  </template>
  <button
    v-for="file in branch.files"
    :key="file.path"
    type="button"
    class="tree-row file-row"
    :class="{ 'is-current': file.path === currentPath }"
    :data-current="file.path === currentPath ? 'yes' : 'no'"
    :style="{ paddingLeft: pad(depth, 1.05) }"
    :title="file.relativePath"
    @click="emit('open', file)"
  >
    <span class="truncate">{{ file.name }}</span>
  </button>
</template>

<style scoped>
.tree-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.4rem;
  padding-top: 0.32rem;
  padding-bottom: 0.32rem;
  padding-right: 0.45rem;
  text-align: left;
  font-size: 0.78rem;
  color: var(--tool);
}

.file-row {
  font-size: 0.82rem;
  color: var(--ink);
}

.tree-row:hover {
  background: var(--hover);
}

.tree-row.is-current {
  background: var(--panel);
  font-weight: 600;
  box-shadow: inset 2px 0 0 var(--accent);
}

.chevron {
  width: 0.38rem;
  height: 0.38rem;
  flex-shrink: 0;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  opacity: 0.7;
}

.chevron[data-open='yes'] {
  transform: rotate(45deg);
}

.tree-row:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  outline-offset: 1px;
}
</style>
