import type { PdfComment } from '../types/comment'

function key(documentId: string): string {
  return `pdf-comments:${documentId}`
}

// semua masih localStorage, nanti ganti ke API call
export async function getComments(documentId: string): Promise<PdfComment[]> {
  const raw = localStorage.getItem(key(documentId))
  if (!raw) return []
  try {
    return JSON.parse(raw) as PdfComment[]
  } catch {
    return []
  }
}

export async function saveComments(documentId: string, comments: PdfComment[]): Promise<void> {
  localStorage.setItem(key(documentId), JSON.stringify(comments))
}

export async function createComment(comment: PdfComment): Promise<PdfComment> {
  const existing = await getComments(comment.documentId)
  await saveComments(comment.documentId, [...existing, comment])
  return comment
}

export async function deleteComment(documentId: string, commentId: string): Promise<void> {
  const existing = await getComments(documentId)
  await saveComments(documentId, existing.filter(c => c.id !== commentId))
}
