import type { Phase23Source } from './phase23Sources'

export type QuranTranslation = {
  id: string
  surah: number
  ayah: number
  language: string
  translator: string
  edition: string
  text: string
  source: Phase23Source & { contentHash: string }
  reviewState: 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'
}

export type QuranTranslationDataset = {
  schema: 'noortools.quran-translations'
  version: 1
  translations: QuranTranslation[]
}

let cached: QuranTranslationDataset | null = null

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

function validate(root: unknown): QuranTranslationDataset {
  if (!isObject(root) || root.schema !== 'noortools.quran-translations' || root.version !== 1 || !Array.isArray(root.translations)) throw new Error('Quran translation dataset has invalid structure.')
  const items = root.translations as QuranTranslation[]
  if (items.length !== 6236) throw new Error(`Pickthall translation must contain 6236 ayahs; received ${items.length}.`)
  const ids = new Set<string>()
  for (const item of items) {
    if (!Number.isInteger(item.surah) || item.surah < 1 || item.surah > 114 || !Number.isInteger(item.ayah) || item.ayah < 1) throw new Error(`Invalid Quran translation reference for ${item?.id ?? 'unknown'}.`)
    if (item.id !== `quran-translation:en:pickthall-1930:${item.surah}:${item.ayah}`) throw new Error(`Unstable translation id ${item.id}.`)
    if (ids.has(item.id)) throw new Error(`Duplicate Quran translation id ${item.id}.`)
    ids.add(item.id)
    if (item.language !== 'en' || item.translator !== 'Marmaduke William Pickthall' || item.edition !== 'The Meaning of the Glorious Koran (1930)') throw new Error(`Unexpected Pickthall metadata for ${item.id}.`)
    if (!item.text.trim() || !isObject(item.source) || item.source.id !== 'quran-translation.pickthall.1930' || item.source.redistributionStatus !== 'cleared' || item.source.verificationStatus !== 'verified' || !item.source.contentHash) throw new Error(`Translation rights metadata failed for ${item.id}.`)
    if (item.reviewState !== 'pending_scholar_review' && item.reviewState !== 'scholar_reviewed') throw new Error(`Translation review state failed for ${item.id}.`)
  }
  return { schema: 'noortools.quran-translations', version: 1, translations: items }
}

export async function loadQuranTranslations(): Promise<QuranTranslationDataset> {
  if (cached) return cached
  const response = await fetch('/content/phase-2.3-quran-translations.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Quran translations unavailable: HTTP ${response.status}`)
  cached = validate(await response.json())
  return cached
}
export function clearQuranTranslationCache(): void { cached = null }
