<template>
  <div
    class="comment-item"
    :class="[`status-${comment.status}`, { active: isActive }]"
    @click="$emit('click')"
  >
    <!-- Top row: type badge + page + time + delete -->
    <div class="item-top">
      <div class="item-meta">
        <span class="type-badge" :class="comment.type">
          <template v-if="comment.type === 'highlight'">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
            Highlight
          </template>
          <template v-else>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Area
          </template>
        </span>
        <!-- Page pill -->
        <span class="page-pill">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Hal. {{ comment.pageNumber }}
        </span>
      </div>
      <div class="item-top-right">
        <span class="created-time">{{ formatDateTime(comment.createdAt) }}</span>
        <button class="delete-btn" @click.stop="$emit('delete')" title="Hapus komentar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Highlight quote -->
    <div v-if="comment.type === 'highlight' && comment.selectedText" class="selected-quote">
      "{{ truncatedSelected }}"
    </div>

    <!-- Comment text -->
    <p class="comment-text">{{ comment.text }}</p>

    <!-- Status badge + history -->
    <div class="status-row">
      <span class="status-badge" :class="comment.status">
        <span class="status-dot" />
        {{ statusLabel[comment.status] }}
      </span>
      <span v-if="lastStatusEntry" class="status-time">
        {{ formatStatusTime(lastStatusEntry.changedAt) }}
      </span>
    </div>

    <!-- Review action buttons -->
    <div class="review-actions" @click.stop>
      <button
        class="action-btn approve"
        :class="{ active: comment.status === 'approved' }"
        @click="$emit('set-status', 'approved')"
        title="Approve"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Approve
      </button>
      <button
        class="action-btn pending"
        :class="{ active: comment.status === 'pending' }"
        @click="$emit('set-status', 'pending')"
        title="Pending"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Pending
      </button>
      <button
        class="action-btn reject"
        :class="{ active: comment.status === 'rejected' }"
        @click="$emit('set-status', 'rejected')"
        title="Reject"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Reject
      </button>
    </div>

    <!-- Status history (collapsible) -->
    <div v-if="comment.statusHistory && comment.statusHistory.length > 0" class="history-section">
      <button class="history-toggle" @click.stop="showHistory = !showHistory">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline :points="showHistory ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"/></svg>
        Riwayat status ({{ comment.statusHistory.length }})
      </button>
      <div v-if="showHistory" class="history-list">
        <div
          v-for="(h, i) in [...comment.statusHistory].reverse()"
          :key="i"
          class="history-entry"
        >
          <span class="history-dot" :class="h.status" />
          <div class="history-info">
            <div class="history-info-top">
              <span class="history-label">{{ statusLabel[h.status] }}</span>
              <span v-if="h.reviewerName" class="history-reviewer">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ h.reviewerName }}
              </span>
            </div>
            <span class="history-time">{{ formatStatusTime(h.changedAt) }}</span>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PdfComment, ReviewStatus } from '../types/comment'
import { formatDateTime, formatStatusTime } from '../utils/time'

const props = defineProps<{
  comment: PdfComment
  isActive: boolean
}>()

defineEmits<{
  click: []
  delete: []
  'set-status': [status: ReviewStatus]
}>()

const showHistory = ref(false)

const statusLabel: Record<ReviewStatus, string> = {
  pending:  'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const truncatedSelected = computed(() => {
  const t = props.comment.selectedText ?? ''
  return t.length > 100 ? t.slice(0, 100) + '…' : t
})

const lastStatusEntry = computed(() => {
  const h = props.comment.statusHistory
  return h && h.length > 0 ? h[h.length - 1] : null
})
</script>

<style scoped>
.comment-item {
  position: relative;
  padding: 12px 13px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.comment-item:hover { border-color: #c8b89a; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.comment-item.active {
  border-color: var(--color-active);
  background: var(--color-active-bg);
  box-shadow:
    0 0 0 2px rgba(37, 99, 235, 0.25),
    0 4px 20px rgba(37, 99, 235, 0.12);
  animation: card-active-in 0.3s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
  transform-origin: top center;
}

@keyframes card-active-in {
  0%   { transform: scaleX(0.97); opacity: 0.7; }
  100% { transform: scaleX(1);    opacity: 1;   }
}

/* Border kiri animasi grow saat aktif */
.comment-item.active::before {
  content: '';
  position: absolute;
  left: -1px; top: 0; bottom: 0;
  width: 3px;
  border-radius: 99px 0 0 99px;
  background: linear-gradient(to bottom, #2563eb, #7c3aed);
  animation: left-bar-grow 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
  transform-origin: top;
}

@keyframes left-bar-grow {
  0%   { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}

/* Left accent border per status */
.comment-item.status-approved { border-left: 3px solid #16a34a; }
.comment-item.status-rejected  { border-left: 3px solid #dc2626; }
.comment-item.status-pending   { border-left: 3px solid #d97706; }

/* Top row */
.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.item-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.item-top-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.type-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 2px 6px; border-radius: 99px;
  font-family: 'JetBrains Mono', monospace;
}
.type-badge.highlight { background: #fef9c3; color: #a16207; border: 1px solid #fde68a; }
.type-badge.area      { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

/* Page pill */
.page-pill {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 9px; font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  padding: 2px 7px; border-radius: 99px;
  letter-spacing: 0.03em; flex-shrink: 0;
  background: var(--color-bg);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.created-time {
  font-size: 10px; color: var(--color-text); opacity: 0.85;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap; flex-shrink: 0;
}

/* Highlight quote */
.selected-quote {
  font-size: 11px; font-style: italic; color: #92400e;
  background: #fefce8; border-left: 2px solid #f59e0b;
  padding: 5px 8px; border-radius: 0 4px 4px 0; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

/* Comment text */
.comment-text {
  font-size: 13px; color: var(--color-text); margin: 0; line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}

/* Status row */
.status-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 600; padding: 3px 8px;
  border-radius: 99px; text-transform: uppercase; letter-spacing: 0.04em;
}
.status-badge.pending  { background: #fef3c7; color: #92400e; }
.status-badge.approved { background: #dcfce7; color: #166534; }
.status-badge.rejected { background: #fee2e2; color: #991b1b; }

.status-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.status-badge.pending  .status-dot { background: #d97706; }
.status-badge.approved .status-dot { background: #16a34a; }
.status-badge.rejected .status-dot { background: #dc2626; }

.status-time {
  font-size: 10px; color: var(--color-text); opacity: 0.85;
  font-family: 'JetBrains Mono', monospace;
}

/* Review action buttons */
.review-actions {
  display: flex; gap: 5px;
}
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 5px 0; border-radius: 6px; border: 1px solid var(--color-border);
  background: transparent; font-size: 10px; font-weight: 600;
  font-family: 'DM Sans', sans-serif; cursor: pointer;
  transition: all 0.15s; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.action-btn:hover { opacity: 0.85; }

.action-btn.approve:hover,
.action-btn.approve.active {
  background: #dcfce7; border-color: #86efac; color: #166534;
}
.action-btn.pending:hover,
.action-btn.pending.active {
  background: #fef3c7; border-color: #fcd34d; color: #92400e;
}
.action-btn.reject:hover,
.action-btn.reject.active {
  background: #fee2e2; border-color: #fca5a5; color: #991b1b;
}

/* Status history */
.history-section { border-top: 1px dashed var(--color-border); padding-top: 6px; }
.history-toggle {
  display: flex; align-items: center; gap: 5px;
  border: none; background: none; padding: 0; cursor: pointer;
  font-size: 10px; color: var(--color-text-muted); font-family: 'DM Sans', sans-serif;
  font-weight: 500;
}
.history-toggle:hover { color: var(--color-text); }

.history-list {
  margin-top: 6px; display: flex; flex-direction: column; gap: 4px;
}
.history-entry {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 10px; color: var(--color-text-muted);
}
.history-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
}
.history-dot.pending  { background: #d97706; }
.history-dot.approved { background: #16a34a; }
.history-dot.rejected { background: #dc2626; }
.history-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.history-info-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.history-label { font-weight: 600; color: var(--color-text); }
.history-reviewer {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 9px; color: var(--color-text-muted);
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 99px; padding: 1px 6px;
}
.history-time  { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--color-text); opacity: 0.85; }

/* Delete button — inline di item-top, selalu terlihat */
.delete-btn {
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 5px; background: transparent;
  color: var(--color-border); cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.delete-btn:hover { background: #fee2e2; color: #dc2626; }
</style>
