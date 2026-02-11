/**
 * Utilities for working with notes and pitch classes
 */

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
] as const

/**
 * Converts note name to pitch class (0-11)
 * @param name - Note name ('C', 'C#', 'D', ...)
 * @returns Pitch class (0-11) or -1 if not found
 */
export function noteNameToPitchClass(name: string): number {
  const index = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number])
  return index
}

/**
 * Converts pitch class to note name
 * @param pc - Pitch class (0-11)
 * @returns Note name
 */
export function pitchClassToNoteName(pc: number): string {
  const normalized = ((pc % 12) + 12) % 12
  return NOTE_NAMES[normalized] || 'C'
}
