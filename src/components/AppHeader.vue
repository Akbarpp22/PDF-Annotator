<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="8" y1="13" x2="16" y2="13"/>
          <line x1="8" y1="17" x2="12" y2="17"/>
        </svg>
      </div>
      <span class="app-name">Annotate</span>
      <span class="divider">·</span>
      <span class="doc-title">{{ title }}</span>
    </div>

    <div class="header-right">
      <div v-if="commentCount > 0" class="comment-badge">
        {{ commentCount }} {{ commentCount === 1 ? 'note' : 'notes' }}
      </div>
      <button class="sidebar-toggle" :class="{ active: isSidebarOpen }" @click="$emit('toggle-sidebar')" :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        <span>Comments</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  commentCount: number
  isSidebarOpen: boolean
}>()

defineEmits<{
  'toggle-sidebar': []
}>()
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 16px;
  flex-shrink: 0;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.logo {
  color: var(--color-accent);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.app-name {
  font-family: 'Fraunces', serif;
  font-size: 16px;
  font-weight: 300;
  color: var(--color-text);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.divider {
  color: var(--color-border);
  flex-shrink: 0;
}

.doc-title {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.comment-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 99px;
  padding: 2px 10px;
  font-family: 'JetBrains Mono', monospace;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-toggle:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.sidebar-toggle.active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: white;
}
</style>
