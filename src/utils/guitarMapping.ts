/**
 * Утилиты для маппинга нот на струны гитары
 * Стандартная настройка гитары (E Standard Tuning)
 */

import type { GuitarString, NoteInfo } from '@/types'

/**
 * Конфигурация струн гитары (от самой толстой к самой тонкой)
 * Индекс 0 = 6-я струна (самая толстая, E2)
 * Индекс 5 = 1-я струна (самая тонкая, E4)
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
 * Диапазон частот для каждой струны
 * На гитаре можно играть ноты на разных ладах, поэтому диапазон шире
 * Каждая струна покрывает примерно 7-9 ладов в комфортной зоне
 */
const SEMITONE_RATIO = Math.pow(2, 1 / 12) // ~1.059

// Диапазон для определения струны: от -1 полутона до +7 полутонов (около 7 ладов)
const TOLERANCE_SEMITONES_DOWN = 1
const TOLERANCE_SEMITONES_UP = 7

/**
 * Вычисляет диапазон частот для струны с толерантностью
 * @param baseFrequency - Базовая частота струны
 * @returns { min, max }
 */
function getFrequencyRange(baseFrequency: number): { min: number; max: number } {
  const min = baseFrequency / Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_DOWN)
  const max = baseFrequency * Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_UP)
  return { min, max }
}

/**
 * Определяет какая струна играет по частоте
 * @param frequency - Частота в Hz
 * @returns Информация о струне или null если не найдено
 */
export function getStringByFrequency(frequency: number): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Собираем все струны, в диапазон которых попадает частота
  const matchingStrings: GuitarString[] = []
  for (const string of GUITAR_STRINGS) {
    const range = getFrequencyRange(string.frequency)
    if (frequency >= range.min && frequency <= range.max) {
      matchingStrings.push(string)
    }
  }

  // Если нашли подходящие струны, выбираем ближайшую по полутоновому расстоянию
  if (matchingStrings.length > 0) {
    return matchingStrings.reduce((closest, current) => {
      const closestDist = Math.abs(12 * Math.log2(frequency / closest.frequency))
      const currentDist = Math.abs(12 * Math.log2(frequency / current.frequency))
      return currentDist < closestDist ? current : closest
    })
  }

  // Если не нашли ни одной подходящей, ищем ближайшую струну (fallback)
  return findClosestString(frequency)
}

/**
 * Находит ближайшую струну по частоте (fallback метод)
 * @param frequency - Частота в Hz
 * @returns Ближайшая струна или null
 */
function findClosestString(frequency: number): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Слишком низкая или слишком высокая частота - игнорируем
  const MIN_FREQ = 60 // Ниже этого не определяем (ниже C2)
  const MAX_FREQ = 500 // Выше этого не определяем (выше C5)

  if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
    return null
  }

  // Ищем струну с минимальным полутоновым расстоянием
  let closestString: GuitarString | null = null
  let minSemitones = Infinity

  for (const string of GUITAR_STRINGS) {
    const semitoneDistance = Math.abs(12 * Math.log2(frequency / string.frequency))

    // Если разница больше октавы (12 полутонов), скорее всего это не та струна
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
 * Определяет какая струна играет по ноте
 * @param note - Название ноты (E, A, D, etc.)
 * @param octave - Октава
 * @returns Информация о струне или null если не найдено
 */
export function getStringByNote(note: string, octave: number): GuitarString | null {
  if (!note || typeof octave !== 'number') {
    return null
  }

  // Точное совпадение
  const exactMatch = GUITAR_STRINGS.find((s) => s.note === note && s.octave === octave)
  if (exactMatch) {
    return exactMatch
  }

  // Если октава отличается на ±1, проверяем с толерантностью
  // (например, играют на ладу и нота сместилась в другую октаву)
  const tolerantMatch = GUITAR_STRINGS.find(
    (s) => s.note === note && Math.abs(s.octave - octave) <= 1
  )

  return tolerantMatch || null
}

/**
 * Получает информацию о струне по индексу (1-6)
 * @param stringIndex - Номер струны (1-6)
 * @returns Информация о струне или null
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
 * Определяет активную струну из pitch данных
 * @param pitchData - { note, octave, frequency }
 * @returns { string, confidence } или null
 */
export function getActiveString(
  pitchData: Partial<NoteInfo> & { frequency?: number }
): ActiveStringResult | null {
  if (!pitchData) {
    return null
  }

  const { note, octave, frequency } = pitchData

  // Приоритет 1: По частоте (самый точный)
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

  // Приоритет 2: По ноте и октаве
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
 * Проверяет играется ли открытая струна (без лада)
 * @param frequency - Частота в Hz
 * @param tolerance - Толерантность в центах (default 50)
 * @returns Струна если это открытая струна
 */
export function isOpenString(frequency: number, tolerance: number = 50): GuitarString | null {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Толерантность в центах (100 центов = 1 полутон)
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
 * Получает цвет для струны по индексу
 * @param stringIndex - Индекс струны (1-6)
 * @returns Hex цвет
 */
export function getStringColor(stringIndex: number): string {
  const string = getStringByIndex(stringIndex)
  return string ? string.color : '#667eea' // Default фиолетовый
}

/**
 * Экспортируем константы для удобства
 */
export const TOTAL_STRINGS = 6
export const STRING_INDICES = [6, 5, 4, 3, 2, 1] as const
export const STRING_NOTES = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const
