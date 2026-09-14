import { useEffect, useMemo, useState } from 'react'
import { calculatePrayerTimes, nextPrayer, qiblaBearing, type Prayer } from './prayer'
import { loadState, resetState, saveState, type AppState } from './storage'

const salahNames = ['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const
const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dateKey = (d = new Date()) => d.toISOString().slice(0, 10)

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [view, setView] = useState<'home'|'prayer'|'qibla'|'salah'|'tasbih'|'settings'>('home')
  const [now, setNow] = useState(new Date())
  const [manual, setManual] = useState({ label: '', lat: '', lon: '' })
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('noortools:theme') as 'light'|'dark') || 'light')

  useEffect(() => { saveState(state) }, [state])
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('noortools:theme', theme) }, [theme])

  const prayers = useMemo(() => state.location ? calculatePrayerTimes(now, state.location.lat, state.location.lon) : [], [state.location, now.toDateString()])
  const next = state.location && prayers.length ? nextPrayer(prayers, now) : null
  const countdown = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0
  const cd = `${String(Math.floor(countdown/3600000)).padStart(2,'0')}:${String(Math.floor(countdown%3600000/60000)).padStart(2,'0')}:${String(Math.floor(countdown%60000/1000)).padStart(2,'0')}`
  const today = state.salah[dateKey()] || {}

  const setLocation = (loc: {lat:number;lon:number;label:string}) => setState(s => ({...s, location: loc}))
  const requestLocation = () => navigator.geolocation?.getCurrentPosition(p => setLocation({lat:p.coords.latitude, lon:p.coords.longitude, label:'Current location'}), () => alert('Location permission was denied. You can enter a location manually.'))
  const addSalah = (name: typeof salahNames[number]) => setState(s => ({...s, salah: {...s.salah, [dateKey()]: {...(s.salah[dateKey()]||{}), [name]: !(s.salah[dateKey()]||{})[name]}}}))
  const increment = () => setState(s => ({...s, tasbih:{...s.tasbih,count:s.tasbih.count+1,total:s.tasbih.total+1}}))

  return <div className="app">
    <header className="topbar"><button className="brand" onClick={() => setView('home')}><span className="mark">ن</span><span><b>NoorTools</b><small>Islamic companion</small></span></button><div className="top-actions"><button onClick={() => setView('settings')} aria-label="Settings">⚙</button></div></header>
    <main>
      {view === 'home' && <section className="page">
        <div className="hero"><div><p className="eyebrow">{now.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'})}</p><h1>Assalamu Alaikum</h1><p className="muted">A calm place for your daily worship.</p></div><div className="arabic">نور</div></div>
        {!state.location ? <div className="card location-card"><div><span className="icon">⌖</span><h2>Choose your location</h2><p className="muted">Prayer times need your location. NoorTools never silently assumes one.</p></div><div className="row"><button className="primary" onClick={requestLocation}>Use my location</button><button onClick={() => setView('settings')}>Enter manually</button></div></div> : <>
          <div className="card next-card"><div><span className="eyebrow">NEXT PRAYER</span><h2>{next?.name || 'Prayer'}</h2><strong>{next ? fmt(next.time) : '—'}</strong></div><div className="countdown"><span>{cd}</span><small>remaining</small></div></div>
          <div className="grid two"><div className="card"><div className="card-head"><h3>Today's prayers</h3><button onClick={() => setView('prayer')}>View all</button></div>{prayers.map(p => <PrayerRow key={p.name} p={p} active={next?.name===p.name} />)}</div><div className="stack"><button className="feature-card" onClick={() => setView('qibla')}><span>◉</span><div><b>Qibla</b><small>{Math.round(qiblaBearing(state.location!.lat,state.location!.lon))}° from north</small></div><i>›</i></button><button className="feature-card" onClick={() => setView('tasbih')}><span>◌</span><div><b>Tasbih</b><small>{state.tasbih.total} total counts</small></div><i>›</i></button><button className="feature-card" onClick={() => setView('salah')}><span>✓</span><div><b>Salah tracker</b><small>{Object.values(today).filter(Boolean).length}/5 today</small></div><i>›</i></button></div></div>
        </>}
        <div className="empty-panel"><span>✦</span><div><h3>Your library is ready for verified content</h3><p>Quran, Hadith, Duas and learning content will connect here only when verified/licensed sources are available.</p></div></div>
      </section>}
      {view === 'prayer' && <section className="page"><Back title="Prayer times" onBack={()=>setView('home')} />{!state.location ? <Empty text="Select a location in Settings first."/> : <div className="card list-card">{prayers.map(p=><PrayerRow key={p.name} p={p} active={next?.name===p.name} large />)}<p className="footnote">Calculation: MWL-style angles. Asr uses standard shadow ratio. High-latitude fallback and additional methods are planned for later phases.</p></div>}</section>}
      {view === 'qibla' && <section className="page"><Back title="Qibla" onBack={()=>setView('home')} />{!state.location?<Empty text="Select a location first."/>:<div className="qibla-wrap"><div className="compass"><div className="north">N</div><div className="needle" style={{transform:`rotate(${qiblaBearing(state.location.lat,state.location.lon)}deg)`}}><span>▲</span></div><div className="kaaba">◆</div></div><h2>{Math.round(qiblaBearing(state.location.lat,state.location.lon))}°</h2><p className="muted">Qibla bearing from true north. Device compass integration will use real orientation data when supported; no simulated heading is shown.</p></div>}</section>}
      {view === 'salah' && <section className="page"><Back title="Salah tracker" onBack={()=>setView('home')} /><div className="card"><p className="muted">{now.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'})}</p>{salahNames.map(n=><label className="check-row" key={n}><span>{n}</span><input type="checkbox" checked={!!today[n]} onChange={()=>addSalah(n)}/></label>)}<p className="footnote">Nothing is pre-completed. Your history is stored only on this device.</p></div></section>}
      {view === 'tasbih' && <section className="page"><Back title="Tasbih" onBack={()=>setView('home')} /><div className="tasbih"><p className="eyebrow">{state.tasbih.dhikr} · target {state.tasbih.target}</p><button className="counter" onClick={increment}><strong>{state.tasbih.count}</strong><span>Tap to count</span></button><div className="row center"><button onClick={()=>setState(s=>({...s,tasbih:{...s.tasbih,count:0}}))}>Reset</button><button onClick={()=>setState(s=>({...s,tasbih:{...s.tasbih,count:0, sessions:s.tasbih.sessions+1}}))}>Finish session</button></div><p className="muted">Total counts: {state.tasbih.total} · Sessions: {state.tasbih.sessions}</p></div></section>}
      {view === 'settings' && <section className="page"><Back title="Settings" onBack={()=>setView('home')} /><div className="card"><h3>Appearance</h3><div className="segmented"><button className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}>Light</button><button className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}>Dark</button></div><hr/><h3>Location</h3>{state.location&&<p>{state.location.label}<br/><small>{state.location.lat.toFixed(4)}, {state.location.lon.toFixed(4)}</small></p>}<button className="primary" onClick={requestLocation}>Use device location</button><div className="manual"><input placeholder="Location name" value={manual.label} onChange={e=>setManual({...manual,label:e.target.value})}/><input placeholder="Latitude" inputMode="decimal" value={manual.lat} onChange={e=>setManual({...manual,lat:e.target.value})}/><input placeholder="Longitude" inputMode="decimal" value={manual.lon} onChange={e=>setManual({...manual,lon:e.target.value})}/><button onClick={()=>{const lat=Number(manual.lat),lon=Number(manual.lon);if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)setLocation({lat,lon,label:manual.label||'Manual location'});else alert('Enter valid latitude and longitude.')}}>Save manual location</button></div><hr/><h3>Privacy & data</h3><p className="muted">Core activity is local-only. No analytics, ads, or hidden tracking are included in Phase 1.</p><button className="danger" onClick={()=>{if(confirm('Reset all local NoorTools data?'))setState(resetState())}}>Reset local data</button></div></section>}
    </main>
    <nav className="bottom-nav">{[['home','Home','⌂'],['prayer','Prayer','◷'],['qibla','Qibla','◉'],['tasbih','Tasbih','◌'],['salah','Salah','✓']].map(([v,l,i])=><button key={v} className={view===v?'active':''} onClick={()=>setView(v as typeof view)}><span>{i}</span>{l}</button>)}</nav>
  </div>
}
function PrayerRow({p,active,large}:{p:Prayer;active?:boolean;large?:boolean}){return <div className={`prayer-row ${active?'active':''} ${large?'large':''}`}><span>{p.name}</span><time>{fmt(p.time)}</time></div>}
function Back({title,onBack}:{title:string;onBack:()=>void}){return <div className="back"><button onClick={onBack}>←</button><h1>{title}</h1></div>}
function Empty({text}:{text:string}){return <div className="empty-panel"><span>⌁</span><p>{text}</p></div>}
