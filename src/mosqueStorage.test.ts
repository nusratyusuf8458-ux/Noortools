import { beforeEach, describe, expect, it } from 'vitest'
import { cacheAgeLabel, cachedResultsForDisplay, clearMosqueCache, loadMosqueCache, saveMosqueCache } from './mosqueStorage'
const item = { id: 'osm:node:1', source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/node/1', lastUpdated: null, name: 'Masjid', address: null, coordinates: { lat: 19, lon: 72 }, phone: null, website: null, openingHours: null, facilities: [], jummah: [], mosqueTimetable: null, sourceTags: {} }
describe('Phase 3D mosque cache', () => {
  beforeEach(() => { localStorage.clear() })
  it('starts empty and never seeds fake mosque data', () => { expect(loadMosqueCache(1000).results).toEqual([]); expect(loadMosqueCache(1000).status).toBe('unavailable') })
  it('persists bounded cache and marks it as cached on reload', () => { const saved = saveMosqueCache({ lat: 19, lon: 72 }, 'Mumbai', [item], 1000); expect(saved.status).toBe('live'); const loaded = loadMosqueCache(2000); expect(loaded.status).toBe('cached'); expect(loaded.results[0].name).toBe('Masjid') })
  it('sorts cached results by the chosen origin without changing provider data', () => { const second = { ...item, id: 'osm:node:2', name: 'Near', coordinates: { lat: 19.001, lon: 72.001 } }; saveMosqueCache({ lat: 19, lon: 72 }, 'x', [item, second], 1000); expect(cachedResultsForDisplay(loadMosqueCache(2000), { lat: 19, lon: 72 })[0].name).toBe('Near') })
  it('expires cache after its bounded retention window and labels cache age', () => { expect(cacheAgeLabel(1000, 3601000)).toContain('1h'); saveMosqueCache({ lat: 19, lon: 72 }, 'x', [item], 1000); expect(loadMosqueCache(24 * 60 * 60 * 1000 + 1001).results).toEqual([]); clearMosqueCache(); expect(loadMosqueCache(Date.now()).results).toEqual([]) })
})
