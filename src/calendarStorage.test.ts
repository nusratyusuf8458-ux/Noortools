import { beforeEach, describe, expect, it } from 'vitest'
import { loadCalendarAdjustment, saveCalendarAdjustment } from './calendarStorage'

describe('calendar adjustment storage', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty and persists bounded settings locally', () => {
    expect(loadCalendarAdjustment()).toBe(0)
    saveCalendarAdjustment(2)
    expect(loadCalendarAdjustment()).toBe(2)
    saveCalendarAdjustment(99)
    expect(loadCalendarAdjustment()).toBe(3)
    saveCalendarAdjustment(-99)
    expect(loadCalendarAdjustment()).toBe(-3)
  })

  it('recovers safely from invalid persisted data', () => {
    localStorage.setItem('noortools:phase3:calendar:v1', 'not-a-number')
    expect(loadCalendarAdjustment()).toBe(0)
  })
})
