<script setup lang="ts">
defineProps<{
  name:
    | 'bold'
    | 'italic'
    | 'strike'
    | 'highlight'
    | 'rule'
    | 'emoji'
    | 'heading'
    | 'list'
    | 'task'
    | 'quote'
    | 'code'
    | 'table'
    | 'html'
    | 'link'
    | 'image'
    | 'math'
    | 'math-block'
    | 'diagram'
    | 'footnote'
    | 'focus'
    | 'typewriter'
    | 'copy'
    | 'word'
    | 'epub'
    | 'latex'
    | 'print'
    | 'search'
    | 'source'
    | 'preview'
    | 'undo'
    | 'redo'
    | 'save'
    | 'sidebar-collapse'
    | 'sidebar-expand'
    | 'sun'
    | 'moon'
    | 'display'
    | 'settings'
    | 'close'
}>()
</script>

<template>
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <text v-if="name === 'bold'" class="glyph" x="8" y="12">B</text>
    <text v-else-if="name === 'italic'" class="glyph italic" x="8" y="12">I</text>
    <g v-else-if="name === 'strike'">
      <text class="glyph" x="8" y="12">S</text>
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
    </g>
    <g v-else-if="name === 'highlight'">
      <path d="M3.2 11.2 8.6 3.4l2.8 1.8-5.4 7.8H3.2z" />
      <line x1="2.5" y1="13.4" x2="13.5" y2="13.4" />
    </g>
    <line v-else-if="name === 'rule'" x1="2" y1="8" x2="14" y2="8" />
    <g v-else-if="name === 'emoji'">
      <circle cx="8" cy="8" r="5.4" />
      <circle class="dot" cx="6" cy="6.8" r="0.7" />
      <circle class="dot" cx="10" cy="6.8" r="0.7" />
      <path d="M5.7 9.4c.6 1.3 1.6 1.9 2.3 1.9s1.7-.6 2.3-1.9" />
    </g>
    <text v-else-if="name === 'heading'" class="glyph" x="8" y="12">H</text>
    <g v-else-if="name === 'list'">
      <circle class="dot" cx="3.2" cy="4" r="0.85" />
      <circle class="dot" cx="3.2" cy="8" r="0.85" />
      <circle class="dot" cx="3.2" cy="12" r="0.85" />
      <line x1="6" y1="4" x2="13.4" y2="4" />
      <line x1="6" y1="8" x2="13.4" y2="8" />
      <line x1="6" y1="12" x2="13.4" y2="12" />
    </g>
    <g v-else-if="name === 'task'">
      <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.6" />
      <path d="M4.6 8.1 6.7 10.2 11.4 5.6" />
    </g>
    <g v-else-if="name === 'quote'">
      <path d="M6.2 5.2c-1.8.2-3 1.5-3 3.2V12h3.4V8.6H5" />
      <path d="M12.4 5.2c-1.8.2-3 1.5-3 3.2V12h3.4V8.6h-1.6" />
    </g>
    <g v-else-if="name === 'code'">
      <path d="M6 4 2.6 8 6 12" />
      <path d="M10 4 13.4 8 10 12" />
    </g>
    <g v-else-if="name === 'table'">
      <rect x="2" y="2.4" width="12" height="11.2" rx="1.2" />
      <line x1="2" y1="6.2" x2="14" y2="6.2" />
      <line x1="6.8" y1="2.4" x2="6.8" y2="13.6" />
      <line x1="11" y1="6.2" x2="11" y2="13.6" />
    </g>
    <text v-else-if="name === 'html'" class="code-mark" x="8" y="11">&lt;/&gt;</text>
    <g v-else-if="name === 'link'">
      <path d="M6.8 9.2 5.4 10.6a2.2 2.2 0 0 1-3.1-3.1L3.7 6.1" />
      <path d="M9.2 6.8 10.6 5.4a2.2 2.2 0 0 1 3.1 3.1L12.3 9.9" />
      <line x1="6.4" y1="9.6" x2="9.6" y2="6.4" />
    </g>
    <g v-else-if="name === 'image'">
      <rect x="2" y="3" width="12" height="10" rx="1.3" />
      <circle class="dot" cx="5.4" cy="6.1" r="0.9" />
      <path d="m2.6 11.2 3.1-2.8 2.1 1.8 1.8-1.4 3.8 2.6" />
    </g>
    <text v-else-if="name === 'math'" class="glyph" x="8" y="12">Σ</text>
    <g v-else-if="name === 'math-block'">
      <rect x="1.8" y="2.2" width="12.4" height="11.6" rx="1.3" />
      <text class="glyph small" x="8" y="11.2">Σ</text>
    </g>
    <g v-else-if="name === 'diagram'">
      <rect x="1.6" y="2" width="4.6" height="3.2" rx="0.6" />
      <rect x="9.8" y="2" width="4.6" height="3.2" rx="0.6" />
      <rect x="5.7" y="10.6" width="4.6" height="3.2" rx="0.6" />
      <path d="M6.2 3.6h3.6M8 5.2v5.4" />
    </g>
    <g v-else-if="name === 'footnote'">
      <text class="glyph" x="6.2" y="12.2">1</text>
      <path d="m10.2 3.2 1.6 1.6M10.2 4.8l1.6-1.6" />
    </g>
    <g v-else-if="name === 'focus'">
      <circle cx="8" cy="8" r="2.7" />
      <circle class="dot" cx="8" cy="8" r="0.7" />
      <line x1="8" y1="1.6" x2="8" y2="3.6" />
      <line x1="8" y1="12.4" x2="8" y2="14.4" />
      <line x1="1.6" y1="8" x2="3.6" y2="8" />
      <line x1="12.4" y1="8" x2="14.4" y2="8" />
    </g>
    <g v-else-if="name === 'typewriter'">
      <rect x="1.6" y="5" width="12.8" height="7.2" rx="1.2" />
      <line x1="3.8" y1="7.4" x2="12.2" y2="7.4" />
      <line x1="3.8" y1="9.8" x2="9.6" y2="9.8" />
    </g>
    <g v-else-if="name === 'copy'">
      <rect x="5.2" y="2.2" width="8" height="9.2" rx="1.1" />
      <path d="M10.2 13.6H3.2a1 1 0 0 1-1-1V5.4" />
    </g>
    <g v-else-if="name === 'word'">
      <path d="M3.2 2.4h7.2l2.4 2.4v9H3.2z" />
      <text class="glyph small" x="7.2" y="11.4">W</text>
    </g>
    <g v-else-if="name === 'epub'">
      <path d="M3 3.2h4.8A2.2 2.2 0 0 1 10 5.4V13H5.2A2.2 2.2 0 0 0 3 15.2z" />
      <path d="M13 3.2H8.2A2.2 2.2 0 0 0 6 5.4" />
      <path d="M8 3.2V13" />
    </g>
    <g v-else-if="name === 'latex'">
      <path d="M3.2 2.4h7.2l2.4 2.4v9H3.2z" />
      <text class="code-mark" x="7.4" y="11.2">TeX</text>
    </g>
    <g v-else-if="name === 'print'">
      <path d="M4.2 6.2V2.6h7.6v3.6" />
      <rect x="2.2" y="6.2" width="11.6" height="5.2" rx="1.1" />
      <path d="M4.6 9.2h6.8V13.6H4.6z" />
    </g>
    <g v-else-if="name === 'search'">
      <circle cx="7" cy="7" r="3.5" />
      <line x1="9.6" y1="9.6" x2="13.4" y2="13.4" />
    </g>
    <g v-else-if="name === 'source'">
      <path d="M6.2 3.8 2.8 8l3.4 4.2" />
      <path d="M9.8 3.8 13.2 8 9.8 12.2" />
    </g>
    <g v-else-if="name === 'preview'">
      <path d="M1.6 8s2.3-3.8 6.4-3.8S14.4 8 14.4 8 12.1 11.8 8 11.8 1.6 8 1.6 8z" />
      <circle cx="8" cy="8" r="1.6" />
    </g>
    <g v-else-if="name === 'undo'">
      <path d="M4.2 6.4h5.6a2.8 2.8 0 1 1 0 5.6H8" />
      <path d="M6.2 4.1 3.6 6.4l2.6 2.3" />
    </g>
    <g v-else-if="name === 'redo'">
      <path d="M11.8 6.4H6.2a2.8 2.8 0 1 0 0 5.6H8" />
      <path d="m9.8 4.1 2.6 2.3-2.6 2.3" />
    </g>
    <g v-else-if="name === 'save'">
      <path d="M3 2.4h7.4L13.2 5v8.6H3z" />
      <path d="M5.2 2.4V6h5.2" />
      <path d="M5.4 9.2h5.2v4.4H5.4z" />
    </g>
    <g v-else-if="name === 'sidebar-collapse'">
      <rect x="1.8" y="2.4" width="4" height="11.2" rx="0.5" />
      <path d="M13.4 5.3 10.2 8l3.2 2.7" />
    </g>
    <g v-else-if="name === 'sidebar-expand'">
      <rect x="1.8" y="2.4" width="4" height="11.2" rx="0.5" />
      <path d="M9.2 5.3 12.4 8 9.2 10.7" />
    </g>
    <g v-else-if="name === 'sun'">
      <circle cx="8" cy="8" r="2.3" />
      <path d="M8 2.1v1.7M8 12.2v1.7M2.1 8h1.7M12.2 8h1.7M3.9 3.9l1.2 1.2M10.9 10.9l1.2 1.2M12.1 3.9l-1.2 1.2M5.1 10.9l-1.2 1.2" />
    </g>
    <g v-else-if="name === 'moon'">
      <path d="M9.8 2.4a4.8 4.8 0 1 0 3.6 8.1 3.9 3.9 0 0 1-3.6-8.1z" />
    </g>
    <g v-else-if="name === 'display'">
      <rect x="2.2" y="2.6" width="11.6" height="8" rx="0.8" />
      <path d="M6.2 13.4h3.6M8 10.6v2.8" />
    </g>
    <g v-else-if="name === 'settings'" class="gear">
      <path
        fill-rule="evenodd"
        d="M6.45 1.15h3.1l.38 1.48c.42.14.81.36 1.15.64l1.38-.62 1.55 2.68-1.12 1.05c.1.4.16.82.16 1.24s-.06.84-.16 1.24l1.12 1.05-1.55 2.68-1.38-.62c-.34.28-.73.5-1.15.64l-.38 1.48h-3.1l-.38-1.48a4.2 4.2 0 0 1-1.15-.64l-1.38.62-1.55-2.68 1.12-1.05A4.7 4.7 0 0 1 3.9 8c0-.42.06-.84.16-1.24L2.94 5.71l1.55-2.68 1.38.62c.34-.28.73-.5 1.15-.64zm1.55 4.2a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3z"
      />
    </g>
    <path v-else-if="name === 'close'" d="M4 4 12 12M12 4 4 12" />
  </svg>
</template>

<style scoped>
svg {
  width: 0.95rem;
  height: 0.95rem;
  flex: none;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.glyph,
.code-mark {
  fill: currentColor;
  stroke: none;
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
}

.glyph.italic {
  font-style: italic;
  font-family: Palatino, 'Songti SC', serif;
}

.glyph.small {
  font-size: 8px;
}

.code-mark {
  font-size: 6.5px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-weight: 600;
}

.dot {
  fill: currentColor;
  stroke: none;
}

.gear path {
  fill: currentColor;
  stroke: none;
}
</style>
