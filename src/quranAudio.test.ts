import { describe, expect, it } from 'vitest'
import { AUDIO_UI_STATE, QURAN_AUDIO_PROVIDERS, canDownloadAudio, canStreamAudio } from './quranAudio'

describe('Quran audio permissions', () => {
  it('does not stream from un-cleared providers', () => {
    for (const provider of QURAN_AUDIO_PROVIDERS) {
      expect(canStreamAudio(provider)).toBe(false)
      expect(canDownloadAudio(provider)).toBe(false)
      expect(provider.source.redistributionStatus).toBe('blocked')
    }
  })

  it('keeps audio unavailable without a recording-specific grant', () => {
    expect(AUDIO_UI_STATE.available).toBe(false)
    expect(AUDIO_UI_STATE.reviewState).toBe('unavailable')
  })

  it('requires both offline and bundling permission before downloads', () => {
    const provider = QURAN_AUDIO_PROVIDERS[0]
    expect(canDownloadAudio({ ...provider, permissions: { streaming: false, offlineDownload: true, bundling: false, commercialUse: false }, source: { ...provider.source, redistributionStatus: 'cleared', verificationStatus: 'verified' } })).toBe(false)
    expect(canDownloadAudio({ ...provider, permissions: { streaming: false, offlineDownload: true, bundling: true, commercialUse: false }, source: { ...provider.source, redistributionStatus: 'cleared', verificationStatus: 'verified' } })).toBe(true)
  })
})
