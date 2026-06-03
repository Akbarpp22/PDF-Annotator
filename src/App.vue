<template>
  <div class="app-shell">
    <AppHeader
      :title="document?.title ?? 'Loading…'"
      :comment-count="commentStore.totalComments"
      :is-sidebar-open="isSidebarOpen"
      @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
    />

    <div class="app-body">
      <!-- Loading state -->
      <div v-if="loadingDoc" class="state-screen">
        <div class="state-inner">
          <div class="spinner" />
          <p class="state-label">Loading document…</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="docError" class="state-screen">
        <div class="state-inner error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p class="state-label">{{ docError }}</p>
          <button class="btn-primary" @click="loadDocument">Retry</button>
        </div>
      </div>

      <!-- Main content -->
      <template v-else-if="document">
        <PdfViewer
          :pdf-url="document.pdfUrl"
          :document-id="document.documentId"
          :class="{ 'sidebar-open': isSidebarOpen }"
        />

        <Transition name="slide-sidebar">
          <CommentSidebar
            v-if="isSidebarOpen"
            :document-id="document.documentId"
          />
        </Transition>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import PdfViewer from './components/PdfViewer.vue'
import CommentSidebar from './components/CommentSidebar.vue'
import { getDocumentById } from './services/documentService'
import { usePdfCommentStore } from './stores/pdfCommentStore'
import type { PdfDocument } from './types/document'

const commentStore = usePdfCommentStore()

const document = ref<PdfDocument | null>(null)
const loadingDoc = ref(true)
const docError = ref<string | null>(null)
const isSidebarOpen = ref(true)

async function loadDocument() {
  loadingDoc.value = true
  docError.value = null
  try {
    const doc = await getDocumentById('aceh-001')
    document.value = doc
    await commentStore.loadComments(doc.documentId)
  } catch (e) {
    docError.value = e instanceof Error ? e.message : 'Failed to load document'
  } finally {
    loadingDoc.value = false
  }
}

onMounted(() => {
  loadDocument()
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.state-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--color-text-muted);
}

.state-inner.error {
  color: #dc2626;
}

.state-label {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-primary {
  padding: 8px 20px;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}

.slide-sidebar-enter-active,
.slide-sidebar-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-sidebar-enter-from,
.slide-sidebar-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
