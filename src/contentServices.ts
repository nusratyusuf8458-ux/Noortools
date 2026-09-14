import type { QuranAyah, SourceMetadata } from './content'

export type TranslationResource = {
  id: string
  language: string
  edition: string
  source: SourceMetadata
}

export interface QuranTranslationProvider {
  listTranslations(): Promise<TranslationResource[]>
  getTranslation(ayah: QuranAyah, resource: TranslationResource): Promise<string | null>
}

export interface QuranAudioProvider {
  getAudioUrl(ayah: QuranAyah): Promise<string | null>
}

export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error'

export const unavailableTranslationProvider: QuranTranslationProvider = {
  async listTranslations() { return [] },
  async getTranslation() { return null },
}

export const unavailableAudioProvider: QuranAudioProvider = {
  async getAudioUrl() { return null },
}
