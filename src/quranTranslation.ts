import type { Phase23Source } from './phase23Sources'

export type QuranTranslation = {
  id: string
  surah: number
  ayah: number
  language: string
  translator: string
  edition: string
  text: string
  contentHash: string
  source: Phase23Source & { contentHash: string }
  reviewState: 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'
}

export type ExcludedQuranTranslation = {
  id: string
  surah: number
  ayah: number
  printedPage: number
  reason: string
  sourceName: string
  sourceURL: string
  recordURL: string
  edition: string
  publisher: string
  digitization: string
  manualCorrection: boolean
  shippingStatus: 'unavailable_pending_verification'
  sourceHash: string | null
  recordContentHash: string | null
  reviewer: null
  reviewState: 'unavailable'
}

export type QuranTranslationDataset = {
  schema: 'noortools.quran-translations'
  version: 2
  translations: QuranTranslation[]
  excluded: ExcludedQuranTranslation[]
  audit: { canonicalAyahCount: 6236; distributableAyahCount: 6232; excludedAyahCount: 4; excludedKeys: string[]; sourceHash: string; source: string; note: string }
}

let cached: QuranTranslationDataset | null = null

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

function validate(root: unknown): QuranTranslationDataset {
  if (!isObject(root) || root.schema !== 'noortools.quran-translations' || root.version !== 2 || !Array.isArray(root.translations) || !Array.isArray(root.excluded) || !isObject(root.audit)) throw new Error('Quran translation dataset has invalid structure.')
  const items = root.translations as QuranTranslation[]
  const excluded = root.excluded as ExcludedQuranTranslation[]
  if (items.length !== 6232 || excluded.length !== 4 || root.audit.canonicalAyahCount !== 6236 || root.audit.distributableAyahCount !== 6232) throw new Error('Pickthall audit cardinality is invalid.')
  const ids = new Set<string>()
  for (const item of items) {
    if (!Number.isInteger(item.surah) || item.surah < 1 || item.surah > 114 || !Number.isInteger(item.ayah) || item.ayah < 1) throw new Error(`Invalid Quran translation reference for ${item?.id ?? 'unknown'}.`)
    if (item.id !== `quran-translation:en:pickthall-1930:${item.surah}:${item.ayah}`) throw new Error(`Unstable translation id ${item.id}.`)
    if (ids.has(item.id)) throw new Error(`Duplicate Quran translation id ${item.id}.`)
    ids.add(item.id)
    if (item.language !== 'en' || item.translator !== 'Marmaduke William Pickthall' || item.edition !== 'The Meaning of the Glorious Koran (1930)') throw new Error(`Unexpected Pickthall metadata for ${item.id}.`)
    if (!item.text.trim() || !/^[a-f0-9]{64}$/.test(item.contentHash) || !isObject(item.source) || item.source.id !== 'quran-translation.pickthall.1930.gutenberg' || item.source.redistributionStatus !== 'cleared' || item.source.verificationStatus !== 'verified' || !/^[a-f0-9]{64}$/.test(item.source.contentHash)) throw new Error(`Translation rights/hash metadata failed for ${item.id}.`)
    if (item.reviewState !== 'pending_scholar_review' && item.reviewState !== 'scholar_reviewed') throw new Error(`Translation review state failed for ${item.id}.`)
  }
  const excludedKeys = excluded.map(item => `${item.surah}:${item.ayah}`)
  if (new Set(excludedKeys).size !== 4 || excludedKeys.some(key => ids.has(`quran-translation:en:pickthall-1930:${key}`)) || JSON.stringify(excludedKeys) !== JSON.stringify(['17:33', '39:46', '45:32', '56:26'])) throw new Error('Pickthall excluded-record inventory is invalid.')
  for (const item of excluded) {
    if (item.reviewState !== 'unavailable' || item.shippingStatus !== 'unavailable_pending_verification' || item.manualCorrection !== false || item.sourceHash !== null || item.recordContentHash !== null || item.reviewer !== null) throw new Error(`Excluded Pickthall record ${item.surah}:${item.ayah} has unsafe metadata.`)
  }
  return { schema: 'noortools.quran-translations', version: 2, translations: items, excluded, audit: root.audit as QuranTranslationDataset['audit'] }
}

export function searchQuranTranslations(items: QuranTranslation[], query: string): QuranTranslation[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return items.filter(item => `${item.surah}:${item.ayah} ${item.text}`.toLocaleLowerCase().includes(needle))
}

export function toggleTranslationBookmark(bookmarks: string[], id: string): string[] {
  return bookmarks.includes(id) ? bookmarks.filter(item => item !== id) : [...bookmarks, id]
}

export async function loadQuranTranslations(): Promise<QuranTranslationDataset> {
  if (cached) return cached
  const response = await fetch('/content/phase-2.3-quran-translations.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Quran translations unavailable: HTTP ${response.status}`)
  cached = validate(await response.json())
  return cached
}
export function clearQuranTranslationCache(): void { cached = null }
