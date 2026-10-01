import { describe, expect, it } from 'vitest'
import { formatProductTime, productDateKey, productIsoToLocalDateTime, productLocalDateTimeToIso } from '../src/utils/dateTime'

describe('UK product date and time', () => {
  it('uses the London calendar date around UTC midnight in summer', () => {
    expect(productDateKey(new Date('2026-09-30T23:30:00.000Z'))).toBe('2026-10-01')
    expect(productDateKey(new Date('2026-12-31T23:30:00.000Z'))).toBe('2026-12-31')
  })

  it('converts the same wall-clock commitment correctly in BST and GMT', () => {
    expect(productLocalDateTimeToIso('2026-09-30T17:00')).toBe('2026-09-30T16:00:00.000Z')
    expect(productLocalDateTimeToIso('2026-12-01T17:00')).toBe('2026-12-01T17:00:00.000Z')
    expect(formatProductTime('2026-09-30T16:00:00.000Z')).toBe('17:00')
    expect(formatProductTime('2026-12-01T17:00:00.000Z')).toBe('17:00')
    expect(productIsoToLocalDateTime('2026-09-30T16:00:00.000Z')).toBe('2026-09-30T17:00')
    expect(productIsoToLocalDateTime('2026-12-01T17:00:00.000Z')).toBe('2026-12-01T17:00')
  })

  it('handles both clock-change boundaries and rejects a missing local time', () => {
    expect(productLocalDateTimeToIso('2027-03-28T00:30')).toBe('2027-03-28T00:30:00.000Z')
    expect(() => productLocalDateTimeToIso('2027-03-28T01:30')).toThrow(/does not exist/)
    expect(productLocalDateTimeToIso('2026-10-25T02:30')).toBe('2026-10-25T02:30:00.000Z')
  })
})
