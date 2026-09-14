export type SalahState = Record<string, Partial<Record<'Fajr'|'Dhuhr'|'Asr'|'Maghrib'|'Isha', boolean>>>
export type AppState = { version: 1; location: { lat: number; lon: number; label: string } | null; salah: SalahState; tasbih: { count: number; target: number; dhikr: string; sessions: number; total: number } }

const KEY = 'noortools:v1'
const empty: AppState = { version: 1, location: null, salah: {}, tasbih: { count: 0, target: 33, dhikr: 'SubhanAllah', sessions: 0, total: 0 } }

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(empty)
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...structuredClone(empty), ...parsed, version: 1, tasbih: { ...empty.tasbih, ...(parsed.tasbih || {}) } }
  } catch { return structuredClone(empty) }
}
export function saveState(state: AppState) { localStorage.setItem(KEY, JSON.stringify(state)) }
export function resetState() { localStorage.removeItem(KEY); return structuredClone(empty) }
