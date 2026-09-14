const KEY = 'noortools:phase3:calendar:v1'
const MIN = -3
const MAX = 3

export function loadCalendarAdjustment(): number {
  try {
    const raw = localStorage.getItem(KEY)
    const value = Number(raw)
    return Number.isInteger(value) ? Math.max(MIN, Math.min(MAX, value)) : 0
  } catch { return 0 }
}

export function saveCalendarAdjustment(value: number) {
  const next = Number.isInteger(value) ? Math.max(MIN, Math.min(MAX, value)) : 0
  try { localStorage.setItem(KEY, String(next)) } catch { /* local persistence is best-effort */ }
}
