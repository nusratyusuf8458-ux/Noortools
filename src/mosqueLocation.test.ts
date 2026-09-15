import { describe, expect, it } from 'vitest'
import { locationPermissionMessage, resolveLocationTimezone, validateManualLocation } from './mosqueLocation'
describe('Phase 3D location flow', () => {
  it('validates manual coordinates and rejects out-of-range values', () => { expect(validateManualLocation('19.0760', '72.8777')).toEqual({ lat: 19.076, lon: 72.8777 }); expect(validateManualLocation('91', '72')).toBeNull(); expect(validateManualLocation('19', '181')).toBeNull(); expect(validateManualLocation('nope', '72')).toBeNull() })
  it('provides an explicit denied/unsupported fallback', () => { expect(locationPermissionMessage('denied')).toContain('Manual location remains available'); expect(locationPermissionMessage('unsupported')).toContain('Manual location remains available') })
  it('resolves selected coordinates to an IANA timezone instead of a hardcoded city', () => { expect(resolveLocationTimezone({ lat: 19.076, lon: 72.8777 })).toBe('Asia/Kolkata') })
})
