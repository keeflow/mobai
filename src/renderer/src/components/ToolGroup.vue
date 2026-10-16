<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <section class="tool-group" :aria-label="label">
    <span class="tool-group-label">{{ label }}</span>
    <div class="tool-group-actions">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.tool-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.12rem 0.28rem 0.12rem 0;
  border: 1px solid var(--line);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--panel) 62%, transparent);
}

.tool-group-label {
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 0.55rem;
  border-right: 1px solid var(--line);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--muted);
  white-space: nowrap;
}

.tool-group-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.05rem;
  min-width: 0;
}
</style>
