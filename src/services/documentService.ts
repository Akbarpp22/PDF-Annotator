import type { PdfDocument } from '../types/document'

// mock dulu, nanti tinggal ganti fetch ke /api/documents/:id
const MOCK_DOCUMENTS: Record<string, PdfDocument> = {
  'aceh-001': {
    documentId: 'aceh-001',
    title: 'ACEH PDF Document',
    pdfUrl: '/ACEH.pdf',
  },
}

export async function getDocumentById(documentId: string): Promise<PdfDocument> {
  await new Promise(r => setTimeout(r, 300))
  const doc = MOCK_DOCUMENTS[documentId]
  if (!doc) throw new Error(`Document not found: ${documentId}`)
  return doc
}
