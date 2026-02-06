import { describe, it, expect } from 'vitest'
import { NOTE_NAMES, noteNameToPitchClass, pitchClassToNoteName } from './noteUtils'

describe('noteUtils', () => {
  describe('NOTE_NAMES', () => {
    it('should have 12 note names', () => {
      expect(NOTE_NAMES).toHaveLength(12)
    })

    it('should start with C and end with B', () => {
      expect(NOTE_NAMES[0]).toBe('C')
      expect(NOTE_NAMES[11]).toBe('B')
    })
  })

  describe('noteNameToPitchClass', () => {
    it('should convert C to pitch class 0', () => {
      expect(noteNameToPitchClass('C')).toBe(0)
    })

    it('should convert C# to pitch class 1', () => {
      expect(noteNameToPitchClass('C#')).toBe(1)
    })

    it('should convert E to pitch class 4', () => {
      expect(noteNameToPitchClass('E')).toBe(4)
    })

    it('should convert A to pitch class 9', () => {
      expect(noteNameToPitchClass('A')).toBe(9)
    })

    it('should convert B to pitch class 11', () => {
      expect(noteNameToPitchClass('B')).toBe(11)
    })

    it('should return -1 for unknown note name', () => {
      expect(noteNameToPitchClass('H')).toBe(-1)
      expect(noteNameToPitchClass('X')).toBe(-1)
    })
  })

  describe('pitchClassToNoteName', () => {
    it('should convert pitch class 0 to C', () => {
      expect(pitchClassToNoteName(0)).toBe('C')
    })

    it('should convert pitch class 4 to E', () => {
      expect(pitchClassToNoteName(4)).toBe('E')
    })

    it('should convert pitch class 11 to B', () => {
      expect(pitchClassToNoteName(11)).toBe('B')
    })

    it('should handle negative pitch classes with modulo', () => {
      expect(pitchClassToNoteName(-1)).toBe('B')
      expect(pitchClassToNoteName(-12)).toBe('C')
    })

    it('should wrap around for values >= 12', () => {
      expect(pitchClassToNoteName(12)).toBe('C')
      expect(pitchClassToNoteName(13)).toBe('C#')
      expect(pitchClassToNoteName(23)).toBe('B')
    })

    it('should handle large positive values', () => {
      expect(pitchClassToNoteName(24)).toBe('C')
      expect(pitchClassToNoteName(100)).toBe('E') // 100 % 12 = 4 = E
    })
  })

  describe('round-trip conversion', () => {
    it('should convert note name to pitch class and back', () => {
      for (let i = 0; i < 12; i++) {
        const noteName = NOTE_NAMES[i]!
        const pc = noteNameToPitchClass(noteName)
        const back = pitchClassToNoteName(pc)
        expect(back).toBe(noteName)
      }
    })
  })
})
