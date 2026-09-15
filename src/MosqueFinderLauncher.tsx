import { useEffect, useMemo, useState } from 'react'
import { loadState } from './storage'
import { timezoneFromCoordinates } from './timezone'
import { buildLocalReportPackage, externalDirectionsUrl, formatDistance, nearbyMosques, OSM_METADATA, reportCategories, searchLocations, sortByDistance, type Coordinate, type GeocodeResult, type Mosque, type ReportCategory } from './mosque'
import { cacheAgeLabel, cachedResultsForDisplay, loadMosqueCache, saveMosqueCache, type MosqueCacheState } from './mosqueStorage'

function validCoordinatePair(lat: number, lon: number) { return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180 }
function canSaveLocationChoice(): boolean { return window.confirm('Save this location in NoorTools? This stores the selected coordinates locally until you change or reset them.') }

export default function MosqueFinderLauncher() {
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState<Coordinate | null>(null)
  const [originLabel, setOriginLabel] = useState('')
  const [permission, setPermission] = useState<'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [locationError, setLocationError] = useState('')
  const [query, setQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([])
  const [results, setResults] = useState<ReturnType<typeof sortByDistance>>([])
  const [selected, setSelected] = useState<Mosque | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [radius, setRadius] = useState(5000)
  const [cache, setCache] = useState<MosqueCacheState>(() => loadMosqueCache())
  const [reportCategory, setReportCategory] = useState<ReportCategory>(reportCategories()[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [prepared, setPrepared] = useState(false)

  useEffect(() => {
    if (!open) return
    const appLocation = loadState().location
    if (appLocation && validCoordinatePair(appLocation.lat, appLocation.lon)) { setOrigin({ lat: appLocation.lat, lon: appLocation.lon }); setOriginLabel(appLocation.label || 'NoorTools selected location') }
    else {
      try { const raw = localStorage.getItem('noortools:phase3d:chosen-location'); if (raw) { const v = JSON.parse(raw) as Partial<Coordinate>; if (typeof v.lat === 'number' && typeof v.lon === 'number' && validCoordinatePair(v.lat, v.lon)) { setOrigin({ lat: v.lat, lon: v.lon }); setOriginLabel('Saved local location') } } } catch { /* malformed optional preference is ignored */ }
    }
    if (!navigator.geolocation) { setPermission('unsupported'); return }
    navigator.permissions?.query?.({ name: 'geolocation' }).then(p => setPermission(p.state as 'prompt' | 'granted' | 'denied')).catch(() => undefined)
  }, [open])
  const displayResults = useMemo(() => results.length ? results : cachedResultsForDisplay(cache, origin), [results, cache, origin])
  const setChosenLocation = (lat: number, lon: number, label: string, save = false) => {
    try { timezoneFromCoordinates(lat, lon); const next = { lat, lon }; setOrigin(next); setOriginLabel(label); setLocationError(''); if (save) localStorage.setItem('noortools:phase3d:chosen-location', JSON.stringify(next)) } catch { setLocationError('That location does not resolve to a valid timezone.') }
  }
  const useMyLocation = () => {
    if (!navigator.geolocation) { setPermission('unsupported'); setLocationError('This browser does not provide location access. Use manual location search.'); return }
    setPermission('prompt'); setLocationError('')
    navigator.geolocation.getCurrentPosition(p => { setPermission('granted'); setAccuracy(p.coords.accuracy); const save = canSaveLocationChoice(); setChosenLocation(p.coords.latitude, p.coords.longitude, 'Current device location', save) }, e => { setPermission(e.code === 1 ? 'denied' : 'unknown'); setLocationError(e.code === 1 ? 'Location permission was denied. Manual search remains available.' : 'Location could not be determined. Manual search remains available.') }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 })
  }
  const searchPlace = async () => {
    setSearchError('');
    try { setPlaceResults(await searchLocations(query)) } catch (e) { setSearchError(e instanceof Error ? e.message : 'Location search failed.') }
  }
  const choosePlace = (place: GeocodeResult) => { setChosenLocation(place.lat, place.lon, place.label); setQuery(place.label); setPlaceResults([]); void findMosques({ lat: place.lat, lon: place.lon }, place.label) }
  const findMosques = async (where = origin, whereLabel = originLabel) => {
    if (!where) { setSearchError('Choose a location first.'); return }
    setLoading(true); setSearchError(''); setSelected(null)
    try { const live = await nearbyMosques(where, radius); setResults(sortByDistance(live, where)); setCache(saveMosqueCache(where, whereLabel, live)) }
    catch (e) { setSearchError(e instanceof Error ? e.message : 'Nearby mosque search failed.'); const cached = loadMosqueCache(); setCache(cached); setResults([]) }
    finally { setLoading(false) }
  }
  const saveReport = () => {
    if (!selected) return
    const text = buildLocalReportPackage(selected, reportCategory, reportDetails)
    const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `noortools-mosque-report-${selected.id.replace(/[^a-z0-9:-]/gi, '-')}.json`; link.click(); URL.revokeObjectURL(url)
    setReportOpen(false); setReportDetails(''); setPrepared(true); window.setTimeout(() => setPrepared(false), 2500)
  }
  const clearSavedLocation = () => { localStorage.removeItem('noortools:phase3d:chosen-location'); setOrigin(null); setOriginLabel(''); setResults([]) }
  const openDirections = (mosque: Mosque) => window.open(externalDirectionsUrl(origin, mosque.coordinates), '_blank', 'noopener,noreferrer')
  return <>
    <button className="phase3d-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog">Mosque Finder</button>
    {open && <div className="mosque-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <section className="mosque-dialog" role="dialog" aria-modal="true" aria-labelledby="mosque-title">
        <header className="mosque-header"><div><span className="eyebrow">LOCAL COMMUNITY</span><h2 id="mosque-title">Mosque Finder</h2><p>Real OpenStreetMap geospatial data. Missing details stay unavailable.</p></div><button aria-label="Close Mosque Finder" onClick={() => { setOpen(false); setReportOpen(false) }}>×</button></header>
        {!selected ? <>
          <div className="mosque-hero"><div><span>NEAREST MOSQUE</span><strong>{displayResults[0]?.name || 'Choose a location'}</strong><small>{displayResults[0] ? `${displayResults[0].distanceLabel} · approx. straight-line distance` : 'No mosque selected yet.'}</small></div><button className="primary" onClick={() => displayResults[0] && setSelected(displayResults[0])} disabled={!displayResults[0]}>View nearest</button></div>
          <div className="mosque-location-row"><button onClick={useMyLocation}>Use my location</button><div className="permission-note">{permission === 'denied' ? 'Permission denied — manual fallback is active.' : permission === 'granted' && accuracy != null ? `Location permission granted · accuracy reported by device: ±${Math.round(accuracy)} m` : 'Precise location is not stored by this feature unless you choose Save.'}</div></div>
          {locationError && <p className="error" role="alert">{locationError}</p>}
          <div className="mosque-search"><label htmlFor="mosque-place">Search city, area, or mosque name</label><div className="search-line"><input id="mosque-place" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void searchPlace() }} placeholder="e.g. city, locality, mosque name" maxLength={160} /><button onClick={() => void searchPlace()} disabled={!query.trim()}>Search</button></div>{placeResults.length > 0 && <div className="place-results">{placeResults.map(place => <button key={`${place.lat}:${place.lon}:${place.label}`} onClick={() => choosePlace(place)}>{place.label}</button>)}</div>}{searchError && <p className="error" role="alert">{searchError}</p>}</div>
          <div className="mosque-controls"><label>Radius <select value={radius} onChange={e => setRadius(Number(e.target.value))}><option value="2000">2 km</option><option value="5000">5 km</option><option value="10000">10 km</option></select></label><button className="primary" onClick={() => void findMosques()} disabled={!origin || loading}>{loading ? 'Finding…' : 'Find nearby mosques'}</button></div>
          {origin && <div className="origin-chip">Search origin: {originLabel || `${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}`} {originLabel && <button onClick={clearSavedLocation}>Clear saved choice</button>}</div>}
          <div className="mosque-list" aria-live="polite">{displayResults.map(m => <article className="mosque-card" key={m.id}><div><h3>{m.name || 'Unnamed place of worship'}</h3><p>{m.address || 'Address unavailable from source.'}</p><span>{m.distanceLabel}{m.distanceMeters != null ? ' · approx. straight-line distance' : ''}</span></div><button onClick={() => setSelected(m)}>Details</button></article>)}{!loading && displayResults.length === 0 && <div className="empty-state"><strong>{cache.results.length ? 'No fresh results; a cached set is unavailable for this origin.' : 'No nearby mosques loaded yet.'}</strong><p>Allow location or choose a city/area, then search nearby. No mosque is fabricated when the provider has no result.</p></div>}</div>
          <footer className="mosque-source"><b>Source:</b> {OSM_METADATA.provider}. {OSM_METADATA.attribution}. <a href={OSM_METADATA.licenseUrl} target="_blank" rel="noreferrer">License</a> · <a href={OSM_METADATA.policyUrl} target="_blank" rel="noreferrer">Service policies</a><br /><small>Public services are rate-limited; production/commercial deployments should move to self-hosted or paid infrastructure where required by provider guidance.</small>{cache.fetchedAt && !results.length && <div className="stale-warning" role="status">Showing cached source data from {cacheAgeLabel(cache.fetchedAt)}. It may be stale and is not live.</div>}</footer>
        </> : <MosqueDetail mosque={selected} origin={origin} onBack={() => setSelected(null)} onDirections={() => openDirections(selected)} onReport={() => setReportOpen(true)} />}
        {reportOpen && selected && <div className="report-backdrop"><div className="report-card" role="dialog" aria-modal="true" aria-labelledby="report-title"><h3 id="report-title">Report incorrect information</h3><p className="muted">This creates a local submission package. It is not automatically sent to OpenStreetMap or any provider.</p><label>Issue <select value={reportCategory} onChange={e => setReportCategory(e.target.value as ReportCategory)}>{reportCategories().map(x => <option key={x}>{x}</option>)}</select></label><label>Details <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={2000} rows={5} placeholder="Describe the correction…" /></label><div className="report-actions"><button onClick={() => setReportOpen(false)}>Cancel</button><button className="primary" onClick={saveReport}>Prepare report file</button></div>{prepared && <p role="status">Local report package prepared.</p>}</div></div>}
      </section>
    </div>}
  </>
}
function MosqueDetail({ mosque, origin, onBack, onDirections, onReport }: { mosque: Mosque; origin: Coordinate | null; onBack: () => void; onDirections: () => void; onReport: () => void }) {
  const distance = origin ? formatDistance(distanceForDetail(origin, mosque.coordinates)) : null
  return <div className="mosque-detail"><button className="back-link" onClick={onBack}>← Back to results</button><div className="detail-hero"><span className="eyebrow">MOSQUE DETAIL</span><h2>{mosque.name || 'Unnamed place of worship'}</h2><p>{mosque.address || 'Address unavailable from source.'}</p><strong>{distance ? `${distance} · approx. straight-line distance` : 'Distance unavailable'}</strong><div className="detail-actions"><button className="primary" onClick={onDirections}>Directions</button><button onClick={onReport}>Report issue</button></div></div>
    <div className="detail-grid"><Field label="Coordinates" value={`${mosque.coordinates.lat.toFixed(6)}, ${mosque.coordinates.lon.toFixed(6)}`} /><Field label="Phone" value={mosque.phone} link={mosque.phone ? `tel:${mosque.phone.replace(/[^0-9+]/g, '')}` : undefined} /><Field label="Website" value={mosque.website} link={mosque.website || undefined} /><Field label="Opening hours" value={mosque.openingHours} /><Field label="Open / closed status" value={null} /><Field label="Source last updated" value={mosque.lastUpdated} /></div>
    <div className="detail-panel"><h3>Facilities</h3>{mosque.facilities.length ? <div className="facility-list">{mosque.facilities.map(x => <span key={x}>{x}</span>)}</div> : <p className="muted">Unavailable from source.</p>}</div>
    <div className="detail-panel"><h3>Jummah</h3><p className="muted">{mosque.jummah.length ? 'Source-provided sessions shown here.' : 'Verified mosque Jummah timetable unavailable.'}</p>{mosque.jummah.map((x, i) => <p key={`${x.time}-${i}`}><b>{x.label || `Session ${i + 1}`}</b> · {x.time}</p>)}</div>
    <div className="detail-panel"><h3>Prayer timetable</h3><p className="muted">{mosque.mosqueTimetable ? 'Mosque-provided timetable is available to the provider adapter.' : 'Verified mosque timetable unavailable.'}</p><small>NoorTools calculated prayer times are never substituted for a mosque timetable. Mosque-specific past/current/upcoming states remain unavailable until a verified mosque timetable is supplied.</small></div>
    <div className="detail-panel"><h3>Map / coordinates</h3><p className="muted">No proprietary map is embedded. Directions open using OpenStreetMap's public directions interface.</p><a href={mosque.sourceUrl} target="_blank" rel="noreferrer">Open source record ↗</a></div>
  </div>
}
function distanceForDetail(a: Coordinate, b: Coordinate) { const rad = Math.PI / 180; const dLat = (b.lat - a.lat) * rad; const dLon = (b.lon - a.lon) * rad; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2; return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) }
function Field({ label, value, link }: { label: string; value: string | null; link?: string }) { return <div className="field"><span>{label}</span>{value ? link ? <a href={link} target={link.startsWith('http') ? '_blank' : undefined} rel={link.startsWith('http') ? 'noreferrer' : undefined}>{value}</a> : <b>{value}</b> : <b className="muted">Unavailable</b>}</div> }
