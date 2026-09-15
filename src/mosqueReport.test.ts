import { describe, expect, it } from 'vitest'
import { buildLocalReportPackage } from './mosque'
const mosque = { id: 'osm:node:1', source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/node/1', lastUpdated: null, name: 'Masjid', address: null, coordinates: { lat: 19, lon: 72 }, phone: null, website: null, openingHours: null, facilities: [], jummah: [], mosqueTimetable: null, sourceTags: {} }
describe('Phase 3D report flow', () => {
  it('creates a local, explicit report package without pretending submission occurred', () => { const parsed = JSON.parse(buildLocalReportPackage(mosque, 'wrong timetable', '<b>check</b>', '2026-09-15T00:00:00.000Z')); expect(parsed.schema).toBe('noortools.mosque-report'); expect(parsed.provider).toBe('OpenStreetMap'); expect(parsed.category).toBe('wrong timetable'); expect(parsed.details).toBe('<b>check</b>'); expect(parsed.createdAt).toBe('2026-09-15T00:00:00.000Z') })
})
