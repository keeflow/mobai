<script setup lang="ts">
import ToolGroup from './ToolGroup.vue'
import ToolIcon from './ToolIcon.vue'

defineProps<{
  sidebarOpen: boolean
  title: string | undefined
  editing: 'write' | 'source'
  focusMode: boolean
  typewriter: boolean
  linkOpen: boolean
  emojiOpen: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
  openFind: []
  toggleSource: []
  undo: []
  redo: []
  save: []
  bold: []
  italic: []
  strike: []
  highlight: []
  heading: []
  bulletList: []
  taskList: []
  blockquote: []
  codeBlock: []
  horizontalRule: []
  toggleFocus: []
  toggleTypewriter: []
  link: []
  image: []
  table: []
  html: []
  math: []
  mathBlock: []
  diagram: []
  footnote: []
  toggleEmoji: []
  copyHtml: []
  exportDocx: []
  exportEpub: []
  exportLatex: []
  print: []
}>()
</script>

<template>
  <header class="toolbar border-b px-3 py-2">
    <div class="toolbar-head">
      <div class="flex min-w-0 items-center gap-2">
        <button v-if="!sidebarOpen" class="tool icon-tool" type="button" title="展开侧栏" aria-label="展开侧栏" @click="emit('toggleSidebar')">
          <ToolIcon name="sidebar-expand" />
        </button>
        <div class="min-w-0 truncate text-sm muted">{{ title }}</div>
      </div>
      <ToolGroup label="文档">
        <button class="tool" type="button" @click="emit('openFind')"><ToolIcon name="search" />查找</button>
        <button class="tool" type="button" @click="emit('toggleSource')">
          <ToolIcon :name="editing === 'source' ? 'preview' : 'source'" />
          {{ editing === 'source' ? '预览' : '源码' }}
        </button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('undo')"><ToolIcon name="undo" />撤销</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('redo')"><ToolIcon name="redo" />重做</button>
        <button class="tool" type="button" @click="emit('save')"><ToolIcon name="save" />保存</button>
      </ToolGroup>
    </div>
    <div class="tool-groups">
      <ToolGroup label="格式">
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('bold')"><ToolIcon name="bold" />加粗</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('italic')"><ToolIcon name="italic" />斜体</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('strike')"><ToolIcon name="strike" />删除线</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('highlight')"><ToolIcon name="highlight" />高亮</button>
      </ToolGroup>
      <ToolGroup label="结构">
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('heading')"><ToolIcon name="heading" />标题</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('bulletList')"><ToolIcon name="list" />列表</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('taskList')"><ToolIcon name="task" />待办</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('blockquote')"><ToolIcon name="quote" />引用</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('codeBlock')"><ToolIcon name="code" />代码</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('horizontalRule')"><ToolIcon name="rule" />分隔线</button>
      </ToolGroup>
      <ToolGroup label="视图">
        <button class="tool" type="button" :class="{ selected: focusMode }" @click="emit('toggleFocus')"><ToolIcon name="focus" />聚焦</button>
        <button class="tool" type="button" :class="{ selected: typewriter }" @click="emit('toggleTypewriter')"><ToolIcon name="typewriter" />打字机</button>
      </ToolGroup>
      <ToolGroup label="插入">
        <button class="tool" type="button" :class="{ selected: linkOpen }" :disabled="editing !== 'write'" @click="emit('link')">
          <ToolIcon name="link" />链接
        </button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('image')"><ToolIcon name="image" />图片</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('table')"><ToolIcon name="table" />表格</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('html')"><ToolIcon name="html" />HTML</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('math')"><ToolIcon name="math" />公式</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('mathBlock')"><ToolIcon name="math-block" />公式块</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('diagram')"><ToolIcon name="diagram" />图</button>
        <button class="tool" type="button" :disabled="editing !== 'write'" @click="emit('footnote')"><ToolIcon name="footnote" />脚注</button>
        <button class="tool" type="button" :class="{ selected: emojiOpen }" :disabled="editing !== 'write'" @click="emit('toggleEmoji')">
          <ToolIcon name="emoji" />表情
        </button>
      </ToolGroup>
      <ToolGroup label="导出">
        <button class="tool" type="button" @click="emit('copyHtml')"><ToolIcon name="copy" />复制 HTML</button>
        <button class="tool" type="button" @click="emit('exportDocx')"><ToolIcon name="word" />Word</button>
        <button class="tool" type="button" @click="emit('exportEpub')"><ToolIcon name="epub" />EPUB</button>
        <button class="tool" type="button" @click="emit('exportLatex')"><ToolIcon name="latex" />LaTeX</button>
        <button class="tool" type="button" @click="emit('print')"><ToolIcon name="print" />打印</button>
      </ToolGroup>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.toolbar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.tool-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.4rem;
}

.icon-tool {
  padding: 0.32rem;
}
</style>
