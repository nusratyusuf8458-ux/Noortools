import { useEffect, useMemo, useState } from 'react'
import { calculatePrayerTimes, currentPrayer, nextPrayer, nightMidpoint, prayerTimeLabel, qiblaBearing, CALCULATION_METHODS, type CalculationMethod, type HighLatitudeMethod, type PrayerAdjustments, type PrayerName } from './prayer'
import { loadState, localDateKey, saveState, type AppState } from './storage'
import { timezoneFromCoordinates, timezoneLabel } from './timezone'
import { hijriDate, buildIslamicMonthView, shiftIslamicMonth, calendarSupportsUmmAlQura, IMPORTANT_EVENT_STATUS } from './islamicCalendar'
import { loadQuran, type QuranRuntime } from './quranRuntime'
import { loadVerifiedContent, type AllahName, type Azkar, type Dua } from './verifiedContentRuntime'
import { loadQuranTranslations, type QuranTranslation } from './quranTranslation'
import { selectDailyDhikr, selectDailyDua, selectDailyName } from './dailyContent'
import { loadCalendarAdjustment, saveCalendarAdjustment } from './calendarStorage'

const PRAYERS: Array<Exclude<PrayerName, 'Sunrise'>> = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const LOCATION_KEY = 'noortools:phase3:location-last'
type Section = 'dashboard' | 'prayer' | 'calendar'
type LocationDraft = { label: string; lat: string; lon: string }

function readLastLocation(): LocationDraft {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return { label: '', lat: '', lon: '' }
    const value = JSON.parse(raw) as { label?: unknown; lat?: unknown; lon?: unknown }
    return { label: typeof value.label === 'string' ? value.label.slice(0, 120) : '', lat: typeof value.lat === 'number' ? String(value.lat) : '', lon: typeof value.lon === 'number' ? String(value.lon) : '' }
  } catch { return { label: '', lat: '', lon: '' } }
}
function dayAtZone(now: Date, timeZone: string) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value])) as Record<string, string>; return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), 12) }
function formatCountdown(ms: number) { const total = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(total / 3600); const m = Math.floor(total % 3600 / 60); const s = total % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
function fmtDate(date: Date, timeZone: string) { return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date) }
function cleanAdjustment(value: string) { const n = Number(value); return Number.isFinite(n) ? Math.max(-120, Math.min(120, Math.round(n))) : 0 }
function progressPercent(completed: number, total: number) { return total ? Math.round(completed / total * 100) : 0 }

export default function Phase3Launcher() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<Section>('dashboard')
  const [state, setState] = useState<AppState>(loadState)
  const [draft, setDraft] = useState<LocationDraft>(readLastLocation)
  const [locationLoading, setLocationLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [quran, setQuran] = useState<QuranRuntime | null>(null)
  const [dailyContent, setDailyContent] = useState<{ names: AllahName[]; duas: Dua[]; azkar: Azkar[]; translations: QuranTranslation[] }>({ names: [], duas: [], azkar: [], translations: [] })
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date())
  const [calendarAdjustment, setCalendarAdjustment] = useState(loadCalendarAdjustment)

  useEffect(() => { if (!open) return; setState(loadState()); setDraft(readLastLocation()); setNow(new Date()); setCalendarAdjustment(loadCalendarAdjustment()); void Promise.all([loadQuran(), loadVerifiedContent(), loadQuranTranslations()]).then(([q, content, translations]) => { setQuran(q); setDailyContent({ names: content.names, duas: content.duas, azkar: content.azkar, translations: translations.translations }) }).catch(e => setError(e instanceof Error ? e.message : 'Verified content could not be loaded.')) }, [open])
  useEffect(() => { if (!open) return; saveState(state) }, [state, open])
  useEffect(() => { saveCalendarAdjustment(calendarAdjustment) }, [calendarAdjustment])
  useEffect(() => { if (!open) return; const id = window.setInterval(() => setNow(new Date()), 1000); const onVisible = () => setNow(new Date()); document.addEventListener('visibilitychange', onVisible); return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) } }, [open])

  const location = state.location
  const timeZone = location?.timeZone ?? null
  const todayKey = timeZone ? localDateKey(now, timeZone) : localDateKey(now)
  const calculationSettings = useMemo(() => ({ method: state.prayerSettings.method, asrMethod: state.prayerSettings.asrMethod, highLatitude: state.prayerSettings.highLatitude, adjustments: state.prayerSettings.adjustments }), [state.prayerSettings])
  const prayers = useMemo(() => location && timeZone ? calculatePrayerTimes(now, location.lat, location.lon, timeZone, calculationSettings) : [], [now, location, timeZone, calculationSettings, todayKey])
  const next = location && timeZone ? nextPrayer(prayers, location.lat, location.lon, timeZone, calculationSettings, now) : null
  const current = currentPrayer(prayers, now)
  const countdown = next ? formatCountdown(next.time.getTime() - now.getTime()) : '—'
  const tomorrowPrayers = useMemo(() => location && timeZone ? calculatePrayerTimes(new Date(now.getTime() + 86400000), location.lat, location.lon, timeZone, calculationSettings) : [], [now, location, timeZone, calculationSettings, todayKey])
  const tomorrowFajr = tomorrowPrayers.find(item => item.name === 'Fajr') ?? null
  const hijri = timeZone ? hijriDate(now, timeZone, calendarAdjustment) : hijriDate(now, 'UTC', calendarAdjustment)
  const calendar = timeZone ? buildIslamicMonthView(calendarAnchor, timeZone, calendarAdjustment) : buildIslamicMonthView(calendarAnchor, 'UTC', calendarAdjustment)
  const todayGregorianKey = timeZone ? localDateKey(now, timeZone) : localDateKey(now)
  const selectedDayIsToday = calendar.days.some(day => day.isCurrentMonth && localDateKey(day.gregorian, timeZone ?? undefined) === todayGregorianKey)
  const dailySelectionDate = timeZone ? dayAtZone(now, timeZone) : now
  const dailyName = selectDailyName(dailyContent.names, dailySelectionDate)
  const dailyDua = selectDailyDua(dailyContent.duas, dailySelectionDate)
  const dailyDhikr = selectDailyDhikr(dailyContent.azkar, dailySelectionDate)
  const dailyAyah = quran?.ayahs.length ? quran.ayahs[((Math.floor((dailySelectionDate.getTime() - new Date(dailySelectionDate.getFullYear(), 0, 1).getTime()) / 86400000)) % quran.ayahs.length + quran.ayahs.length) % quran.ayahs.length] : null
  const dailyTranslation = dailyAyah ? dailyContent.translations.find(item => item.surah === dailyAyah.surah && item.ayah === dailyAyah.ayah) : undefined
  const salahCompleted = Object.values(state.salah[todayKey] ?? {}).filter(Boolean).length
  const realQuranRead = (() => { try { const raw = localStorage.getItem('noortools:content:v3'); const parsed = raw ? JSON.parse(raw) as { quran?: { readAyahs?: Record<string, string> } } : null; return Object.keys(parsed?.quran?.readAyahs ?? {}).length } catch { return 0 } })()

  const setLocation = (lat: number, lon: number, label: string) => {
    try {
      const tz = timezoneFromCoordinates(lat, lon)
      const nextLocation = { lat, lon, label: label.trim().slice(0, 120) || 'Selected location', timeZone: tz }
      setState(s => ({ ...s, location: nextLocation }))
      localStorage.setItem(LOCATION_KEY, JSON.stringify({ label: nextLocation.label, lat, lon }))
      setMessage(`Prayer calculation location set to ${nextLocation.label}.`)
      setError('')
    } catch { setError('These coordinates could not be resolved to an IANA timezone. Check the location and try again.') }
  }
  const submitManual = () => {
    const lat = Number(draft.lat), lon = Number(draft.lon)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) { setError('Enter latitude between −90 and 90 and longitude between −180 and 180.'); return }
    setLocation(lat, lon, draft.label || 'Manual location')
  }
  const requestLocation = () => {
    setError('')
    if (!navigator.geolocation) { setError('This browser does not provide geolocation. Manual coordinates remain available.'); return }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(position => { setLocationLoading(false); setLocation(position.coords.latitude, position.coords.longitude, 'Current device location') }, e => { setLocationLoading(false); setError(e.code === 1 ? 'Location permission was denied. Manual coordinates remain available.' : 'Location could not be determined. Enter a location manually.') }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 })
  }
  const updatePrayer = (patch: Partial<AppState['prayerSettings']>) => setState(s => ({ ...s, prayerSettings: { ...s.prayerSettings, ...patch } }))
  const updateAdjustment = (name: keyof PrayerAdjustments, value: string) => updatePrayer({ adjustments: { ...state.prayerSettings.adjustments, [name]: cleanAdjustment(value) } })

  return <>
    <button className="phase3-launcher" onClick={() => setOpen(true)} aria-label="Open Phase 3 Islamic companion">3A <span>Prayer · Calendar · Daily</span></button>
    {open && <div className="phase2-overlay" role="dialog" aria-modal="true" aria-label="NoorTools Phase 3A Islamic companion">
      <section className="page content-page phase3-page">
        <div className="back"><button onClick={() => setOpen(false)} aria-label="Close Phase 3A">←</button><div><p className="eyebrow">PHASE 3A</p><h1>Noor Daily</h1></div></div>
        <div className="content-tabs" role="tablist" aria-label="Phase 3A sections">
          {(['dashboard', 'prayer', 'calendar'] as const).map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{item === 'dashboard' ? 'Dashboard' : item === 'prayer' ? 'Prayer' : 'Calendar'}</button>)}
        </div>
        {error && <div className="empty-panel" role="alert"><span>!</span><p>{error}</p><button onClick={() => setError('')}>Dismiss</button></div>}
        {message && <div className="experience-toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

        {!location && <div className="card"><p className="eyebrow">LOCATION REQUIRED</p><h2>Set a calculation location</h2><p className="muted">NoorTools will not silently assume a city or hard-code prayer times. Select a device location or enter coordinates.</p><div className="row"><button className="primary" onClick={requestLocation} disabled={locationLoading}>{locationLoading ? 'Locating…' : 'Use my location'}</button><input aria-label="Location label" value={draft.label} onChange={e => setDraft(v => ({ ...v, label: e.target.value }))} placeholder="Location name" /></div><div className="grid two"><label>Latitude<input inputMode="decimal" value={draft.lat} onChange={e => setDraft(v => ({ ...v, lat: e.target.value }))} placeholder="e.g. 19.0760" /></label><label>Longitude<input inputMode="decimal" value={draft.lon} onChange={e => setDraft(v => ({ ...v, lon: e.target.value }))} placeholder="e.g. 72.8777" /></label></div><button onClick={submitManual}>Use manual location</button></div>}

        {section === 'dashboard' && location && timeZone && <>
          <div className="grid two"><div className="card next-card"><div><span className="eyebrow">NEXT PRAYER</span><h2>{next?.name ?? 'Not calculable'}</h2><strong>{next ? prayerTimeLabel(next.time, timeZone, state.prayerSettings.timeFormat === '24h') : '—'}</strong><p className="muted">{current ? `Current prayer: ${current}` : 'No current prayer window'}</p></div><div className="countdown"><span>{countdown}</span><small>remaining</small></div></div><div className="card"><p className="eyebrow">TODAY</p><h2>{fmtDate(now, timeZone)}</h2><p className="muted">{hijri.day} {hijri.monthName} {hijri.year} AH · {timezoneLabel(timeZone)}</p><p className="footnote">Hijri calendar: Umm al-Qura calendar exposed by the runtime, calculated from the selected date with {calendarAdjustment >= 0 ? '+' : ''}{calendarAdjustment} day adjustment.</p></div></div>
          <div className="card"><div className="card-head"><h2>Prayer timeline</h2><button onClick={() => setSection('prayer')}>Open details</button></div>{prayers.map(p => <PrayerRow key={p.name} name={p.name} time={p.time} timeZone={timeZone} format24={state.prayerSettings.timeFormat === '24h'} active={current === p.name} />)}{tomorrowFajr && <p className="footnote">Tomorrow Fajr: {prayerTimeLabel(tomorrowFajr.time, timeZone, state.prayerSettings.timeFormat === '24h')} · rolls over automatically after Isha.</p>}</div>
          <div className="grid two"><DailyCard title="Daily Quran" arabic={dailyAyah?.arabic} translation={dailyTranslation?.text} meta={dailyAyah ? `Quran ${dailyAyah.surah}:${dailyAyah.ayah} · Tanzil Uthmani v1.1` : 'Verified Quran data loading…'} /><DailyCard title="Daily Dua" arabic={dailyDua?.arabic} translation={dailyDua?.translation} meta={dailyDua ? `${dailyDua.reference} · ${dailyDua.source.sourceName}` : 'Verified Dua data loading…'} /><DailyCard title="Daily Dhikr" arabic={dailyDhikr?.arabic} translation={dailyDhikr?.translation} meta={dailyDhikr ? `${dailyDhikr.reference} · ${dailyDhikr.source.sourceName}` : 'Verified Azkar data loading…'} /><DailyCard title="Name of the Day" arabic={dailyName?.arabic} translation={dailyName?.meaning} meta={dailyName ? `${dailyName.transliteration} · ${dailyName.source.sourceName}` : 'Verified 99 Names data loading…'} /></div>
          <div className="grid two"><ProgressCard title="Salah progress" value={salahCompleted} total={5} detail={`${salahCompleted}/5 recorded today`} /><ProgressCard title="Quran progress" value={realQuranRead} total={quran?.ayahs.length ?? 0} detail={`${realQuranRead} ayahs recorded as read · rendering alone never creates activity`} /><div className="card"><p className="eyebrow">TASBIH</p><h3>{state.tasbih.total}</h3><p className="muted">Total recorded counts from local NoorTools state.</p></div><div className="card"><p className="eyebrow">QIBLA</p><h3>{Math.round(qiblaBearing(location.lat, location.lon))}°</h3><p className="muted">True bearing from selected coordinates. Device compass remains separately permission-gated.</p></div></div>
        </>}

        {section === 'prayer' && location && timeZone && <div className="stack"><div className="card"><p className="eyebrow">CALCULATION</p><h2>{CALCULATION_METHODS[state.prayerSettings.method].label}</h2><p className="muted">{CALCULATION_METHODS[state.prayerSettings.method].source}</p><div className="grid two"><label>Method<select value={state.prayerSettings.method} onChange={e => updatePrayer({ method: e.target.value as CalculationMethod })}>{Object.entries(CALCULATION_METHODS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><label>Asr method<select value={state.prayerSettings.asrMethod} onChange={e => updatePrayer({ asrMethod: e.target.value as AppState['prayerSettings']['asrMethod'], hanafi: e.target.value === 'hanafi' })}><option value="standard">Standard (shadow factor 1)</option><option value="hanafi">Hanafi (shadow factor 2)</option></select></label><label>High latitude<select value={state.prayerSettings.highLatitude} onChange={e => updatePrayer({ highLatitude: e.target.value as HighLatitudeMethod })}><option value="none">None</option><option value="angleBased">Angle based</option><option value="oneSeventh">One seventh of night</option><option value="middleOfNight">Middle of night</option></select></label><label>Clock format<select value={state.prayerSettings.timeFormat} onChange={e => updatePrayer({ timeFormat: e.target.value as AppState['prayerSettings']['timeFormat'] })}><option value="12h">12 hour</option><option value="24h">24 hour</option></select></label></div></div><div className="card"><h2>Prayer adjustments</h2><p className="muted">Optional local adjustments in minutes. These change display times only and are stored locally with the selected calculation settings.</p><div className="grid two">{PRAYERS.map(name => <label key={name}>{name}<input type="number" min="-120" max="120" step="1" value={state.prayerSettings.adjustments[name] ?? 0} onChange={e => updateAdjustment(name, e.target.value)} /></label>)}</div></div><div className="card"><h2>Today's calculated times</h2>{prayers.map(p => <PrayerRow key={p.name} name={p.name} time={p.time} timeZone={timeZone} format24={state.prayerSettings.timeFormat === '24h'} active={current === p.name} large />)}<div className="grid two"><div className="card soft"><p className="eyebrow">SUNRISE / SUNSET</p><p>{prayers.find(p => p.name === 'Sunrise') ? prayerTimeLabel(prayers.find(p => p.name === 'Sunrise')!.time, timeZone, state.prayerSettings.timeFormat === '24h') : 'Not calculable'} · {prayers.find(p => p.name === 'Maghrib') ? prayerTimeLabel(prayers.find(p => p.name === 'Maghrib')!.time, timeZone, state.prayerSettings.timeFormat === '24h') : 'Not calculable'}</p><p className="muted">Sunrise uses −0.833° solar altitude; Maghrib follows the selected convention.</p></div><div className="card soft"><p className="eyebrow">NIGHT MIDPOINT</p><p>{nightMidpoint(now, location.lat, location.lon, timeZone, calculationSettings) ? prayerTimeLabel(nightMidpoint(now, location.lat, location.lon, timeZone, calculationSettings)!, timeZone, state.prayerSettings.timeFormat === '24h') : 'Not calculable'}</p><p className="muted">Derived from today's Maghrib to tomorrow's Fajr; no fixed clock time is used.</p></div></div><p className="footnote">Location: {location.label} ({location.lat.toFixed(4)}, {location.lon.toFixed(4)}) · timezone: {timeZone}. Calculations are astronomical approximations based on the published Pray Times convention table and formulas; local mosque/authority schedules may differ.</p></div></div>}

        {section === 'calendar' && <div className="stack"><div className="card"><div className="card-head"><div><p className="eyebrow">ISLAMIC CALENDAR</p><h2>{calendar.monthName} {calendar.year} AH</h2></div><div className="row"><button onClick={() => setCalendarAnchor(anchor => shiftIslamicMonth(anchor, -1, timeZone ?? 'UTC', calendarAdjustment))} aria-label="Previous Islamic month">←</button><button onClick={() => setCalendarAnchor(new Date())}>Today</button><button onClick={() => setCalendarAnchor(anchor => shiftIslamicMonth(anchor, 1, timeZone ?? 'UTC', calendarAdjustment))} aria-label="Next Islamic month">→</button></div></div><p className="muted">{calendarSupportsUmmAlQura() ? 'Umm al-Qura (Intl) calculation' : 'This runtime does not expose the required Umm al-Qura calendar.'} · {selectedDayIsToday ? 'Today is in this month.' : 'Navigate by Islamic month.'}</p><div className="calendar-grid" role="grid" aria-label={`${calendar.monthName} ${calendar.year} AH`}><div className="calendar-weekday" role="columnheader">Sun</div><div className="calendar-weekday" role="columnheader">Mon</div><div className="calendar-weekday" role="columnheader">Tue</div><div className="calendar-weekday" role="columnheader">Wed</div><div className="calendar-weekday" role="columnheader">Thu</div><div className="calendar-weekday" role="columnheader">Fri</div><div className="calendar-weekday" role="columnheader">Sat</div>{calendar.days.map((day, index) => <div className={`calendar-day ${day.isCurrentMonth ? '' : 'outside'} ${localDateKey(day.gregorian, timeZone ?? undefined) === todayGregorianKey ? 'today' : ''}`} key={`${day.gregorian.toISOString()}-${index}`} role="gridcell"><span className="calendar-hijri">{day.hijri.day}</span><span className="calendar-gregorian">{new Intl.DateTimeFormat('en-US', { timeZone: timeZone ?? undefined, day: 'numeric' }).format(day.gregorian)}</span></div>)}</div></div><div className="card"><h2>Date adjustment</h2><p className="muted">Use only when your local authority follows a one-day date adjustment. NoorTools does not infer local moon-sighting decisions.</p><div className="row"><button onClick={() => setCalendarAdjustment(v => Math.max(-3, v - 1))} aria-label="Decrease Hijri date adjustment">−</button><strong>{calendarAdjustment} day{Math.abs(calendarAdjustment) === 1 ? '' : 's'}</strong><button onClick={() => setCalendarAdjustment(v => Math.min(3, v + 1))} aria-label="Increase Hijri date adjustment">+</button><button onClick={() => setCalendarAdjustment(0)}>Reset</button></div></div><div className="empty-panel"><span>!</span><p>{IMPORTANT_EVENT_STATUS} No fabricated Ramadan, Eid, Hajj, or other event dates are shown.</p></div></div>}

        {location && <div className="card"><div className="card-head"><div><h3>Calculation location</h3><p className="muted">{location.label} · {timeZone}</p></div><button onClick={() => setState(s => ({ ...s, location: null }))}>Change</button></div><div className="row"><input aria-label="Location label" value={draft.label} onChange={e => setDraft(v => ({ ...v, label: e.target.value }))} placeholder="Location name" /><input aria-label="Latitude" inputMode="decimal" value={draft.lat} onChange={e => setDraft(v => ({ ...v, lat: e.target.value }))} /><input aria-label="Longitude" inputMode="decimal" value={draft.lon} onChange={e => setDraft(v => ({ ...v, lon: e.target.value }))} /><button onClick={submitManual}>Apply</button></div></div>}
        <p className="footnote">Source transparency: prayer conventions reference Pray Times. Hijri date conversion uses the runtime's `islamic-umalqura` calendar. NoorTools does not claim scholar verification for calculated output.</p>
      </section>
    </div>}
  </>
}

function PrayerRow({ name, time, timeZone, format24, active, large = false }: { name: PrayerName; time: Date; timeZone: string; format24: boolean; active: boolean; large?: boolean }) {
  return <div className={`prayer-row ${active ? 'active' : ''} ${large ? 'large' : ''}`}><span><b>{name}</b>{active && <small>Current</small>}</span><strong>{prayerTimeLabel(time, timeZone, format24)}</strong></div>
}
function DailyCard({ title, arabic, translation, meta }: { title: string; arabic?: string; translation?: string; meta: string }) { return <article className="card"><p className="eyebrow">{title}</p><p className="arabic-text" dir="rtl">{arabic || 'Loading…'}</p><p>{translation || 'Verified content is loading.'}</p><p className="footnote">{meta}</p></article> }
function ProgressCard({ title, value, total, detail }: { title: string; value: number; total: number; detail: string }) { return <div className="card"><p className="eyebrow">{title}</p><h3>{value}{total ? ` / ${total}` : ''}</h3><div className="progress-track" aria-label={`${title}: ${progressPercent(value, total)} percent`}><span style={{ width: `${Math.min(100, progressPercent(value, total))}%` }} /></div><p className="muted">{detail}</p></div> }
