export type QuranRuntimeAyah = { id: string; type: 'quran_ayah'; surah: number; ayah: number; arabic: string }
export type QuranRuntimeSource = { sourceId: string; sourceName: string; sourceVersion: string; edition: string; license: string; licenseUrl: string; sourceUrl: string; reference: string; verificationStatus: 'verified'|'needs_review'|'unavailable'; reviewStatus: 'not_reviewed'|'in_review'|'reviewed'; contentHash: string; importVersion: string; importedAt: string; reviewer?: string|null; reviewDate?: string|null; reviewNotes?: string|null }
export type QuranSurah = { number: number; nameArabic: string; nameTransliteration: string; nameEnglish: string; ayahCount: number }
export type QuranPartition = { index: number; surah: number; ayah: number }
export type QuranRuntime = { source: QuranRuntimeSource; ayahs: QuranRuntimeAyah[]; surahs: QuranSurah[]; juz: QuranPartition[]; pages: QuranPartition[] }

let cached: QuranRuntime | null = null

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

function validate(value: unknown, metadata: unknown): QuranRuntime {
  if (!isObject(value) || !Array.isArray(value.ayahs) || !isObject(value.source)) throw new Error('Quran dataset is incomplete.')
  if (!isObject(metadata) || !Array.isArray(metadata.surahs) || !Array.isArray(metadata.juz) || !Array.isArray(metadata.pages)) throw new Error('Quran metadata is incomplete.')
  const source = value.source as QuranRuntimeSource
  const ayahs = value.ayahs as QuranRuntimeAyah[]
  const surahs = metadata.surahs as QuranSurah[]
  const juz = metadata.juz as QuranPartition[]
  const pages = metadata.pages as QuranPartition[]
  if (source.sourceId !== 'tanzil-uthmani' || source.sourceVersion !== '1.1' || source.edition !== 'Uthmani' || source.verificationStatus !== 'verified' || source.reviewStatus !== 'not_reviewed') throw new Error('Quran source metadata is not the expected verified Tanzil release.')
  if (ayahs.length !== 6236 || surahs.length !== 114 || juz.length !== 30 || pages.length !== 604) throw new Error('Quran corpus metadata counts do not match the verified Tanzil release.')
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
  for (let index = 0; index < 114; index += 1) if (surahs[index].number !== index + 1 || surahs[index].ayahCount !== counts[index]) throw new Error(`Quran surah metadata mismatch at surah ${index + 1}.`)
  return { source, ayahs, surahs, juz, pages }
}

export async function loadQuran(): Promise<QuranRuntime> {
  if (cached) return cached
  const [response, metadataResponse] = await Promise.all([
    fetch('/content/quran-uthmani-v1.1.json', { cache: 'no-store' }),
    fetch('/content/quran-metadata.json', { cache: 'no-store' }),
  ])
  if (!response.ok) throw new Error(`Quran dataset unavailable: HTTP ${response.status}`)
  if (!metadataResponse.ok) throw new Error(`Quran metadata unavailable: HTTP ${metadataResponse.status}`)
  cached = validate(await response.json(), await metadataResponse.json())
  return cached
}

export function clearQuranCache(): void { cached = null }
