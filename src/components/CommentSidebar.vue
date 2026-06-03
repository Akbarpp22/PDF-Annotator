<template>
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <h2 class="sidebar-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Review Notes
      </h2>
      <span v-if="store.totalComments > 0" class="total-count">{{ store.totalComments }}</span>
    </div>

    <!-- Filter tabs -->
    <div v-if="store.totalComments > 0" class="filter-bar">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ active: store.filterStatus === tab.key }"
        @click="store.setFilterStatus(tab.key)"
      >
        {{ tab.label }}
        <span class="tab-count" :class="tab.key">{{ store.statusCounts[tab.key] }}</span>
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="store.totalComments === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <p class="empty-title">Belum ada catatan</p>
      <p class="empty-desc">Drag area atau teks pada PDF untuk menambahkan anotasi pertama.</p>
    </div>

    <!-- Empty filter state -->
    <div v-else-if="store.commentsByPage.length === 0" class="empty-state">
      <div class="empty-icon" style="opacity:0.25">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <p class="empty-title">Tidak ada hasil</p>
      <p class="empty-desc">Tidak ada komentar dengan status "{{ currentFilterLabel }}".</p>
    </div>

    <!-- Comment list grouped by page -->
    <div v-else class="comment-list" ref="listEl">
      <template v-for="group in store.commentsByPage" :key="group.page">
        <!-- Page group header -->
        <div class="page-group-header">
          <div class="page-group-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Halaman {{ group.page }}
          </div>
          <span class="page-group-count">{{ group.items.length }} catatan</span>
        </div>

        <!-- Comments in this page -->
        <!-- index dihitung dari sortedCommentsByNewest agar sesuai dengan badge nomor di PDF -->
        <TransitionGroup name="comment-anim">
          <CommentItem
            v-for="comment in group.items"
            :key="comment.id"
            :comment="comment"
            :is-active="store.activeCommentId === comment.id"
            @click="handleCommentClick(comment.id)"
            @delete="handleDelete(comment.id)"
            @set-status="(s) => handleSetStatus(comment.id, s)"
          />
        </TransitionGroup>
      </template>
    </div>

    <!-- Toast notifications -->
    <Transition name="fade">
      <div v-if="toast.show" class="toast" :class="toast.type">
        <svg v-if="toast.type === 'deleted'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {{ toast.message }}
      </div>
    </Transition>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CommentItem from './CommentItem.vue'
import { usePdfCommentStore } from '../stores/pdfCommentStore'
import type { ReviewStatus } from '../types/comment'

defineProps<{ documentId: string }>()
const store = usePdfCommentStore()
const listEl = ref<HTMLElement | null>(null)

const filterTabs: Array<{ key: ReviewStatus | 'all'; label: string }> = [
  { key: 'all',      label: 'Semua'    },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const currentFilterLabel = computed(() =>
  filterTabs.find(t => t.key === store.filterStatus)?.label ?? ''
)

// Toast
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'deleted' | 'status' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: typeof toast.value.type) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 2200)
}

function handleCommentClick(id: string) {
  store.setActiveComment(id)
  window.dispatchEvent(new CustomEvent('scroll-to-comment', { detail: { id } }))
}

async function handleDelete(id: string) {
  await store.deleteComment(id)
  showToast('Komentar dihapus', 'deleted')
}

async function handleSetStatus(id: string, status: ReviewStatus) {
  await store.setStatus(id, status)
  const label = status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Pending'
  showToast(`Status: ${label}`, 'status')
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex; flex-direction: column;
  overflow: hidden; flex-shrink: 0; position: relative;
}

/* Header */
.sidebar-header {
  padding: 15px 16px 13px;
  border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.sidebar-title {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  margin: 0; color: var(--color-text); letter-spacing: 0.01em;
}
.total-count {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 99px; padding: 1px 8px; color: var(--color-text-muted);
}

/* Filter bar */
.filter-bar {
  display: flex; padding: 8px 10px; gap: 4px;
  border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  background: var(--color-bg);
}
.filter-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 5px 6px; border-radius: 7px; border: none; background: transparent;
  font-size: 11px; font-weight: 500; color: var(--color-text-muted);
  cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}
.filter-tab:hover  { background: white; color: var(--color-text); }
.filter-tab.active { background: white; color: var(--color-text); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

.tab-count {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
  padding: 1px 5px; border-radius: 99px; line-height: 1.4;
}
.tab-count.all      { background: #e5e7eb; color: #374151; }
.tab-count.pending  { background: #fef3c7; color: #92400e; }
.tab-count.approved { background: #dcfce7; color: #166534; }
.tab-count.rejected { background: #fee2e2; color: #991b1b; }

/* Empty state */
.empty-state {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 32px 24px; text-align: center;
  gap: 10px; color: var(--color-text-muted);
}
.empty-icon { opacity: 0.3; margin-bottom: 4px; }
.empty-title {
  font-size: 14px; font-weight: 600; color: var(--color-text);
  margin: 0; opacity: 0.5;
}
.empty-desc {
  font-size: 12px; line-height: 1.6; margin: 0; opacity: 0.6; max-width: 220px;
}

/* Comment list */
.comment-list {
  flex: 1; overflow-y: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
}

/* Page group header */
.page-group-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px 7px;
  margin-top: 6px;
  background: var(--color-text);
  border-radius: 7px;
}
.page-group-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; color: white;
  letter-spacing: 0.02em;
}
.page-group-label svg { opacity: 0.8; }
.page-group-count {
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  color: rgba(255,255,255,0.6); font-weight: 500;
}

/* Toast */
.toast {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  color: white; font-size: 12px; font-weight: 500; padding: 7px 14px;
  border-radius: 99px; display: flex; align-items: center; gap: 7px;
  white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 10;
}
.toast.deleted { background: #374151; }
.toast.status  { background: #1d4ed8; }
.toast.success { background: #15803d; }

/* Animations */
.comment-anim-enter-active, .comment-anim-leave-active { transition: all 0.2s ease; }
.comment-anim-enter-from { opacity: 0; transform: translateY(-6px); }
.comment-anim-leave-to   { opacity: 0; transform: translateX(16px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
