import type { ContentType } from './content'

export type Bookmark = { id: string; type: ContentType; addedAt: string }
export type QuranReadingProgress = { lastReadId: string | null; positions: Record<string, { ayah: number; updatedAt: string }> }
export type ContentUserState = {
  version: 1
  bookmarks: Record<string, Bookmark>
  quran: QuranReadingProgress
  itemProgress: Record<string, { completed: number; target: number; updatedAt: string }>
}

const KEY = 'noortools:content:v1'
const EMPTY: ContentUserState = { version: 1, bookmarks: {}, quran: { lastReadId: null, positions: {} }, itemProgress: {} }
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
  return { version: 1, bookmarks, quran: { lastReadId: typeof quranSource.lastReadId === 'string' ? quranSource.lastReadId : null, positions }, itemProgress }
}

export function loadContentState(): ContentUserState { try { const raw = localStorage.getItem(KEY); return raw ? migrate(JSON.parse(raw)) : cloneEmpty() } catch { return cloneEmpty() } }
export function saveContentState(state: ContentUserState): void { localStorage.setItem(KEY, JSON.stringify({ ...state, version: 1 })) }
export function resetContentState(): ContentUserState { localStorage.removeItem(KEY); return cloneEmpty() }
export function toggleBookmark(state: ContentUserState, id: string, type: ContentType, now = new Date()): ContentUserState { const next = structuredClone(state); if (next.bookmarks[id]) delete next.bookmarks[id]; else next.bookmarks[id] = { id, type, addedAt: now.toISOString() }; return next }
export function recordQuranProgress(state: ContentUserState, surah: number, ayah: number, now = new Date()): ContentUserState { if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) return state; const next = structuredClone(state); const id = `quran:${surah}`; next.quran.lastReadId = id; next.quran.positions[id] = { ayah, updatedAt: now.toISOString() }; return next }
export function setItemProgress(state: ContentUserState, id: string, completed: number, target: number, now = new Date()): ContentUserState { if (!id.trim() || !Number.isInteger(completed) || completed < 0 || !Number.isInteger(target) || target <= 0 || completed > target) return state; const next = structuredClone(state); next.itemProgress[id] = { completed, target, updatedAt: now.toISOString() }; return next }
export function bookmarkCount(state: ContentUserState): number { return Object.keys(state.bookmarks).length }
