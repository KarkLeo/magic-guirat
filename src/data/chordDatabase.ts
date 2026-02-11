/**
 * Chord database for recognition
 * Each template — intervals from root in semitones
 */

import { pitchClassToNoteName } from '@/utils/noteUtils'
import type { ChordCandidate, ChordType } from '@/types'

/**
 * Chord templates: name → array of intervals from root
 */
export const CHORD_TEMPLATES: Record<ChordType, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  power: [0, 7]
}

/**
 * Suffixes for chord display
 */
export const CHORD_DISPLAY_NAMES: Record<ChordType, string> = {
  major: '',
  minor: 'm',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  sus2: 'sus2',
  sus4: 'sus4',
  dim: 'dim',
  aug: 'aug',
  power: '5'
}

/**
 * Finds the most suitable chords for a set of active pitch classes
 * @param activePitchClasses - Set of active pitch classes (0-11)
 * @param chromagram - Chromagram for weighted scoring (optional)
 * @param maxResults - Maximum number of results
 * @returns Array of chord candidates, sorted by score
 */
export function lookupChord(
  activePitchClasses: Set<number> | number[],
  chromagram: Float32Array | null = null,
  maxResults: number = 3
): ChordCandidate[] {
  const active =
    activePitchClasses instanceof Set ? activePitchClasses : new Set(activePitchClasses)

  if (active.size < 2) return []

  const candidates: ChordCandidate[] = []

  // Iterate over all 12 roots × all templates
  for (let root = 0; root < 12; root++) {
    for (const [type, intervals] of Object.entries(CHORD_TEMPLATES)) {
      // Calculate pitch classes of the chord
      const chordPCs = new Set(intervals.map((i) => (root + i) % 12))

      // Count matches
      let matched = 0
      let chromaWeight = 0
      for (const pc of chordPCs) {
        if (active.has(pc)) {
          matched++
          if (chromagram) {
            chromaWeight += chromagram[pc] ?? 0
          }
        }
      }

      // Skip if fewer than 2 notes matched
      if (matched < 2) continue

      // Penalty for missing chord notes
      const missing = chordPCs.size - matched
      // Penalty for extra notes (not in chord)
      let extra = 0
      for (const pc of active) {
        if (!chordPCs.has(pc)) extra++
      }

      // Score: fraction of matched notes - penalties
      let score = matched / chordPCs.size - missing * 0.25 - extra * 0.15

      // Bonus for chromagram-weighted scoring
      if (chromagram && chromaWeight > 0) {
        // Bonus if chord root is the loudest pitch class
        const rootStrength = chromagram[root] ?? 0
        score += rootStrength * 0.1
      }

      // Bonus for simple chords (major/minor)
      if (type === 'major' || type === 'minor') {
        score += 0.05
      }

      candidates.push({
        root,
        rootName: pitchClassToNoteName(root),
        type,
        displayName:
          pitchClassToNoteName(root) + (CHORD_DISPLAY_NAMES[type as ChordType] || ''),
        score,
        matchedNotes: matched,
        totalNotes: chordPCs.size
      })
    }
  }

  // Sort by score (descending)
  candidates.sort((a, b) => b.score - a.score)

  return candidates.slice(0, maxResults)
}
