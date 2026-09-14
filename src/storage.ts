export type SalahName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type SalahRecord = Partial<Record<SalahName, boolean>>
export type SalahState = Record<string, SalahRecord>
export type TasbihSession = { date: string; count: number; target: number; dhikr: string }
export type AppState = {
  version: 2
  location: { lat: number; lon: number; label: string } | null
  salah: SalahState
  tasbih: { count: number; target: number; dhikr: string; sessions: TasbihSession[]; total: number; haptic: boolean; sound: boolean }
}

const KEY = 'noortools:v2'
const LEGACY_KEY = 'noortools:v1'
const empty: AppState = {
  version: 2,
  location: null,
  salah: {},
  tasbih: { count: 0, target: 33, dhikr: 'SubhanAllah', sessions: [], total: 0, haptic: true, sound: false },
}

const cloneEmpty = () => structuredClone(empty)

function validLocation(value: unknown): AppState['location'] {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return typeof v.label === 'string' && typeof v.lat === 'number' && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 && typeof v.lon === 'number' && Number.isFinite(v.lon) && Math.abs(v.lon) <= 180
    ? { label: v.label, lat: v.lat, lon: v.lon }
    : null
}

function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return cloneEmpty()
  const parsed = raw as Partial<AppState> & { version?: unknown }
  if (parsed.version === 2) {
    const result = cloneEmpty()
    result.location = validLocation(parsed.location)
    result.salah = parsed.salah && typeof parsed.salah === 'object' ? parsed.salah : {}
    result.tasbih = {
      ...empty.tasbih,
      ...(parsed.tasbih && typeof parsed.tasbih === 'object' ? parsed.tasbih : {}),
      sessions: Array.isArray(parsed.tasbih?.sessions) ? parsed.tasbih.sessions.filter(s => s && typeof s === 'object' && typeof s.date === 'string' && typeof s.count === 'number' && s.count > 0) : [],
    }
    return result
  }
  if (parsed.version === 1 || parsed.version === undefined) {
    const result = cloneEmpty()
    result.location = validLocation(parsed.location)
    result.salah = parsed.salah && typeof parsed.salah === 'object' ? parsed.salah : {}
    const legacyTasbih = parsed.tasbih && typeof parsed.tasbih === 'object' ? parsed.tasbih : {}
    result.tasbih = {
      ...empty.tasbih,
      count: typeof legacyTasbih.count === 'number' && legacyTasbih.count >= 0 ? legacyTasbih.count : 0,
      target: typeof legacyTasbih.target === 'number' && legacyTasbih.target > 0 ? legacyTasbih.target : 33,
      dhikr: typeof legacyTasbih.dhikr === 'string' && legacyTasbih.dhikr.trim() ? legacyTasbih.dhikr : 'SubhanAllah',
      total: typeof legacyTasbih.total === 'number' && legacyTasbih.total >= 0 ? legacyTasbih.total : 0,
    }
    return result
  }
  return cloneEmpty()
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) return migrate(JSON.parse(legacy))
    return cloneEmpty()
  } catch {
    return cloneEmpty()
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify({ ...state, version: 2 }))
}

export function resetState() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(LEGACY_KEY)
  return cloneEmpty()
}

export function salahStats(salah: SalahState, today = new Date()) {
  const todayKey = localDateKey(today)
  const days = Object.entries(salah).filter(([key, value]) => Object.values(value).some(Boolean)).map(([key, value]) => ({ key, completed: Object.values(value).filter(Boolean).length }))
  const todayRecord = salah[todayKey] ?? {}
  const todayCompleted = Object.values(todayRecord).filter(Boolean).length
  const last7 = days.filter(({ key }) => {
    const d = new Date(`${key}T12:00:00`)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    return diff >= 0 && diff < 7
  }).reduce((sum, day) => sum + day.completed, 0)
  const last30 = days.filter(({ key }) => {
    const d = new Date(`${key}T12:00:00`)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    return diff >= 0 && diff < 30
  }).reduce((sum, day) => sum + day.completed, 0)
  let streak = 0
  const cursor = new Date(today)
  while (true) {
    const key = localDateKey(cursor)
    if (Object.values(salah[key] ?? {}).filter(Boolean).length !== 5) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return { todayCompleted, last7, last30, streak }
}

export function tasbihStats(sessions: TasbihSession[], today = new Date()) {
  const todayKey = localDateKey(today)
  const countFor = (days: number) => sessions.filter(session => {
    const d = new Date(`${session.date}T12:00:00`)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    return diff >= 0 && diff < days
  }).reduce((sum, session) => sum + session.count, 0)
  let streak = 0
  const dates = new Set(sessions.map(session => session.date))
  const cursor = new Date(today)
  while (dates.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return { today: sessions.filter(s => s.date === todayKey).reduce((sum, s) => sum + s.count, 0), last7: countFor(7), last30: countFor(30), streak }
}
