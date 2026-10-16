<script setup lang="ts">
const rows = defineModel<number>('rows', { required: true })
const cols = defineModel<number>('cols', { required: true })

const emit = defineEmits<{
  insert: []
  align: [align: 'left' | 'center' | 'right']
  addRow: []
  removeRow: []
  close: []
}>()
</script>

<template>
  <div class="find-bar">
    <label>行 <input v-model.number="rows" class="count-input" type="number" min="1" max="12" /></label>
    <label>列 <input v-model.number="cols" class="count-input" type="number" min="1" max="8" /></label>
    <button type="button" @click="emit('insert')">插入</button>
    <button type="button" @click="emit('align', 'left')">左对齐</button>
    <button type="button" @click="emit('align', 'center')">居中</button>
    <button type="button" @click="emit('align', 'right')">右对齐</button>
    <button type="button" @click="emit('addRow')">加一行</button>
    <button type="button" @click="emit('removeRow')">删除行</button>
    <button type="button" @click="emit('close')">关闭</button>
  </div>
</template>
