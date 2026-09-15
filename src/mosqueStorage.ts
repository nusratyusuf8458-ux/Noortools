import { sortByDistance, type Coordinate, type Mosque, type MosqueResult } from './mosque'

type CacheEnvelope = { version: 1; fetchedAt: number; origin: Coordinate | null; query: string; results: Mosque[] }
const KEY = 'noortools:phase3d:mosque-cache:v1'
const MAX_CACHED = 50
const CACHE_RETENTION_MS = 24 * 60 * 60 * 1000
export type MosqueCacheState = { fetchedAt: number | null; origin: Coordinate | null; query: string; results: Mosque[]; status: 'live' | 'cached' | 'unavailable' }
const blank = (): MosqueCacheState => ({ fetchedAt: null, origin: null, query: '', results: [], status: 'unavailable' })
const valid = (raw: unknown): raw is CacheEnvelope => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const v = raw as Record<string, unknown>
  return v.version === 1 && typeof v.fetchedAt === 'number' && Number.isFinite(v.fetchedAt) && (v.origin === null || (typeof v.origin === 'object' && v.origin !== null && !Array.isArray(v.origin))) && typeof v.query === 'string' && Array.isArray(v.results)
}
export function loadMosqueCache(now = Date.now()): MosqueCacheState {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return blank(); const parsed: unknown = JSON.parse(raw); if (!valid(parsed)) return blank()
    const age = now - parsed.fetchedAt; if (age < 0 || age > CACHE_RETENTION_MS) { localStorage.removeItem(KEY); return blank() }
    return { fetchedAt: parsed.fetchedAt, origin: parsed.origin, query: parsed.query.slice(0, 160), results: parsed.results.slice(0, MAX_CACHED), status: 'cached' }
  } catch { return blank() }
}
export function saveMosqueCache(origin: Coordinate | null, query: string, results: Mosque[], now = Date.now()): MosqueCacheState {
  const clean: CacheEnvelope = { version: 1, fetchedAt: now, origin, query: query.trim().slice(0, 160), results: results.slice(0, MAX_CACHED) }
  try { localStorage.setItem(KEY, JSON.stringify(clean)) } catch { /* Cache is optional; live results still work without it. */ }
  return { fetchedAt: now, origin, query: clean.query, results: clean.results, status: 'live' }
}
export function clearMosqueCache() { localStorage.removeItem(KEY) }
export function cachedResultsForDisplay(cache: MosqueCacheState, origin: Coordinate | null): MosqueResult[] { return sortByDistance(cache.results, origin) }
export function cacheAgeLabel(fetchedAt: number | null, now = Date.now()): string { if (!fetchedAt) return 'No cached result'; const age = Math.max(0, now - fetchedAt); if (age < 60000) return 'Less than a minute ago'; if (age < 3600000) return `${Math.floor(age / 60000)}m ago`; return `${Math.floor(age / 3600000)}h ${Math.floor((age % 3600000) / 60000)}m ago` }
