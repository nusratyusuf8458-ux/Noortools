import type { ReminderKey, ReminderPreferences } from './contentStorage'

export const REMINDER_LABELS: Record<ReminderKey, string> = {
  prayer: 'Prayer', morningAzkar: 'Morning Azkar', eveningAzkar: 'Evening Azkar', quranReading: 'Quran reading', tasbih: 'Tasbih',
}
export const REMINDER_ORDER: ReminderKey[] = ['prayer', 'morningAzkar', 'eveningAzkar', 'quranReading', 'tasbih']
export function supportsNotifications(): boolean { return typeof Notification !== 'undefined' }
export async function requestNotificationPermission(): Promise<ReminderPreferences['permission']> {
  if (!supportsNotifications()) return 'unsupported'
  try { return await Notification.requestPermission() as ReminderPreferences['permission'] } catch { return Notification.permission as ReminderPreferences['permission'] }
}
export function canSchedule(preferences: ReminderPreferences, key: ReminderKey): boolean {
  return preferences.notificationsEnabled && preferences.permission === 'granted' && preferences.items[key].enabled
}
export function validateReminderTime(time: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) }
