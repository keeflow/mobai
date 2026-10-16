<script setup lang="ts">
defineProps<{
  status: string
  zoom: number
  characters: number
  words: number
}>()

const emit = defineEmits<{
  zoom: [value: number]
}>()
</script>

<template>
  <footer class="status-bar flex items-center justify-between border-t px-4 py-2 text-xs">
    <span>{{ status }}</span>
    <span class="flex items-center gap-2">
      <button class="tool" type="button" @click="emit('zoom', zoom - 10)">缩小</button>
      <button class="tool" type="button" @click="emit('zoom', 100)">{{ zoom }}%</button>
      <button class="tool" type="button" @click="emit('zoom', zoom + 10)">放大</button>
      <span>{{ characters }} 字 · {{ words }} 词</span>
    </span>
  </footer>
</template>
