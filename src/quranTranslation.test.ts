import { describe, expect, it } from 'vitest'
import { searchQuranTranslations, toggleTranslationBookmark } from './quranTranslation'

const synthetic = (id: string, surah: number, ayah: number, text: string) => ({
  id, surah, ayah, language: 'en', translator: 'Marmaduke William Pickthall', edition: 'The Meaning of the Glorious Koran (1930)', text,
  source: {
    id: 'quran-translation.pickthall.1930', name: 'The Meaning of the Glorious Koran', version: '1930 edition', sourceURL: 'https://www.gutenberg.org/ebooks/16955.txt.utf-8',
    license: 'Public domain work', licenseURL: 'https://www.gutenberg.org/ebooks/16955', copyrightHolder: 'Marmaduke William Pickthall', attribution: 'Translator: Marmaduke William Pickthall',
    redistributionStatus: 'cleared' as const, modificationStatus: 'permitted' as const, commercialUseStatus: 'permitted' as const, contentHash: 'a'.repeat(64), verificationStatus: 'verified' as const, reviewStatus: 'pending_scholar_review' as const,
  }, reviewState: 'pending_scholar_review' as const,
})

describe('Quran translations', () => {
  it('uses stable ayah IDs and preserves translation metadata', () => {
    const item = synthetic('quran-translation:en:pickthall-1930:2:255', 2, 255, 'synthetic test translation')
    expect(item.id).toBe('quran-translation:en:pickthall-1930:2:255')
    expect(item.translator).toBe('Marmaduke William Pickthall')
    expect(item.source.redistributionStatus).toBe('cleared')
    expect(item.source.contentHash).toHaveLength(64)
    expect(item.reviewState).toBe('pending_scholar_review')
  })

  it('supports reference/search without modifying source text', () => {
    const items = [synthetic('quran-translation:en:pickthall-1930:1:1', 1, 1, 'In the name of Allah'), synthetic('quran-translation:en:pickthall-1930:2:1', 2, 1, 'Alif Lam Mim')]
    expect(searchQuranTranslations(items, 'Allah').map(item => item.id)).toEqual(['quran-translation:en:pickthall-1930:1:1'])
    expect(searchQuranTranslations(items, '2:1').map(item => item.id)).toEqual(['quran-translation:en:pickthall-1930:2:1'])
  })

  it('toggles bookmarks without creating duplicate IDs', () => {
    expect(toggleTranslationBookmark([], 'x')).toEqual(['x'])
    expect(toggleTranslationBookmark(['x'], 'x')).toEqual([])
    expect(toggleTranslationBookmark(['x'], 'y')).toEqual(['x', 'y'])
  })
})
