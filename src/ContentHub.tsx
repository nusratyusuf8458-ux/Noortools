import { useEffect, useMemo, useState } from 'react'
import { CONTENT_CATEGORIES, QURAN_SOURCE, contentSourceLabel, type ContentCategory } from './content'
import { loadContentState, recordQuranProgress, saveContentState, toggleBookmark, type ContentUserState } from './contentStorage'
import { ALLAH_NAME_FIELDS, AZKAR_CATEGORIES, DUA_CATEGORIES, HADITH_COLLECTION_SECTIONS } from './contentTaxonomy'
import { loadQuran, type QuranRuntime } from './quranRuntime'
import { buildReviewPackage } from './reviewPackage'

type Section = 'overview' | 'quran' | 'names' | 'duas' | 'azkar' | 'hadith' | 'search' | 'bookmarks'
const categoryBySection: Record<Exclude<Section, 'overview' | 'quran' | 'search' | 'bookmarks'>, ContentCategory> = { names: 'Names of Allah', duas: 'Duas', azkar: 'Morning & Evening Azkar', hadith: 'Hadith' }

export default function ContentHub({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const [contentState, setContentState] = useState<ContentUserState>(loadContentState)
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [readingFontSize, setReadingFontSize] = useState(28)
  const [quran, setQuran] = useState<QuranRuntime | null>(null)
  const [quranError, setQuranError] = useState('')
  const [partition, setPartition] = useState<'surah' | 'juz' | 'page'>('surah')
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => { void loadQuran().then(setQuran).catch(error => setQuranError(error instanceof Error ? error.message : 'Quran dataset could not be loaded.')) }, [])
  const update = (next: ContentUserState) => { setContentState(next); saveContentState(next) }
  const filteredAyahs = useMemo(() => {
    if (!quran || selectedSurah === null) return []
    const wanted = query.trim().toLocaleLowerCase()
    return quran.ayahs.filter(item => item.surah === selectedSurah && (!wanted || item.arabic.toLocaleLowerCase().includes(wanted)))
  }, [quran, selectedSurah, query])

  const selectPartition = (value: string) => {
    const index = Number(value)
    if (!quran || !Number.isInteger(index) || index < 1) return
    if (partition === 'surah') setSelectedSurah(index)
    const start = partition === 'juz' ? quran.juz[index - 1] : quran.pages[index - 1]
    if (start) setSelectedSurah(start.surah)
    setQuery('')
    setSection('quran')
  }

  const exportReview = () => {
    if (!quran) return
    const blob = new Blob([JSON.stringify(buildReviewPackage(quran.ayahs.map(item => ({ ...item, source: quran.source }))), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'noortools-quran-review-package-v1.json'; link.click(); URL.revokeObjectURL(url)
    setReviewMessage('Scholar review package exported. It records source metadata and explicitly shows that no NoorTools scholar review is currently recorded.')
  }

  const surahInfo = (number: number) => quran?.surahs[number - 1]

  return <section className="page content-page">
    <div className="back"><button onClick={onBack} aria-label="Back from verified library">←</button><h1>Verified library</h1></div>
    <div className="content-tabs" role="tablist" aria-label="Content sections">{(['overview', 'quran', 'names', 'duas', 'azkar', 'hadith', 'search', 'bookmarks'] as Section[]).map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{labelFor(item)}</button>)}</div>

    {section === 'overview' && <>
      <div className="card content-hero"><p className="eyebrow">PHASE 2.1 · VERIFIED CONTENT</p><h2>Source-backed Islamic content.</h2><p className="muted">Quran Arabic is sourced directly from Tanzil Uthmani v1.1. Other religious datasets stay unavailable until their source and redistribution permissions are independently established.</p><span className="status-pill">Quran · Verified source · Scholar review pending</span></div>
      <div className="grid two">{CONTENT_CATEGORIES.map(category => <button className="feature-card content-card" key={category} onClick={() => setSection(sectionForCategory(category))}><div><b>{category}</b><small>{category === 'Quran' ? quran ? '114 surahs · 6,236 ayahs loaded' : 'Loading verified source…' : 'Source-gated until legally usable'}</small></div><i>›</i></button>)}</div>
      <div className="card"><h3>Personal library</h3><div className="stats-grid"><div><b>{Object.keys(contentState.bookmarks).length}</b><small>bookmarks</small></div><div><b>{contentState.quran.lastReadId ? '1' : '0'}</b><small>last-read location</small></div><div><b>{Object.keys(contentState.quran.positions).length}</b><small>Quran positions</small></div></div></div>
      <div className="card"><h3>Scholar review package</h3><p className="muted">Export the loaded Quran corpus with its Arabic, provenance, references, license and current review status for independent qualified review.</p><button className="primary" onClick={exportReview} disabled={!quran}>Export review package</button>{reviewMessage && <p className="sensor-status" role="status">{reviewMessage}</p>}</div>
      <SourceCard source={QURAN_SOURCE} actual={quran?.source} />
    </>}

    {section === 'quran' && <>
      <div className="card"><p className="eyebrow">QURAN · TANZIL UTHMANI v1.1</p><h2>114 Surahs</h2>{quran ? <p className="muted">{quran.ayahs.length.toLocaleString()} ayahs loaded from the source import. Canonical Arabic strings are rendered as received; no client-side normalization is applied.</p> : <p className="muted">{quranError || 'Loading verified Quran source…'}</p>}
        <div className="row"><label>Navigate by<select value={partition} onChange={e => { setPartition(e.target.value as typeof partition); setSelectedSurah(null); setQuery('') }}><option value="surah">Surah</option><option value="juz">Juz</option><option value="page">Page</option></select></label><label>{partition === 'surah' ? 'Surah' : partition === 'juz' ? 'Juz' : 'Page'}<select value={selectedSurah ?? ''} onChange={e => selectPartition(e.target.value)} disabled={!quran}>{partition === 'surah' ? quran?.surahs.map(item => <option key={item.number} value={item.number}>{item.number}. {item.nameTransliteration || item.nameEnglish || `Surah ${item.number}`}</option>) : partition === 'juz' ? quran?.juz.map(item => <option key={item.index} value={item.index}>Juz {item.index} · {item.surah}:{item.ayah}</option>) : quran?.pages.map(item => <option key={item.index} value={item.index}>Page {item.index} · {item.surah}:{item.ayah}</option>)}</select></label></div>
        <div className="quran-slot-list">{quran?.surahs.map(item => <button key={item.number} className="quran-slot" onClick={() => { setSelectedSurah(item.number); setPartition('surah'); setQuery('') }} aria-label={`Surah ${item.number}`}><span>{String(item.number).padStart(3, '0')}</span><b>{item.nameTransliteration || `Surah ${item.number}`}</b><small>{item.ayahCount} ayahs</small></button>)}</div>
      </div>
      {quran && selectedSurah !== null && <div className="card"><div className="card-head"><div><p className="eyebrow">SURAH {selectedSurah}</p><h3>{surahInfo(selectedSurah)?.nameArabic || surahInfo(selectedSurah)?.nameTransliteration || `Surah ${selectedSurah}`}</h3><p className="muted">{surahInfo(selectedSurah)?.nameEnglish || 'Source-defined surah metadata'}</p></div><button onClick={() => setSelectedSurah(null)}>Close</button></div><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this surah" aria-label="Search this surah" />{query && filteredAyahs.length === 0 && <p className="muted">No matching ayahs in this surah.</p>}<div className="reader-list">{filteredAyahs.map(item => { const bookmarked = Boolean(contentState.bookmarks[item.id]); return <article className="ayah-card" key={item.id} id={item.id}><div className="ayah-meta"><span>{item.ayah}</span><button onClick={() => update(toggleBookmark(contentState, item.id, 'quran_ayah'))} aria-label={`${bookmarked ? 'Remove' : 'Add'} bookmark for ${item.surah}:${item.ayah}`}>{bookmarked ? '★' : '☆'}</button></div><p className="ayah-arabic" dir="rtl" lang="ar" style={{ fontSize: readingFontSize }}>{item.arabic}</p><p className="footnote">Source: Tanzil Project · Uthmani v1.1 · {item.id}</p><button onClick={() => update(recordQuranProgress(contentState, item.surah, item.ayah))}>Save as last read</button></article> })}</div><div className="row"><button onClick={() => setReadingFontSize(Math.max(20, readingFontSize - 2))}>A−</button><span className="muted">{readingFontSize}px</span><button onClick={() => setReadingFontSize(Math.min(44, readingFontSize + 2))}>A+</button></div></div>}
      <div className="card"><h3>Reader architecture</h3><div className="architecture-grid"><span>Juz navigation<small>source metadata connected</small></span><span>Page navigation<small>source metadata connected</small></span><span>Translation<small>unavailable until licensed edition</small></span><span>Audio<small>unavailable until authorized recording</small></span><span>Reading mode<small>light/dark inherited from NoorTools</small></span><span>Search<small>Arabic corpus only until translation is licensed</small></span></div></div>
      <SourceCard source={QURAN_SOURCE} actual={quran?.source} />
    </>}

    {section === 'names' && <TaxonomyCategory category={categoryBySection.names} items={ALLAH_NAME_FIELDS} />}
    {section === 'duas' && <TaxonomyCategory category={categoryBySection.duas} items={DUA_CATEGORIES} />}
    {section === 'azkar' && <TaxonomyCategory category={categoryBySection.azkar} items={AZKAR_CATEGORIES} />}
    {section === 'hadith' && <TaxonomyCategory category={categoryBySection.hadith} items={HADITH_COLLECTION_SECTIONS} />}

    {section === 'search' && <div className="card"><p className="eyebrow">GLOBAL SEARCH</p><h2>Search verified content</h2><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search loaded Quran Arabic" aria-label="Search verified content" /><p className="muted">{query ? `${quran?.ayahs.filter(item => item.arabic.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).length ?? 0} Quran matches in the verified source.` : 'Global search indexes only content that is actually loaded and source-verified.'}</p><div className="empty-panel"><span>⌕</span><p>{quran ? 'Quran Arabic search is active. Hadith, Duas, Azkar and Names remain excluded until verified datasets are connected.' : 'No search index is available until the verified Quran dataset loads.'}</p></div></div>}

    {section === 'bookmarks' && <div className="card"><p className="eyebrow">BOOKMARKS</p><h2>{Object.keys(contentState.bookmarks).length} saved items</h2>{Object.keys(contentState.bookmarks).length === 0 ? <div className="empty-panel"><span>☆</span><p>No bookmarks yet.</p></div> : <div>{Object.values(contentState.bookmarks).map(item => <div className="session-row" key={item.id}><span>{item.id}</span><button onClick={() => update(toggleBookmark(contentState, item.id, item.type))}>Remove</button></div>)}</div>}<p className="footnote">Bookmarks are local-only and use stable canonical content IDs.</p></div>}
  </section>
}

function TaxonomyCategory({ category, items }: { category: ContentCategory; items: readonly string[] }) { return <div className="card"><p className="eyebrow">{category.toUpperCase()}</p><h2>{category}</h2><p className="muted">Architecture and category taxonomy are present, but no religious text is displayed until a legitimate source, license/permission chain and verification record are connected.</p><div className="architecture-grid">{items.map(item => <span key={item}>{item}<small>scaffolded</small></span>)}</div><div className="empty-panel"><span>◌</span><div><h3>Verified source not connected</h3><p>No content is shown and no scholar review is claimed.</p></div></div></div> }

function SourceCard({ source, actual }: { source: typeof QURAN_SOURCE; actual?: { sourceId: string; sourceName: string; sourceVersion: string; edition: string; sourceUrl: string; contentHash: string; verificationStatus: string; reviewStatus: string; license: string } }) { return <div className="card source-card"><h3>Source information</h3><p><b>{actual ? `${actual.sourceName} · ${actual.edition} · v${actual.sourceVersion}` : contentSourceLabel(source)}</b><br />License: {actual?.license ?? source.license}<br />Status: {actual?.verificationStatus ?? source.verificationStatus}<br />Review: {actual?.reviewStatus ?? source.reviewStatus ?? 'not_reviewed'}<br />SHA-256: {actual?.contentHash ?? 'available after import'}<br />Source: <a href="https://tanzil.net" target="_blank" rel="noreferrer">Tanzil Project</a></p><p className="footnote">The app does not label this content “Verified by Scholars”.</p></div> }

function labelFor(section: Section): string { return section === 'overview' ? 'Library' : section === 'quran' ? 'Quran' : section === 'names' ? '99 Names' : section === 'duas' ? 'Duas' : section === 'azkar' ? 'Azkar' : section === 'hadith' ? 'Hadith' : section === 'search' ? 'Search' : 'Bookmarks' }
function sectionForCategory(category: ContentCategory): Section { return category === 'Quran' ? 'quran' : category === 'Names of Allah' ? 'names' : category === 'Duas' ? 'duas' : category === 'Morning & Evening Azkar' ? 'azkar' : 'hadith' }
