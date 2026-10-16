<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FindOptions } from '@shared/find'

defineProps<{
  error: string
  count: number
  index: number
}>()

const emit = defineEmits<{
  search: [options: FindOptions]
  next: []
  previous: []
  replace: [text: string]
  replaceAll: [text: string]
  close: []
}>()

const form = reactive({
  query: '',
  replacement: '',
  caseSensitive: false,
  wholeWord: false,
  regex: false
})

watch(
  () => [form.query, form.caseSensitive, form.wholeWord, form.regex],
  () => emit('search', options())
)

function options(): FindOptions {
  return {
    query: form.query,
    caseSensitive: form.caseSensitive,
    wholeWord: form.wholeWord,
    regex: form.regex
  }
}

function focusQuery(): void {
  document.getElementById('find-query')?.focus()
}

defineExpose({ focusQuery, options })
</script>

<template>
  <form class="find-bar" @submit.prevent="emit('next')">
    <input id="find-query" v-model="form.query" class="find-input" type="text" placeholder="查找" />
    <input v-model="form.replacement" class="find-input" type="text" placeholder="替换为" />
    <label><input v-model="form.caseSensitive" type="checkbox" /> 区分大小写</label>
    <label><input v-model="form.wholeWord" type="checkbox" /> 整词</label>
    <label><input v-model="form.regex" type="checkbox" /> 正则</label>
    <button type="button" @click="emit('previous')">上一个</button>
    <button type="submit">下一个</button>
    <button type="button" @click="emit('replace', form.replacement)">替换</button>
    <button type="button" @click="emit('replaceAll', form.replacement)">全部替换</button>
    <span class="find-count">{{ count ? index + 1 : 0 }}/{{ count }}</span>
    <button type="button" @click="emit('close')">关闭</button>
    <p v-if="error" class="find-error">{{ error }}</p>
  </form>
</template>
