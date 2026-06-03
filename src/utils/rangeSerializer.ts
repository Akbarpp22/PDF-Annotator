// serialize/deserialize Range supaya highlight bisa di-restore setelah refresh
// pakai xpath + offset, relatif ke text layer container

export interface SerializedRange {
  startXPath: string
  startOffset: number
  endXPath: string
  endOffset: number
  text: string
}

function getXPath(node: Node, root: Element): string {
  const parts: string[] = []
  let current: Node | null = node

  while (current && current !== root) {
    if (current.nodeType === Node.TEXT_NODE) {
      let idx = 0
      let sib = current.previousSibling
      while (sib) {
        if (sib.nodeType === Node.TEXT_NODE) idx++
        sib = sib.previousSibling
      }
      parts.unshift(`text()[${idx + 1}]`)
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const el  = current as Element
      const tag = el.tagName.toLowerCase()
      let idx = 1
      let sib = el.previousElementSibling
      while (sib) {
        if (sib.tagName.toLowerCase() === tag) idx++
        sib = sib.previousElementSibling
      }
      parts.unshift(`${tag}[${idx}]`)
    }
    current = current.parentNode
  }

  return parts.join('/')
}

function resolveXPath(xpath: string, root: Element): Node | null {
  try {
    const result = document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    return result.singleNodeValue
  } catch {
    return null
  }
}

export function serializeRange(range: Range, root: Element): SerializedRange {
  return {
    startXPath:   getXPath(range.startContainer, root),
    startOffset:  range.startOffset,
    endXPath:     getXPath(range.endContainer, root),
    endOffset:    range.endOffset,
    text:         range.toString(),
  }
}

export function deserializeRange(sr: SerializedRange, root: Element): Range | null {
  try {
    const startNode = resolveXPath(sr.startXPath, root)
    const endNode   = resolveXPath(sr.endXPath, root)
    if (!startNode || !endNode) return null

    const range = document.createRange()
    range.setStart(startNode, sr.startOffset)
    range.setEnd(endNode, sr.endOffset)
    return range
  } catch {
    return null
  }
}
