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

function nonNegative(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function positive(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function validLocation(value: unknown): AppState['location'] {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return typeof v.label === 'string' && typeof v.lat === 'number' && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 && typeof v.lon === 'number' && Number.isFinite(v.lon) && Math.abs(v.lon) <= 180
    ? { label: v.label, lat: v.lat, lon: v.lon }
    : null
}

function validSalah(value: unknown): SalahState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: SalahState = {}
  for (const [date, record] of Object.entries(value)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue
    const cleaned: SalahRecord = {}
    for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) {
      if ((record as Record<string, unknown>)[name] === true) cleaned[name] = true
    }
    if (Object.keys(cleaned).length) result[date] = cleaned
  }
  return result
}

function validSessions(value: unknown): TasbihSession[] {
  if (!Array.isArray(value)) return []
  return value.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object').flatMap(s => {
    const date = typeof s.date === 'string' ? s.date : ''
    const count = nonNegative(s.count, 0)
    const target = positive(s.target, 33)
    const dhikr = typeof s.dhikr === 'string' && s.dhikr.trim() ? s.dhikr.trim() : 'SubhanAllah'
    return date && count > 0 ? [{ date, count, target, dhikr }] : []
  })
}

function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return cloneEmpty()
  const parsed = raw as Partial<AppState> & { version?: unknown; tasbih?: Record<string, unknown> }
  if (parsed.version === 2) {
    const result = cloneEmpty()
    result.location = validLocation(parsed.location)
    result.salah = validSalah(parsed.salah)
    const t = parsed.tasbih ?? {}
    result.tasbih = {
      count: nonNegative(t.count, 0),
      target: positive(t.target, 33),
      dhikr: typeof t.dhikr === 'string' && t.dhikr.trim() ? t.dhikr.trim() : 'SubhanAllah',
      sessions: validSessions(t.sessions),
      total: nonNegative(t.total, 0),
      haptic: typeof t.haptic === 'boolean' ? t.haptic : true,
      sound: typeof t.sound === 'boolean' ? t.sound : false,
    }
    return result
  }
  if (parsed.version === 1 || parsed.version === undefined) {
    const result = cloneEmpty()
    result.location = validLocation(parsed.location)
    result.salah = validSalah(parsed.salah)
    const t = parsed.tasbih ?? {}
    result.tasbih = {
      ...result.tasbih,
      count: nonNegative(t.count, 0),
      target: positive(t.target, 33),
      dhikr: typeof t.dhikr === 'string' && t.dhikr.trim() ? t.dhikr.trim() : 'SubhanAllah',
      total: nonNegative(t.total, 0),
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

function daysAgo(today: Date, key: string) {
  const d = new Date(`${key}T12:00:00`)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  return Math.round((t.getTime() - d.getTime()) / 86400000)
}

export function salahStats(salah: SalahState, today = new Date()) {
  const todayKey = localDateKey(today)
  const days = Object.entries(salah).filter(([, value]) => Object.values(value).some(Boolean)).map(([key, value]) => ({ key, completed: Object.values(value).filter(Boolean).length }))
  const todayCompleted = Object.values(salah[todayKey] ?? {}).filter(Boolean).length
  const within = (limit: number) => days.filter(({ key }) => { const diff = daysAgo(today, key); return diff >= 0 && diff < limit }).reduce((sum, day) => sum + day.completed, 0)
  let streak = 0
  const cursor = new Date(today)
  while (Object.values(salah[localDateKey(cursor)] ?? {}).filter(Boolean).length === 5) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return { todayCompleted, last7: within(7), last30: within(30), streak }
}

export function tasbihStats(sessions: TasbihSession[], today = new Date()) {
  const todayKey = localDateKey(today)
  const within = (limit: number) => sessions.filter(session => { const diff = daysAgo(today, session.date); return diff >= 0 && diff < limit }).reduce((sum, session) => sum + session.count, 0)
  const dates = new Set(sessions.map(session => session.date))
  let streak = 0
  const cursor = new Date(today)
  while (dates.has(localDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return { today: sessions.filter(s => s.date === todayKey).reduce((sum, s) => sum + s.count, 0), last7: within(7), last30: within(30), streak }
}
