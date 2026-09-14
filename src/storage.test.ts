import { describe, expect, it, beforeEach } from 'vitest'
import { loadState, saveState, resetState } from './storage'

describe('local storage', () => {
  beforeEach(() => localStorage.clear())
  it('starts empty and persists real activity', () => {
    const initial = loadState()
    expect(initial.location).toBeNull()
    expect(initial.tasbih.total).toBe(0)
    const next = {...initial, tasbih:{...initial.tasbih,count:3,total:3}}
    saveState(next)
    expect(loadState().tasbih.total).toBe(3)
  })
  it('defensively handles corrupt data', () => {
    localStorage.setItem('noortools:v1','not-json')
    expect(loadState().location).toBeNull()
  })
  it('resets all local data', () => {
    localStorage.setItem('noortools:v1', JSON.stringify({...loadState(),location:{lat:1,lon:2,label:'x'}}))
    expect(resetState().location).toBeNull()
  })
})
