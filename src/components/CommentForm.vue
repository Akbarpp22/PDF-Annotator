<template>
  <Transition name="slide-up">
    <div v-if="visible" class="comment-form-card" :style="cardStyle">
      <div class="form-header">
        <span class="form-label">Add note</span>
        <span class="page-chip">Page {{ pageNumber }}</span>
      </div>

      <!-- Preview teks yang di-highlight -->
      <div v-if="selectedText" class="highlight-preview">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
        <span class="highlight-text">"{{ truncatedSelectedText }}"</span>
      </div>

      <textarea
        ref="textareaRef"
        v-model="text"
        class="form-textarea"
        :placeholder="selectedText ? 'Add a note on this highlight…' : 'Write your comment…'"
        rows="3"
        @keydown.enter.ctrl="handleSave"
        @keydown.esc="handleCancel"
      />
      <div class="form-hint">Ctrl+↵ to save · Esc to cancel</div>
      <div class="form-actions">
        <button class="btn-cancel" @click="handleCancel">Cancel</button>
        <button class="btn-save" @click="handleSave" :disabled="!text.trim()">
          Save note
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  pageNumber: number
  anchorX: number
  anchorY: number
  anchorWidth: number
  anchorHeight: number
  selectedText?: string
}>()

const emit = defineEmits<{
  save: [text: string]
  cancel: []
}>()

const text = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const CARD_WIDTH = 300
const CARD_HEIGHT_BASE = 185
const CARD_HEIGHT_WITH_PREVIEW = 220

const truncatedSelectedText = computed(() => {
  if (!props.selectedText) return ''
  return props.selectedText.length > 120
    ? props.selectedText.slice(0, 120) + '…'
    : props.selectedText
})

const cardStyle = computed(() => {
  const cardH = props.selectedText ? CARD_HEIGHT_WITH_PREVIEW : CARD_HEIGHT_BASE
  let left = props.anchorX
  let top = props.anchorY + props.anchorHeight + 10

  const vw = window.innerWidth
  if (left + CARD_WIDTH > vw - 16) left = vw - CARD_WIDTH - 16
  if (left < 16) left = 16

  const vh = window.innerHeight
  if (top + cardH > vh - 16) top = props.anchorY - cardH - 10

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${CARD_WIDTH}px`,
  }
})

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      text.value = ''
      await nextTick()
      textareaRef.value?.focus()
    }
  }
)

function handleSave() {
  if (!text.value.trim()) return
  emit('save', text.value.trim())
  text.value = ''
}

function handleCancel() {
  text.value = ''
  emit('cancel')
}
</script>

<style scoped>
.comment-form-card {
  position: fixed;
  z-index: 200;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.page-chip {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 99px;
  padding: 1px 8px;
}

/* Preview teks highlight */
.highlight-preview {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-left: 3px solid #f59e0b;
  border-radius: 6px;
  padding: 7px 9px;
  color: #92400e;
  font-size: 11px;
}

.highlight-preview svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #f59e0b;
}

.highlight-text {
  line-height: 1.5;
  font-style: italic;
  word-break: break-word;
}

.form-textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  padding: 8px 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-bg);
  resize: none;
  outline: none;
  transition: border-color 0.15s;
  line-height: 1.5;
}

.form-textarea:focus {
  border-color: var(--color-active);
  background: white;
}

.form-textarea::placeholder {
  color: var(--color-text-muted);
  opacity: 0.6;
}

.form-hint {
  font-size: 10px;
  color: var(--color-text-muted);
  opacity: 0.7;
  font-family: 'JetBrains Mono', monospace;
  margin-top: -4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.btn-save {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: var(--color-text);
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-save:hover:not(:disabled) {
  background: #211c18;
}

.btn-save:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
