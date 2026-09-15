import { describe, expect, it } from 'vitest'
import { isAndroidRuntime, isNativeRuntime, triggerNativeHaptic } from './nativeRuntime'

describe('Phase 3F native runtime bridge', () => {
  it('detects the browser runtime without pretending it is Android', () => {
    expect(isNativeRuntime()).toBe(false)
    expect(isAndroidRuntime()).toBe(false)
  })

  it('does not attempt haptics in the browser runtime', async () => {
    await expect(triggerNativeHaptic()).resolves.toBe(false)
  })
})
