export function toPercentage(value: number, total: number): number {
  return (value / total) * 100
}

export function fromPercentage(pct: number, total: number): number {
  return (pct / 100) * total
}

export function normalizeRect(
  startX: number, startY: number,
  endX: number,   endY: number,
  containerWidth: number, containerHeight: number
) {
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width  = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  return {
    x:      toPercentage(x,      containerWidth),
    y:      toPercentage(y,      containerHeight),
    width:  toPercentage(width,  containerWidth),
    height: toPercentage(height, containerHeight),
  }
}
