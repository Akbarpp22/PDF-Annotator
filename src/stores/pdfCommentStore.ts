import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PdfComment, ReviewStatus } from '../types/comment'
import { getComments, saveComments } from '../services/commentService'
import { getCurrentReviewerName } from '../services/reviewerService'

type RichComment = PdfComment & {
  highlightRects?: Array<{ x: number; y: number; width: number; height: number }>
}

export const usePdfCommentStore = defineStore('pdfComment', () => {
  const comments          = ref<RichComment[]>([])
  const activeCommentId   = ref<string | null>(null)
  const currentDocumentId = ref<string | null>(null)
  const filterStatus      = ref<ReviewStatus | 'all'>('all')

  // dikelompokkan per halaman (asc), dalam halaman diurutkan terbaru dulu
  const commentsByPage = computed(() => {
    const source = filterStatus.value === 'all'
      ? comments.value
      : comments.value.filter(c => c.status === filterStatus.value)

    const map = new Map<number, RichComment[]>()
    for (const c of source) {
      if (!map.has(c.pageNumber)) map.set(c.pageNumber, [])
      map.get(c.pageNumber)!.push(c)
    }

    map.forEach(group =>
      group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    )

    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([page, items]) => ({ page, items }))
  })

  const totalComments = computed(() => comments.value.length)

  const statusCounts = computed(() => ({
    all:      comments.value.length,
    pending:  comments.value.filter(c => c.status === 'pending').length,
    approved: comments.value.filter(c => c.status === 'approved').length,
    rejected: comments.value.filter(c => c.status === 'rejected').length,
  }))

  // dipake PdfViewer buat numbering anotasi
  const sortedCommentsByNewest = computed(() =>
    [...comments.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  function commentsByDocumentId(documentId: string) {
    return comments.value.filter(c => c.documentId === documentId)
  }

  async function loadComments(documentId: string) {
    currentDocumentId.value = documentId
    const loaded = await getComments(documentId)
    // migrasi komentar lama yang belum punya status
    comments.value = (loaded as RichComment[]).map(c => ({
      ...c,
      status: c.status ?? 'pending',
      statusHistory: c.statusHistory ?? [],
    }))
    activeCommentId.value = null
  }

  async function addComment(comment: RichComment) {
    comments.value.push({ ...comment, status: 'pending', statusHistory: [] })
    await persistComments(comment.documentId)
  }

  async function deleteComment(id: string) {
    const docId = comments.value.find(c => c.id === id)?.documentId
    comments.value = comments.value.filter(c => c.id !== id)
    if (activeCommentId.value === id) activeCommentId.value = null
    if (docId) await persistComments(docId)
  }

  async function setStatus(id: string, status: ReviewStatus) {
    const comment = comments.value.find(c => c.id === id)
    if (!comment) return

    // TODO: reviewerName dari auth store pas login udah jalan
    comment.status = status
    comment.statusHistory = [
      ...(comment.statusHistory ?? []),
      { status, changedAt: new Date().toISOString(), reviewerName: getCurrentReviewerName() },
    ]
    await persistComments(comment.documentId)
  }

  function setActiveComment(id: string | null) {
    activeCommentId.value = id
  }

  function setFilterStatus(s: ReviewStatus | 'all') {
    filterStatus.value = s
  }

  async function clearCommentsByDocument(documentId: string) {
    comments.value = comments.value.filter(c => c.documentId !== documentId)
    await saveComments(documentId, [])
  }

  async function persistComments(documentId: string) {
    const forDoc = comments.value.filter(c => c.documentId === documentId)
    await saveComments(documentId, forDoc as PdfComment[])
  }

  return {
    comments,
    activeCommentId,
    currentDocumentId,
    filterStatus,
    commentsByPage,
    totalComments,
    statusCounts,
    sortedCommentsByNewest,
    commentsByDocumentId,
    loadComments,
    addComment,
    deleteComment,
    setStatus,
    setActiveComment,
    setFilterStatus,
    clearCommentsByDocument,
    persistComments,
  }
})
