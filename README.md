# PDF Annotator

A professional PDF annotation frontend built with Vue 3, Vite, TypeScript, Pinia, and PDF.js.

## Getting Started

### 1. Add your PDF file

Place your PDF file in the `public` folder:

```
public/ACEH.pdf
```

> **Important:** The app is pre-configured to load `ACEH.pdf` from the `public` folder. The file must be named exactly `ACEH.pdf`.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Features

- **PDF Viewer** — Renders all pages vertically with zoom controls (in/out/reset)
- **Area Annotation** — Click and drag on any page to select an area
- **Comment Form** — A floating card appears after selection for writing a note
- **Persistent Comments** — Comments are saved to `localStorage` and survive browser refresh
- **Comment Sidebar** — Lists all comments sorted by newest first
- **Active State** — Clicking a comment in the sidebar or annotation on the PDF highlights both
- **Delete** — Remove any comment with the trash button; annotation disappears from PDF

---

## Project Structure

```
src/
├── main.ts
├── App.vue
├── style.css
├── components/
│   ├── AppHeader.vue          # Top navigation bar
│   ├── PdfViewer.vue          # PDF rendering + drag annotation logic
│   ├── ZoomControls.vue       # Zoom in/out/reset buttons
│   ├── CommentForm.vue        # Floating form card after area selection
│   ├── CommentSidebar.vue     # Right sidebar with comment list
│   └── CommentItem.vue        # Individual comment card
├── stores/
│   └── pdfCommentStore.ts     # Pinia store for comments + activeCommentId
├── services/
│   ├── documentService.ts     # Mock document fetch (replace with API)
│   └── commentService.ts      # localStorage-backed comment CRUD (replace with API)
├── types/
│   ├── document.ts            # PdfDocument interface
│   └── comment.ts             # PdfComment + SelectionRect interfaces
└── utils/
    ├── coordinate.ts          # Coordinate normalization helpers
    └── time.ts                # Relative time formatting + ID generation
```

---

## Connecting to a Real Backend

When your backend is ready, update these two files:

### `src/services/documentService.ts`
Replace the mock with a real fetch:
```ts
export async function getDocumentById(documentId: string): Promise<PdfDocument> {
  const res = await fetch(`/api/documents/${documentId}`)
  if (!res.ok) throw new Error('Document not found')
  return res.json()
}
```

### `src/services/commentService.ts`
Replace localStorage calls with API calls:
```ts
export async function getComments(documentId: string): Promise<PdfComment[]> {
  const res = await fetch(`/api/comments?documentId=${documentId}`)
  return res.json()
}

export async function createComment(comment: PdfComment): Promise<PdfComment> {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  })
  return res.json()
}

export async function deleteComment(documentId: string, commentId: string): Promise<void> {
  await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
}
```

---

## localStorage Key Format

Comments are stored under:
```
pdf-comments:aceh-001
```

Or dynamically: `pdf-comments:${documentId}`

---

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder.
