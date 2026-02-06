/**
 * Утилиты для работы с нотами и pitch classes
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
 * Конвертирует название ноты в pitch class (0-11)
 * @param name - Название ноты ('C', 'C#', 'D', ...)
 * @returns Pitch class (0-11) или -1 если не найдено
 */
export function noteNameToPitchClass(name: string): number {
  const index = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number])
  return index
}

/**
 * Конвертирует pitch class в название ноты
 * @param pc - Pitch class (0-11)
 * @returns Название ноты
 */
export function pitchClassToNoteName(pc: number): string {
  const normalized = ((pc % 12) + 12) % 12
  return NOTE_NAMES[normalized] || 'C'
}
