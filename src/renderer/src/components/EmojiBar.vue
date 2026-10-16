<script setup lang="ts">
import { searchEmoji } from '@shared/emoji'
import { computed } from 'vue'

const query = defineModel<string>('query', { required: true })

const emit = defineEmits<{
  insert: [emoji: string]
  close: []
}>()

const choices = computed(() => searchEmoji(query.value))
</script>

<template>
  <div class="find-bar">
    <input v-model="query" class="find-input" type="text" placeholder="搜索表情，例如 笑、赞、火" />
    <button v-for="emoji in choices" :key="emoji" type="button" @click="emit('insert', emoji)">{{ emoji }}</button>
    <button type="button" @click="emit('close')">关闭</button>
  </div>
</template>
