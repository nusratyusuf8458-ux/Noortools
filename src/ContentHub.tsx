import { useMemo, useState } from 'react'
import { CONTENT_CATEGORIES, QURAN_SOURCE, QURAN_SURAH_SLOTS, contentSourceLabel, type ContentCategory } from './content'
import { loadContentState, recordQuranProgress, saveContentState, toggleBookmark, type ContentUserState } from './contentStorage'
import { ALLAH_NAME_FIELDS, AZKAR_CATEGORIES, DUA_CATEGORIES, HADITH_COLLECTION_SECTIONS } from './contentTaxonomy'

type Section = 'overview' | 'quran' | 'names' | 'duas' | 'azkar' | 'hadith' | 'search' | 'bookmarks'
const categoryBySection: Record<Exclude<Section, 'overview' | 'quran' | 'search' | 'bookmarks'>, ContentCategory> = { names: 'Names of Allah', duas: 'Duas', azkar: 'Morning & Evening Azkar', hadith: 'Hadith' }
const quranSections = ['Surah list', 'Reader', 'Juz', 'Pages', 'Reading settings', 'Audio', 'Translation'] as const

export default function ContentHub({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const [contentState, setContentState] = useState<ContentUserState>(loadContentState)
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [readingFontSize, setReadingFontSize] = useState(28)
  const update = (next: ContentUserState) => { setContentState(next); saveContentState(next) }
  const searchSummary = useMemo(() => query.trim() ? 'Search is ready for verified content. No unverified religious text is indexed.' : 'Search across Quran, Hadith, Duas, Azkar and Names of Allah once verified datasets are connected.', [query])

  return <section className="page content-page">
    <div className="back"><button onClick={onBack} aria-label="Back from verified library">←</button><h1>Verified library</h1></div>
    <div className="content-tabs" role="tablist" aria-label="Content sections">
      {(['overview', 'quran', 'names', 'duas', 'azkar', 'hadith', 'search', 'bookmarks'] as Section[]).map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{labelFor(item)}</button>)}
    </div>

    {section === 'overview' && <>
      <div className="card content-hero"><p className="eyebrow">PHASE 2 · CONTENT FOUNDATION</p><h2>Verified Islamic content, never guessed.</h2><p className="muted">No religious source text is synthesized or presented as authentic. Connected datasets must carry source, edition, version, license and verification metadata.</p></div>
      <div className="grid two">{CONTENT_CATEGORIES.map(category => <button className="feature-card content-card" key={category} onClick={() => setSection(sectionForCategory(category))}><div><b>{category}</b><small>{category === 'Quran' ? '114-surah reader architecture' : 'Schema + source-aware unavailable state'}</small></div><i>›</i></button>)}</div>
      <div className="card"><h3>Personal library</h3><div className="stats-grid"><div><b>{Object.keys(contentState.bookmarks).length}</b><small>bookmarks</small></div><div><b>{contentState.quran.lastReadId ? '1' : '0'}</b><small>last-read location</small></div><div><b>{Object.keys(contentState.quran.positions).length}</b><small>Quran positions</small></div></div></div>
      <SourceCard source={QURAN_SOURCE} />
    </>}

    {section === 'quran' && <>
      <div className="card"><p className="eyebrow">QURAN</p><h2>114 Surahs</h2><p className="muted">The reader structure is complete, but no Quran text is shipped in this build until an explicit source import is performed and passes structural + provenance validation.</p><div className="quran-slot-list">{QURAN_SURAH_SLOTS.map(slot => <button key={slot.number} className="quran-slot" onClick={() => setSelectedSurah(slot.number)} aria-label={`Surah ${slot.number}, content unavailable`}><span>{String(slot.number).padStart(3, '0')}</span><b>Surah {slot.number}</b><small>{slot.available ? 'Available' : 'Not imported'}</small></button>)}</div></div>
      <SourceCard source={QURAN_SOURCE} />
      {selectedSurah !== null && <div className="card"><div className="card-head"><div><p className="eyebrow">SURAH {selectedSurah}</p><h3>Ayah-by-ayah reader</h3></div><button onClick={() => setSelectedSurah(null)}>Close</button></div><ReaderUnavailable fontSize={readingFontSize} setFontSize={setReadingFontSize} /><button onClick={() => update(recordQuranProgress(contentState, selectedSurah, 1))} disabled>Save reading position</button></div>}
      <div className="card"><h3>Quran architecture</h3><div className="architecture-grid">{quranSections.map(item => <span key={item}>{item}<small>ready</small></span>)}</div></div>
    </>}

    {section === 'names' && <TaxonomyCategory category={categoryBySection.names} items={ALLAH_NAME_FIELDS} />}
    {section === 'duas' && <TaxonomyCategory category={categoryBySection.duas} items={DUA_CATEGORIES} />}
    {section === 'azkar' && <TaxonomyCategory category={categoryBySection.azkar} items={AZKAR_CATEGORIES} />}
    {section === 'hadith' && <TaxonomyCategory category={categoryBySection.hadith} items={HADITH_COLLECTION_SECTIONS} />}

    {section === 'search' && <div className="card"><p className="eyebrow">GLOBAL SEARCH</p><h2>Search verified content</h2><input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search after verified content is connected" aria-label="Search verified content" /><p className="muted">{searchSummary}</p><div className="empty-panel"><span>⌕</span><p>No search results because no unverified or placeholder religious corpus is indexed.</p></div></div>}

    {section === 'bookmarks' && <div className="card"><p className="eyebrow">BOOKMARKS</p><h2>{Object.keys(contentState.bookmarks).length} saved items</h2>{Object.keys(contentState.bookmarks).length === 0 ? <div className="empty-panel"><span>☆</span><p>No bookmarks yet. Bookmarks are created only for stable IDs from content that is actually presented.</p></div> : <div>{Object.values(contentState.bookmarks).map(item => <div className="session-row" key={item.id}><span>{item.id}</span><button onClick={() => update(toggleBookmark(contentState, item.id, item.type))}>Remove</button></div>)}</div>}<p className="footnote">Bookmark state is local-only, versioned independently from Phase-1 activity storage.</p></div>}
  </section>
}

function TaxonomyCategory({ category, items }: { category: ContentCategory; items: readonly string[] }) {
  return <div className="card"><p className="eyebrow">{category.toUpperCase()}</p><h2>{category}</h2><p className="muted">Architecture and categories are present, but no religious text is displayed until a legitimate source, license/permission chain and verification record are connected.</p><div className="architecture-grid">{items.map(item => <span key={item}>{item}<small>scaffolded</small></span>)}</div><div className="empty-panel"><span>◌</span><div><h3>Verified source not connected</h3><p>No content is displayed until a source-specific dataset and verification state are recorded. Scholar review is not claimed.</p></div></div></div>
}

function ReaderUnavailable({ fontSize, setFontSize }: { fontSize: number; setFontSize: (value: number) => void }) {
  return <div className="reader-unavailable"><div className="reader-preview" style={{ fontSize }} dir="rtl" lang="ar" aria-label="Quran text unavailable">Quran Arabic text is unavailable until a validated source import is connected.</div><div className="row"><button onClick={() => setFontSize(Math.max(20, fontSize - 2))}>A−</button><span className="muted">{fontSize}px</span><button onClick={() => setFontSize(Math.min(44, fontSize + 2))}>A+</button></div><p className="footnote">Arabic typography, font scaling, light/dark reading mode, ayah numbering, Juz/page navigation, translation switching and audio controls are represented by the reader architecture but remain disabled without licensed content.</p></div>
}

function SourceCard({ source }: { source: typeof QURAN_SOURCE }) {
  return <div className="card source-card"><h3>Source & verification</h3><p><b>{contentSourceLabel(source)}</b><br />License: {source.license}<br />Source: <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceUrl}</a></p><p className="footnote">Status: {source.verificationStatus}. This build does not claim scholar review or connected-data verification.</p></div>
}

function labelFor(section: Section): string { return section === 'overview' ? 'Library' : section === 'quran' ? 'Quran' : section === 'names' ? '99 Names' : section === 'duas' ? 'Duas' : section === 'azkar' ? 'Azkar' : section === 'hadith' ? 'Hadith' : section === 'search' ? 'Search' : 'Bookmarks' }
function sectionForCategory(category: ContentCategory): Section { return category === 'Quran' ? 'quran' : category === 'Names of Allah' ? 'names' : category === 'Duas' ? 'duas' : category === 'Morning & Evening Azkar' ? 'azkar' : 'hadith' }
