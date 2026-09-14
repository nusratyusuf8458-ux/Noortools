const KEY = 'noortools:search-history:v1'
export const SEARCH_HISTORY_MAX = 20
export const SEARCH_HISTORY_MAX_LENGTH = 120

function sanitize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, SEARCH_HISTORY_MAX_LENGTH)
}

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const result: string[] = []
    for (const item of parsed) {
      const value = sanitize(item)
      if (!value) continue
      const key = value.toLocaleLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(value)
      if (result.length >= SEARCH_HISTORY_MAX) break
    }
    return result
  } catch {
    return []
  }
}

function write(values: string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(values.slice(0, SEARCH_HISTORY_MAX))) } catch { /* local-only storage can be unavailable; search still works */ }
}

export function loadSearchHistory(): string[] { return read() }

export function addSearchHistory(current: string[], query: string): string[] {
  const value = sanitize(query)
  if (!value) return current.slice(0, SEARCH_HISTORY_MAX)
  const key = value.toLocaleLowerCase()
  const next = [value, ...current.filter(item => sanitize(item).toLocaleLowerCase() !== key)].slice(0, SEARCH_HISTORY_MAX)
  write(next)
  return next
}

export function clearSearchHistory(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore storage errors */ }
}
