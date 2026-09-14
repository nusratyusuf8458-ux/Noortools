import { useEffect, useMemo, useRef, useState } from 'react'
import { loadContentState, azkarHistoryDates, deleteNote, isAzkarCompleted, recordAzkarCount, recordQuranProgress, resetAzkarDay, saveContentState, saveNote, setReminderPreferences, toggleBookmark, toggleFavorite, type ContentUserState, type ReminderKey, type Note } from './contentStorage'
import { loadQuran, type QuranRuntime, type QuranRuntimeAyah } from './quranRuntime'
import { loadVerifiedContent, type AllahName, type Azkar, type Dua, type VerifiedContentRuntime } from './verifiedContentRuntime'
import { loadQuranTranslations, type QuranTranslation, type ExcludedQuranTranslation } from './quranTranslation'
import { selectDailyDhikr, selectDailyDua, selectDailyName } from './dailyContent'
import { REMINDER_LABELS, REMINDER_ORDER, requestNotificationPermission, validateReminderTime } from './reminders'

type Section = 'overview' | 'quran' | 'names' | 'duas' | 'azkar' | 'search' | 'bookmarks' | 'reminders'
const sections: Section[] = ['overview', 'quran', 'names', 'duas', 'azkar', 'search', 'bookmarks', 'reminders']

type SearchResult = { id: string; type: string; title: string; text: string; source: string; status: string; open: () => void }
type BookmarkRecord = { id: string; type: string; addedAt: string; favorite: boolean; title: string; meta: string; open: () => void }

function dateKey(date = new Date()): string { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}` }
function dailyIndex(length: number, date = new Date()): number { if (!length) return -1; const start = new Date(date.getFullYear(), 0, 0); return (Math.floor((date.getTime() - start.getTime()) / 86400000) - 1) % length }
function typeLabel(type: string): string { return type === 'quran_ayah' ? 'Quran' : type === 'allah_name' ? '99 Names' : type === 'dua' ? 'Dua' : type === 'azkar' ? 'Azkar' : 'Hadith' }
function formatStatus(reviewState?: string): string { return reviewState === 'pending_scholar_review' ? 'Source verified · scholar review pending' : reviewState === 'source_verified' ? 'Source verified' : reviewState === 'unavailable' ? 'Unavailable' : 'Review state recorded' }
function shareTextForQuran(item: QuranRuntimeAyah, translation?: QuranTranslation): string {
  const lines = [`NoorTools · Quran ${item.surah}:${item.ayah}`, item.arabic, translation?.text ? `Translation — ${translation.translator}, ${translation.edition}: ${translation.text}` : 'Translation unavailable for this record.', `Arabic source: Tanzil Project · Uthmani v1.1`, translation ? `Translation source: ${translation.source.name} · ${translation.source.url}` : 'Translation source: Pickthall record not available.', 'NoorTools does not claim scholar verification.']
  return lines.join('\n')
}
async function shareOrCopy(text: string, title: string): Promise<'shared' | 'copied' | 'cancelled' | 'unavailable'> {
  try { if (navigator.share) { await navigator.share({ title, text }); return 'shared' } if (navigator.clipboard) { await navigator.clipboard.writeText(text); return 'copied' } return 'unavailable' } catch { return 'cancelled' }
}

export default function ContentHub({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const [state, setState] = useState<ContentUserState>(loadContentState)
  const [quran, setQuran] = useState<QuranRuntime | null>(null)
  const [verified, setVerified] = useState<VerifiedContentRuntime | null>(null)
  const [translations, setTranslations] = useState<QuranTranslation[]>([])
  const [excluded, setExcluded] = useState<ExcludedQuranTranslation[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null)
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [fontSize, setFontSize] = useState(30)
  const [lineHeight, setLineHeight] = useState(2.05)
  const [readerTheme, setReaderTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('noortools:quran-reader-theme') as 'light' | 'dark') || 'light')
  const [activeAyahId, setActiveAyahId] = useState('')
  const [bookmarkFilter, setBookmarkFilter] = useState<'all' | 'favorites' | Section>('all')
  const [bookmarkSort, setBookmarkSort] = useState<'recent' | 'oldest' | 'type'>('recent')
  const [bookmarkQuery, setBookmarkQuery] = useState('')
  const [dailyDate] = useState(() => new Date())
  const [selectedName, setSelectedName] = useState<AllahName | null>(null)
  const [duaCategory, setDuaCategory] = useState('All')
  const [azkarDate, setAzkarDate] = useState(() => dateKey())
  const [pendingScroll, setPendingScroll] = useState<{ surah: number; ayah: number } | null>(null)
  const ayahRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    void Promise.all([loadQuran(), loadVerifiedContent(), loadQuranTranslations()])
      .then(([q, c, t]) => { setQuran(q); setVerified(c); setTranslations(t.translations); setExcluded(t.excluded) })
      .catch(e => setError(e instanceof Error ? e.message : 'Verified content could not be loaded.'))
  }, [])
  useEffect(() => { saveContentState(state) }, [state])
  useEffect(() => { localStorage.setItem('noortools:quran-reader-theme', readerTheme) }, [readerTheme])
  useEffect(() => {
    if (!quran || selectedSurah === null) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible?.target.id) setActiveAyahId(visible.target.id)
    }, { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.2, 0.6] })
    const ids = quran.ayahs.filter(item => item.surah === selectedSurah).map(item => item.id)
    ids.forEach(id => { const node = ayahRefs.current[id]; if (node) observer.observe(node) })
    return () => observer.disconnect()
  }, [quran, selectedSurah, query])
  useEffect(() => {
    if (!pendingScroll || selectedSurah !== pendingScroll.surah) return
    const id = `quran:${pendingScroll.surah}:${pendingScroll.ayah}`
    const node = ayahRefs.current[id]
    if (node) { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); setActiveAyahId(id); setPendingScroll(null) }
  }, [pendingScroll, selectedSurah, query])

  const update = (next: ContentUserState) => setState(next)
  const names = verified?.names ?? []
  const duas = verified?.duas ?? []
  const azkar = verified?.azkar ?? []
  const translationMap = useMemo(() => new Map(translations.map(item => [`${item.surah}:${item.ayah}`, item])), [translations])
  const excludedMap = useMemo(() => new Map(excluded.map(item => [`${item.surah}:${item.ayah}`, item])), [excluded])
  const currentSurah = selectedSurah ? quran?.surahs[selectedSurah - 1] : undefined
  const selectedJuzStart = selectedJuz ? quran?.juz[selectedJuz - 1] : undefined
  const selectedPageStart = selectedPage ? quran?.pages[selectedPage - 1] : undefined

  const displayedAyahs = useMemo(() => {
    if (!quran || selectedSurah === null) return []
    const needle = query.trim().toLocaleLowerCase()
    return quran.ayahs.filter(item => item.surah === selectedSurah && (!needle || `${item.ayah} ${item.arabic} ${translationMap.get(`${item.surah}:${item.ayah}`)?.text ?? ''}`.toLocaleLowerCase().includes(needle)))
  }, [quran, selectedSurah, query, translationMap])
  const selectedReadCount = useMemo(() => displayedAyahs.filter(item => state.quran.readAyahs[item.id]).length, [displayedAyahs, state.quran.readAyahs])
  const overallRead = Object.keys(state.quran.readAyahs).length
  const lastRead = useMemo(() => {
    const id = state.quran.lastReadId
    return id ? quran?.ayahs.find(item => item.id === id) ?? null : null
  }, [quran, state.quran.lastReadId])
  const dailyAyah = quran && quran.ayahs.length ? quran.ayahs[dailyIndex(quran.ayahs.length, dailyDate)] : null
  const dailyName = selectDailyName(names, dailyDate)
  const dailyDua = selectDailyDua(duas, dailyDate)
  const dailyDhikr = selectDailyDhikr(azkar, dailyDate)
  const duaCategories = useMemo(() => ['All', ...Array.from(new Set(duas.map(item => item.category)))], [duas])
  const filteredDuas = duaCategory === 'All' ? duas : duas.filter(item => item.category === duaCategory)

  const openAyah = (surah: number, ayah: number) => { setSelectedSurah(surah); setQuery(''); setPendingScroll({ surah, ayah }); setSection('quran') }
  const saveLastRead = (item: QuranRuntimeAyah) => { update(recordQuranProgress(state, item.surah, item.ayah)); setMessage(`Saved Quran ${item.surah}:${item.ayah} as your last read.`) }
  const copyOrShareAyah = async (item: QuranRuntimeAyah) => { const result = await shareOrCopy(shareTextForQuran(item, translationMap.get(`${item.surah}:${item.ayah}`)), `Quran ${item.surah}:${item.ayah}`); setMessage(result === 'shared' ? 'Ayah shared.' : result === 'copied' ? 'Ayah copied with attribution.' : result === 'cancelled' ? 'Sharing cancelled.' : 'Sharing is unavailable in this browser.') }

  const allBookmarks = useMemo<BookmarkRecord[]>(() => {
    const list: BookmarkRecord[] = []
    for (const bookmark of Object.values(state.bookmarks)) {
      if (bookmark.type === 'quran_ayah') {
        const q = quran?.ayahs.find(item => item.id === bookmark.id)
        list.push({ id: bookmark.id, type: bookmark.type, addedAt: bookmark.addedAt, favorite: bookmark.favorite, title: q ? `Quran ${q.surah}:${q.ayah}` : bookmark.id, meta: q ? `${q.arabic.slice(0, 72)}…` : 'Quran source content', open: () => q && openAyah(q.surah, q.ayah) })
      } else if (bookmark.type === 'allah_name') {
        const item = names.find(entry => entry.id === bookmark.id); list.push({ id: bookmark.id, type: bookmark.type, addedAt: bookmark.addedAt, favorite: bookmark.favorite, title: item?.transliteration ?? bookmark.id, meta: item?.meaning ?? '99 Names source content', open: () => { if (item) { setSelectedName(item); setSection('names') } } })
      } else if (bookmark.type === 'dua') {
        const item = duas.find(entry => entry.id === bookmark.id); list.push({ id: bookmark.id, type: bookmark.type, addedAt: bookmark.addedAt, favorite: bookmark.favorite, title: item?.title ?? bookmark.id, meta: item?.reference ?? 'Dua source content', open: () => setSection('duas') })
      } else if (bookmark.type === 'azkar') {
        const item = azkar.find(entry => entry.id === bookmark.id); list.push({ id: bookmark.id, type: bookmark.type, addedAt: bookmark.addedAt, favorite: bookmark.favorite, title: item?.title ?? bookmark.id, meta: item?.reference ?? 'Azkar source content', open: () => setSection('azkar') })
      } else list.push({ id: bookmark.id, type: 'hadith', addedAt: bookmark.addedAt, favorite: bookmark.favorite, title: 'Hadith placeholder', meta: 'No Hadith dataset is available; bookmark architecture retained.', open: () => setSection('bookmarks') })
    }
    return list
  }, [state.bookmarks, quran, names, duas, azkar])
  const visibleBookmarks = useMemo(() => allBookmarks.filter(item => (bookmarkFilter === 'favorites' ? item.favorite : bookmarkFilter === 'all' ? true : item.type === bookmarkFilter)).filter(item => `${item.title} ${item.meta} ${item.id}`.toLocaleLowerCase().includes(bookmarkQuery.trim().toLocaleLowerCase())).sort((a, b) => bookmarkSort === 'type' ? a.type.localeCompare(b.type) : bookmarkSort === 'oldest' ? a.addedAt.localeCompare(b.addedAt) : b.addedAt.localeCompare(a.addedAt)), [allBookmarks, bookmarkFilter, bookmarkQuery, bookmarkSort])

  const globalResults = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return []
    const result: SearchResult[] = []
    quran?.ayahs.forEach(item => { const translation = translationMap.get(`${item.surah}:${item.ayah}`); if (`${item.surah}:${item.ayah} ${item.arabic} ${translation?.text ?? ''}`.toLocaleLowerCase().includes(needle)) result.push({ id: item.id, type: 'Quran', title: `Surah ${item.surah}:${item.ayah}`, text: translation?.text ?? item.arabic, source: translation ? `${translation.translator} · ${translation.edition}` : 'Tanzil Project · Uthmani v1.1', status: translation ? formatStatus(translation.reviewState) : 'Source verified', open: () => openAyah(item.surah, item.ayah) }) })
    names.forEach(item => { if (`${item.id} ${item.title} ${item.arabic} ${item.transliteration} ${item.meaning}`.toLocaleLowerCase().includes(needle)) result.push({ id: item.id, type: '99 Names', title: item.transliteration, text: item.meaning, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: formatStatus(item.source.reviewState), open: () => { setSelectedName(item); setSection('names') } }) })
    duas.forEach(item => { if (`${item.id} ${item.title} ${item.arabic} ${item.translation} ${item.reference}`.toLocaleLowerCase().includes(needle)) result.push({ id: item.id, type: 'Dua', title: item.title, text: item.translation, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: formatStatus(item.source.reviewState), open: () => setSection('duas') }) })
    azkar.forEach(item => { if (`${item.id} ${item.title} ${item.arabic} ${item.translation} ${item.reference}`.toLocaleLowerCase().includes(needle)) result.push({ id: item.id, type: 'Azkar', title: item.title, text: item.translation, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: formatStatus(item.source.reviewState), open: () => setSection('azkar') }) })
    return result.slice(0, 80)
  }, [query, quran, translationMap, names, duas, azkar])

  const sourceUnavailable = (surah: number, ayah: number) => excludedMap.get(`${surah}:${ayah}`)
  const notesFor = (contentId: string, contentType: Note['contentType']) => state.notes[`note:${contentType}:${contentId}`]

  const notificationPermission = async () => { const permission = await requestNotificationPermission(); update(setReminderPreferences(state, { permission, notificationsEnabled: permission === 'granted' })); setMessage(permission === 'granted' ? 'Notification permission granted. Choose individual reminder times below.' : permission === 'denied' ? 'Notification permission denied. Reminder settings remain saved locally.' : 'Notifications are not available in this browser.') }
  const toggleReminder = (key: ReminderKey, enabled: boolean) => update(setReminderPreferences(state, { item: { [key]: { enabled } } }))
  const setReminderTime = (key: ReminderKey, time: string) => { if (validateReminderTime(time)) update(setReminderPreferences(state, { item: { [key]: { time } } })) }

  return <section className="page content-page">
    <div className="back"><button onClick={onBack} aria-label="Back from NoorTools library">←</button><div><p className="eyebrow">PHASE 2.4 · ISLAMIC EXPERIENCE</p><h1>Noor Library</h1></div></div>
    <div className="content-tabs" role="tablist" aria-label="Noor Library sections">{sections.map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{labelFor(item)}</button>)}</div>
    {error && <div className="empty-panel" role="alert"><span>!</span><p>{error}</p></div>}
    {message && <div className="experience-toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

    {section === 'overview' && <Overview quran={quran} dailyAyah={dailyAyah} dailyName={dailyName} dailyDua={dailyDua} dailyDhikr={dailyDhikr} lastRead={lastRead} overallRead={overallRead} bookmarkCount={Object.keys(state.bookmarks).length} onContinue={() => lastRead && openAyah(lastRead.surah, lastRead.ayah)} onSection={setSection} />}

    {section === 'quran' && <div className={`quran-reader reader-${readerTheme}`}>
      <div className="reader-toolbar card">
        <div><p className="eyebrow">QURAN · TANZIL UTHMANI v1.1</p><h2>{currentSurah ? `${currentSurah.nameTransliteration || `Surah ${selectedSurah}`} · ${currentSurah.nameEnglish || ''}` : 'Surah browser'}</h2><p className="muted">Canonical Arabic is unchanged. Reading position is saved only after explicit user action.</p></div>
        <div className="reader-controls">
          <label>Surah<select value={selectedSurah ?? ''} onChange={e => { setSelectedSurah(e.target.value ? Number(e.target.value) : null); setQuery('') }} aria-label="Choose Surah"><option value="">Browse all</option>{quran?.surahs.map(item => <option key={item.number} value={item.number}>{item.number}. {item.nameTransliteration || `Surah ${item.number}`}</option>)}</select></label>
          <label>Juz<select value={selectedJuz ?? ''} onChange={e => { const value = e.target.value ? Number(e.target.value) : null; setSelectedJuz(value); const start = value ? quran?.juz[value - 1] : null; if (start) openAyah(start.surah, start.ayah) }} aria-label="Choose Juz"><option value="">Jump to Juz</option>{quran?.juz.map(item => <option key={item.index} value={item.index}>Juz {item.index}</option>)}</select></label>
          <label>Page<select value={selectedPage ?? ''} onChange={e => { const value = e.target.value ? Number(e.target.value) : null; setSelectedPage(value); const start = value ? quran?.pages[value - 1] : null; if (start) openAyah(start.surah, start.ayah) }} aria-label="Choose page"><option value="">Jump to page</option>{quran?.pages.map(item => <option key={item.index} value={item.index}>Page {item.index}</option>)}</select></label>
          <button onClick={() => setReaderTheme(readerTheme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${readerTheme === 'light' ? 'dark' : 'light'} reading mode`}>{readerTheme === 'light' ? '☾' : '☀'} {readerTheme === 'light' ? 'Dark' : 'Light'}</button>
        </div>
        <div className="reader-tuning"><label>Arabic size <button onClick={() => setFontSize(value => Math.max(22, value - 2))} aria-label="Decrease Arabic font size">A−</button><span>{fontSize}px</span><button onClick={() => setFontSize(value => Math.min(52, value + 2))} aria-label="Increase Arabic font size">A+</button></label><label>Line height <input type="range" min="1.65" max="2.7" step="0.05" value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} aria-label="Arabic line height" /></label></div>
      </div>
      {lastRead && <div className="continue-card" role="region" aria-label="Continue reading"><div><span className="eyebrow">CONTINUE READING</span><strong>Quran {lastRead.surah}:{lastRead.ayah}</strong><small>{quran?.surahs[lastRead.surah - 1]?.nameTransliteration}</small></div><button className="primary" onClick={() => openAyah(lastRead.surah, lastRead.ayah)}>Resume</button></div>}
      {selectedSurah === null ? <SurahGrid quran={quran} onOpen={number => openAyah(number, 1)} /> : <>
        <div className="reader-progress"><div><b>{selectedReadCount}</b> / {currentSurah?.ayahCount ?? displayedAyahs.length} explicitly saved in this view</div><progress max={currentSurah?.ayahCount ?? displayedAyahs.length} value={selectedReadCount} aria-label="Surah reading progress" /></div>
        <div className="reader-search-row"><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${currentSurah?.nameTransliteration ?? 'this Surah'} in Arabic or Pickthall`} aria-label="Search Quran" />{query && <button onClick={() => setQuery('')}>Clear</button>}</div>
        {displayedAyahs.length === 0 && <div className="empty-panel"><span>⌕</span><p>No matching ayahs in this Surah.</p></div>}
        <div className="reader-list premium-reader-list">{displayedAyahs.map(item => <AyahCard key={item.id} item={item} translation={translationMap.get(`${item.surah}:${item.ayah}`)} excluded={sourceUnavailable(item.surah, item.ayah)} active={activeAyahId === item.id} bookmarked={Boolean(state.bookmarks[item.id])} favorite={state.bookmarks[item.id]?.favorite === true} note={notesFor(item.id, 'quran_ayah')} fontSize={fontSize} lineHeight={lineHeight} onMount={node => { ayahRefs.current[item.id] = node }} onBookmark={() => update(toggleBookmark(state, item.id, 'quran_ayah'))} onFavorite={() => state.bookmarks[item.id] ? update(toggleFavorite(state, item.id)) : update(toggleBookmark(state, item.id, 'quran_ayah'))} onSaveRead={() => saveLastRead(item)} onShare={() => void copyOrShareAyah(item)} onNote={text => update(saveNote(state, item.id, 'quran_ayah', text))} onDeleteNote={() => update(deleteNote(state, item.id, 'quran_ayah'))} />)}</div>
        {selectedJuzStart && <p className="footnote">Viewing around Juz {selectedJuz}: starts at {selectedJuzStart.surah}:{selectedJuzStart.ayah}. Page jump starts at {selectedPageStart ? `${selectedPageStart.surah}:${selectedPageStart.ayah}` : 'not selected'}.</p>}
      </>}
    </div>}

    {section === 'names' && <div className="card"><p className="eyebrow">99 NAMES OF ALLAH</p><h2>Source-backed enumeration</h2><p className="muted">This is the selected dataset enumeration. It is source-verified and not presented as scholar-reviewed.</p>{dailyName && <DailyCard kind="Name of the Day" item={dailyName} arabic={dailyName.arabic} translation={dailyName.meaning} reference={dailyName.source.reference} onOpen={() => setSelectedName(dailyName)} />}{selectedName && <DetailCard title={selectedName.transliteration} arabic={selectedName.arabic} translation={selectedName.meaning} reference={selectedName.references.join(' · ')} source={`${selectedName.source.sourceName} · v${selectedName.source.sourceVersion}`} status={formatStatus(selectedName.source.reviewState)} bookmarked={Boolean(state.bookmarks[selectedName.id])} favorite={state.bookmarks[selectedName.id]?.favorite === true} note={notesFor(selectedName.id, 'allah_name')} onBookmark={() => update(toggleBookmark(state, selectedName.id, 'allah_name'))} onFavorite={() => state.bookmarks[selectedName.id] ? update(toggleFavorite(state, selectedName.id)) : update(toggleBookmark(state, selectedName.id, 'allah_name'))} onNote={text => update(saveNote(state, selectedName.id, 'allah_name', text))} onDeleteNote={() => update(deleteNote(state, selectedName.id, 'allah_name'))} />}</div>}

    {section === 'duas' && <div className="card"><p className="eyebrow">DUAS</p><h2>Source-backed supplications</h2><div className="row">{duaCategories.map(category => <button key={category} className={duaCategory === category ? 'selected' : ''} onClick={() => setDuaCategory(category)}>{category}</button>)}</div><div className="reader-list">{filteredDuas.map(item => <DetailCard key={item.id} title={item.title} arabic={item.arabic} translation={item.translation} reference={item.reference} source={`${item.source.sourceName} · v${item.source.sourceVersion}`} status={formatStatus(item.source.reviewState)} bookmarked={Boolean(state.bookmarks[item.id])} favorite={state.bookmarks[item.id]?.favorite === true} note={notesFor(item.id, 'dua')} onBookmark={() => update(toggleBookmark(state, item.id, 'dua'))} onFavorite={() => state.bookmarks[item.id] ? update(toggleFavorite(state, item.id)) : update(toggleBookmark(state, item.id, 'dua'))} onNote={text => update(saveNote(state, item.id, 'dua', text))} onDeleteNote={() => update(deleteNote(state, item.id, 'dua'))} />)}</div></div>}

    {section === 'azkar' && <div className="card"><p className="eyebrow">MORNING & EVENING AZKAR</p><h2>Daily checklist</h2><div className="row"><label>Date<input type="date" value={azkarDate} onChange={e => setAzkarDate(e.target.value)} /></label><button onClick={() => update(resetAzkarDay(state, azkarDate))}>Reset day</button></div><div className="reader-list">{azkar.map(item => { const current = state.azkarDaily[azkarDate]?.[item.id] ?? 0; const done = isAzkarCompleted(state, azkarDate, item.id, item.count); return <article className="detail-card" key={item.id}><div className="ayah-meta"><div><b>{item.title}</b><small>{item.category}</small></div><div className="row"><button onClick={() => update(toggleBookmark(state, item.id, 'azkar'))} aria-label={`${state.bookmarks[item.id] ? 'Remove' : 'Add'} bookmark for ${item.title}`}>{state.bookmarks[item.id] ? '★' : '☆'}</button><button onClick={() => state.bookmarks[item.id] ? update(toggleFavorite(state, item.id)) : update(toggleBookmark(state, item.id, 'azkar'))} aria-label="Toggle favorite">{state.bookmarks[item.id]?.favorite ? '♥' : '♡'}</button></div></div><p className="ayah-arabic" dir="rtl" lang="ar">{item.arabic}</p><p>{item.translation}</p><p className="source-line">Reference: {item.reference} · {formatStatus(item.source.reviewState)}</p><div className="row"><button className={done ? 'primary' : ''} onClick={() => update(recordAzkarCount(state, azkarDate, item.id, Math.min(item.count, current + 1)))}>{done ? `Complete · ${item.count}/${item.count}` : `${current}/${item.count} · Mark once`}</button><button onClick={() => update(saveNote(state, item.id, 'azkar', prompt('Add a private note') ?? ''))}>Add note</button></div>{notesFor(item.id, 'azkar') && <NoteBadge note={notesFor(item.id, 'azkar')} onDelete={() => update(deleteNote(state, item.id, 'azkar'))} />}</article> })}</div><div className="card"><h3>Activity history</h3><p className="muted">Stored dates: {azkarHistoryDates(state).slice(0, 14).join(', ') || 'No activity recorded yet.'}</p></div></div>}

    {section === 'search' && <div className="card"><p className="eyebrow">SEARCH</p><h2>Verified content only</h2><p className="muted">Deterministic search across the available Quran Arabic, Pickthall translation, 99 Names, Duas and Azkar. Blocked or unavailable datasets are excluded.</p><input autoFocus className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Arabic, English, title, reference or 2:255" aria-label="Search all verified content" />{query.trim() && <div className="reader-list">{globalResults.map(result => <button className="search-result" key={`${result.type}:${result.id}`} onClick={result.open}><span className="eyebrow">{result.type}</span><b>{result.title}</b><p>{result.text}</p><small>Source: {result.source} · {result.status}</small></button>)}{globalResults.length === 0 && <div className="empty-panel"><span>⌕</span><p>No verified content matched “{query}”.</p></div>}</div>}</div>}

    {section === 'bookmarks' && <div className="card"><p className="eyebrow">YOUR SAVED ITEMS</p><h2>Bookmarks & Favorites</h2><div className="toolbar-row"><input className="content-search" value={bookmarkQuery} onChange={e => setBookmarkQuery(e.target.value)} placeholder="Search saved items" aria-label="Search bookmarks" /><select value={bookmarkSort} onChange={e => setBookmarkSort(e.target.value as typeof bookmarkSort)} aria-label="Sort bookmarks"><option value="recent">Recently added</option><option value="oldest">Oldest first</option><option value="type">Content type</option></select></div><div className="row">{['all', 'favorites', 'quran_ayah', 'allah_name', 'dua', 'azkar', 'hadith'].map(value => <button key={value} className={bookmarkFilter === value ? 'selected' : ''} onClick={() => setBookmarkFilter(value as typeof bookmarkFilter)}>{value === 'all' ? 'All' : value === 'favorites' ? 'Favorites' : typeLabel(value)}</button>)}</div>{visibleBookmarks.length === 0 ? <div className="empty-panel"><span>☆</span><p>No saved items yet. Bookmarks and favorites are created only by your actions.</p></div> : <div className="bookmark-list">{visibleBookmarks.map(item => <article className="bookmark-row" key={item.id}><button className="bookmark-main" onClick={item.open}><span className="eyebrow">{typeLabel(item.type)}</span><b>{item.title}</b><small>{item.meta}</small></button><button onClick={() => update(toggleFavorite(state, item.id))} aria-label={`Toggle favorite for ${item.title}`}>{item.favorite ? '♥' : '♡'}</button><button onClick={() => update(toggleBookmark(state, item.id, state.bookmarks[item.id]?.type ?? 'hadith'))} aria-label={`Remove bookmark for ${item.title}`}>×</button></article>)}</div>}</div>}

    {section === 'reminders' && <Reminders preferences={state.reminders} onPermission={notificationPermission} onToggle={toggleReminder} onTime={setReminderTime} message={message} />}
  </section>
}

function Overview({ quran, dailyAyah, dailyName, dailyDua, dailyDhikr, lastRead, overallRead, bookmarkCount, onContinue, onSection }: { quran: QuranRuntime | null; dailyAyah: QuranRuntimeAyah | null; dailyName: AllahName | null; dailyDua: Dua | null; dailyDhikr: Azkar | null; lastRead: QuranRuntimeAyah | null; overallRead: number; bookmarkCount: number; onContinue: () => void; onSection: (section: Section) => void }) {
  return <>
    <div className="card content-hero premium-hero"><div><p className="eyebrow">TODAY · LOCAL EXPERIENCE</p><h2>Read with focus. Keep your data yours.</h2><p className="muted">Verified source content stays distinct from your private activity, notes and preferences. Nothing is pre-bookmarked and rendering an ayah never marks it read.</p></div><div className="hero-stat"><strong>{overallRead}</strong><small>ayahs explicitly saved</small></div></div>
    <div className="grid two"><div className="card"><div className="card-head"><div><p className="eyebrow">CONTINUE READING</p><h3>{lastRead ? `Surah ${lastRead.surah}:${lastRead.ayah}` : 'No saved position yet'}</h3></div>{lastRead && <button className="primary" onClick={onContinue}>Resume</button>}</div><p className="muted">{lastRead ? 'Your last position is restored locally. Progress changes only after you tap “Save as last read & mark read”.' : 'Open the Quran reader and explicitly save a position when you are ready.'}</p><button onClick={() => onSection('quran')}>{lastRead ? 'Open Quran reader' : 'Start Quran reader'}</button></div><div className="card"><p className="eyebrow">LIBRARY</p><h3>{bookmarkCount} saved items</h3><p className="muted">Bookmarks and favorites across Quran, Names, Duas, Azkar and the Hadith placeholder architecture.</p><button onClick={() => onSection('bookmarks')}>Open bookmarks</button></div></div>
    <div className="card daily-grid"><div><p className="eyebrow">DAILY AYAH</p>{dailyAyah ? <><h3>Quran {dailyAyah.surah}:{dailyAyah.ayah}</h3><p className="ayah-arabic" dir="rtl" lang="ar">{dailyAyah.arabic}</p><small>Source: Tanzil Project · Uthmani v1.1 · deterministic daily selection.</small></> : <p className="muted">Quran content is unavailable.</p>}</div><div><p className="eyebrow">NAME OF THE DAY</p>{dailyName ? <><h3>{dailyName.transliteration}</h3><p className="ayah-arabic" dir="rtl" lang="ar">{dailyName.arabic}</p><p>{dailyName.meaning}</p><small>Source: {dailyName.source.sourceName} · v{dailyName.source.sourceVersion}</small></> : <p className="muted">No verified name loaded.</p>}</div><div><p className="eyebrow">DAILY DUA</p>{dailyDua ? <><h3>{dailyDua.title}</h3><p>{dailyDua.translation}</p><small>Reference: {dailyDua.reference}</small></> : <p className="muted">No verified dua loaded.</p>}</div><div><p className="eyebrow">DAILY DHIKR</p>{dailyDhikr ? <><h3>{dailyDhikr.title}</h3><p>{dailyDhikr.translation}</p><small>Reference: {dailyDhikr.reference}</small></> : <p className="muted">No verified dhikr loaded.</p>}</div></div>
    <div className="architecture-strip"><button onClick={() => onSection('search')}>Search verified content <span>Quran · Pickthall · Names · Duas · Azkar →</span></button><button onClick={() => onSection('reminders')}>Reminders <span>Permission-aware local preferences →</span></button></div>
  </>
}

function SurahGrid({ quran, onOpen }: { quran: QuranRuntime | null; onOpen: (surah: number) => void }) {
  if (!quran) return <div className="empty-panel" role="status"><span>…</span><p>Loading the verified Quran. Nothing has been marked read.</p></div>
  return <div className="surah-browser"><div className="browser-heading"><div><p className="eyebrow">114 SURahs</p><h3>Choose a Surah</h3></div><span>{quran.source.sourceName} · {quran.source.edition} v{quran.source.sourceVersion}</span></div><div className="quran-slot-list premium-surah-list">{quran.surahs.map(item => <button key={item.number} className="quran-slot" onClick={() => onOpen(item.number)}><span>{String(item.number).padStart(3, '0')}</span><b>{item.nameTransliteration || `Surah ${item.number}`}</b><small>{item.nameEnglish} · {item.ayahCount} ayahs</small></button>)}</div></div>
}

function AyahCard({ item, translation, excluded, active, bookmarked, favorite, note, fontSize, lineHeight, onMount, onBookmark, onFavorite, onSaveRead, onShare, onNote, onDeleteNote }: { item: QuranRuntimeAyah; translation?: QuranTranslation; excluded?: ExcludedQuranTranslation; active: boolean; bookmarked: boolean; favorite: boolean; note?: Note; fontSize: number; lineHeight: number; onMount: (node: HTMLElement | null) => void; onBookmark: () => void; onFavorite: () => void; onSaveRead: () => void; onShare: () => void; onNote: (text: string) => void; onDeleteNote: () => void }) {
  return <article id={item.id} ref={onMount} className={`ayah-card premium-ayah ${active ? 'ayah-active' : ''}`} aria-label={`Quran ${item.surah}:${item.ayah}`}><div className="ayah-meta"><span className="ayah-number">{item.surah}:{item.ayah}</span><div className="row"><button onClick={onBookmark} aria-label={`${bookmarked ? 'Remove' : 'Add'} bookmark`}>{bookmarked ? '★' : '☆'}</button><button onClick={onFavorite} aria-label="Toggle favorite">{favorite ? '♥' : '♡'}</button></div></div><p className="ayah-arabic premium-arabic" dir="rtl" lang="ar" style={{ fontSize, lineHeight }}>{item.arabic}</p><div className="source-content"><span className="eyebrow">SOURCE CONTENT</span>{translation ? <><p className="translation-text">{translation.text}</p><p className="source-line">Translation: {translation.translator} · {translation.edition} · {formatStatus(translation.reviewState)} · Source: {translation.source.name} · {translation.source.url}</p></> : excluded ? <div className="translation-unavailable"><b>Translation unavailable for this record.</b><small>Excluded from the distributable Pickthall dataset pending exact edition verification (printed p. {excluded.printedPage}). No replacement text is generated.</small></div> : <p className="source-line">Translation unavailable for this record.</p>}</div><div className="ayah-actions"><button className="primary" onClick={onSaveRead}>Save as last read & mark read</button><button onClick={onShare}>Share / copy</button><button onClick={() => void Promise.resolve(onNote(prompt(note ? 'Update your private note' : 'Add a private note', note?.text ?? '') ?? '')).then(() => undefined)}>Notes</button></div>{note && <NoteBadge note={note} onDelete={onDeleteNote} />}</article>
}

function DetailCard({ title, arabic, translation, reference, source, status, bookmarked, favorite, note, onBookmark, onFavorite, onNote, onDeleteNote }: { title: string; arabic: string; translation: string; reference: string; source: string; status: string; bookmarked: boolean; favorite: boolean; note?: Note; onBookmark: () => void; onFavorite: () => void; onNote: (text: string) => void; onDeleteNote: () => void }) {
  return <article className="detail-card"><div className="ayah-meta"><div><p className="eyebrow">SOURCE CONTENT</p><h3>{title}</h3></div><div className="row"><button onClick={onBookmark} aria-label="Toggle bookmark">{bookmarked ? '★' : '☆'}</button><button onClick={onFavorite} aria-label="Toggle favorite">{favorite ? '♥' : '♡'}</button></div></div><p className="ayah-arabic" dir="rtl" lang="ar">{arabic}</p><p className="translation-text">{translation}</p><p className="source-line">Reference: {reference}<br />Source: {source} · {status}</p><div className="row"><button onClick={() => { void shareOrCopy(`${title}\n${arabic}\n${translation}\nReference: ${reference}\nSource: ${source}`, title) }}>Share / copy</button><button onClick={() => onNote(prompt(note ? 'Update your private note' : 'Add a private note', note?.text ?? '') ?? '')}>Notes</button></div>{note && <NoteBadge note={note} onDelete={onDeleteNote} />}</article>
}

function NoteBadge({ note, onDelete }: { note?: Note; onDelete: () => void }) { if (!note) return null; return <div className="user-note"><span className="eyebrow">USER NOTE</span><p>{note.text}</p><button className="danger" onClick={onDelete}>Delete note</button></div> }

function DailyCard({ kind, item, arabic, translation, reference, onOpen }: { kind: string; item: AllahName; arabic: string; translation: string; reference: string; onOpen: () => void }) { return <button className="daily-focus" onClick={onOpen}><div><p className="eyebrow">{kind}</p><h3>{item.transliteration}</h3><p className="ayah-arabic" dir="rtl" lang="ar">{arabic}</p></div><div><p>{translation}</p><small>{reference}</small></div></button> }

function Reminders({ preferences, onPermission, onToggle, onTime }: { preferences: ContentUserState['reminders']; onPermission: () => void; onToggle: (key: ReminderKey, enabled: boolean) => void; onTime: (key: ReminderKey, time: string) => void; message: string }) {
  const supported = preferences.permission !== 'unsupported'
  return <div className="card"><p className="eyebrow">REMINDERS</p><h2>Private, permission-aware reminders</h2><p className="muted">Preferences are stored locally. Browser notification permission is requested only after you choose to enable it. Android background notification delivery still requires physical-device testing.</p><div className="reminder-status"><span className="status-pill">{preferences.permission}</span><b>{preferences.notificationsEnabled ? 'Notifications enabled' : 'Notifications off'}</b></div>{supported && preferences.permission !== 'granted' && <button className="primary" onClick={onPermission}>Enable notification permission</button>}{preferences.permission === 'denied' && <div className="empty-panel"><span>!</span><p>Browser notification permission is denied. Re-enable it in the browser/app settings before turning reminders on.</p></div>}<div className="reminder-list">{REMINDER_ORDER.map(key => <div className="reminder-row" key={key}><div><b>{REMINDER_LABELS[key]}</b><small>{preferences.items[key].enabled ? `Daily at ${preferences.items[key].time}` : 'Off'}</small></div><input type="time" value={preferences.items[key].time} onChange={e => onTime(key, e.target.value)} aria-label={`${REMINDER_LABELS[key]} reminder time`} /><button className={preferences.items[key].enabled ? 'primary' : ''} disabled={preferences.permission === 'denied' || preferences.permission === 'unsupported'} onClick={() => onToggle(key, !preferences.items[key].enabled)} aria-pressed={preferences.items[key].enabled}>{preferences.items[key].enabled ? 'On' : 'Off'}</button></div>)}</div><p className="footnote">This phase provides the permission/preferences architecture and foreground web notification support where available. It does not claim fully tested background Android scheduling.</p></div>
}

function labelFor(section: Section): string { return section === 'overview' ? 'Home' : section === 'quran' ? 'Quran Reader' : section === 'names' ? '99 Names' : section === 'duas' ? 'Duas' : section === 'azkar' ? 'Azkar' : section === 'search' ? 'Search' : section === 'bookmarks' ? 'Bookmarks' : 'Reminders' }
