import { useEffect, useMemo, useState } from 'react'
import { loadContentState, azkarHistoryDates, isAzkarCompleted, recordAzkarCount, recordQuranProgress, resetAzkarDay, saveContentState, toggleBookmark, type ContentUserState } from './contentStorage'
import { loadQuran, type QuranRuntime } from './quranRuntime'
import { loadVerifiedContent, type AllahName, type VerifiedContentRuntime } from './verifiedContentRuntime'
import type { ReligiousContentItem, SourceMetadata } from './content'
import { buildReviewPackage } from './reviewPackage'

type Section = 'overview' | 'quran' | 'names' | 'duas' | 'azkar' | 'hadith' | 'search' | 'bookmarks'
const sections: Section[] = ['overview', 'quran', 'names', 'duas', 'azkar', 'hadith', 'search', 'bookmarks']

export default function ContentHub({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const [state, setState] = useState<ContentUserState>(loadContentState)
  const [quran, setQuran] = useState<QuranRuntime | null>(null)
  const [verified, setVerified] = useState<VerifiedContentRuntime | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [selectedName, setSelectedName] = useState<AllahName | null>(null)
  const [duaCategory, setDuaCategory] = useState('All')
  const [azkarDate, setAzkarDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fontSize, setFontSize] = useState(28)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void Promise.all([loadQuran(), loadVerifiedContent()])
      .then(([q, c]) => { setQuran(q); setVerified(c) })
      .catch(e => setError(e instanceof Error ? e.message : 'Verified content could not be loaded.'))
  }, [])

  const update = (next: ContentUserState) => { setState(next); saveContentState(next) }
  const names = verified?.names ?? []
  const duas = verified?.duas ?? []
  const azkar = verified?.azkar ?? []
  const currentSurah = selectedSurah ? quran?.surahs[selectedSurah - 1] : undefined
  const filteredAyahs = useMemo(() => quran && selectedSurah ? quran.ayahs.filter(item => item.surah === selectedSurah && (!query.trim() || item.arabic.includes(query.trim()))) : [], [quran, selectedSurah, query])
  const duaCategories = useMemo(() => ['All', ...Array.from(new Set(duas.map(item => item.category)))], [duas])
  const filteredDuas = duaCategory === 'All' ? duas : duas.filter(item => item.category === duaCategory)
  const dailyName = useMemo(() => {
    if (names.length === 0) return null
    const today = new Date(); const start = new Date(today.getFullYear(), 0, 0); const day = Math.floor((today.getTime() - start.getTime()) / 86400000)
    return names[(day - 1) % names.length]
  }, [names])

  const globalResults = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return [] as Array<{ id: string; type: string; title: string; text: string; source: string; status: string; open: () => void }>
    const result: Array<{ id: string; type: string; title: string; text: string; source: string; status: string; open: () => void }> = []
    quran?.ayahs.filter(item => item.arabic.toLocaleLowerCase().includes(needle)).slice(0, 20).forEach(item => result.push({ id: item.id, type: 'Quran', title: `${item.surah}:${item.ayah}`, text: item.arabic, source: 'Tanzil Project · Uthmani v1.1', status: 'Verified source', open: () => { setSelectedSurah(item.surah); setSection('quran') } }))
    names.filter(item => `${item.arabic} ${item.transliteration} ${item.meaning}`.toLocaleLowerCase().includes(needle)).forEach(item => result.push({ id: item.id, type: '99 Names', title: item.transliteration, text: item.meaning, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: 'Verified source · Pending scholar review', open: () => { setSelectedName(item); setSection('names') } }))
    duas.filter(item => `${item.title} ${item.arabic} ${item.translation} ${item.reference}`.toLocaleLowerCase().includes(needle)).slice(0, 20).forEach(item => result.push({ id: item.id, type: 'Dua', title: item.title, text: item.translation, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: 'Verified source · Pending scholar review', open: () => setSection('duas') }))
    azkar.filter(item => `${item.arabic} ${item.translation} ${item.reference}`.toLocaleLowerCase().includes(needle)).slice(0, 20).forEach(item => result.push({ id: item.id, type: 'Azkar', title: item.title, text: item.translation, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: 'Verified source · Pending scholar review', open: () => setSection('azkar') }))
    return result.slice(0, 60)
  }, [query, quran, names, duas, azkar])

  const shareName = async (name: AllahName) => {
    const text = `${name.transliteration}\n${name.arabic}\n${name.meaning}\nSource: ${name.source.sourceName} · v${name.source.sourceVersion}`
    try {
      if (navigator.share) await navigator.share({ title: name.transliteration, text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
      else { setMessage('Sharing is unavailable in this browser.'); return }
      setMessage('Name details shared.')
    } catch { setMessage('Sharing was cancelled.') }
  }

  const sourceForReview = (s: { sourceId: string; sourceName: string; sourceVersion: string; license: string; sourceUrl: string; reference: string; verificationStatus: string; reviewState: string; reviewStatus: string; contentHash: string; importVersion: string; importDate: string }): SourceMetadata => ({
    sourceId: s.sourceId, source: s.sourceName, sourceName: s.sourceName, version: s.sourceVersion, sourceVersion: s.sourceVersion, license: s.license, sourceUrl: s.sourceUrl, reference: s.reference,
    verificationStatus: s.verificationStatus as SourceMetadata['verificationStatus'], reviewState: s.reviewState as SourceMetadata['reviewState'], reviewStatus: s.reviewStatus as SourceMetadata['reviewStatus'],
    contentHash: s.contentHash, importVersion: s.importVersion, importDate: s.importDate, importedAt: s.importDate, reviewer: null, reviewDate: null, reviewNotes: null,
  })

  const exportReview = () => {
    const items: ReligiousContentItem[] = []
    for (const item of names) items.push({ id: item.id, type: item.type, title: item.title, arabic: item.arabic, transliteration: item.transliteration, translation: item.meaning, source: sourceForReview(item.source) })
    for (const item of duas) items.push({ id: item.id, type: item.type, title: item.title, arabic: item.arabic, transliteration: item.transliteration, translation: item.translation, source: sourceForReview(item.source) })
    for (const item of azkar) items.push({ id: item.id, type: item.type, title: item.title, arabic: item.arabic, transliteration: item.transliteration, translation: item.translation, source: sourceForReview(item.source) })
    const blob = new Blob([JSON.stringify(buildReviewPackage(items), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'noortools-phase-2.2-review-package.json'; link.click(); URL.revokeObjectURL(url)
    setMessage('Review package exported. No scholar review is claimed.')
  }

  return <section className="page content-page">
    <div className="back"><button onClick={onBack} aria-label="Back from verified library">←</button><h1>Verified library</h1></div>
    <div className="content-tabs" role="tablist" aria-label="Content sections">{sections.map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{labelFor(item)}</button>)}</div>
    {error && <div className="empty-panel"><span>!</span><p>{error}</p></div>}

    {section === 'overview' && <>
      <div className="card content-hero"><p className="eyebrow">PHASE 2.2 · VERIFIED CONTENT</p><h2>Source-backed Islamic content.</h2><p className="muted">Quran Arabic stays on the completed Tanzil foundation. Phase 2.2 adds source-gated Names, Duas and Morning/Evening Azkar. Hadith, translations and audio stay unavailable until redistribution rights are clear.</p><span className="status-pill">Source verified ≠ scholar reviewed</span></div>
      <div className="grid two">{[['Quran', 'quran', quran ? '114 surahs · 6,236 ayahs' : 'Loading…'], ['Names of Allah', 'names', `${names.length} names loaded`], ['Duas', 'duas', `${duas.length} source-backed records`], ['Morning & Evening Azkar', 'azkar', `${azkar.length} records · sourced counts`], ['Hadith', 'hadith', 'Unavailable · redistribution source not cleared']].map(([title, target, meta]) => <button className="feature-card content-card" key={title} onClick={() => setSection(target as Section)}><div><b>{title}</b><small>{meta}</small></div><i>›</i></button>)}</div>
      <div className="card"><div className="card-head"><h3>Scholar review package</h3><button onClick={exportReview} disabled={!verified}>Export</button></div>{message && <p className="sensor-status">{message}</p>}<p className="muted">The export contains religious text plus provenance, license, reference, hash and review state so a qualified scholar can inspect the dataset.</p></div>
    </>}

    {section === 'quran' && quran && <div className="card"><p className="eyebrow">QURAN · TANZIL UTHMANI v1.1</p><h2>{currentSurah ? currentSurah.nameTransliteration || `Surah ${selectedSurah}` : 'Surah browser'}</h2>{selectedSurah === null ? <div className="quran-slot-list">{quran.surahs.map(item => <button key={item.number} className="quran-slot" onClick={() => { setSelectedSurah(item.number); setQuery('') }}><span>{String(item.number).padStart(3, '0')}</span><b>{item.nameTransliteration || `Surah ${item.number}`}</b><small>{item.ayahCount} ayahs</small></button>)}</div> : <><div className="card-head"><p className="muted">{currentSurah?.nameEnglish || ''}</p><button onClick={() => setSelectedSurah(null)}>All Surahs</button></div><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Arabic in this surah" />{filteredAyahs.length === 0 && <p className="muted">No matching ayahs.</p>}<div className="reader-list">{filteredAyahs.map(item => <article className="ayah-card" key={item.id}><div className="ayah-meta"><span>{item.ayah}</span><button onClick={() => update(toggleBookmark(state, item.id, 'quran_ayah'))}>{state.bookmarks[item.id] ? '★' : '☆'}</button></div><p className="ayah-arabic" dir="rtl" lang="ar" style={{ fontSize }}>{item.arabic}</p><p className="footnote">Tanzil Project · Uthmani v1.1 · {item.id}</p><button onClick={() => update(recordQuranProgress(state, item.surah, item.ayah))}>Save as last read</button></article>)}</div><div className="row"><button onClick={() => setFontSize(Math.max(20, fontSize - 2))}>A−</button><span>{fontSize}px</span><button onClick={() => setFontSize(Math.min(44, fontSize + 2))}>A+</button></div></>}</div>}

    {section === 'names' && <div className="card"><p className="eyebrow">99 NAMES OF ALLAH</p><h2>Selected source enumeration</h2>{dailyName && <div className="card content-hero"><p className="eyebrow">NAME OF THE DAY</p><h3>{dailyName.transliteration}</h3><p className="ayah-arabic" dir="rtl" lang="ar">{dailyName.arabic}</p><p>{dailyName.meaning}</p><small>Daily presentation is deterministic from the selected source list; it does not represent user activity or a scholar ranking.</small></div>}<p className="muted">This is a source-backed enumeration from the selected dataset. Exact enumerations and English wording can differ between scholarly sources, so NoorTools does not label this “scholar verified”.</p><div className="quran-slot-list">{names.map(name => <button className="quran-slot" key={name.id} onClick={() => setSelectedName(name)}><span>{name.id.split(':')[1].padStart(2, '0')}</span><b>{name.transliteration}</b><small>{name.meaning}</small></button>)}</div>{selectedName && <DetailCard title={selectedName.transliteration} arabic={selectedName.arabic} translation={selectedName.meaning} transliteration={selectedName.transliteration} reference={selectedName.source.reference} source={selectedName.source} bookmarked={Boolean(state.bookmarks[selectedName.id])} onBookmark={() => update(toggleBookmark(state, selectedName.id, 'allah_name'))} onShare={() => void shareName(selectedName)} />}{message && <p className="sensor-status">{message}</p>}</div>}

    {section === 'duas' && <div className="card"><p className="eyebrow">DUAS</p><h2>Source-backed supplications</h2><div className="row">{duaCategories.map(category => <button key={category} className={duaCategory === category ? 'selected' : ''} onClick={() => setDuaCategory(category)}>{category}</button>)}</div><div className="reader-list">{filteredDuas.map(item => <DetailCard key={item.id} title={item.title} arabic={item.arabic} translation={item.translation} transliteration={item.transliteration || undefined} reference={item.reference} source={item.source} count={item.count} bookmarked={Boolean(state.bookmarks[item.id])} onBookmark={() => update(toggleBookmark(state, item.id, 'dua'))} />)}</div><p className="footnote">Category labels are NoorTools navigation taxonomy derived from source titles; they do not add authenticity claims.</p></div>}

    {section === 'azkar' && <div className="card"><p className="eyebrow">MORNING & EVENING AZKAR</p><h2>Daily checklist</h2><div className="row"><label>Date<input type="date" value={azkarDate} onChange={e => setAzkarDate(e.target.value)} /></label><button onClick={() => update(resetAzkarDay(state, azkarDate))}>Reset day</button></div><div className="reader-list">{azkar.map(item => { const current = state.azkarDaily[azkarDate]?.[item.id] ?? 0; const done = isAzkarCompleted(state, azkarDate, item.id, item.count); return <article className="ayah-card" key={item.id}><div className="ayah-meta"><span>{item.title}</span><button onClick={() => update(toggleBookmark(state, item.id, 'azkar'))}>{state.bookmarks[item.id] ? '★' : '☆'}</button></div><p className="ayah-arabic" dir="rtl" lang="ar">{item.arabic}</p><p>{item.translation}</p><p className="footnote">Reference: {item.reference}<br />Sourced count: {item.count}</p><button className={done ? 'primary' : ''} onClick={() => update(recordAzkarCount(state, azkarDate, item.id, Math.min(item.count, current + 1)))}>{done ? `Complete · ${item.count}/${item.count}` : `${current}/${item.count} · Mark once`}</button></article> })}</div><div className="card"><h3>Activity history</h3>{azkarHistoryDates(state).length === 0 ? <p className="muted">No Azkar activity recorded yet.</p> : azkarHistoryDates(state).map(date => <div className="session-row" key={date}><span>{date}</span><small>{Object.keys(state.azkarDaily[date] ?? {}).length} items started</small></div>)}</div></div>}

    {section === 'hadith' && <div className="card"><p className="eyebrow">HADITH</p><h2>Unavailable</h2><div className="empty-panel"><span>◌</span><p>No Hadith text is bundled. A public API/key is not by itself a redistribution licence for an offline corpus, so NoorTools keeps this feature unavailable until a collection and edition have clear rights.</p></div></div>}

    {section === 'search' && <div className="card"><p className="eyebrow">GLOBAL SEARCH</p><h2>Source-backed search</h2><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Quran, Names, Duas or Azkar" />{!query.trim() ? <p className="muted">Only source-loaded, presentable content is searchable.</p> : globalResults.length === 0 ? <div className="empty-panel"><span>⌕</span><p>No source-verified matches.</p></div> : <div className="reader-list">{globalResults.map(result => <button className="feature-card content-card" key={`${result.type}:${result.id}`} onClick={result.open}><div><b>{result.title}</b><small>{result.type} · {result.source} · {result.status}</small><p>{result.text}</p></div></button>)}</div>}</div>}

    {section === 'bookmarks' && <div className="card"><p className="eyebrow">BOOKMARKS</p><h2>{Object.keys(state.bookmarks).length} saved items</h2>{Object.keys(state.bookmarks).length === 0 ? <div className="empty-panel"><span>☆</span><p>No bookmarks yet.</p></div> : Object.values(state.bookmarks).map(item => <div className="session-row" key={item.id}><span>{item.id}</span><button onClick={() => update(toggleBookmark(state, item.id, item.type))}>Remove</button></div>)}<p className="footnote">No bookmarks are seeded.</p></div>}
  </section>
}

function DetailCard({ title, arabic, translation, transliteration, reference, source, count, bookmarked, onBookmark, onShare }: { title: string; arabic: string; translation: string; transliteration?: string; reference: string | null; source: Pick<AllahName['source'], 'sourceName' | 'sourceVersion' | 'license' | 'reference' | 'reviewState' | 'contentHash'>; count?: number | null; bookmarked: boolean; onBookmark: () => void; onShare?: () => void }) {
  return <article className="ayah-card"><div className="card-head"><div><h3>{title}</h3><span className="status-pill">Verified source · Pending scholar review</span></div><button onClick={onBookmark}>{bookmarked ? '★' : '☆'}</button></div><p className="ayah-arabic" dir="rtl" lang="ar">{arabic}</p>{transliteration && <p className="muted">{transliteration}</p>}<p>{translation}</p>{count !== undefined && <p className="footnote">Sourced count: {count === null ? 'Not specified by source' : count}</p>}<p className="footnote">Reference: {reference || source.reference || 'Not supplied by source'}<br />Source: {source.sourceName} · v{source.sourceVersion}<br />License: {source.license}<br />Content hash: {source.contentHash}</p>{onShare && <button onClick={onShare}>Share</button>}</article>
}
function labelFor(section: Section): string { return section === 'overview' ? 'Library' : section === 'quran' ? 'Quran' : section === 'names' ? '99 Names' : section === 'duas' ? 'Duas' : section === 'azkar' ? 'Azkar' : section === 'hadith' ? 'Hadith' : section === 'search' ? 'Search' : 'Bookmarks' }
