export type QuranRuntimeAyah = {
  id: string
  type: 'quran_ayah'
  surah: number
  ayah: number
  arabic: string
}

export type QuranRuntimeSource = {
  sourceId: string
  sourceName: string
  sourceVersion: string
  edition: string
  license: string
  licenseUrl: string
  sourceUrl: string
  reference: string
  verificationStatus: 'verified' | 'needs_review' | 'unavailable'
  reviewStatus: 'not_reviewed' | 'in_review' | 'reviewed'
  contentHash: string
  importVersion: string
  importedAt: string
  reviewer?: string | null
  reviewDate?: string | null
  reviewNotes?: string | null
}

export type QuranRuntime = {
  source: QuranRuntimeSource
  ayahs: QuranRuntimeAyah[]
}

let cached: QuranRuntime | null = null

function validate(value: unknown): QuranRuntime {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Quran dataset has invalid structure.')
  const root = value as Record<string, unknown>
  if (!root.source || !Array.isArray(root.ayahs)) throw new Error('Quran dataset is incomplete.')
  const source = root.source as QuranRuntimeSource
  const ayahs = root.ayahs as QuranRuntimeAyah[]
  if (source.sourceId !== 'tanzil-uthmani' || source.sourceVersion !== '1.1' || source.edition !== 'Uthmani' || source.verificationStatus !== 'verified' || source.reviewStatus !== 'not_reviewed') throw new Error('Quran source metadata is not the expected verified Tanzil release.')
  if (ayahs.length !== 6236) throw new Error(`Quran dataset contains ${ayahs.length} ayahs; expected 6236.`)
  const seen = new Set<string>()
  const counts = Array(114).fill(0)
  for (const item of ayahs) {
    const id = `quran:${item.surah}:${item.ayah}`
    if (item.id !== id || item.type !== 'quran_ayah' || !item.arabic) throw new Error(`Quran item ${id} failed canonical validation.`)
    if (seen.has(id)) throw new Error(`Duplicate Quran item ${id}.`)
    seen.add(id)
    counts[item.surah - 1] += 1
    if (item.ayah !== counts[item.surah - 1]) throw new Error(`Quran numbering is not contiguous in surah ${item.surah}.`)
  }
  if (counts.some(count => count === 0)) throw new Error('Quran dataset is missing one or more surahs.')
  return { source, ayahs }
}

export async function loadQuran(): Promise<QuranRuntime> {
  if (cached) return cached
  const response = await fetch('/content/quran-uthmani-v1.1.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Quran dataset unavailable: HTTP ${response.status}`)
  cached = validate(await response.json())
  return cached
}

export function clearQuranCache(): void {
  cached = null
}
