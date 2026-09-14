import { describe, expect, it } from 'vitest'
import { ayahsForPartition, partitionReadProgress, partitionTarget, searchQuranRuntime, translationForAyahKey } from './quranExperience'
import type { QuranRuntime } from './quranRuntime'

const runtime = { ayahs: [{ id: 'quran:1:1', type: 'quran_ayah', surah: 1, ayah: 1, arabic: 'a' }, { id: 'quran:1:2', type: 'quran_ayah', surah: 1, ayah: 2, arabic: 'b' }, { id: 'quran:2:1', type: 'quran_ayah', surah: 2, ayah: 1, arabic: 'c' }], juz: [{ index: 1, surah: 1, ayah: 1 }, { index: 2, surah: 2, ayah: 1 }], pages: [{ index: 1, surah: 1, ayah: 1 }, { index: 2, surah: 1, ayah: 2 }], surahs: [], source: {} } as unknown as QuranRuntime

describe('Quran experience helpers', () => {
  it('maps Juz/page navigation to verified partition starts', () => {
    expect(partitionTarget(runtime, 'juz', 2)).toEqual({ index: 2, surah: 2, ayah: 1 })
    expect(partitionTarget(runtime, 'page', 0)).toBeNull()
    expect(ayahsForPartition(runtime, 'juz', 1).map(item => item.id)).toEqual(['quran:1:1', 'quran:1:2'])
  })
  it('computes genuine partition progress from explicitly read IDs', () => {
    const progress = partitionReadProgress(runtime, 'juz', 1, { 'quran:1:1': '2026-09-14T00:00:00Z' })
    expect(progress).toEqual({ read: 1, total: 2, percent: 50 })
  })
  it('searches Arabic and translation deterministically and uses stable translation ids', () => {
    const translations = new Map([['1:2', 'translation two']])
    expect(searchQuranRuntime(runtime, 'translation two', translations).map(item => item.id)).toEqual(['quran:1:2'])
    expect(searchQuranRuntime(runtime, 'no match', translations)).toEqual([])
    expect(translationForAyahKey(2, 255)).toBe('quran-translation:en:pickthall-1930:2:255')
  })
})
