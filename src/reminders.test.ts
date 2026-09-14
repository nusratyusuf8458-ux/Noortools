import { describe, expect, it } from 'vitest'
import { canSchedule, validateReminderTime } from './reminders'
import type { ReminderPreferences } from './contentStorage'

const base: ReminderPreferences = {
  notificationsEnabled: true,
  permission: 'granted',
  items: { prayer: { enabled: false, time: '05:00' }, morningAzkar: { enabled: false, time: '07:00' }, eveningAzkar: { enabled: false, time: '18:00' }, quranReading: { enabled: true, time: '21:00' }, tasbih: { enabled: false, time: '20:00' } },
}

describe('reminder architecture', () => {
  it('only considers a reminder schedulable after explicit permission and enablement', () => {
    expect(canSchedule(base, 'quranReading')).toBe(true)
    expect(canSchedule(base, 'tasbih')).toBe(false)
    expect(canSchedule({ ...base, permission: 'denied' }, 'quranReading')).toBe(false)
    expect(canSchedule({ ...base, notificationsEnabled: false }, 'quranReading')).toBe(false)
  })
  it('validates 24-hour local reminder times', () => {
    expect(validateReminderTime('00:00')).toBe(true)
    expect(validateReminderTime('23:59')).toBe(true)
    expect(validateReminderTime('24:00')).toBe(false)
    expect(validateReminderTime('9:00')).toBe(false)
  })
})
