export type SalahName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type SalahRecord = Partial<Record<SalahName, boolean>>
export type SalahState = Record<string, SalahRecord>
export type TasbihSession = { date: string; count: number; target: number; dhikr: string }
export type LocationState = { lat: number; lon: number; label: string; timeZone: string | null }
export type HighLatitudeMethod = 'none' | 'angleBased' | 'oneSeventh' | 'middleOfNight'
export type PrayerSettingsState = { method: 'MWL' | 'ISNA'; hanafi: boolean; highLatitude: HighLatitudeMethod }
export type AppState = {
  version: 3
  location: LocationState | null
  prayerSettings: PrayerSettingsState
  salah: SalahState
  tasbih: { count: number; target: number; dhikr: string; sessions: TasbihSession[]; total: number; haptic: boolean; sound: boolean }
}

type ExportEnvelope = { schema: 'noortools.local-data'; version: number; data: unknown }

const KEY = 'noortools:v3'
const LEGACY_KEYS = ['noortools:v2', 'noortools:v1'] as const
const empty: AppState = {
  version: 3,
  location: null,
  prayerSettings: { method: 'MWL', hanafi: false, highLatitude: 'none' },
  salah: {},
  tasbih: { count: 0, target: 33, dhikr: 'SubhanAllah', sessions: [], total: 0, haptic: true, sound: false },
}

const cloneEmpty = () => structuredClone(empty)
const nonNegative = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
const positive = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

function validLocation(value: unknown): LocationState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const timeZone = typeof v.timeZone === 'string' && v.timeZone.trim() ? v.timeZone : null
  return typeof v.label === 'string' && typeof v.lat === 'number' && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 && typeof v.lon === 'number' && Number.isFinite(v.lon) && Math.abs(v.lon) <= 180
    ? { label: v.label, lat: v.lat, lon: v.lon, timeZone } : null
}

function validSalah(value: unknown): SalahState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: SalahState = {}
  for (const [date, record] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !record || typeof record !== 'object' || Array.isArray(record)) continue
    const cleaned: SalahRecord = {}
    for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) if ((record as Record<string, unknown>)[name] === true) cleaned[name] = true
    if (Object.keys(cleaned).length) result[date] = cleaned
  }
  return result
}

function validSessions(value: unknown): TasbihSession[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(s => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return []
    const item = s as Record<string, unknown>
    const date = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : ''
    const count = nonNegative(item.count, 0)
    const target = positive(item.target, 33)
    const dhikr = typeof item.dhikr === 'string' && item.dhikr.trim() ? item.dhikr.trim() : 'SubhanAllah'
    return date && count > 0 ? [{ date, count, target, dhikr }] : []
  })
}

function validPrayerSettings(value: unknown): PrayerSettingsState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty.prayerSettings
  const p = value as Record<string, unknown>
  const method = p.method === 'ISNA' ? 'ISNA' : 'MWL'
  const highLatitude = p.highLatitude === 'angleBased' || p.highLatitude === 'oneSeventh' || p.highLatitude === 'middleOfNight' ? p.highLatitude : 'none'
  return { method, hanafi: p.hanafi === true, highLatitude }
}

function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return cloneEmpty()
  const parsed = raw as { version?: unknown; location?: unknown; prayerSettings?: unknown; salah?: unknown; tasbih?: unknown }
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== undefined) return cloneEmpty()
  const t = parsed.tasbih && typeof parsed.tasbih === 'object' && !Array.isArray(parsed.tasbih) ? parsed.tasbih as Record<string, unknown> : {}
  return {
    version: 3,
    location: validLocation(parsed.location),
    prayerSettings: validPrayerSettings(parsed.prayerSettings),
    salah: validSalah(parsed.salah),
    tasbih: {
      count: nonNegative(t.count, 0),
      target: positive(t.target, 33),
      dhikr: typeof t.dhikr === 'string' && t.dhikr.trim() ? t.dhikr.trim() : 'SubhanAllah',
      sessions: validSessions(t.sessions),
      total: nonNegative(t.total, 0),
      haptic: typeof t.haptic === 'boolean' ? t.haptic : true,
      sound: typeof t.sound === 'boolean' ? t.sound : false,
    },
  }
}

export function localDateKey(date = new Date(), timeZone?: string) {
  if (!timeZone) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value])) as Record<string, string>
  return `${values.year}-${values.month}-${values.day}`
}

export function loadState(): AppState {
  try {
    const current = localStorage.getItem(KEY)
    if (current) return migrate(JSON.parse(current))
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key)
      if (legacy) return migrate(JSON.parse(legacy))
    }
  } catch { return cloneEmpty() }
  return cloneEmpty()
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify({ ...state, version: 3 }))
}

export function resetState() {
  localStorage.removeItem(KEY)
  for (const key of LEGACY_KEYS) localStorage.removeItem(key)
  return cloneEmpty()
}

export function exportData(state: AppState): string {
  const envelope: ExportEnvelope = { schema: 'noortools.local-data', version: 3, data: { location: state.location, prayerSettings: state.prayerSettings, salah: state.salah, tasbih: state.tasbih } }
  return JSON.stringify(envelope, null, 2)
}

export function parseImportedData(text: string): AppState {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Import file is too large or invalid.')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('Import file is not valid JSON.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Import file must contain a NoorTools data object.')
  const envelope = parsed as Partial<ExportEnvelope>
  if (envelope.schema !== 'noortools.local-data') throw new Error('This file is not a NoorTools local-data export.')
  if (typeof envelope.version !== 'number' || ![1, 2, 3].includes(envelope.version)) throw new Error('Unsupported NoorTools data version.')
  if (!envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) throw new Error('NoorTools export data is missing.')
  return migrate({ ...(envelope.data as Record<string, unknown>), version: envelope.version })
}

function daysAgo(today: Date, key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const d = new Date(year, month - 1, day, 12)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  return Math.round((t.getTime() - d.getTime()) / 86400000)
}

export function salahStats(salah: SalahState, today = new Date(), timeZone?: string) {
  const todayKey = localDateKey(today, timeZone)
  const days = Object.entries(salah).filter(([, value]) => Object.values(value).some(Boolean)).map(([key, value]) => ({ key, completed: Object.values(value).filter(Boolean).length }))
  const todayCompleted = Object.values(salah[todayKey] ?? {}).filter(Boolean).length
  const within = (limit: number) => days.filter(({ key }) => { const diff = daysAgo(today, key); return diff >= 0 && diff < limit }).reduce((sum, day) => sum + day.completed, 0)
  let streak = 0
  const cursor = new Date(today)
  while (Object.values(salah[localDateKey(cursor, timeZone)] ?? {}).filter(Boolean).length === 5) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return { todayCompleted, last7: within(7), last30: within(30), streak }
}

export function tasbihStats(sessions: TasbihSession[], today = new Date(), timeZone?: string) {
  const todayKey = localDateKey(today, timeZone)
  const within = (limit: number) => sessions.filter(session => { const diff = daysAgo(today, session.date); return diff >= 0 && diff < limit }).reduce((sum, session) => sum + session.count, 0)
  const dates = new Set(sessions.map(session => session.date))
  let streak = 0
  const cursor = new Date(today)
  while (dates.has(localDateKey(cursor, timeZone))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return { today: sessions.filter(s => s.date === todayKey).reduce((sum, s) => sum + s.count, 0), last7: within(7), last30: within(30), streak }
}
