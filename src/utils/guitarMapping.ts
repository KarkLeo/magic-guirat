/**
 * Utilities for mapping notes to guitar strings
 * Standard guitar tuning (E Standard Tuning)
 */

import type { GuitarString, NoteInfo } from '@/types'

/**
 * Guitar string configuration (thick to thin)
 * Index 0 = 6th string (thickest, E2)
 * Index 5 = 1st string (thinnest, E4)
 */
export const GUITAR_STRINGS: readonly GuitarString[] = [
  {
    index: 6,
    note: 'E',
    octave: 2,
    fullNote: 'E2',
    frequency: 82.41,
    color: '#667eea'
  },
  {
    index: 5,
    note: 'A',
    octave: 2,
    fullNote: 'A2',
    frequency: 110.0,
    color: '#764ba2'
  },
  {
    index: 4,
    note: 'D',
    octave: 3,
    fullNote: 'D3',
    frequency: 146.83,
    color: '#a855f7'
  },
  {
    index: 3,
    note: 'G',
    octave: 3,
    fullNote: 'G3',
    frequency: 196.0,
    color: '#c084fc'
  },
  {
    index: 2,
    note: 'B',
    octave: 3,
    fullNote: 'B3',
    frequency: 246.94,
    color: '#e879f9'
  },
  {
    index: 1,
    note: 'E',
    octave: 4,
    fullNote: 'E4',
    frequency: 329.63,
    color: '#f093fb'
  }
]

/**
 * Frequency range for each string
 * Guitars can play notes on different frets, so range is wider
 * Each string covers approximately 7-9 frets in comfortable zone
 */
const SEMITONE_RATIO = Math.pow(2, 1 / 12) // ~1.059

// Range for string detection: from -1 semitone to +7 semitones (about 7 frets)
const TOLERANCE_SEMITONES_DOWN = 1
const TOLERANCE_SEMITONES_UP = 7

/**
 * Calculates frequency range for string with tolerance
 * @param baseFrequency - Base string frequency
 * @returns { min, max }
 */
function getFrequencyRange(baseFrequency: number): { min: number; max: number } {
  const min = baseFrequency / Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_DOWN)
  const max = baseFrequency * Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_UP)
  return { min, max }
}

/**
 * Determines which string plays based on frequency
 * @param frequency - Frequency in Hz
 * @returns String info or null if not found
 */
export function getStringByFrequency(frequency: number): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Collect all strings in frequency range
  const matchingStrings: GuitarString[] = []
  for (const string of GUITAR_STRINGS) {
    const range = getFrequencyRange(string.frequency)
    if (frequency >= range.min && frequency <= range.max) {
      matchingStrings.push(string)
    }
  }

  // If found matching strings, choose closest by semitone distance
  if (matchingStrings.length > 0) {
    return matchingStrings.reduce((closest, current) => {
      const closestDist = Math.abs(12 * Math.log2(frequency / closest.frequency))
      const currentDist = Math.abs(12 * Math.log2(frequency / current.frequency))
      return currentDist < closestDist ? current : closest
    })
  }

  // If no match found, find closest string (fallback)
  return findClosestString(frequency)
}

/**
 * Finds closest string by frequency (fallback method)
 * @param frequency - Frequency in Hz
 * @returns Closest string or null
 */
function findClosestString(frequency: number): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Too low or too high frequency - ignore
  const MIN_FREQ = 60 // Below this don't detect (lower than C2)
  const MAX_FREQ = 500 // Above this don't detect (higher than C5)

  if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
    return null
  }

  // Find string with minimum semitone distance
  let closestString: GuitarString | null = null
  let minSemitones = Infinity

  for (const string of GUITAR_STRINGS) {
    const semitoneDistance = Math.abs(12 * Math.log2(frequency / string.frequency))

    // If difference > octave (12 semitones), probably wrong string
    if (semitoneDistance > 12) {
      continue
    }

    if (semitoneDistance < minSemitones) {
      minSemitones = semitoneDistance
      closestString = string
    }
  }

  return closestString
}

/**
 * Determines which string plays based on note
 * @param note - Note name (E, A, D, etc.)
 * @param octave - Octave number
 * @returns String info or null if not found
 */
export function getStringByNote(note: string, octave: number): GuitarString | null {
  if (!note || typeof octave !== 'number') {
    return null
  }

  // Exact match
  const exactMatch = GUITAR_STRINGS.find((s) => s.note === note && s.octave === octave)
  if (exactMatch) {
    return exactMatch
  }

  // If octave differs by ±1, check with tolerance
  // (e.g., playing on fret and note shifted to different octave)
  const tolerantMatch = GUITAR_STRINGS.find(
    (s) => s.note === note && Math.abs(s.octave - octave) <= 1
  )

  return tolerantMatch || null
}

/**
 * Gets string info by index (1-6)
 * @param stringIndex - String number (1-6)
 * @returns String info or null
 */
export function getStringByIndex(stringIndex: number): GuitarString | null {
  return GUITAR_STRINGS.find((s) => s.index === stringIndex) || null
}

interface ActiveStringResult {
  string: GuitarString
  confidence: 'high' | 'medium'
  method: 'frequency' | 'note'
}

/**
 * Determines active string from pitch data
 * @param pitchData - { note, octave, frequency }
 * @returns { string, confidence } or null
 */
export function getActiveString(
  pitchData: Partial<NoteInfo> & { frequency?: number }
): ActiveStringResult | null {
  if (!pitchData) {
    return null
  }

  const { note, octave, frequency } = pitchData

  // Priority 1: By frequency (most accurate)
  if (frequency && frequency > 0) {
    const stringByFreq = getStringByFrequency(frequency)
    if (stringByFreq) {
      return {
        string: stringByFreq,
        confidence: 'high',
        method: 'frequency'
      }
    }
  }

  // Priority 2: By note and octave
  if (note && typeof octave === 'number') {
    const stringByNote = getStringByNote(note, octave)
    if (stringByNote) {
      return {
        string: stringByNote,
        confidence: 'medium',
        method: 'note'
      }
    }
  }

  return null
}

/**
 * Checks if playing open string (no fret)
 * @param frequency - Frequency in Hz
 * @param tolerance - Tolerance in cents (default 50)
 * @returns String if open, null otherwise
 */
export function isOpenString(frequency: number, tolerance: number = 50): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Tolerance in cents (100 cents = 1 semitone)
  const toleranceRatio = Math.pow(2, tolerance / 1200)

  for (const string of GUITAR_STRINGS) {
    const min = string.frequency / toleranceRatio
    const max = string.frequency * toleranceRatio

    if (frequency >= min && frequency <= max) {
      return string
    }
  }

  return null
}

/**
 * Gets color for string by index
 * @param stringIndex - String index (1-6)
 * @returns Hex color
 */
export function getStringColor(stringIndex: number): string {
  const string = getStringByIndex(stringIndex)
  return string ? string.color : '#667eea' // Default purple
}

/**
 * Export constants for convenience
 */
export const TOTAL_STRINGS = 6
export const STRING_INDICES = [6, 5, 4, 3, 2, 1] as const
export const STRING_NOTES = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const
