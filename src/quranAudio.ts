import { getPhase23Source, type Phase23Source } from './phase23Sources'

export type AudioPermissionProfile = {
  streaming: boolean
  offlineDownload: boolean
  bundling: boolean
  commercialUse: boolean
}

export type QuranAudioProvider = {
  id: string
  recordingSource: string
  reciter: string | null
  publisher: string | null
  source: Phase23Source
  permissions: AudioPermissionProfile
}

export const QURAN_AUDIO_PROVIDERS: QuranAudioProvider[] = [
  {
    id: 'quran-foundation', recordingSource: 'Quran Foundation recitation API', reciter: null, publisher: 'Quran Foundation', source: getPhase23Source('quran-audio.quran-foundation')!,
    permissions: { streaming: false, offlineDownload: false, bundling: false, commercialUse: false },
  },
  {
    id: 'everyayah', recordingSource: 'EveryAyah', reciter: null, publisher: null, source: getPhase23Source('quran-audio.everyayah')!,
    permissions: { streaming: false, offlineDownload: false, bundling: false, commercialUse: false },
  },
]

export function canStreamAudio(provider: QuranAudioProvider): boolean { return provider.permissions.streaming && provider.source.redistributionStatus !== 'blocked' }
export function canDownloadAudio(provider: QuranAudioProvider): boolean { return provider.permissions.offlineDownload && provider.permissions.bundling && provider.source.redistributionStatus === 'cleared' }
export const AUDIO_UI_STATE = { available: false, reviewState: 'unavailable' as const, reason: 'No recitation source has a NoorTools redistribution grant on file.' }
