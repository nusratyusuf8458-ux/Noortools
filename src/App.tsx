import { useEffect, useMemo, useState } from 'react'
import { calculatePrayerTimes, currentPrayer, nextPrayer, qiblaBearing, type Prayer } from './prayer'
import { loadState, localDateKey, resetState, saveState, salahStats, tasbihStats, type AppState, type SalahName } from './storage'

const salahNames: SalahName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

type OrientationState = { supported: boolean; enabled: boolean; heading: number | null; accuracy: number | null; message: string }

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [view, setView] = useState<'home' | 'prayer' | 'qibla' | 'salah' | 'tasbih' | 'settings'>('home')
  const [now, setNow] = useState(new Date())
  const [manual, setManual] = useState({ label: '', lat: '', lon: '' })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('noortools:theme') as 'light' | 'dark') || 'light')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [orientation, setOrientation] = useState<OrientationState>({ supported: 'DeviceOrientationEvent' in window, enabled: false, heading: null, accuracy: null, message: 'Compass sensor not enabled.' })

  useEffect(() => saveState(state), [state])
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('noortools:theme', theme) }, [theme])

  const prayers = useMemo(() => state.location ? calculatePrayerTimes(now, state.location.lat, state.location.lon) : [], [state.location, localDateKey(now)])
  const next = state.location && prayers.length ? nextPrayer(prayers, state.location.lat, state.location.lon, now) : null
  const current = currentPrayer(prayers, now)
  const ms = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0
  const cd = `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}`
  const todayKey = localDateKey(now)
  const todaySalah = state.salah[todayKey] || {}
  const salah = salahStats(state.salah, now)
  const tasbih = tasbihStats(state.tasbih.sessions, now)

  const setLocation = (loc: { lat: number; lon: number; label: string }) => {
    setState(s => ({ ...s, location: loc }))
    setLocationError('')
  }

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationError('This browser does not provide location access. Enter coordinates manually.'); return }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Current device location' }); setLocationLoading(false) },
      error => { setLocationLoading(false); setLocationError(error.code === 1 ? 'Location permission was denied. Enter a location manually below.' : 'Location could not be determined. Enter a location manually below.') },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    )
  }

  const toggleSalah = (name: SalahName) => setState(s => ({ ...s, salah: { ...s.salah, [todayKey]: { ...(s.salah[todayKey] || {}), [name]: !(s.salah[todayKey] || {})[name] } } }))

  const playClick = () => {
    if (!state.tasbih.sound) return
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return
      const ctx = new AudioContextCtor()
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.frequency.value = 880; gain.gain.value = 0.035; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.025)
      osc.addEventListener('ended', () => void ctx.close())
    } catch { /* sound is optional */ }
  }

  const increment = () => {
    setState(s => ({ ...s, tasbih: { ...s.tasbih, count: s.tasbih.count + 1, total: s.tasbih.total + 1 } }))
    if (state.tasbih.haptic) navigator.vibrate?.(10)
    playClick()
  }

  const finishSession = () => {
    if (state.tasbih.count <= 0) return
    setState(s => ({ ...s, tasbih: { ...s.tasbih, count: 0, sessions: [...s.tasbih.sessions, { date: todayKey, count: s.tasbih.count, target: s.tasbih.target, dhikr: s.tasbih.dhikr }] } }))
  }

  const enableOrientation = async () => {
    if (!('DeviceOrientationEvent' in window)) { setOrientation(o => ({ ...o, supported: false, message: 'Device orientation is not supported in this browser.' })); return }
    try {
      const DeviceOrientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
      if (typeof DeviceOrientation.requestPermission === 'function') {
        const permission = await DeviceOrientation.requestPermission()
        if (permission !== 'granted') { setOrientation(o => ({ ...o, enabled: false, message: 'Compass permission was denied.' })); return }
      }
      setOrientation(o => ({ ...o, enabled: true, message: 'Move the phone slowly in a figure-eight if the heading seems unstable.' }))
    } catch {
      setOrientation(o => ({ ...o, enabled: false, message: 'Compass permission could not be requested.' }))
    }
  }

  useEffect(() => {
    if (!orientation.enabled) return
    const onOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const heading = typeof webkitHeading === 'number' && Number.isFinite(webkitHeading) ? webkitHeading : (event.absolute && typeof event.alpha === 'number' ? (360 - event.alpha + 360) % 360 : null)
      const accuracy = (event as DeviceOrientationEvent & { webkitCompassAccuracy?: number }).webkitCompassAccuracy
      setOrientation(o => ({ ...o, heading, accuracy: typeof accuracy === 'number' ? accuracy : null, message: heading == null ? 'The browser exposed orientation data but not a usable compass heading.' : o.message }))
    }
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)
    return () => { window.removeEventListener('deviceorientationabsolute', onOrientation); window.removeEventListener('deviceorientation', onOrientation) }
  }, [orientation.enabled])

  return <div className="app">
    <header className="topbar"><button className="brand" onClick={() => setView('home')}><span className="mark">ن</span><span><b>NoorTools</b><small>Islamic companion</small></span></button><button onClick={() => setView('settings')} aria-label="Settings">⚙</button></header>
    <main>
      {view === 'home' && <section className="page"><div className="hero"><div><p className="eyebrow">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Assalamu Alaikum</h1><p className="muted">A calm place for your daily worship.</p></div><div className="arabic">نور</div></div>
        {!state.location ? <div className="card location-card"><div><span>⌖</span><h2>Choose your location</h2><p className="muted">Prayer times need your location. NoorTools never silently assumes one.</p></div><div className="row"><button className="primary" onClick={requestLocation} disabled={locationLoading}>{locationLoading ? 'Locating…' : 'Use my location'}</button><button onClick={() => setView('settings')}>Enter manually</button></div>{locationError && <p className="error">{locationError}</p>}</div> : <>
          <div className="card next-card"><div><span className="eyebrow">NEXT PRAYER</span><h2>{next?.name || 'Prayer'}</h2><strong>{next ? fmt(next.time) : '—'}</strong><p className="muted current-label">{current ? `Current prayer: ${current}` : 'No current salah window'}</p></div><div className="countdown"><span>{cd}</span><small>remaining</small></div></div>
          <div className="grid two"><div className="card"><div className="card-head"><h3>Today's prayers</h3><button onClick={() => setView('prayer')}>View all</button></div>{prayers.map(p => <PrayerRow key={p.name} p={p} active={current === p.name} />)}</div><div className="stack"><Feature title="Qibla" detail={`${Math.round(qiblaBearing(state.location.lat, state.location.lon))}° from north`} onClick={() => setView('qibla')} icon="◉"/><Feature title="Tasbih" detail={`${state.tasbih.total} total counts`} onClick={() => setView('tasbih')} icon="◌"/><Feature title="Salah tracker" detail={`${salah.todayCompleted}/5 today · ${salah.streak} day streak`} onClick={() => setView('salah')} icon="✓"/></div></div>
          <div className="grid two"><div className="card"><h3>Real activity</h3><p className="stat-line"><b>{salah.last7}</b> Salah records in 7 days · <b>{salah.last30}</b> in 30 days</p><p className="stat-line"><b>{tasbih.last7}</b> Tasbih counts in 7 days · <b>{tasbih.streak}</b> day Tasbih streak</p></div><div className="card"><h3>Timezone</h3><p className="muted">Prayer times use this device's IANA timezone: <b>{Intl.DateTimeFormat().resolvedOptions().timeZone || 'browser timezone'}</b>.</p></div></div>
        </>}
        <div className="empty-panel"><span>✦</span><div><h3>Your library is ready for verified content</h3><p>Quran, Hadith, Duas and learning content will connect here only when verified/licensed sources are available.</p></div></div></section>}

      {view === 'prayer' && <section className="page"><Back title="Prayer times" onBack={() => setView('home')} />{!state.location ? <Empty text="Select a location in Settings first." /> : <div className="card"><p className="muted">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device timezone'}</p>{prayers.map(p => <PrayerRow key={p.name} p={p} active={current === p.name} large />)}<p className="footnote">Times are calculated from astronomical solar events using MWL-style Fajr/Isha angles and standard Asr. This implementation uses the device timezone and does not silently choose a location.</p></div>}</section>}

      {view === 'qibla' && <section className="page"><Back title="Qibla" onBack={() => setView('home')} />{!state.location ? <Empty text="Select a location first." /> : <div className="qibla-wrap"><div className="compass"><div className="north">N</div><div className="needle" style={{ transform: `rotate(${orientation.heading == null ? qiblaBearing(state.location.lat, state.location.lon) : qiblaBearing(state.location.lat, state.location.lon) - orientation.heading}deg)` }}><span>▲</span></div><div className="kaaba">◆</div></div><h2>{Math.round(qiblaBearing(state.location.lat, state.location.lon))}°</h2><p className="muted">True bearing from your selected location to the Kaaba. The arrow becomes device-relative only when a real browser/device heading is available.</p><button className="primary" onClick={enableOrientation} disabled={!orientation.supported || orientation.enabled}>{orientation.enabled ? 'Compass enabled' : 'Enable device compass'}</button><p className="sensor-status">{orientation.message}{orientation.accuracy != null ? ` Accuracy: ±${Math.round(orientation.accuracy)}°.` : ''}</p>{orientation.heading == null && orientation.enabled && <div className="empty-panel"><span>⌁</span><p>No usable device heading is exposed. The fixed true bearing remains available; no fake sensor value is substituted.</p></div>}</div>}</section>}

      {view === 'salah' && <section className="page"><Back title="Salah tracker" onBack={() => setView('home')} /><div className="card"><p className="muted">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>{salahNames.map(n => <label className="check-row" key={n}><span>{n}</span><input type="checkbox" checked={!!todaySalah[n]} onChange={() => toggleSalah(n)} /></label>)}<div className="stats-grid"><div><b>{salah.streak}</b><small>day full-Salah streak</small></div><div><b>{salah.last7}</b><small>records · 7 days</small></div><div><b>{salah.last30}</b><small>records · 30 days</small></div></div><p className="footnote">A streak advances only when all five Salah are explicitly recorded for a date. No prayer is auto-completed when its time passes.</p></div></section>}

      {view === 'tasbih' && <section className="page"><Back title="Tasbih" onBack={() => setView('home')} /><div className="tasbih"><div className="row center controls"><input aria-label="Dhikr" value={state.tasbih.dhikr} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, dhikr: e.target.value } }))} placeholder="Dhikr" /><input aria-label="Target" type="number" min={1} value={state.tasbih.target} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, target: Math.max(1, Number(e.target.value) || 1) } }))} /></div><p className="eyebrow">{state.tasbih.dhikr || 'Dhikr'} · target {state.tasbih.target}</p><button className="counter" onClick={increment}><strong>{state.tasbih.count}</strong><span>Tap to count</span></button><div className="row center"><button onClick={() => setState(s => ({ ...s, tasbih: { ...s.tasbih, count: Math.max(0, s.tasbih.count - 1), total: Math.max(0, s.tasbih.total - 1) } }))}>Undo</button><button onClick={() => setState(s => ({ ...s, tasbih: { ...s.tasbih, count: 0 } }))}>Reset</button><button onClick={finishSession} disabled={state.tasbih.count === 0}>Finish session</button></div><div className="row center toggles"><label><input type="checkbox" checked={state.tasbih.haptic} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, haptic: e.target.checked } }))} /> Haptic</label><label><input type="checkbox" checked={state.tasbih.sound} onChange={e => setState(s => ({ ...s, tasbih: { ...s.tasbih, sound: e.target.checked } }))} /> Sound</label></div><div className="stats-grid"><div><b>{tasbih.today}</b><small>today</small></div><div><b>{tasbih.last7}</b><small>7-day counts</small></div><div><b>{tasbih.streak}</b><small>day streak</small></div></div><div className="session-history"><h3>Recent sessions</h3>{state.tasbih.sessions.length === 0 ? <p className="muted">No completed sessions yet.</p> : state.tasbih.sessions.slice(-8).reverse().map((s, i) => <div className="session-row" key={`${s.date}-${i}`}><span>{s.date} · {s.dhikr}</span><b>{s.count}</b></div>)}</div><p className="footnote">Counts are persistent local activity. A Tasbih streak uses only dates with a completed session; no history is seeded.</p></div></section>}

      {view === 'settings' && <section className="page"><Back title="Settings" onBack={() => setView('home')} /><div className="card"><h3>Appearance</h3><div className="segmented"><button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}>Light</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}>Dark</button></div><hr/><h3>Location</h3>{state.location && <p>{state.location.label}<br /><small>{state.location.lat.toFixed(4)}, {state.location.lon.toFixed(4)}</small></p>}<button className="primary" onClick={requestLocation} disabled={locationLoading}>{locationLoading ? 'Locating…' : 'Use device location'}</button>{locationError && <p className="error">{locationError}</p>}<div className="manual"><input placeholder="Location name" value={manual.label} onChange={e => setManual({ ...manual, label: e.target.value })} /><input placeholder="Latitude" inputMode="decimal" value={manual.lat} onChange={e => setManual({ ...manual, lat: e.target.value })} /><input placeholder="Longitude" inputMode="decimal" value={manual.lon} onChange={e => setManual({ ...manual, lon: e.target.value })} /><button onClick={() => { const lat = Number(manual.lat); const lon = Number(manual.lon); if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) setLocation({ lat, lon, label: manual.label.trim() || 'Manual location' }); else setLocationError('Enter valid latitude and longitude.') }}>Save manual location</button></div><hr/><h3>Privacy & data</h3><p className="muted">Core activity is local-only. No analytics, ads, or hidden tracking are included in Phase 1.</p><button className="danger" onClick={() => { if (confirm('Reset all local NoorTools data?')) setState(resetState()) }}>Reset local data</button></div></section>}
    </main>
    <nav className="bottom-nav">{[['home', 'Home', '⌂'], ['prayer', 'Prayer', '◷'], ['qibla', 'Qibla', '◉'], ['tasbih', 'Tasbih', '◌'], ['salah', 'Salah', '✓']].map(([v, l, i]) => <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v as typeof view)}><span>{i}</span>{l}</button>)}</nav>
  </div>
}

function Feature({ title, detail, onClick, icon }: { title: string; detail: string; onClick: () => void; icon: string }) { return <button className="feature-card" onClick={onClick}><span>{icon}</span><div><b>{title}</b><small>{detail}</small></div><i>›</i></button> }
function PrayerRow({ p, active, large }: { p: Prayer; active?: boolean; large?: boolean }) { return <div className={`prayer-row ${active ? 'active' : ''} ${large ? 'large' : ''}`}><span>{p.name}</span><time>{fmt(p.time)}</time></div> }
function Back({ title, onBack }: { title: string; onBack: () => void }) { return <div className="back"><button onClick={onBack}>←</button><h1>{title}</h1></div> }
function Empty({ text }: { text: string }) { return <div className="empty-panel"><span>⌁</span><p>{text}</p></div> }
