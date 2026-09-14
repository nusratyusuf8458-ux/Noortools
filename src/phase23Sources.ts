export type RedistributionStatus = 'cleared' | 'restricted' | 'blocked' | 'unknown'
export type ReviewState = 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'

export type Phase23Source = {
  id: string
  name: string
  version: string
  sourceURL: string
  license: string
  licenseURL: string
  copyrightHolder: string
  attribution: string
  redistributionStatus: RedistributionStatus
  modificationStatus: RedistributionStatus | 'permitted'
  commercialUseStatus: RedistributionStatus | 'permitted'
  contentHash: string | null
  verificationStatus: 'verified' | 'unavailable'
  reviewStatus: 'not_reviewed' | 'pending_scholar_review'
}

export const PHASE_23_SOURCES: Phase23Source[] = [
  {
    id: 'hadith.sunnahcom', name: 'Sunnah.com Hadith API', version: 'current API',
    sourceURL: 'https://sunnah.com/developers', license: 'No corpus-wide redistribution license established', licenseURL: 'https://sunnah.com/developers',
    copyrightHolder: 'Sunnah.com and respective rights holders', attribution: 'Pending source-specific permission', redistributionStatus: 'blocked', modificationStatus: 'unknown', commercialUseStatus: 'unknown', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
  {
    id: 'hadith.fawazahmed0', name: 'fawazahmed0/hadith-api', version: 'branch 1 @ df57907be35291c91ad6a6691180e22ca9920784',
    sourceURL: 'https://github.com/fawazahmed0/hadith-api/tree/1', license: 'Unlicense for repository; collection-specific text rights not proven as a whole', licenseURL: 'https://github.com/fawazahmed0/hadith-api/blob/1/LICENSE',
    copyrightHolder: 'Repository author and respective upstream rights holders', attribution: 'Preserve applicable upstream attribution', redistributionStatus: 'blocked', modificationStatus: 'unknown', commercialUseStatus: 'unknown', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
  {
    id: 'quran-translation.pickthall.1930', name: 'The Meaning of the Glorious Koran', version: '1930 edition / Project Gutenberg #16955; updated 2020-12-12',
    sourceURL: 'https://www.gutenberg.org/ebooks/16955.txt.utf-8', license: 'Public domain work', licenseURL: 'https://www.gutenberg.org/ebooks/16955',
    copyrightHolder: 'Marmaduke William Pickthall (1875-1936), original 1930 work', attribution: 'Translator: Marmaduke William Pickthall; Project Gutenberg eBook #16955', redistributionStatus: 'cleared', modificationStatus: 'permitted', commercialUseStatus: 'permitted', contentHash: null, verificationStatus: 'verified', reviewStatus: 'pending_scholar_review',
  },
  {
    id: 'quran-translation.tanzil.translations', name: 'Tanzil Quran translations collection', version: 'current collection', sourceURL: 'https://tanzil.net/trans/', license: 'Non-commercial; redistribution requires direct permission', licenseURL: 'https://tanzil.net/trans/',
    copyrightHolder: 'Individual translators and publishers', attribution: 'Varies by translation', redistributionStatus: 'blocked', modificationStatus: 'blocked', commercialUseStatus: 'blocked', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
  {
    id: 'quran-translation.quran-foundation', name: 'Quran Foundation Content API translations', version: 'current API', sourceURL: 'https://api-docs.quran.com/legal/developer-terms/', license: 'Display license; raw QF Content may not be redistributed without separate written license', licenseURL: 'https://api-docs.quran.com/legal/developer-terms/',
    copyrightHolder: 'Quran Foundation and respective rights holders', attribution: 'Source-specific requirements apply', redistributionStatus: 'blocked', modificationStatus: 'blocked', commercialUseStatus: 'blocked', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
  {
    id: 'quran-audio.quran-foundation', name: 'Quran Foundation recitations', version: 'current API', sourceURL: 'https://api-docs.quran.com/legal/developer-terms/', license: 'Recording-specific redistribution grant not established', licenseURL: 'https://api-docs.quran.com/legal/developer-terms/',
    copyrightHolder: 'Reciters/rightsholders as applicable', attribution: 'Reciter/source attribution required when licensed', redistributionStatus: 'blocked', modificationStatus: 'blocked', commercialUseStatus: 'blocked', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
  {
    id: 'quran-audio.everyayah', name: 'EveryAyah recitations', version: 'current site/stream', sourceURL: 'https://everyayah.com/', license: 'No sufficiently explicit NoorTools redistribution grant established', licenseURL: 'https://everyayah.com/',
    copyrightHolder: 'Individual reciters/rightsholders', attribution: 'Reciter attribution required when licensed', redistributionStatus: 'blocked', modificationStatus: 'blocked', commercialUseStatus: 'blocked', contentHash: null, verificationStatus: 'unavailable', reviewStatus: 'not_reviewed',
  },
]

export function getPhase23Source(id: string): Phase23Source | undefined { return PHASE_23_SOURCES.find(source => source.id === id) }
export function isRedistributionCleared(source: Phase23Source): boolean { return source.redistributionStatus === 'cleared' && source.verificationStatus === 'verified' }
