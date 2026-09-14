export type QuranRuntimeAyah = { id: string; type: 'quran_ayah'; surah: number; ayah: number; arabic: string }
export type QuranRuntime = { source: Record<string, unknown>; ayahs: QuranRuntimeAyah[] }

let cached: QuranRuntime | null = null

export async function loadQuran(): Promise<QuranRuntime> {
  if (cached) return cached
  const response = await fetch('/content/quran-uthmani-v1.1.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Quran dataset unavailable: HTTP ${response.status}`)
  const value = await response.json() as unknown
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Quran dataset has invalid structure.')
  const candidate = value as { source?: unknown; ayahs?: unknown }
  if (!candidate.source || !Array.isArray(candidate.ayahs)) throw new Error('Quran dataset is incomplete.')
  if (candidate.ayahs.length !== 6236) throw new Error(`Quran dataset contains ${candidate.ayahs.length} ayahs; expected 6236.`)
  cached = { source: candidate.source as Record<string, unknown>, ayahs: candidate.ayahs as QuranRuntimeAyah[] }
  return cached
}
