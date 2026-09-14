import { describe, expect, it } from 'vitest'
import { buildIslamicMonthView, calendarSupportsUmmAlQura, hijriDate, shiftIslamicMonth } from './islamicCalendar'

describe('Phase 3A Islamic calendar', () => {
  it('detects the runtime Umm al-Qura calendar support', () => {
    expect(calendarSupportsUmmAlQura()).toBe(true)
  })

  it('returns a stable Hijri date with the selected timezone', () => {
    const date = new Date('2026-09-14T23:30:00Z')
    const india = hijriDate(date, 'Asia/Kolkata')
    const newYork = hijriDate(date, 'America/New_York')
    expect(india.year).toBeGreaterThan(1400)
    expect(india.month).toBeGreaterThanOrEqual(1)
    expect(india.month).toBeLessThanOrEqual(12)
    expect(india.day).toBeGreaterThanOrEqual(1)
    expect(india.day).toBeLessThanOrEqual(30)
    expect(india.monthName.length).toBeGreaterThan(0)
    expect(india).not.toEqual(newYork)
  })

  it('supports explicit local date adjustments without changing canonical source data', () => {
    const date = new Date('2026-09-14T12:00:00Z')
    const base = hijriDate(date, 'Asia/Kolkata', 0)
    const plus = hijriDate(date, 'Asia/Kolkata', 1)
    expect(plus.day).toBe(base.day + 1)
  })

  it('builds a complete Islamic month view and labels outside-month cells', () => {
    const view = buildIslamicMonthView(new Date('2026-09-14T12:00:00Z'), 'Asia/Kolkata')
    expect(view.year).toBeGreaterThan(1400)
    expect(view.month).toBeGreaterThanOrEqual(1)
    expect(view.month).toBeLessThanOrEqual(12)
    expect(view.days.length % 7).toBe(0)
    expect(view.days.filter(day => day.isCurrentMonth).length).toBeGreaterThanOrEqual(29)
    expect(view.days.filter(day => day.isCurrentMonth).length).toBeLessThanOrEqual(30)
    expect(view.days.some(day => !day.isCurrentMonth)).toBe(true)
  })

  it('navigates exactly one Hijri month forward and backward', () => {
    const anchor = new Date('2026-09-14T12:00:00Z')
    const current = buildIslamicMonthView(anchor, 'Asia/Kolkata')
    const forward = buildIslamicMonthView(shiftIslamicMonth(anchor, 1, 'Asia/Kolkata'), 'Asia/Kolkata')
    const back = buildIslamicMonthView(shiftIslamicMonth(anchor, -1, 'Asia/Kolkata'), 'Asia/Kolkata')
    expect(`${forward.year}-${forward.month}`).not.toBe(`${current.year}-${current.month}`)
    expect(`${back.year}-${back.month}`).not.toBe(`${current.year}-${current.month}`)
  })

  it('clamps extreme adjustment inputs to a small explicit range', () => {
    const date = new Date('2026-09-14T12:00:00Z')
    expect(hijriDate(date, 'Asia/Kolkata', 99)).toEqual(hijriDate(date, 'Asia/Kolkata', 3))
    expect(hijriDate(date, 'Asia/Kolkata', -99)).toEqual(hijriDate(date, 'Asia/Kolkata', -3))
  })
})
