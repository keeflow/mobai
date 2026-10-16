<script setup lang="ts">
const text = defineModel<string>('text', { required: true })
const href = defineModel<string>('href', { required: true })

const emit = defineEmits<{
  submit: []
  remove: []
  cancel: []
}>()
</script>

<template>
  <form class="find-bar" @submit.prevent="emit('submit')">
    <label>文字 <input id="link-text" v-model="text" class="find-input" type="text" placeholder="显示的文字" /></label>
    <label>地址 <input id="link-href" v-model="href" class="find-input link-input" type="text" placeholder="https://" /></label>
    <button type="submit">确定</button>
    <button type="button" @click="emit('remove')">去掉链接</button>
    <button type="button" @click="emit('cancel')">取消</button>
  </form>
</template>
