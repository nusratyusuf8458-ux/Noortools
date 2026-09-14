export type ContentType = 'quran_ayah' | 'allah_name' | 'dua' | 'azkar' | 'hadith'
export type VerificationStatus = 'verified' | 'needs_review' | 'unavailable'

export type SourceMetadata = {
  source: string
  reference?: string
  collection?: string
  edition?: string
  version: string
  license: string
  sourceUrl: string
  importedAt?: string
  importVersion?: string
  verificationStatus: VerificationStatus
  reviewerStatus?: 'not_reviewed' | 'in_review' | 'reviewed'
  reviewerNotes?: string
  reviewDate?: string
}

export type ReligiousContentItem = {
  id: string
  type: ContentType
  arabic?: string
  translation?: string
  transliteration?: string
  title?: string
  source: SourceMetadata
}

export type QuranAyah = ReligiousContentItem & {
  type: 'quran_ayah'
  surah: number
  ayah: number
  juz?: number
  page?: number
  audioUrl?: string
}

export type QuranSurahSlot = {
  number: number
  ayahCount?: number
  available: boolean
}

export type ContentCategory = 'Quran' | 'Names of Allah' | 'Duas' | 'Morning & Evening Azkar' | 'Hadith'

export const QURAN_SOURCE: SourceMetadata = {
  source: 'Tanzil Project',
  edition: 'Uthmani',
  version: '1.1',
  license: 'Creative Commons Attribution 3.0; text must remain verbatim and attribution retained',
  sourceUrl: 'https://tanzil.net/download/',
  verificationStatus: 'unavailable',
  reviewerStatus: 'not_reviewed',
}

// Structural slots deliberately contain no Quranic source text. They become readable only after an explicit source import passes validation.
export const QURAN_SURAH_SLOTS: QuranSurahSlot[] = Array.from({ length: 114 }, (_, index) => ({
  number: index + 1,
  available: false,
}))

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'Quran',
  'Names of Allah',
  'Duas',
  'Morning & Evening Azkar',
  'Hadith',
]

export function isPresentable(item: ReligiousContentItem): boolean {
  return item.source.verificationStatus === 'verified' && Boolean(item.arabic || item.translation || item.title)
}

export function contentSourceLabel(source: SourceMetadata): string {
  return `${source.source}${source.edition ? ` · ${source.edition}` : ''} · v${source.version}`
}

export function searchVerifiedContent(items: ReligiousContentItem[], query: string): ReligiousContentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return items.filter(item => isPresentable(item)).filter(item => [item.id, item.title, item.arabic, item.translation, item.transliteration, item.source.reference, item.source.collection].filter(Boolean).some(value => value!.toLocaleLowerCase().includes(needle)))
}

export function validateQuranItems(items: QuranAyah[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const keys = new Set<string>()
  for (const item of items) {
    const key = `${item.surah}:${item.ayah}`
    if (keys.has(key)) errors.push(`Duplicate ayah ${key}.`)
    keys.add(key)
    const expectedId = `quran:${item.surah}:${item.ayah}`
    if (item.id !== expectedId) errors.push(`Ayah ${key} has unstable id ${item.id}.`)
    if (item.source.verificationStatus !== 'verified') errors.push(`Ayah ${key} is not verified.`)
    if (item.source.source.trim() === '' || item.source.version.trim() === '' || item.source.license.trim() === '' || item.source.sourceUrl.trim() === '') errors.push(`Ayah ${key} is missing source metadata.`)
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
