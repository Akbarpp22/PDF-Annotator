<template>
  <div class="pdf-viewer-wrapper">
    <!-- Toolbar -->
    <div class="toolbar">
      <ZoomControls :scale="scale" @zoom-in="zoomIn" @zoom-out="zoomOut" @zoom-reset="zoomReset" />

      <div class="mode-toggle">
        <button class="mode-btn" :class="{ active: mode === 'area' }" @click="setMode('area')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          Area
        </button>
        <button class="mode-btn" :class="{ active: mode === 'highlight' }" @click="setMode('highlight')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Highlight
        </button>
      </div>

      <span class="toolbar-hint">
        {{ mode === 'area' ? 'Drag untuk menandai area' : 'Drag teks untuk highlight' }}
      </span>
    </div>

    <!-- PDF scroll area -->
    <div ref="scrollContainer" class="pdf-scroll">
      <div v-if="loadingPdf" class="pdf-loading">
        <div class="spinner" /><p>Merender PDF…</p>
      </div>

      <div v-show="!loadingPdf" class="pdf-pages">
        <div
          v-for="pageNum in totalPages"
          :key="pageNum"
          :ref="el => setPageRef(el, pageNum)"
          class="pdf-page-wrapper"
        >
          <!-- 1. Canvas -->
          <canvas :ref="el => setCanvasRef(el, pageNum)" class="pdf-canvas" />

          <!-- 2. Saved highlight rects -->
          <div class="highlight-layer" :style="layerSize(pageNum)">
            <template v-for="comment in highlightCommentsForPage(pageNum)" :key="comment.id">
              <!-- Render tiap rect highlight -->
              <div
                v-for="(rect, ri) in comment.highlightRects || []"
                :key="ri"
                class="hl-rect"
                :class="{ active: store.activeCommentId === comment.id }"
                :style="pctStyle(rect)"
                @click.stop="handleAnnotationClick(comment.id)"
              />
              <!-- Active highlight: underline glow (tidak ganggu teks) + pin kecil -->
              <template v-if="store.activeCommentId === comment.id">
                <!-- Underline glow di bawah tiap baris — tidak menutupi teks -->
                <div
                  v-for="(rect, gi) in comment.highlightRects || []"
                  :key="'ul-' + gi"
                  class="hl-underline"
                  :style="{
                    left: rect.x + '%',
                    top: (rect.y + rect.height) + '%',
                    width: rect.width + '%',
                  }"
                />
                <!-- Pin kecil di ujung kiri baris pertama -->
                <div
                  v-if="comment.highlightRects && comment.highlightRects.length > 0"
                  class="hl-pin"
                  :style="{
                    left: comment.highlightRects[0].x + '%',
                    top: comment.highlightRects[0].y + '%',
                  }"
                >
                  <span class="hl-pin-line" />
                  <span class="hl-pin-dot" />
                  <span class="hl-pin-ripple" />
                  <span class="hl-pin-ripple hl-pin-ripple--2" />
                </div>
              </template>
            </template>
          </div>

          <!-- 3. Live highlight preview while dragging -->
          <div class="highlight-layer" :style="layerSize(pageNum)">
            <template v-if="hlDrag.pageNum === pageNum && hlDrag.rects.length">
              <div
                v-for="(rect, ri) in hlDrag.rects"
                :key="ri"
                class="hl-rect preview"
                :style="pctStyle(rect)"
              />
            </template>
          </div>

          <!-- 4. Unified interaction overlay -->
          <div
            class="interact-overlay"
            :style="layerSize(pageNum)"
            :class="{ 'mode-area': mode === 'area', 'mode-highlight': mode === 'highlight' }"
            @mousedown="e => onMouseDown(e, pageNum)"
            @mousemove="e => onMouseMove(e, pageNum)"
            @mouseup="e => onMouseUp(e, pageNum)"
          >
            <!-- Area annotations -->
            <div
              v-for="comment in areaCommentsForPage(pageNum)"
              :key="comment.id"
              class="annotation-box"
              :class="{ active: store.activeCommentId === comment.id }"
              :style="pctStyle(comment)"
              @mousedown.stop
              @click.stop="handleAnnotationClick(comment.id)"
            >
              <!-- Active area: animated corner brackets + marching dashes -->
              <template v-if="store.activeCommentId === comment.id">
                <div class="area-active-overlay">
                  <!-- Marching dashed border -->
                  <div class="area-march" />
                  <!-- Corner brackets -->
                  <span class="corner corner--tl" />
                  <span class="corner corner--tr" />
                  <span class="corner corner--bl" />
                  <span class="corner corner--br" />
                  <!-- Scan line sweep -->
                  <div class="area-scan" />
                </div>
              </template>
            </div>

            <!-- Click targets for saved highlights -->
            <div
              v-for="comment in highlightCommentsForPage(pageNum)"
              :key="'hlt-' + comment.id"
              class="hl-click-target"
              :style="pctStyle(comment)"
              @mousedown.stop
              @click.stop="handleAnnotationClick(comment.id)"
            />

            <!-- Area drag selection rect -->
            <div
              v-if="areaDrag.active && areaDrag.pageNum === pageNum"
              class="selection-rect"
              :style="areaDragStyle"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Comment form -->
    <CommentForm
      :visible="showForm"
      :page-number="(pendingHighlight?.pageNumber ?? pendingArea?.pageNumber) ?? 1"
      :anchor-x="formAnchor.x"
      :anchor-y="formAnchor.y"
      :anchor-width="formAnchor.w"
      :anchor-height="formAnchor.h"
      :selected-text="pendingHighlight?.selectedText"
      @save="handleFormSave"
      @cancel="handleFormCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import ZoomControls from './ZoomControls.vue'
import CommentForm from './CommentForm.vue'
import { usePdfCommentStore } from '../stores/pdfCommentStore'
import { generateId } from '../utils/time'
import type { PdfComment, SelectionRect, HighlightRange, AnnotationType } from '../types/comment'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href

const props = defineProps<{ pdfUrl: string; documentId: string }>()
const store = usePdfCommentStore()

// ─── PDF state ────────────────────────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null)
const scale           = ref(1.2)
const totalPages      = ref(0)
const loadingPdf      = ref(true)
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

const canvasRefs = ref(new Map<number, HTMLCanvasElement>())
const pageRefs   = ref(new Map<number, HTMLElement>())
const pageSizes  = ref(new Map<number, { w: number; h: number }>())

/**
 * Per-character rect in canvas-pixel space.
 * Each entry is ONE character from the PDF text content.
 * Splitting to character level gives maximum highlight precision.
 */
type CharRect = { char: string; x: number; y: number; w: number; h: number }
const pageCharRects = new Map<number, CharRect[]>()

function setCanvasRef(el: unknown, p: number) { if (el instanceof HTMLCanvasElement) canvasRefs.value.set(p, el) }
function setPageRef(el: unknown, p: number)   { if (el instanceof HTMLElement) pageRefs.value.set(p, el) }

// ─── Mode ─────────────────────────────────────────────────────────────
type Mode = 'area' | 'highlight'
const mode = ref<Mode>('area')
function setMode(m: Mode) { mode.value = m; cancelAll() }

// ─── Helpers ──────────────────────────────────────────────────────────
function layerSize(p: number) {
  const s = pageSizes.value.get(p)
  return s ? { width: s.w + 'px', height: s.h + 'px' } : {}
}
function pctStyle(r: { x: number; y: number; width: number; height: number }) {
  return { left: r.x + '%', top: r.y + '%', width: r.width + '%', height: r.height + '%' }
}
function areaCommentsForPage(p: number) {
  return store.comments.filter(c => c.documentId === props.documentId && c.pageNumber === p && c.type === 'area')
}
function highlightCommentsForPage(p: number) {
  return store.comments.filter(c => c.documentId === props.documentId && c.pageNumber === p && c.type === 'highlight') as
    Array<PdfComment & { highlightRects?: Array<{ x: number; y: number; width: number; height: number }> }>
}


// ─── PDF load & render ────────────────────────────────────────────────
async function loadPdf() {
  loadingPdf.value = true
  canvasRefs.value.clear()
  pageRefs.value.clear()
  pageSizes.value.clear()
  pageCharRects.clear()

  try {
    pdfDoc = await pdfjsLib.getDocument(props.pdfUrl).promise
    totalPages.value = pdfDoc.numPages
    await nextTick()
    await renderAllPages()
  } catch (e) {
    console.error('PDF load error:', e)
  } finally {
    loadingPdf.value = false
  }
}

async function renderAllPages() {
  if (!pdfDoc) return
  for (let i = 1; i <= totalPages.value; i++) await renderPage(i)
}

async function renderPage(pageNum: number) {
  if (!pdfDoc) return
  const canvas = canvasRefs.value.get(pageNum)
  if (!canvas) return

  const page     = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: scale.value })

  canvas.width  = viewport.width
  canvas.height = viewport.height
  pageSizes.value.set(pageNum, { w: viewport.width, h: viewport.height })

  const wrapper = pageRefs.value.get(pageNum)
  if (wrapper) wrapper.style.width = `${viewport.width}px`

  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
  await extractCharRects(page, viewport, pageNum)
}

/**
 * Extract ONE rect per CHARACTER from PDF text content.
 *
 * PDF.js TextItem gives us:
 *   transform = [scaleX, skewY, skewX, scaleY, originX, originY]  (PDF user space)
 *   width     = total width of the entire string in PDF units
 *   height    = ascent height in PDF units
 *
 * We distribute the total pixel width across each character proportionally
 * by its character width relative to the total string length.
 * For better accuracy we use `fontName` + canvas measureText when possible.
 */
async function extractCharRects(
  page: pdfjsLib.PDFPageProxy,
  viewport: pdfjsLib.PageViewport,
  pageNum: number
) {
  const content = await page.getTextContent()
  const chars: CharRect[] = []

  // Offscreen canvas for character width measurement
  const measurer = document.createElement('canvas').getContext('2d')!

  for (const raw of content.items) {
    const ti = raw as TextItem
    if (!ti.str || ti.str.length === 0) continue

    const tx   = ti.transform
    const pdfX = tx[4]
    const pdfY = tx[5]

    // Canvas-pixel coordinates of the item origin and right edge
    const [cxLeft,  cyBaseline] = viewport.convertToViewportPoint(pdfX,           pdfY)
    const [cxRight, ]           = viewport.convertToViewportPoint(pdfX + ti.width, pdfY)
    const [,        cyTop]      = viewport.convertToViewportPoint(pdfX,            pdfY + ti.height)

    const itemX = Math.min(cxLeft, cxRight)
    const itemY = Math.min(cyTop, cyBaseline)
    const itemW = Math.abs(cxRight - cxLeft)
    const itemH = Math.abs(cyBaseline - cyTop)

    if (itemW <= 0 || itemH <= 0) continue

    const str = ti.str

    // ── Measure each character width using Canvas 2D measureText ──────
    // Set font size proportional to the rendered item height so measurements
    // are in the same scale as the canvas pixels.
    measurer.font = `${itemH}px sans-serif`
    // totalMeasured unused

    // Build cumulative widths so we know the x-offset of each character
    const cumWidths: number[] = [0]  // cumWidths[i] = px offset of char i from item start
    for (let i = 0; i < str.length; i++) {
      const cw = measurer.measureText(str[i]).width
      cumWidths.push(cumWidths[i] + cw)
    }
    const measuredTotal = cumWidths[str.length]

    // Scale factor: map measured widths → actual canvas pixel widths
    // Falls back to uniform distribution if measurement fails
    const scale2canvas = measuredTotal > 0 ? itemW / measuredTotal : itemW / str.length

    for (let i = 0; i < str.length; i++) {
      const charX = itemX + cumWidths[i]     * scale2canvas
      const charW = (cumWidths[i + 1] - cumWidths[i]) * scale2canvas

      if (charW > 0) {
        chars.push({
          char: str[i],
          x: charX,
          y: itemY,
          w: charW,
          h: itemH,
        })
      }
    }
  }

  pageCharRects.set(pageNum, chars)
}

// ─── Zoom ─────────────────────────────────────────────────────────────
function zoomIn()    { scale.value = Math.min(scale.value + 0.25, 3) }
function zoomOut()   { scale.value = Math.max(scale.value - 0.25, 0.5) }
function zoomReset() { scale.value = 1.2 }
watch(scale, async () => { await nextTick(); await renderAllPages() })

// ─── Canvas pixel position ────────────────────────────────────────────
function getCanvasPos(e: MouseEvent, pageNum: number) {
  const canvas = canvasRefs.value.get(pageNum)
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  }
}

// ─── Area drag state ──────────────────────────────────────────────────
const areaDrag = reactive({
  active: false, pageNum: 0,
  startX: 0, startY: 0, curX: 0, curY: 0,
})
const areaDragStyle = computed(() => {
  if (!areaDrag.active) return {}
  const s = pageSizes.value.get(areaDrag.pageNum)
  if (!s) return {}
  const x = Math.min(areaDrag.startX, areaDrag.curX)
  const y = Math.min(areaDrag.startY, areaDrag.curY)
  const w = Math.abs(areaDrag.curX - areaDrag.startX)
  const h = Math.abs(areaDrag.curY - areaDrag.startY)
  return {
    left: (x / s.w * 100) + '%', top:    (y / s.h * 100) + '%',
    width:(w / s.w * 100) + '%', height: (h / s.h * 100) + '%',
  }
})

// ─── Highlight drag state ─────────────────────────────────────────────
const hlDrag = reactive({
  active: false, pageNum: 0,
  startX: 0, startY: 0,
  rects: [] as Array<{ x: number; y: number; width: number; height: number }>,
  selectedText: '',
})

// ─── Form state ───────────────────────────────────────────────────────
const showForm         = ref(false)
const pendingArea      = ref<SelectionRect | null>(null)
const pendingHighlight = ref<HighlightRange | null>(null)
const formAnchor       = ref({ x: 0, y: 0, w: 0, h: 0 })

// ─── Mouse handlers ───────────────────────────────────────────────────
function onMouseDown(e: MouseEvent, pageNum: number) {
  if (showForm.value || e.button !== 0) return
  const pos = getCanvasPos(e, pageNum)
  if (!pos) return

  if (mode.value === 'area') {
    Object.assign(areaDrag, { active: true, pageNum, startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y })
    e.preventDefault()
  } else {
    Object.assign(hlDrag, { active: true, pageNum, startX: pos.x, startY: pos.y, rects: [], selectedText: '' })
    e.preventDefault()
  }
}

function onMouseMove(e: MouseEvent, pageNum: number) {
  if (mode.value === 'area') {
    if (!areaDrag.active || areaDrag.pageNum !== pageNum) return
    const pos = getCanvasPos(e, pageNum)
    if (pos) { areaDrag.curX = pos.x; areaDrag.curY = pos.y }
  } else {
    if (!hlDrag.active || hlDrag.pageNum !== pageNum) return
    const pos = getCanvasPos(e, pageNum)
    if (!pos) return
    const result = hitTestCharRange(pageNum, hlDrag.startX, hlDrag.startY, pos.x, pos.y)
    hlDrag.rects = result.rects
    hlDrag.selectedText = result.text
  }
}

function onMouseUp(e: MouseEvent, pageNum: number) {
  if (mode.value === 'area') {
    if (!areaDrag.active || areaDrag.pageNum !== pageNum) return
    areaDrag.active = false

    const pos = getCanvasPos(e, pageNum)
    if (!pos) return
    const s = pageSizes.value.get(pageNum)
    if (!s) return

    const rawW = Math.abs(pos.x - areaDrag.startX)
    const rawH = Math.abs(pos.y - areaDrag.startY)
    if (rawW < 8 || rawH < 8) return

    const x = Math.min(areaDrag.startX, pos.x)
    const y = Math.min(areaDrag.startY, pos.y)
    pendingArea.value = {
      pageNumber: pageNum,
      x: (x / s.w) * 100, y: (y / s.h) * 100,
      width: (rawW / s.w) * 100, height: (rawH / s.h) * 100,
    }
    pendingHighlight.value = null

    const canvas = canvasRefs.value.get(pageNum)!
    const cr = canvas.getBoundingClientRect()
    formAnchor.value = {
      x: cr.left + x / (canvas.width / cr.width),
      y: cr.top  + y / (canvas.height / cr.height),
      w: rawW, h: rawH,
    }
    showForm.value = true

  } else {
    if (!hlDrag.active || hlDrag.pageNum !== pageNum) return
    hlDrag.active = false

    const pos = getCanvasPos(e, pageNum)
    if (!pos) return

    const result = hitTestCharRange(pageNum, hlDrag.startX, hlDrag.startY, pos.x, pos.y)
    if (!result.text || result.rects.length === 0) {
      hlDrag.rects = []
      return
    }

    const s = pageSizes.value.get(pageNum)!
    const allX = result.rects.flatMap(r => [r.x, r.x + r.width])
    const allY = result.rects.flatMap(r => [r.y, r.y + r.height])

    pendingHighlight.value = {
      pageNumber: pageNum,
      selectedText: result.text,
      x: Math.min(...allX), y: Math.min(...allY),
      width:  Math.max(...allX) - Math.min(...allX),
      height: Math.max(...allY) - Math.min(...allY),
      rects: result.rects,
      domRange: new Range(), // unused in v6 approach
    }
    pendingArea.value = null

    // Form anchor: first rect in viewport coords
    const first = result.rects[0]
    const canvas = canvasRefs.value.get(pageNum)!
    const cr = canvas.getBoundingClientRect()
    const scX = cr.width  / canvas.width
    const scY = cr.height / canvas.height
    formAnchor.value = {
      x: cr.left + first.x / 100 * s.w * scX,
      y: cr.top  + first.y / 100 * s.h * scY,
      w: first.width  / 100 * s.w * scX,
      h: first.height / 100 * s.h * scY,
    }
    showForm.value = true
  }
}

// ─── Core: hit-test per CHARACTER ────────────────────────────────────
/**
 * Given drag from (x1,y1) → (x2,y2) in canvas-pixel space,
 * find all CHARACTER rects that fall within the selection band.
 *
 * Selection rules (mirrors browser text selection):
 *   - Single line : chars whose midX is between startX and endX
 *   - First line  : chars whose midX >= startX
 *   - Last line   : chars whose midX <= endX
 *   - Middle lines: all chars
 *
 * Result rects are merged per line (one rect per line, from first
 * selected char to last selected char) — exactly like real highlight.
 */
function hitTestCharRange(
  pageNum: number,
  x1: number, y1: number,
  x2: number, y2: number
): { rects: Array<{ x: number; y: number; width: number; height: number }>; text: string } {
  const chars = pageCharRects.get(pageNum)
  if (!chars || chars.length === 0) return { rects: [], text: '' }
  const s = pageSizes.value.get(pageNum)
  if (!s) return { rects: [], text: '' }

  // Normalize: startY is always the top of the drag
  const startY = Math.min(y1, y2)
  const endY   = Math.max(y1, y2)
  const startX = y1 <= y2 ? x1 : x2   // x at the TOP of the drag
  const endX   = y1 <= y2 ? x2 : x1   // x at the BOTTOM of the drag

  const LINE_GAP = 4  // px — chars within this vertical distance are on the same line
  const SNAP     = 3  // px — extra tolerance for line boundary detection

  // ── Group chars into lines ───────────────────────────────────────────
  // Sort top→bottom, left→right
  const sorted = [...chars].sort((a, b) => {
    const aMid = a.y + a.h / 2
    const bMid = b.y + b.h / 2
    if (Math.abs(aMid - bMid) < LINE_GAP) return a.x - b.x
    return aMid - bMid
  })

  type Line = { midY: number; chars: CharRect[] }
  const lines: Line[] = []

  for (const ch of sorted) {
    const midY = ch.y + ch.h / 2
    const last = lines[lines.length - 1]
    if (last && Math.abs(midY - last.midY) < LINE_GAP) {
      last.chars.push(ch)
    } else {
      lines.push({ midY, chars: [ch] })
    }
  }

  // ── Find lines that overlap the drag band vertically ─────────────────
  const hitLines = lines.filter(line => {
    const top    = Math.min(...line.chars.map(c => c.y)) - SNAP
    const bottom = Math.max(...line.chars.map(c => c.y + c.h)) + SNAP
    return bottom >= startY && top <= endY
  })

  if (hitLines.length === 0) return { rects: [], text: '' }

  const resultRects: Array<{ x: number; y: number; width: number; height: number }> = []
  const textParts: string[] = []

  hitLines.forEach((line, lineIdx) => {
    const isFirst  = lineIdx === 0
    const isLast   = lineIdx === hitLines.length - 1
    const isSingle = hitLines.length === 1

    // ── Filter chars on this line by x position ──────────────────────
    // Use midX of each character as the selection point —
    // this means a character is selected when the cursor passes its center,
    // giving per-character precision.
    const selected = line.chars.filter(ch => {
      const midX = ch.x + ch.w / 2

      if (isSingle) {
        const selLeft  = Math.min(startX, endX)
        const selRight = Math.max(startX, endX)
        return midX >= selLeft && midX <= selRight
      }
      if (isFirst)  return midX >= startX
      if (isLast)   return midX <= endX
      return true  // middle lines: select all chars
    })

    if (selected.length === 0) return

    // ── Merge selected chars into one rect per line ──────────────────
    // From the leftmost selected char to the rightmost selected char.
    const lineLeft   = Math.min(...selected.map(c => c.x))
    const lineRight  = Math.max(...selected.map(c => c.x + c.w))
    const lineTop    = Math.min(...selected.map(c => c.y))
    const lineBottom = Math.max(...selected.map(c => c.y + c.h))

    resultRects.push({
      x:      (lineLeft              / s.w) * 100,
      y:      (lineTop               / s.h) * 100,
      width:  ((lineRight - lineLeft) / s.w) * 100,
      height: ((lineBottom - lineTop) / s.h) * 100,
    })

    textParts.push(selected.map(c => c.char).join(''))
  })

  return { rects: resultRects, text: textParts.join('\n') }
}

// ─── Form handlers ────────────────────────────────────────────────────
async function handleFormSave(text: string) {
  let comment: PdfComment

  if (pendingHighlight.value) {
    const h = pendingHighlight.value
    comment = {
      id: generateId(),
      documentId: props.documentId,
      pageNumber: h.pageNumber,
      type: 'highlight' as AnnotationType,
      x: h.x, y: h.y, width: h.width, height: h.height,
      text, selectedText: h.selectedText,
      // @ts-ignore — extra field persisted to localStorage
      highlightRects: h.rects,
      status: 'pending',
      statusHistory: [],
      createdAt: new Date().toISOString(),
    }
  } else if (pendingArea.value) {
    const d = pendingArea.value
    comment = {
      id: generateId(),
      documentId: props.documentId,
      pageNumber: d.pageNumber,
      type: 'area' as AnnotationType,
      x: d.x, y: d.y, width: d.width, height: d.height,
      text,
      status: 'pending',
      statusHistory: [],
      createdAt: new Date().toISOString(),
    }
  } else return

  hlDrag.rects = []
  await store.addComment(comment)
  store.setActiveComment(comment.id)
  showForm.value = false
  pendingArea.value = null
  pendingHighlight.value = null
}

function handleFormCancel() {
  hlDrag.rects = []
  showForm.value = false
  pendingArea.value = null
  pendingHighlight.value = null
}

function cancelAll() {
  areaDrag.active = false
  hlDrag.active   = false
  hlDrag.rects    = []
  showForm.value  = false
  pendingArea.value = null
  pendingHighlight.value = null
}

function handleAnnotationClick(id: string) {
  store.setActiveComment(store.activeCommentId === id ? null : id)
}

function scrollToComment(id: string) {
  const c = store.comments.find(c => c.id === id)
  if (!c) return
  pageRefs.value.get(c.pageNumber)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function globalMouseUp() {
  if (areaDrag.active) areaDrag.active = false
  if (hlDrag.active)   hlDrag.active   = false
}

onMounted(async () => {
  await loadPdf()
  window.addEventListener('mouseup', globalMouseUp)
  window.addEventListener('scroll-to-comment', ((e: CustomEvent) => scrollToComment(e.detail.id)) as EventListener)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', globalMouseUp)
  if (pdfDoc) pdfDoc.destroy()
})
watch(() => props.pdfUrl, () => loadPdf())
</script>

<style scoped>
.pdf-viewer-wrapper {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;
  background: #e8e4de;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0);
  background-size: 24px 24px;
}

/* Toolbar */
.toolbar {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 100; display: flex; align-items: center; gap: 10px;
}
.mode-toggle {
  display: flex; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.mode-btn {
  display: flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px;
  border: none; background: transparent; font-size: 12px;
  font-family: 'DM Sans', sans-serif; font-weight: 500;
  color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.mode-btn:first-child { border-right: 1px solid var(--color-border); }
.mode-btn:hover  { background: var(--color-bg); color: var(--color-text); }
.mode-btn.active { background: var(--color-text); color: white; }
.toolbar-hint {
  font-size: 11px; color: var(--color-text-muted); background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px); border: 1px solid var(--color-border);
  border-radius: 99px; padding: 5px 12px; white-space: nowrap; pointer-events: none;
}

/* Scroll */
.pdf-scroll { flex: 1; overflow-y: auto; overflow-x: auto; padding: 64px 24px 40px; }
.pdf-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; gap: 16px;
  color: var(--color-text-muted); font-size: 13px;
}
.spinner {
  width: 32px; height: 32px; border: 2px solid var(--color-border);
  border-top-color: var(--color-accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.pdf-pages { display: flex; flex-direction: column; align-items: center; gap: 20px; }

/* Page */
.pdf-page-wrapper {
  position: relative;
  box-shadow: 0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1);
  border-radius: 2px; background: white;
}
.pdf-canvas { display: block; }

/* Layers */
.highlight-layer,
.interact-overlay {
  position: absolute; top: 0; left: 0;
}

/* Highlight rects */
.highlight-layer { pointer-events: none; z-index: 1; }
.hl-rect {
  position: absolute;
  background: rgba(250, 204, 21, 0.45);
  border-radius: 1px;
  pointer-events: auto;
  cursor: pointer;
  mix-blend-mode: multiply;
  transition: background 0.12s;
}
.hl-rect:hover  { background: rgba(250, 204, 21, 0.7); }
.hl-rect.active { background: rgba(37, 99, 235, 0.3); }
.hl-rect.preview {
  pointer-events: none;
  background: rgba(250, 204, 21, 0.5);
}

/* ════════════════════════════════════════════════════════════════════
   ACTIVE ANNOTATION EFFECTS
   ════════════════════════════════════════════════════════════════════

   HIGHLIGHT ACTIVE:
   - Animated golden→blue glow wash across each highlighted line
   - Pin marker (vertical line + pulsing dot) anchored at start of text
   - Two expanding ripple rings from the pin dot

   AREA ACTIVE:
   - Marching-ants dashed border that animates around the box
   - Animated corner bracket corners that "lock on"
   - Horizontal scan line that sweeps top→bottom once
   ════════════════════════════════════════════════════════════════════ */

/* ── Highlight active: underline glow di BAWAH teks (tidak ganggu baca) */
.hl-underline {
  position: absolute;
  height: 2px;
  transform: translateY(3px);  /* dorong ke bawah agar tidak overlap teks */
  pointer-events: none;
  border-radius: 2px;
  background: linear-gradient(90deg, #ef4444, #dc2626, #ef4444);
  background-size: 200% 100%;
  animation: ul-travel 1.8s linear infinite;
  box-shadow: 0 1px 6px rgba(239, 68, 68, 0.7);
}

@keyframes ul-travel {
  0%   { background-position: 0%   0; }
  100% { background-position: 200% 0; }
}

/* ── Highlight pin marker ─────────────────────────────────────────── */
.hl-pin {
  position: absolute;
  transform: translateY(-100%);
  pointer-events: none;
  z-index: 12;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: pin-drop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes pin-drop {
  0%   { transform: translateY(-200%) scaleY(0.5); opacity: 0; }
  100% { transform: translateY(-100%) scaleY(1);   opacity: 1; }
}

.hl-pin-line {
  display: block;
  width: 2px;
  height: 14px;
  background: linear-gradient(to bottom, transparent, #2563eb);
  border-radius: 1px;
}

.hl-pin-dot {
  display: block;
  width: 8px; height: 8px;
  background: #2563eb;
  border-radius: 50%;
  box-shadow: 0 0 0 2px white, 0 0 10px rgba(37, 99, 235, 0.6);
  flex-shrink: 0;
}

.hl-pin-ripple {
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%) scale(0);
  width: 20px; height: 20px;
  border: 1.5px solid rgba(37, 99, 235, 0.7);
  border-radius: 50%;
  animation: pin-ripple 1.8s ease-out infinite;
}

.hl-pin-ripple--2 {
  width: 32px; height: 32px;
  animation-delay: 0.5s;
  border-color: rgba(37, 99, 235, 0.4);
}

@keyframes pin-ripple {
  0%   { transform: translateX(-50%) scale(0);   opacity: 1; }
  80%  { transform: translateX(-50%) scale(1);   opacity: 0; }
  100% { transform: translateX(-50%) scale(1.1); opacity: 0; }
}

/* ── Area active overlay ──────────────────────────────────────────── */
.area-active-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 3px;
  overflow: hidden;
}

/* Marching ants — animated dashed border */
.area-march {
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  border: 2px dashed #2563eb;
  animation: march 0.6s linear infinite;
  background: rgba(37, 99, 235, 0.06);
}

@keyframes march {
  to { stroke-dashoffset: -20; }
}

/* We simulate marching via background-position trick */
.area-march {
  border: none;
  background:
    repeating-linear-gradient(0deg,   #2563eb 0, #2563eb 6px, transparent 6px, transparent 12px) left   / 2px 100% no-repeat,
    repeating-linear-gradient(0deg,   #2563eb 0, #2563eb 6px, transparent 6px, transparent 12px) right  / 2px 100% no-repeat,
    repeating-linear-gradient(90deg,  #2563eb 0, #2563eb 6px, transparent 6px, transparent 12px) top    / 100% 2px no-repeat,
    repeating-linear-gradient(90deg,  #2563eb 0, #2563eb 6px, transparent 6px, transparent 12px) bottom / 100% 2px no-repeat,
    rgba(37, 99, 235, 0.07);
  animation: march-bg 0.5s linear infinite;
}

@keyframes march-bg {
  from { background-position: left 0 top 0, right 0 top 0, top 0 left 0,   bottom 0 left 0,   0 0; }
  to   { background-position: left 0 top 12px, right 0 top -12px, top 0 left 12px, bottom 0 left -12px, 0 0; }
}

/* Corner brackets — lock-on effect */
.corner {
  position: absolute;
  width: 10px; height: 10px;
  border-color: #2563eb;
  border-style: solid;
  animation: corner-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.corner--tl { top: -1px; left: -1px;  border-width: 2px 0 0 2px; transform-origin: top left;  }
.corner--tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; transform-origin: top right; }
.corner--bl { bottom: -1px; left: -1px;  border-width: 0 0 2px 2px; transform-origin: bottom left;  }
.corner--br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; transform-origin: bottom right; }

@keyframes corner-in {
  0%   { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* Scan line — sweeps once from top to bottom */
.area-scan {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.7), transparent);
  top: 0;
  animation: scan-sweep 1.2s ease-in-out forwards;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
}

@keyframes scan-sweep {
  0%   { top: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* Interact overlay */
.interact-overlay { z-index: 2; pointer-events: auto; }
.interact-overlay.mode-area      { cursor: crosshair; }
.interact-overlay.mode-highlight { cursor: text; }

/* Area annotations */
.annotation-box {
  position: absolute; cursor: pointer; pointer-events: auto;
  border: 1.5px solid var(--color-annotation-border);
  background: var(--color-annotation); border-radius: 3px;
  transition: background 0.15s, box-shadow 0.15s;
}
.annotation-box:hover  { background: rgba(251,191,36,0.5); box-shadow: 0 0 0 2px rgba(245,158,11,0.3); }
.annotation-box.active {
  border-color: var(--color-annotation-active-border);
  background: var(--color-annotation-active);
  box-shadow: 0 0 0 2px rgba(37,99,235,0.25);
}
/* ann-num dihapus — diganti pulse animation */

/* Highlight click targets */
.hl-click-target { position: absolute; pointer-events: auto; cursor: pointer; }

/* Area drag rect */
.selection-rect {
  position: absolute; pointer-events: none;
  border: 2px dashed var(--color-selection-border);
  background: var(--color-selection); border-radius: 3px;
}
</style>
