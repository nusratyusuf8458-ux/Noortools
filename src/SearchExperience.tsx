import { useEffect, useMemo, useState } from 'react'
import { loadQuran, type QuranRuntime } from './quranRuntime'
import { loadVerifiedContent, type AllahName, type Azkar, type Dua } from './verifiedContentRuntime'
import { loadQuranTranslations, type QuranTranslation, type ExcludedQuranTranslation } from './quranTranslation'
import { addSearchHistory, clearSearchHistory, loadSearchHistory } from './searchHistory'
import { HighlightedText } from './searchPresentation'

type SearchFilter = 'all' | 'quran' | 'names' | 'duas' | 'azkar'
type Result = { id: string; type: SearchFilter; label: string; title: string; text: string; source: string; status: string; rtl?: boolean; unavailable?: boolean; open: () => void }

function status(reviewState?: string): string {
  return reviewState === 'pending_scholar_review' ? 'Source verified · scholar review pending' : reviewState === 'source_verified' ? 'Source verified' : 'Unavailable'
}

function normalized(value: string): string { return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase() }
function includesQuery(value: string, query: string): boolean { const needle = normalized(query.trim()); return Boolean(needle) && normalized(value).includes(needle) }

export default function SearchExperience({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')
  const [history, setHistory] = useState<string[]>(loadSearchHistory)
  const [quran, setQuran] = useState<QuranRuntime | null>(null)
  const [names, setNames] = useState<AllahName[]>([])
  const [duas, setDuas] = useState<Dua[]>([])
  const [azkar, setAzkar] = useState<Azkar[]>([])
  const [translations, setTranslations] = useState<QuranTranslation[]>([])
  const [excluded, setExcluded] = useState<ExcludedQuranTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([loadQuran(), loadVerifiedContent(), loadQuranTranslations()]).then(([q, c, t]) => {
      setQuran(q); setNames(c.names); setDuas(c.duas); setAzkar(c.azkar); setTranslations(t.translations); setExcluded(t.excluded)
    }).catch(e => setError(e instanceof Error ? e.message : 'Verified search data could not be loaded.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const translationMap = useMemo(() => new Map(translations.map(item => [`${item.surah}:${item.ayah}`, item])), [translations])
  const excludedMap = useMemo(() => new Map(excluded.map(item => [`${item.surah}:${item.ayah}`, item])), [excluded])

  const results = useMemo<Result[]>(() => {
    const q = query.trim()
    if (!q) return []
    const result: Result[] = []
    if (filter === 'all' || filter === 'quran') {
      quran?.ayahs.forEach(item => {
        const reference = `${item.surah}:${item.ayah}`
        const translation = translationMap.get(reference)
        if (includesQuery(reference, q) || includesQuery(item.arabic, q)) result.push({ id: `${item.id}:arabic`, type: 'quran', label: 'Quran Arabic', title: `Surah ${item.surah} · Ayah ${item.ayah}`, text: item.arabic, source: 'Tanzil Project · Uthmani v1.1', status: 'Source verified', rtl: true, open: () => undefined })
        if (translation && includesQuery(`${reference} ${translation.text}`, q)) result.push({ id: `${item.id}:pickthall`, type: 'quran', label: 'Pickthall translation', title: `Surah ${item.surah} · Ayah ${item.ayah}`, text: translation.text, source: `${translation.translator} · ${translation.edition}`, status: status(translation.reviewState), open: () => undefined })
      })
      excluded.forEach(item => {
        const reference = `${item.surah}:${item.ayah}`
        if (includesQuery(reference, q)) result.push({ id: `excluded:${reference}`, type: 'quran', label: 'Pickthall translation', title: `Surah ${item.surah} · Ayah ${item.ayah}`, text: 'Translation unavailable for this record.', source: 'Pickthall 1930 · excluded pending exact edition verification', status: 'Unavailable', unavailable: true, open: () => undefined })
      })
    }
    if (filter === 'all' || filter === 'names') names.forEach(item => { const text = `${item.id} ${item.title} ${item.arabic} ${item.transliteration} ${item.meaning}`; if (includesQuery(text, q)) result.push({ id: item.id, type: 'names', label: '99 Names', title: item.transliteration, text: `${item.arabic} · ${item.meaning}`, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: status(item.source.reviewState), rtl: false, open: () => undefined }) })
    if (filter === 'all' || filter === 'duas') duas.forEach(item => { const text = `${item.id} ${item.title} ${item.arabic} ${item.translation} ${item.reference}`; if (includesQuery(text, q)) result.push({ id: item.id, type: 'duas', label: 'Dua', title: item.title, text: `${item.arabic} · ${item.translation}`, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: status(item.source.reviewState), rtl: false, open: () => undefined }) })
    if (filter === 'all' || filter === 'azkar') azkar.forEach(item => { const text = `${item.id} ${item.title} ${item.arabic} ${item.translation} ${item.reference}`; if (includesQuery(text, q)) result.push({ id: item.id, type: 'azkar', label: 'Azkar', title: item.title, text: `${item.arabic} · ${item.translation}`, source: `${item.source.sourceName} · v${item.source.sourceVersion}`, status: status(item.source.reviewState), rtl: false, open: () => undefined }) })
    return result.slice(0, 120)
  }, [query, filter, quran, names, duas, azkar, translations, excluded, translationMap])

  const submit = () => { const clean = query.trim(); if (clean) setHistory(addSearchHistory(history, clean)) }
  const chooseHistory = (value: string) => { setQuery(value); setFilter('all') }
  const resultCount = query.trim() ? results.length : 0

  return <div className="search-experience" role="dialog" aria-modal="true" aria-label="Verified content search">
    <div className="search-experience-panel">
      <header className="search-header"><div><p className="eyebrow">NOORTOOLS SEARCH</p><h1>Search verified content</h1><p className="muted">Quran Arabic, available Pickthall translation, 99 Names, Duas and Azkar. Blocked and missing datasets never appear.</p></div><button onClick={onClose} aria-label="Close search">×</button></header>
      <form className="search-box" onSubmit={event => { event.preventDefault(); submit() }}>
        <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Arabic, English, title, reference or 2:255" aria-label="Search verified content" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        <button className="primary" type="submit">Search</button>
      </form>
      <div className="search-filters" role="group" aria-label="Search content type filters">{(['all', 'quran', 'names', 'duas', 'azkar'] as SearchFilter[]).map(value => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)} type="button">{value === 'all' ? 'All' : value === 'quran' ? 'Quran' : value === 'names' ? '99 Names' : value === 'duas' ? 'Duas' : 'Azkar'}</button>)}</div>
      {error && <div className="empty-panel" role="alert"><span>!</span><p>{error}</p></div>}
      {!query.trim() && history.length > 0 && <section className="search-history" aria-label="Recent searches"><div className="card-head"><h2>Recent searches</h2><button onClick={() => { clearSearchHistory(); setHistory([]) }} type="button">Clear history</button></div><div className="row">{history.map(value => <button key={value} onClick={() => chooseHistory(value)} type="button">↗ {value}</button>)}</div></section>}
      {!query.trim() && history.length === 0 && <div className="search-empty"><span>⌕</span><h2>Search your verified library</h2><p>Results appear instantly as you type. Recent searches stay only on this device.</p></div>}
      {query.trim() && <section className="search-results" aria-live="polite"><div className="card-head"><h2>{loading ? 'Searching…' : `${resultCount} result${resultCount === 1 ? '' : 's'}`}</h2><span className="muted">Presentation-only highlighting</span></div>{!loading && resultCount === 0 && <div className="search-empty"><span>⌕</span><h2>No matching verified content</h2><p>No source text was generated or substituted for unavailable records.</p></div>}<div className="reader-list">{results.map(result => <article className="search-result-card" key={result.id} dir={result.rtl ? 'rtl' : 'ltr'}><div className="ayah-meta"><div><p className="eyebrow">{result.label}</p><h3 dir="ltr">{result.title}</h3></div>{result.unavailable && <span className="status-pill">Unavailable</span>}</div><p className={result.rtl ? 'search-result-text arabic-search-result' : 'search-result-text'}><HighlightedText text={result.text} query={query} dir={result.rtl ? 'rtl' : 'ltr'} /></p>{!result.unavailable && <p className="source-line" dir="ltr">Source: {result.source} · {result.status}</p>}{result.unavailable && <p className="source-line" dir="ltr">Translation unavailable for this record. No replacement text is generated.</p>}</article>)}</div></section>}
    </div>
  </div>
}
