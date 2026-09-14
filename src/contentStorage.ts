import type { ContentType } from './content'

export type Bookmark = { id: string; type: ContentType; addedAt: string }
export type QuranReadingProgress = { lastReadId: string | null; positions: Record<string, { ayah: number; updatedAt: string }> }
export type AzkarDay = Record<string, number>
export type ContentUserState = {
  version: 2
  bookmarks: Record<string, Bookmark>
  quran: QuranReadingProgress
  itemProgress: Record<string, { completed: number; target: number; updatedAt: string }>
  azkarDaily: Record<string, AzkarDay>
}

const KEY = 'noortools:content:v2'
const LEGACY_KEY = 'noortools:content:v1'
const EMPTY: ContentUserState = { version: 2, bookmarks: {}, quran: { lastReadId: null, positions: {} }, itemProgress: {}, azkarDaily: {} }
function cloneEmpty(): ContentUserState { return structuredClone(EMPTY) }
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

function migrate(value: unknown): ContentUserState {
  if (!isObject(value)) return cloneEmpty()
  const bookmarks: Record<string, Bookmark> = {}
  if (isObject(value.bookmarks)) for (const [id, raw] of Object.entries(value.bookmarks)) {
    if (!isObject(raw)) continue
    const type = raw.type; const addedAt = raw.addedAt
    if ((type === 'quran_ayah' || type === 'allah_name' || type === 'dua' || type === 'azkar' || type === 'hadith') && typeof addedAt === 'string') bookmarks[id] = { id, type, addedAt }
  }
  const quranSource = isObject(value.quran) ? value.quran : {}
  const positions: QuranReadingProgress['positions'] = {}
  if (isObject(quranSource.positions)) for (const [surahId, raw] of Object.entries(quranSource.positions)) {
    if (!isObject(raw)) continue
    if (Number.isInteger(raw.ayah) && Number(raw.ayah) > 0 && typeof raw.updatedAt === 'string') positions[surahId] = { ayah: Number(raw.ayah), updatedAt: raw.updatedAt }
  }
  const itemProgress: ContentUserState['itemProgress'] = {}
  if (isObject(value.itemProgress)) for (const [id, raw] of Object.entries(value.itemProgress)) {
    if (!isObject(raw)) continue
    const completed = Number(raw.completed); const target = Number(raw.target)
    if (Number.isInteger(completed) && completed >= 0 && Number.isInteger(target) && target > 0 && completed <= target && typeof raw.updatedAt === 'string') itemProgress[id] = { completed, target, updatedAt: raw.updatedAt }
  }
  const azkarDaily: Record<string, AzkarDay> = {}
  if (isObject(value.azkarDaily)) for (const [date, rawDay] of Object.entries(value.azkarDaily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObject(rawDay)) continue
    const day: AzkarDay = {}
    for (const [id, count] of Object.entries(rawDay)) if (Number.isInteger(count) && Number(count) > 0) day[id] = Number(count)
    if (Object.keys(day).length) azkarDaily[date] = day
  }
  return { version: 2, bookmarks, quran: { lastReadId: typeof quranSource.lastReadId === 'string' ? quranSource.lastReadId : null, positions }, itemProgress, azkarDaily }
}

export function loadContentState(): ContentUserState {
  try {
    const current = localStorage.getItem(KEY)
    if (current) return migrate(JSON.parse(current))
    const legacy = localStorage.getItem(LEGACY_KEY)
    return legacy ? migrate(JSON.parse(legacy)) : cloneEmpty()
  } catch { return cloneEmpty() }
}
export function saveContentState(state: ContentUserState): void { localStorage.setItem(KEY, JSON.stringify({ ...state, version: 2 })) }
export function resetContentState(): ContentUserState { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); return cloneEmpty() }
export function toggleBookmark(state: ContentUserState, id: string, type: ContentType, now = new Date()): ContentUserState { const next = structuredClone(state); if (next.bookmarks[id]) delete next.bookmarks[id]; else next.bookmarks[id] = { id, type, addedAt: now.toISOString() }; return next }
export function recordQuranProgress(state: ContentUserState, surah: number, ayah: number, now = new Date()): ContentUserState { if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) return state; const next = structuredClone(state); const id = `quran:${surah}`; next.quran.lastReadId = id; next.quran.positions[id] = { ayah, updatedAt: now.toISOString() }; return next }
export function setItemProgress(state: ContentUserState, id: string, completed: number, target: number, now = new Date()): ContentUserState { if (!id.trim() || !Number.isInteger(completed) || completed < 0 || !Number.isInteger(target) || target <= 0 || completed > target) return state; const next = structuredClone(state); next.itemProgress[id] = { completed, target, updatedAt: now.toISOString() }; return next }
export function recordAzkarCount(state: ContentUserState, dateKey: string, id: string, count: number): ContentUserState { if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !id.trim() || !Number.isInteger(count) || count < 0) return state; const next = structuredClone(state); const day = next.azkarDaily[dateKey] ?? {}; if (count === 0) delete day[id]; else day[id] = count; if (Object.keys(day).length === 0) delete next.azkarDaily[dateKey]; else next.azkarDaily[dateKey] = day; return next }
export function isAzkarCompleted(state: ContentUserState, dateKey: string, id: string, target: number): boolean { return Number(state.azkarDaily[dateKey]?.[id] ?? 0) >= target }
export function bookmarkCount(state: ContentUserState): number { return Object.keys(state.bookmarks).length }
export function azkarHistoryDates(state: ContentUserState): string[] { return Object.keys(state.azkarDaily).sort().reverse() }
