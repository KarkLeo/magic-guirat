/**
 * Утилиты для маппинга нот на струны гитары
 * Стандартная настройка гитары (E Standard Tuning)
 */

/**
 * Конфигурация струн гитары (от самой толстой к самой тонкой)
 * Индекс 0 = 6-я струна (самая толстая, E2)
 * Индекс 5 = 1-я струна (самая тонкая, E4)
 */
export const GUITAR_STRINGS = [
  {
    index: 6, // 6-я струна
    note: 'E',
    octave: 2,
    fullNote: 'E2',
    frequency: 82.41, // Hz
    color: '#667eea', // Фиолетовый
  },
  {
    index: 5, // 5-я струна
    note: 'A',
    octave: 2,
    fullNote: 'A2',
    frequency: 110.0,
    color: '#764ba2', // Фиолетово-розовый
  },
  {
    index: 4, // 4-я струна
    note: 'D',
    octave: 3,
    fullNote: 'D3',
    frequency: 146.83,
    color: '#a855f7', // Светло-фиолетовый
  },
  {
    index: 3, // 3-я струна
    note: 'G',
    octave: 3,
    fullNote: 'G3',
    frequency: 196.0,
    color: '#c084fc', // Лавандовый
  },
  {
    index: 2, // 2-я струна
    note: 'B',
    octave: 3,
    fullNote: 'B3',
    frequency: 246.94,
    color: '#e879f9', // Розово-фиолетовый
  },
  {
    index: 1, // 1-я струна
    note: 'E',
    octave: 4,
    fullNote: 'E4',
    frequency: 329.63,
    color: '#f093fb', // Розовый
  },
]

/**
 * Диапазон частот для каждой струны
 * На гитаре можно играть ноты на разных ладах, поэтому диапазон шире
 * Каждая струна покрывает примерно 7-9 ладов в комфортной зоне
 */
const SEMITONE_RATIO = Math.pow(2, 1 / 12) // ~1.059

// Диапазон для определения струны: от -1 полутона до +7 полутонов (около 7 ладов)
const TOLERANCE_SEMITONES_DOWN = 1 // Вниз от базовой частоты
const TOLERANCE_SEMITONES_UP = 7 // Вверх от базовой частоты (покрывает комфортную игру на ладах)

/**
 * Вычисляет диапазон частот для струны с толерантностью
 * @param {number} baseFrequency - Базовая частота струны
 * @returns {object} { min, max }
 */
function getFrequencyRange(baseFrequency) {
  const min = baseFrequency / Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_DOWN)
  const max = baseFrequency * Math.pow(SEMITONE_RATIO, TOLERANCE_SEMITONES_UP)
  return { min, max }
}

/**
 * Определяет какая струна играет по частоте
 * @param {number} frequency - Частота в Hz
 * @returns {object|null} Информация о струне или null если не найдено
 */
export function getStringByFrequency(frequency) {
  if (!frequency || frequency <= 0) {
    return null
  }

  // Собираем все струны, в диапазон которых попадает частота
  const matchingStrings = []
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
 * @param {number} frequency - Частота в Hz
 * @returns {object|null} Ближайшая струна или null
 */
function findClosestString(frequency) {
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
  let closestString = null
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
 * @param {string} note - Название ноты (E, A, D, etc.)
 * @param {number} octave - Октава
 * @returns {object|null} Информация о струне или null если не найдено
 */
export function getStringByNote(note, octave) {
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
    (s) => s.note === note && Math.abs(s.octave - octave) <= 1,
  )

  return tolerantMatch || null
}

/**
 * Получает информацию о струне по индексу (1-6)
 * @param {number} stringIndex - Номер струны (1-6)
 * @returns {object|null} Информация о струне или null
 */
export function getStringByIndex(stringIndex) {
  return GUITAR_STRINGS.find((s) => s.index === stringIndex) || null
}

/**
 * Определяет активную струну из pitch данных
 * @param {object} pitchData - { note, octave, frequency }
 * @returns {object|null} { string, confidence }
 */
export function getActiveString(pitchData) {
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
        confidence: 'high', // Определено по частоте
        method: 'frequency',
      }
    }
  }

  // Приоритет 2: По ноте и октаве
  if (note && typeof octave === 'number') {
    const stringByNote = getStringByNote(note, octave)
    if (stringByNote) {
      return {
        string: stringByNote,
        confidence: 'medium', // Определено по ноте
        method: 'note',
      }
    }
  }

  return null
}

/**
 * Проверяет играется ли открытая струна (без лада)
 * @param {number} frequency - Частота в Hz
 * @param {number} tolerance - Толерантность в центах (default 50)
 * @returns {object|null} Струна если это открытая струна
 */
export function isOpenString(frequency, tolerance = 50) {
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
 * @param {number} stringIndex - Индекс струны (1-6)
 * @returns {string} Hex цвет
 */
export function getStringColor(stringIndex) {
  const string = getStringByIndex(stringIndex)
  return string ? string.color : '#667eea' // Default фиолетовый
}

/**
 * Экспортируем константы для удобства
 */
export const TOTAL_STRINGS = 6
export const STRING_INDICES = [6, 5, 4, 3, 2, 1]
export const STRING_NOTES = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
