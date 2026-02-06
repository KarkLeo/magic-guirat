/**
 * Утилиты для работы с нотами и pitch classes
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Конвертирует название ноты в pitch class (0-11)
 * @param {string} name - Название ноты ('C', 'C#', 'D', ...)
 * @returns {number} Pitch class (0-11) или -1 если не найдено
 */
export function noteNameToPitchClass(name) {
  const index = NOTE_NAMES.indexOf(name)
  return index
}

/**
 * Конвертирует pitch class в название ноты
 * @param {number} pc - Pitch class (0-11)
 * @returns {string} Название ноты
 */
export function pitchClassToNoteName(pc) {
  const normalized = ((pc % 12) + 12) % 12
  return NOTE_NAMES[normalized]
}
