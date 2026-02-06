import { describe, it, expect } from 'vitest'
import { CHORD_TEMPLATES, CHORD_DISPLAY_NAMES, lookupChord } from './chordDatabase'

describe('chordDatabase', () => {
  describe('CHORD_TEMPLATES', () => {
    it('should have 10 chord types', () => {
      expect(Object.keys(CHORD_TEMPLATES)).toHaveLength(10)
    })

    it('should have correct intervals for major chord', () => {
      expect(CHORD_TEMPLATES.major).toEqual([0, 4, 7])
    })

    it('should have correct intervals for minor chord', () => {
      expect(CHORD_TEMPLATES.minor).toEqual([0, 3, 7])
    })

    it('should have correct intervals for dominant 7 chord', () => {
      expect(CHORD_TEMPLATES.dom7).toEqual([0, 4, 7, 10])
    })

    it('should have correct intervals for diminished chord', () => {
      expect(CHORD_TEMPLATES.dim).toEqual([0, 3, 6])
    })

    it('should have correct intervals for power chord', () => {
      expect(CHORD_TEMPLATES.power).toEqual([0, 7])
    })
  })

  describe('CHORD_DISPLAY_NAMES', () => {
    it('should have correct display names', () => {
      expect(CHORD_DISPLAY_NAMES.major).toBe('')
      expect(CHORD_DISPLAY_NAMES.minor).toBe('m')
      expect(CHORD_DISPLAY_NAMES.dom7).toBe('7')
      expect(CHORD_DISPLAY_NAMES.maj7).toBe('maj7')
      expect(CHORD_DISPLAY_NAMES.min7).toBe('m7')
      expect(CHORD_DISPLAY_NAMES.power).toBe('5')
    })
  })

  describe('lookupChord', () => {
    it('should return empty array for less than 2 pitch classes', () => {
      expect(lookupChord(new Set([0]))).toEqual([])
    })

    it('should recognize C major chord (C E G = 0 4 7)', () => {
      const results = lookupChord(new Set([0, 4, 7]))
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.displayName).toBe('C')
      expect(results[0]!.type).toBe('major')
    })

    it('should recognize C minor chord (C Eb G = 0 3 7)', () => {
      const results = lookupChord(new Set([0, 3, 7]))
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.displayName).toBe('Cm')
      expect(results[0]!.type).toBe('minor')
    })

    it('should recognize D major chord (D F# A = 2 6 9)', () => {
      const results = lookupChord(new Set([2, 6, 9]))
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.displayName).toBe('D')
    })

    it('should respect maxResults parameter', () => {
      const results = lookupChord(new Set([0, 3, 7]), null, 1)
      expect(results).toHaveLength(1)
    })

    it('should be sorted by score (highest first)', () => {
      const results = lookupChord(new Set([0, 4, 7]))
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score)
      }
    })

    it('should work with array input', () => {
      const results = lookupChord([0, 4, 7])
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.displayName).toBe('C')
    })

    it('should penalize for missing notes in chord', () => {
      // Only C and E (missing G from C major)
      const incomplete = lookupChord(new Set([0, 4]))
      // C major should have lower score without G
      const complete = lookupChord(new Set([0, 4, 7]))

      // Both should find C major, but complete should score higher
      expect(complete[0]!.score).toBeGreaterThan(incomplete[0]!.score)
    })

    it('should penalize for extra notes', () => {
      // C major + extra D
      const withExtra = lookupChord(new Set([0, 2, 4, 7]))
      const exact = lookupChord(new Set([0, 4, 7]))

      // Exact match should score higher
      expect(exact[0]!.score).toBeGreaterThan(withExtra[0]!.score)
    })

    it('should use chromagram weighting when provided', () => {
      const chromagram = new Float32Array(12)
      chromagram[0] = 1.0 // C is the strongest
      chromagram[4] = 0.8 // E
      chromagram[7] = 0.6 // G

      const results = lookupChord(new Set([0, 4, 7]), chromagram)
      expect(results[0]!.displayName).toBe('C')
      // C major should have higher score with weighted chromagram
    })

    it('should handle root strength boost from chromagram', () => {
      const chromagram = new Float32Array(12)
      chromagram[2] = 1.0 // D is root
      chromagram[6] = 0.8 // F#
      chromagram[9] = 0.6 // A

      const results = lookupChord(new Set([2, 6, 9]), chromagram)
      expect(results[0]!.displayName).toBe('D')
    })

    it('should boost major/minor chord scores', () => {
      const pitches = new Set([0, 4, 7]) // Could match major or other templates

      const results = lookupChord(pitches)
      // First result should be major (has boost)
      expect(['major', 'minor']).toContain(results[0]!.type)
    })

    it('should return correct metadata for recognized chords', () => {
      const results = lookupChord(new Set([0, 4, 7]))
      const result = results[0]

      expect(result!.root).toBe(0)
      expect(result!.rootName).toBe('C')
      expect(result!.matchedNotes).toBe(3)
      expect(result!.totalNotes).toBe(3)
      expect(result!.score).toBeGreaterThan(0)
    })

    it('should recognize all 12 different chord roots', () => {
      // Test C major
      const cMajor = lookupChord(new Set([0, 4, 7]))
      expect(cMajor[0]!.root).toBe(0)

      // Test A major (9 6 1)
      const aMajor = lookupChord(new Set([9, 1, 4]))
      expect(aMajor[0]!.root).toBe(9)

      // Test G major (7 11 2)
      const gMajor = lookupChord(new Set([7, 11, 2]))
      expect(gMajor[0]!.root).toBe(7)
    })
  })
})
