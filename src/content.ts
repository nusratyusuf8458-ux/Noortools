export type ContentType = 'quran_ayah' | 'allah_name' | 'dua' | 'azkar' | 'hadith'
export type VerificationStatus = 'verified' | 'needs_review' | 'unavailable'
export type ReviewStatus = 'not_reviewed' | 'in_review' | 'reviewed'
export type ReviewState = 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'
export type SourceMetadata = {
  sourceId: string
  source: string
  sourceName?: string
  reference?: string
  collection?: string
  edition?: string
  version: string
  sourceVersion?: string
  license: string
  licenseUrl?: string
  sourceUrl: string
  importedAt?: string
  importDate?: string
  importVersion?: string
  contentHash?: string
  verificationStatus: VerificationStatus
  reviewStatus?: ReviewStatus
  reviewState?: ReviewState
  reviewer?: string | null
  reviewerNotes?: string | null
  reviewNotes?: string | null
  reviewDate?: string | null
}
export type ReligiousContentItem = { id: string; type: ContentType; arabic?: string; translation?: string; transliteration?: string; title?: string; contentHash?: string; source: SourceMetadata }
export type QuranAyah = ReligiousContentItem & { type: 'quran_ayah'; surah: number; ayah: number; juz?: number; page?: number; audioUrl?: string }
export type QuranSurahSlot = { number: number; ayahCount?: number; available: boolean }
export type ContentCategory = 'Quran' | 'Names of Allah' | 'Duas' | 'Morning & Evening Azkar' | 'Hadith'
export const QURAN_SOURCE: SourceMetadata = {
  sourceId: 'tanzil-uthmani', source: 'Tanzil Project', sourceName: 'Tanzil Project', edition: 'Uthmani', version: '1.1', sourceVersion: '1.1',
  license: 'Creative Commons Attribution 3.0; verbatim copying only; changing the text is not allowed',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  sourceUrl: 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&rub=true&stanween=true',
  verificationStatus: 'verified', reviewStatus: 'not_reviewed', reviewState: 'source_verified',
}
export const QURAN_SURAH_SLOTS: QuranSurahSlot[] = Array.from({ length: 114 }, (_, index) => ({ number: index + 1, available: true }))
export const CONTENT_CATEGORIES: ContentCategory[] = ['Quran', 'Names of Allah', 'Duas', 'Morning & Evening Azkar', 'Hadith']
export function isPresentable(item: ReligiousContentItem): boolean { return item.source.verificationStatus === 'verified' && item.source.reviewState !== 'needs_correction' && item.source.reviewState !== 'unavailable' && Boolean(item.arabic || item.translation || item.title) }
export function contentSourceLabel(source: SourceMetadata): string { return `${source.sourceName ?? source.source}${source.edition ? ` · ${source.edition}` : ''} · v${source.sourceVersion ?? source.version}` }
export function searchVerifiedContent(items: ReligiousContentItem[], query: string): ReligiousContentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return items.filter(isPresentable).filter(item => [item.id, item.title, item.arabic, item.translation, item.transliteration, item.source.reference, item.source.collection].filter(Boolean).some(value => value!.toLocaleLowerCase().includes(needle)))
}
export function validateQuranItems(items: QuranAyah[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []; const keys = new Set<string>()
  for (const item of items) {
    const key = `${item.surah}:${item.ayah}`
    if (keys.has(key)) errors.push(`Duplicate ayah ${key}.`); keys.add(key)
    if (item.id !== `quran:${item.surah}:${item.ayah}`) errors.push(`Ayah ${key} has unstable id ${item.id}.`)
    if (item.source.verificationStatus !== 'verified') errors.push(`Ayah ${key} is not verified.`)
    if (item.source.reviewState === 'needs_correction' || item.source.reviewState === 'unavailable') errors.push(`Ayah ${key} is not publishable.`)
    if (!item.source.sourceId || !(item.source.sourceName ?? item.source.source).trim() || !(item.source.sourceVersion ?? item.source.version).trim() || !item.source.license.trim() || !item.source.sourceUrl.trim()) errors.push(`Ayah ${key} is missing source metadata.`)
    if (!Number.isInteger(item.surah) || item.surah < 1 || item.surah > 114) errors.push(`Ayah ${key} has invalid surah number.`)
    if (!Number.isInteger(item.ayah) || item.ayah < 1) errors.push(`Ayah ${key} has invalid ayah number.`)
  }
  return { valid: errors.length === 0, errors }
}
export function quranAvailability(items: QuranAyah[]): { availableSurahs: number; totalAyahs: number; status: VerificationStatus } {
  if (items.length === 0) return { availableSurahs: 0, totalAyahs: 0, status: 'unavailable' }
  const result = validateQuranItems(items)
  if (!result.valid) return { availableSurahs: 0, totalAyahs: 0, status: 'needs_review' }
  return { availableSurahs: new Set(items.map(item => item.surah)).size, totalAyahs: items.length, status: 'verified' }
}
