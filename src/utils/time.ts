export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now  = new Date()
  const diff = now.getTime() - date.getTime()
  const sec  = Math.floor(diff / 1000)
  const min  = Math.floor(sec  / 60)
  const hour = Math.floor(min  / 60)
  const day  = Math.floor(hour / 24)

  if (sec  < 60) return 'baru saja'
  if (min  < 60) return `${min}m lalu`
  if (hour < 24) return `${hour}j lalu`
  if (day  <  7) return `${day}h lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// tanpa tahun biar lebih ringkas
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('id-ID', { month: 'short' })
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month}, ${hh}:${mm}`
}

export function formatStatusTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day   = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('id-ID', { month: 'short' })
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month}, ${hh}:${mm}`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
