import type { QuranPartition, QuranRuntime, QuranRuntimeAyah } from './quranRuntime'

export type QuranPartitionKind = 'juz' | 'page'
export function partitionTarget(runtime: QuranRuntime, kind: QuranPartitionKind, index: number): QuranPartition | null { const source = kind === 'juz' ? runtime.juz : runtime.pages; if (!Number.isInteger(index) || index < 1 || index > source.length) return null; return source[index - 1] }
export function ayahsForPartition(runtime: QuranRuntime, kind: QuranPartitionKind, index: number): QuranRuntimeAyah[] {
  const start = partitionTarget(runtime, kind, index); if (!start) return []
  const source = kind === 'juz' ? runtime.juz : runtime.pages
  const next = source[index]
  const startIndex = runtime.ayahs.findIndex(item => item.surah === start.surah && item.ayah === start.ayah)
  const endIndex = next ? runtime.ayahs.findIndex(item => item.surah === next.surah && item.ayah === next.ayah) : runtime.ayahs.length
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return []
  return runtime.ayahs.slice(startIndex, endIndex)
}
export function partitionReadProgress(runtime: QuranRuntime, kind: QuranPartitionKind, index: number, readAyahs: Record<string, string>): { read: number; total: number; percent: number } {
  const items = ayahsForPartition(runtime, kind, index); const read = items.filter(item => readAyahs[item.id]).length; const total = items.length
  return { read, total, percent: total ? Math.round((read / total) * 100) : 0 }
}
export function searchQuranRuntime(runtime: QuranRuntime, query: string, translations = new Map<string, string>): QuranRuntimeAyah[] {
  const needle = query.trim().toLocaleLowerCase(); if (!needle) return []
  return runtime.ayahs.filter(item => `${item.surah}:${item.ayah} ${item.arabic} ${translations.get(`${item.surah}:${item.ayah}`) ?? ''}`.toLocaleLowerCase().includes(needle))
}
export function translationForAyahKey(surah: number, ayah: number): string { return `quran-translation:en:pickthall-1930:${surah}:${ayah}` }
