export type AnnotationType = 'area' | 'highlight'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface StatusHistory {
  status: ReviewStatus
  changedAt: string
  reviewerName: string
  // ganti pas backend auth udah ready:
  // reviewerName: authStore.currentUser?.name ?? 'Unknown'
}

export interface PdfComment {
  id: string
  documentId: string
  pageNumber: number
  type: AnnotationType
  x: number
  y: number
  width: number
  height: number
  text: string
  selectedText?: string
  highlightRects?: Array<{ x: number; y: number; width: number; height: number }>
  status: ReviewStatus
  statusHistory: StatusHistory[]
  createdAt: string
}

export interface SelectionRect {
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
}

export interface HighlightRange {
  pageNumber: number
  selectedText: string
  x: number
  y: number
  width: number
  height: number
  rects: Array<{ x: number; y: number; width: number; height: number }>
  domRange: Range
}
