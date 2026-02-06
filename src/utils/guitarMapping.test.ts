import { describe, it, expect } from 'vitest'
import {
  GUITAR_STRINGS,
  TOTAL_STRINGS,
  STRING_INDICES,
  STRING_NOTES,
  getStringByFrequency,
  getStringByNote,
  getStringByIndex,
  getActiveString,
  isOpenString,
  getStringColor
} from './guitarMapping'

describe('guitarMapping', () => {
  describe('GUITAR_STRINGS', () => {
    it('should have 6 strings', () => {
      expect(GUITAR_STRINGS).toHaveLength(6)
    })

    it('should have correct indices 1-6', () => {
      const indices = GUITAR_STRINGS.map((s) => s.index)
      expect(indices).toEqual([6, 5, 4, 3, 2, 1])
    })

    it('should have correct notes', () => {
      expect(GUITAR_STRINGS[0]!.fullNote).toBe('E2')
      expect(GUITAR_STRINGS[1]!.fullNote).toBe('A2')
      expect(GUITAR_STRINGS[2]!.fullNote).toBe('D3')
      expect(GUITAR_STRINGS[3]!.fullNote).toBe('G3')
      expect(GUITAR_STRINGS[4]!.fullNote).toBe('B3')
      expect(GUITAR_STRINGS[5]!.fullNote).toBe('E4')
    })
  })

  describe('Constants', () => {
    it('TOTAL_STRINGS should be 6', () => {
      expect(TOTAL_STRINGS).toBe(6)
    })

    it('STRING_INDICES should be [6, 5, 4, 3, 2, 1]', () => {
      expect(STRING_INDICES).toEqual([6, 5, 4, 3, 2, 1])
    })

    it('STRING_NOTES should match guitar strings', () => {
      expect(STRING_NOTES).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    })
  })

  describe('getStringByFrequency', () => {
    it('should identify E2 (82.41 Hz) as 6th string', () => {
      const result = getStringByFrequency(82.41)
      expect(result?.index).toBe(6)
      expect(result?.fullNote).toBe('E2')
    })

    it('should identify A2 (110 Hz) as 5th string', () => {
      const result = getStringByFrequency(110)
      expect(result?.index).toBe(5)
      expect(result?.fullNote).toBe('A2')
    })

    it('should identify E4 (329.63 Hz) as 1st string', () => {
      const result = getStringByFrequency(329.63)
      expect(result?.index).toBe(1)
      expect(result?.fullNote).toBe('E4')
    })

    it('should return null for invalid frequency (0)', () => {
      expect(getStringByFrequency(0)).toBeNull()
    })

    it('should return null for negative frequency', () => {
      expect(getStringByFrequency(-100)).toBeNull()
    })

    it('should return null for frequency below minimum (< 60 Hz)', () => {
      expect(getStringByFrequency(50)).toBeNull()
    })

    it('should return null for frequency above maximum (> 500 Hz)', () => {
      expect(getStringByFrequency(600)).toBeNull()
    })

    it('should use semitone distance for matching (tolerance)', () => {
      // E2 with -1 semitone = ~77.78 Hz (Ds2)
      const ds2 = 82.41 / Math.pow(2, 1 / 12)
      const result = getStringByFrequency(ds2)
      // Should still find E2 (6th string)
      expect(result?.index).toBe(6)
    })

    it('should use semitone distance for matching (up)', () => {
      // E2 with +5 semitone = ~123.47 Hz (G2/A2), closer to A2
      const g2 = 82.41 * Math.pow(2, 5 / 12)
      const result = getStringByFrequency(g2)
      // G2 is closer to A2 (5th string)
      expect(result?.index).toBe(5)
    })
  })

  describe('getStringByNote', () => {
    it('should find E2 by note', () => {
      const result = getStringByNote('E', 2)
      expect(result?.index).toBe(6)
    })

    it('should find A2 by note', () => {
      const result = getStringByNote('A', 2)
      expect(result?.index).toBe(5)
    })

    it('should find E4 by note', () => {
      const result = getStringByNote('E', 4)
      expect(result?.index).toBe(1)
    })

    it('should return null for non-existent note on guitar', () => {
      expect(getStringByNote('C', 2)).toBeNull()
    })

    it('should return null for invalid note', () => {
      expect(getStringByNote('', 2)).toBeNull()
    })

    it('should handle octave tolerance (±1)', () => {
      // E3 doesn't exist on guitar but E2 and E4 do (±1 octave tolerance)
      const result = getStringByNote('E', 3)
      // This should find the closest E (E2 is 1 octave away)
      expect(result?.index).toBe(6)
    })
  })

  describe('getStringByIndex', () => {
    it('should get 6th string by index', () => {
      const result = getStringByIndex(6)
      expect(result?.fullNote).toBe('E2')
    })

    it('should get 1st string by index', () => {
      const result = getStringByIndex(1)
      expect(result?.fullNote).toBe('E4')
    })

    it('should return null for invalid index', () => {
      expect(getStringByIndex(7)).toBeNull()
      expect(getStringByIndex(0)).toBeNull()
    })
  })

  describe('getActiveString', () => {
    it('should prefer frequency method (high confidence)', () => {
      const result = getActiveString({
        note: 'E',
        octave: 4,
        frequency: 329.63
      })
      expect(result?.confidence).toBe('high')
      expect(result?.method).toBe('frequency')
      expect(result?.string.index).toBe(1)
    })

    it('should fallback to note method (medium confidence)', () => {
      const result = getActiveString({
        note: 'E',
        octave: 2
      })
      expect(result?.confidence).toBe('medium')
      expect(result?.method).toBe('note')
      expect(result?.string.index).toBe(6)
    })

    it('should return null if no valid data', () => {
      expect(getActiveString({})).toBeNull()
      expect(getActiveString(null as any)).toBeNull()
    })
  })

  describe('isOpenString', () => {
    it('should identify E2 as open string', () => {
      const result = isOpenString(82.41)
      expect(result?.index).toBe(6)
    })

    it('should identify A2 as open string', () => {
      const result = isOpenString(110)
      expect(result?.index).toBe(5)
    })

    it('should identify E4 as open string', () => {
      const result = isOpenString(329.63)
      expect(result?.index).toBe(1)
    })

    it('should return null for invalid frequency', () => {
      expect(isOpenString(0)).toBeNull()
      expect(isOpenString(-100)).toBeNull()
    })

    it('should use cent-based tolerance', () => {
      // E2 with ±50 cents tolerance (half semitone)
      const e2Flat = 82.41 * Math.pow(2, -25 / 1200) // -25 cents
      const result = isOpenString(e2Flat, 50)
      expect(result?.index).toBe(6)
    })

    it('should reject frequencies outside tolerance', () => {
      // E2 with -2 semitones (beyond 50 cent tolerance)
      const e2Flat = 82.41 / Math.pow(2, 2 / 12)
      expect(isOpenString(e2Flat, 50)).toBeNull()
    })
  })

  describe('getStringColor', () => {
    it('should return correct color for 6th string', () => {
      expect(getStringColor(6)).toBe('#667eea')
    })

    it('should return correct color for 1st string', () => {
      expect(getStringColor(1)).toBe('#f093fb')
    })

    it('should return default color for invalid index', () => {
      expect(getStringColor(7)).toBe('#667eea')
    })
  })
})
