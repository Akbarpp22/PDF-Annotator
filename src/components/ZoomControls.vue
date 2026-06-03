<template>
  <div class="zoom-controls">
    <button class="zoom-btn" @click="$emit('zoom-out')" title="Zoom out" :disabled="scale <= 0.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button class="zoom-value" @click="$emit('zoom-reset')" title="Reset zoom">
      {{ Math.round(scale * 100) }}%
    </button>
    <button class="zoom-btn" @click="$emit('zoom-in')" title="Zoom in" :disabled="scale >= 3">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ scale: number }>()
defineEmits<{
  'zoom-in': []
  'zoom-out': []
  'zoom-reset': []
}>()
</script>

<style scoped>
.zoom-controls {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.zoom-btn:hover:not(:disabled) {
  background: var(--color-bg);
  color: var(--color-text);
}

.zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-value {
  border: none;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  background: transparent;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-muted);
  padding: 0 8px;
  height: 32px;
  cursor: pointer;
  min-width: 46px;
  transition: background 0.1s;
}

.zoom-value:hover {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>
