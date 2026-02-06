/**
 * База данных аккордов для распознавания
 * Каждый шаблон — интервалы от корня в полутонах
 */

import { pitchClassToNoteName } from '@/utils/noteUtils'
import type { ChordCandidate, ChordType } from '@/types'

/**
 * Шаблоны аккордов: название → массив интервалов от корня
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
 * Суффиксы для отображения аккордов
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
 * Ищет наиболее подходящие аккорды для набора активных pitch classes
 * @param activePitchClasses - Набор активных pitch classes (0-11)
 * @param chromagram - Chromagram для взвешенного скоринга (опционально)
 * @param maxResults - Максимальное количество результатов
 * @returns Массив кандидатов на аккорды, отсортированный по score
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

  // Перебираем все 12 корней × все шаблоны
  for (let root = 0; root < 12; root++) {
    for (const [type, intervals] of Object.entries(CHORD_TEMPLATES)) {
      // Вычисляем pitch classes аккорда
      const chordPCs = new Set(intervals.map((i) => (root + i) % 12))

      // Считаем совпадения
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

      // Пропускаем если совпало менее 2 нот
      if (matched < 2) continue

      // Штраф за пропущенные ноты аккорда
      const missing = chordPCs.size - matched
      // Штраф за лишние ноты (не в аккорде)
      let extra = 0
      for (const pc of active) {
        if (!chordPCs.has(pc)) extra++
      }

      // Score: доля совпавших нот - штрафы
      let score = matched / chordPCs.size - missing * 0.25 - extra * 0.15

      // Бонус для chromagram-взвешенного скоринга
      if (chromagram && chromaWeight > 0) {
        // Бонус если корень аккорда — самый громкий pitch class
        const rootStrength = chromagram[root] ?? 0
        score += rootStrength * 0.1
      }

      // Бонус для простых аккордов (major/minor)
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

  // Сортируем по score (убывание)
  candidates.sort((a, b) => b.score - a.score)

  return candidates.slice(0, maxResults)
}
