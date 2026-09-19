import { useEffect, useMemo, useState } from 'react'
import { calculatePrayerTimes, currentPrayer, nextPrayer, qiblaBearing, type HighLatitudeMethod, type Prayer, type PrayerSettings } from './prayer'
import { exportData, loadState, localDateKey, parseImportedData, resetState, saveState, salahStats, tasbihStats, type AppState, type SalahName } from './storage'
import { localParts, timezoneFromCoordinates, timezoneLabel } from './timezone'

const salahNames: SalahName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const prayerSettingsFromState = (state: AppState): PrayerSettings => state.prayerSettings
type View = 'home' | 'prayer' | 'qibla' | 'salah' | 'tasbih' | 'settings'
type OrientationState = { supported: boolean; enabled: boolean; heading: number | null; accuracy: number | null; message: string }

function fmt(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date)
}
function dateLabel(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(date)
}
function goBackView() { history.back() }

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [view, setView] = useState<View>('home')
  const [now, setNow] = useState(new Date())
  const [manual, setManual] = useState({ label: '', lat: '', lon: '' })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('noortools:theme') as 'light' | 'dark') || 'light')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [dataMessage, setDataMessage] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [orientation, setOrientation] = useState<OrientationState>({ supported: 'DeviceOrientationEvent' in window, enabled: false, heading: null, accuracy: null, message: 'Compass sensor not enabled.' })

  useEffect(() => saveState(state), [state])
  useEffect(() => { history.replaceState({ view: 'home' }, '', location.href); const onPop = (event: PopStateEvent) => setView((event.state?.view as View | undefined) || 'home'); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])
  useEffect(() => { const onOnline = () => setOffline(false); const onOffline = () => setOffline(true); window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); const onVisible = () => setNow(new Date()); document.addEventListener('visibilitychange', onVisible); const id = window.setInterval(() => setNow(new Date()), 1000); return () => { window.clearInterval(id); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); document.removeEventListener('visibilitychange', onVisible) } }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('noortools:theme', theme) }, [theme])
  useEffect(() => {
    if (!state.location) return
    if (state.location.timeZone) return
    try { const timeZone = timezoneFromCoordinates(state.location.lat, state.location.lon); setState(s => s.location ? { ...s, location: { ...s.location, timeZone } } : s) } catch { setLocationError('Could not resolve the selected location timezone. Choose a location again.') }
  }, [state.location])
  useEffect(() => {
    if (!navigator.permissions?.query) return
    let permission: PermissionStatus | undefined
    navigator.permissions.query({ name: 'geolocation' }).then(result => { permission = result; result.onchange = () => { if (result.state === 'denied') setLocationError('Location permission is currently denied. Manual location remains available.') } }).catch(() => undefined)
    return () => { if (permission) permission.onchange = null }
  }, [])

  const tz = state.location?.timeZone ?? null
  const todayKey = localDateKey(now, tz ?? undefined)
  const prayers = useMemo(() => state.location && tz ? calculatePrayerTimes(now, state.location.lat, state.location.lon, tz, prayerSettingsFromState(state)) : [], [state, tz, todayKey])
  const next = state.location && tz && prayers.length ? nextPrayer(prayers, state.location.lat, state.location.lon, tz, prayerSettingsFromState(state), now) : null
  const current = currentPrayer(prayers, now)
  const ms = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0
  const cd = `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}`
  const todaySalah = state.salah[todayKey] || {}
  const salah = salahStats(state.salah, now, tz ?? undefined)
  const tasbih = tasbihStats(state.tasbih.sessions, now, tz ?? undefined)

  const navigate = (nextView: View) => { history.pushState({ view: nextView }, '', `#${nextView}`); setView(nextView) }
  const setLocation = (lat: number, lon: number, label: string) => {
    try {
      const timeZone = timezoneFromCoordinates(lat, lon)
      setState(s => ({ ...s, location: { lat, lon, label, timeZone } }))
      setLocationError('')
      navigate('home')
    } catch { setLocationError('The coordinates could not be resolved to a timezone. Check the values and try again.') }
  }
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationError('This browser does not provide location access. Enter a location manually.'); return }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(p => { setLocationLoading(false); setLocation(p.coords.latitude, p.coords.longitude, 'Current device location') }, error => { setLocationLoading(false); setLocationError(error.code === 1 ? 'Location permission was denied. Enter a location manually below.' : 'Location could not be determined. Enter a location manually below.') }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 })
  }
  const toggleSalah = (name: SalahName) => setState(s => ({ ...s, salah: { ...s.salah, [todayKey]: { ...(s.salah[todayKey] || {}), [name]: !(s.salah[todayKey] || {})[name] } } }))
  const increment = () => { setState(s => ({ ...s, tasbih: { ...s.tasbih, count: s.tasbih.count + 1, total: s.tasbih.total + 1 } })); if (state.tasbih.haptic) navigator.vibrate?.(10) }
  const finishSession = () => { if (state.tasbih.count <= 0) return; setState(s => ({ ...s, tasbih: { ...s.tasbih, count: 0, sessions: [...s.tasbih.sessions, { date: todayKey, count: s.tasbih.count, target: s.tasbih.target, dhikr: s.tasbih.dhikr }] } })) }

  const enableOrientation = async () => {
    if (!('DeviceOrientationEvent' in window)) { setOrientation(o => ({ ...o, supported: false, message: 'Device orientation is not supported in this browser.' })); return }
    try {
      const DeviceOrientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
      if (typeof DeviceOrientation.requestPermission === 'function' && await DeviceOrientation.requestPermission() !== 'granted') { setOrientation(o => ({ ...o, enabled: false, message: 'Compass permission was denied.' })); return }
      setOrientation(o => ({ ...o, enabled: true, message: 'Use figure-eight calibration if the real heading seems unstable.' }))
    } catch { setOrientation(o => ({ ...o, enabled: false, message: 'Compass permission could not be requested.' })) }
  }
  useEffect(() => {
    if (!orientation.enabled) return
    const onOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const heading = typeof webkitHeading === 'number' && Number.isFinite(webkitHeading) ? webkitHeading : event.absolute && typeof event.alpha === 'number' ? (360 - event.alpha + 360) % 360 : null
      const accuracyValue = (event as DeviceOrientationEvent & { webkitCompassAccuracy?: number }).webkitCompassAccuracy
      setOrientation(o => ({ ...o, heading, accuracy: typeof accuracyValue === 'number' ? accuracyValue : null, message: heading == null ? 'No usable absolute/device compass heading is exposed.' : o.message }))
    }
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)
    return () => { window.removeEventListener('deviceorientationabsolute', onOrientation); window.removeEventListener('deviceorientation', onOrientation) }
  }, [orientation.enabled])

  const downloadExport = () => {
    const blob = new Blob([exportData(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `noortools-data-v${state.version}.json`; link.click(); URL.revokeObjectURL(url); setDataMessage('Your local NoorTools data was exported. Theme and no secrets are included.')
  }
  const importFile = async (file: File) => {
    try {
      const imported = parseImportedData(await file.text())
      if (imported.location) imported.location.timeZone = imported.location.timeZone || timezoneFromCoordinates(imported.location.lat, imported.location.lon)
      if (!confirm('Replace your current NoorTools local data with this validated import? This cannot be undone.')) return
      setState(imported); setDataMessage('Import completed successfully.'); setLocationError('')
    } catch (error) { setDataMessage(error instanceof Error ? error.message : 'Import failed. Existing data was kept.') }
  }
  const updatePrayerSettings = (patch: Partial<AppState['prayerSettings']>) => setState(s => ({ ...s, prayerSettings: { ...s.prayerSettings, ...patch } }))

  return <div className="app">
    {offline && <div className="offline-banner" role="status">Offline mode: saved local features continue to work.</div>}
    <header className="topbar"><button className="brand" onClick={() => navigate('home')} aria-label="NoorTools home"><span className="mark">ن</span><span><b>NoorTools</b><small>Islamic companion</small></span></button><button onClick={() => navigate('settings')} aria-label="Settings">⚙</button></header>
    <main>
      {view === 'home' && <section className="page"><div className="hero"><div><p className="eyebrow">{dateLabel(now, tz ?? undefined)}</p><h1>Assalamu Alaikum</h1><p className="muted">A calm place for your daily worship.</p></div><div className="arabic">نور</div></div>
        {!state.location ? <div className="card location-card"><div><span>⌖</span><h2>Choose your location</h2><p className="muted">Prayer times need your location. NoorTools never silently assumes one.</p></div><div className="row"><button className="primary" onClick={requestLocation} disabled={locationLoading}>{locationLoading ? 'Locating…' : 'Use my location'}</button><button onClick={() => navigate('settings')}>Enter manually</button></div>{locationError && <p className="error" role="alert">{locationError}</p>}</div> : !tz ? <div className="card"><h2>Location timezone unavailable</h2><p className="muted">Prayer calculations are paused until the selected coordinates have an IANA timezone.</p><button onClick={() => navigate('settings')}>Review location</button></div> : <>
          <div className="card next-card"><div><span className="eyebrow">NEXT PRAYER</span><h2>{next?.name || 'Prayer'}</h2><strong>{next ? fmt(next.time, tz) : '—'}</strong><p className="muted current-label">{current ? `Current prayer: ${current}` : 'No current salah window'}</p></div><div className="countdown"><span>{cd}</span><small>remaining</small></div></div>
          <div className="grid two"><div className="card"><div className="card-head"><h3>Today's prayers</h3><button onClick={() => navigate('prayer')}>View all</button></div>{prayers.map(p => <PrayerRow key={p.name} p={p} timeZone={tz} active={current === p.name} />)}</div><div className="stack"><Feature title="Qibla" detail={`${Math.round(qiblaBearing(state.location.lat, state.location.lon))}° from true north`} onClick={() => navigate('qibla')} icon="◉"/><Feature title="Tasbih" detail={`${state.tasbih.total} total counts`} onClick={() => navigate('tasbih')} icon="◌"/><Feature title="Salah tracker" detail={`${salah.todayCompleted}/5 today · ${salah.streak} day streak`} onClick={() => navigate('salah')} icon="✓"/></div></div>
          <div className="grid two"><div className="card"><h3>Real activity</h3><p className="stat-line"><b>{salah.last7}</b> Salah records in 7 days · <b>{salah.last30}</b> in 30 days</p><p className="stat-line"><b>{tasbih.last7}</b> Tasbih counts in 7 days · <b>{tasbih.streak}</b> day Tasbih streak</p></div><div className="card"><h3>Selected timezone</h3><p className="muted"><b>{tz}</b><br />{timezoneLabel(tz)} · calculated from selected coordinates.</p></div></div>
        </>}
        {locationError && state.location && <div className="empty-panel" role="alert"><span>!</span><p>{locationError}</p></div>}
        <div className="empty-panel"><span>✦</span><div><h3>Your library is ready for verified content</h3><p>Quran, Hadith, Duas and learning content are intentionally not bundled until verified/licensed sources are available.</p></div></div></section>}

      {view === 'prayer' && <section className="page"><Back title="Prayer times" onBack={goBackView} />{!state.location || !tz ? <Empty text="Select a location with a resolvable timezone in Settings first." /> : <div className="card"><p className="muted">{dateLabel(now, tz)} · {tz}</p>{prayers.map(p => <PrayerRow key={p.name} p={p} timeZone={tz} active={current === p.name} large />)}<p className="footnote">Method: {state.prayerSettings.method}; Asr: {state.prayerSettings.hanafi ? 'Hanafi' : 'standard'} shadow ratio; high-latitude fallback: {state.prayerSettings.highLatitude}. Times are calculated for the selected location timezone, not the device timezone.</p></div>}</section>}

      {view === 'qibla' && <section className="page"><Back title="Qibla" onBack={goBackView} />{!state.location ? <Empty text="Select a location first." /> : <div className="qibla-wrap"><div className="compass"><div className="north">N</div><div className="needle" style={{ transform: `rotate(${orientation.heading == null ? qiblaBearing(state.location.lat, state.location.lon) : qiblaBearing(state.location.lat, state.location.lon) - orientation.heading}deg)` }}><span>▲</span></div><div className="kaaba">◆</div></div><h2>{Math.round(qiblaBearing(state.location.lat, state.location.lon))}°</h2><p className="muted">True bearing from the selected coordinates. Device-relative direction is shown only from a real browser/device compass heading.</p><button className="primary" onClick={enableOrientation} disabled={!orientation.supported || orientation.enabled}>{orientation.enabled ? 'Compass enabled' : 'Enable device compass'}</button><p className="sensor-status" role="status">{orientation.message}{orientation.accuracy != null ? ` Accuracy: ±${Math.round(orientation.accuracy)}°.` : ''}</p>{orientation.heading == null && orientation.enabled && <div className="empty-panel"><span>⌁</span><p>No usable device heading is exposed. The fixed true bearing remains available; no fake sensor value is substituted.</p></div>}</div>}</section>}

      {view === 'salah' && <section className="page"><Back title="Salah tracker" onBack={goBackView} /><div className="card"><p className="muted">{dateLabel(now, tz ?? undefined)}</p>{salahNames.map(n => <label className="check-row" key={n}><span>{n}</span><input type="checkbox" checked={!!todaySalah[n]} onChange={() => toggleSalah(n)} aria-label={`${n} completed`} /></label>)}<div className="stats-grid"><div><b>{salah.streak}</b><small>day full-Salah streak</small></div><div><b>{salah.last7}</b><small>records · 7 days</small></div><div><b>{salah.last30}</b><small>records · 30 days</small></div></div><p className="footnote">A streak advances only when all five Salah are explicitly recorded for a date. No prayer is auto-completed when its time passes.</p></div></section>}

      {view === 'tasbih' && <section className="page"><Back title="Tasbih" onBack={goBackView} /><div className="tasbih"><div className="row center controls"><input aria-label="Dhikr" value={state.tasbih.dhikr} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, dhikr: e.target.value } }))} placeholder="Dhikr" /><input aria-label="Target" type="number" min={1} value={state.tasbih.target} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, target: Math.max(1, Number(e.target.value) || 1) } }))} /></div><p className="eyebrow">{state.tasbih.dhikr || 'Dhikr'} · target {state.tasbih.target}</p><button className="counter" onClick={increment} aria-label="Increment Tasbih"><strong>{state.tasbih.count}</strong><span>Tap to count</span></button><div className="row center"><button onClick={() => setState(s => ({ ...s, tasbih: { ...s.tasbih, count: Math.max(0, s.tasbih.count - 1), total: Math.max(0, s.tasbih.total - 1) } }))}>Undo</button><button onClick={() => setState(s => ({ ...s, tasbih: { ...s.tasbih, count: 0 } }))}>Reset</button><button onClick={finishSession} disabled={state.tasbih.count === 0}>Finish session</button></div><div className="row center toggles"><label><input type="checkbox" checked={state.tasbih.haptic} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, haptic: e.target.checked } }))} /> Haptic</label><label><input type="checkbox" checked={state.tasbih.sound} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, sound: e.target.checked } }))} /> Sound</label></div><div className="stats-grid"><div><b>{tasbih.today}</b><small>today</small></div><div><b>{tasbih.last7}</b><small>7-day counts</small></div><div><b>{tasbih.streak}</b><small>day streak</small></div></div><div className="session-history"><h3>Recent sessions</h3>{state.tasbih.sessions.length === 0 ? <p className="muted">No completed sessions yet.</p> : state.tasbih.sessions.slice(-8).reverse().map((s, i) => <div className="session-row" key={`${s.date}-${i}`}><span>{s.date} · {s.dhikr}</span><b>{s.count}</b></div>)}</div></div></section>}

      {view === 'settings' && <section className="page"><Back title="Settings" onBack={goBackView} /><div className="card"><h3>Appearance</h3><div className="segmented"><button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}>Light</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}>Dark</button></div><hr /><h3>Prayer calculation</h3><label>Method<select value={state.prayerSettings.method} onChange={e => updatePrayerSettings({ method: e.target.value as 'MWL' | 'ISNA' })}><option value="MWL">MWL (Fajr 18°, Isha 17°)</option><option value="ISNA">ISNA (Fajr/Isha 15°)</option></select></label><label>Asr method<select value={state.prayerSettings.hanafi ? 'hanafi' : 'standard'} onChange={e => updatePrayerSettings({ hanafi: e.target.value === 'hanafi' })}><option value="standard">Standard shadow ratio</option><option value="hanafi">Hanafi shadow ratio</option></select></label><label>High-latitude fallback<select value={state.prayerSettings.highLatitude} onChange={e => updatePrayerSettings({ highLatitude: e.target.value as HighLatitudeMethod })}><option value="none">None — astronomical result only</option><option value="angleBased">Angle-based — angle/60 of night</option><option value="oneSeventh">One-seventh of night</option><option value="middleOfNight">Middle of night</option></select></label><p className="footnote">High-latitude fallbacks are calculation conventions, not newly authored religious rulings. If sunrise/sunset boundaries are unavailable, affected Fajr/Isha remain unavailable rather than being fabricated.</p><hr /><h3>Location</h3>{state.location ? <p>{state.location.label}<br /><small>{state.location.lat.toFixed(4)}, {state.location.lon.toFixed(4)}<br />Timezone: {state.location.timeZone || 'unresolved'}</small></p> : <p className="muted">No location selected.</p>}<button className="primary" onClick={requestLocation} disabled={locationLoading}>{locationLoading ? 'Locating…' : 'Use device location'}</button>{locationError && <p className="error" role="alert">{locationError}</p>}<div className="manual"><input aria-label="Location name" placeholder="Location name" value={manual.label} onChange={e => setManual({ ...manual, label: e.target.value })} /><input aria-label="Latitude" placeholder="Latitude" inputMode="decimal" value={manual.lat} onChange={e => setManual({ ...manual, lat: e.target.value })} /><input aria-label="Longitude" placeholder="Longitude" inputMode="decimal" value={manual.lon} onChange={e => setManual({ ...manual, lon: e.target.value })} /><button onClick={() => { const lat = Number(manual.lat), lon = Number(manual.lon); if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) setLocation(lat, lon, manual.label || 'Manual location'); else setLocationError('Enter valid latitude and longitude.') }}>Save manual location</button></div><hr /><h3>Privacy & data</h3><p className="muted">Core activity is local-only. Export includes only NoorTools application data, with schema version. Theme, browser state, credentials and secrets are not exported.</p><div className="row"><button onClick={downloadExport}>Export local data</button><label className="file-button">Import local data<input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.currentTarget.value = '' }} /></label></div>{dataMessage && <p className="sensor-status" role="status">{dataMessage}</p>}<button className="danger" onClick={() => { if (confirm('Reset all local NoorTools data?')) setState(resetState()) }}>Reset local data</button><hr /><h3>Android readiness</h3><p className="muted">Permissions, sensor support, vibration, safe-area CSS, browser back handling, online/offline transitions and responsive layouts are implemented defensively. Physical Android device/emulator verification is still required before any Play Store readiness claim.</p></div></section>}
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation">{[['home', 'Home', '⌂'], ['prayer', 'Prayer', '◷'], ['qibla', 'Qibla', '◉'], ['tasbih', 'Tasbih', '◌'], ['salah', 'Salah', '✓']].map(([v, l, i]) => <button key={v} className={view === v ? 'active' : ''} onClick={() => navigate(v as View)} aria-current={view === v ? 'page' : undefined}><span>{i}</span>{l}</button>)}</nav>
  </div>
}

function Feature({ title, detail, onClick, icon }: { title: string; detail: string; onClick: () => void; icon: string }) { return <button className="feature-card" onClick={onClick}><span>{icon}</span><div><b>{title}</b><small>{detail}</small></div><i>›</i></button> }
function PrayerRow({ p, active, large, timeZone }: { p: Prayer; active?: boolean; large?: boolean; timeZone: string }) { return <div className={`prayer-row ${active ? 'active' : ''} ${large ? 'large' : ''}`}><span>{p.name}</span><time dateTime={p.time.toISOString()}>{fmt(p.time, timeZone)}</time></div> }
function Back({ title, onBack }: { title: string; onBack: () => void }) { return <div className="back"><button onClick={onBack} aria-label={`Back from ${title}`}>←</button><h1>{title}</h1></div> }
function Empty({ text }: { text: string }) { return <div className="empty-panel"><span>⌁</span><p>{text}</p></div> }
