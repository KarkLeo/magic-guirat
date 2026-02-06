import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { lookupChord } from '@/data/chordDatabase'
import { GUITAR_STRINGS } from '@/utils/guitarMapping'
import { noteNameToPitchClass } from '@/utils/noteUtils'
import type { ChordCandidate, UseChordRecognitionReturn } from '@/types'

/**
 * Composable для распознавания аккордов из chromagram данных
 * Включает стабилизацию (3 фрейма) для предотвращения мерцания
 */
export function useChordRecognition(
  activePitchClassesRef: Ref<Set<number>>,
  chromagramRef: Ref<Float32Array | null>
): UseChordRecognitionReturn {
  const currentChord = ref<ChordCandidate | null>(null)
  const chordCandidates = ref<ChordCandidate[]>([])
  const isChordDetected = ref<boolean>(false)
  const detectedStrings = ref<number[]>([])

  // Стабилизация: буфер последних фреймов
  const STABILIZATION_FRAMES = 3
  const chordHistory: string[] = []

  /**
   * Маппит pitch classes на гитарные струны
   * @param pitchClasses - Набор pitch classes (0-11)
   * @returns Массив индексов струн (1-6)
   */
  const mapPitchClassesToStrings = (pitchClasses: Set<number>): number[] => {
    const stringIndices: number[] = []
    for (const gs of GUITAR_STRINGS) {
      const pc = noteNameToPitchClass(gs.note)
      if (pitchClasses.has(pc)) {
        stringIndices.push(gs.index)
      }
    }
    return stringIndices
  }

  // Watch на изменение activePitchClasses
  watch(
    activePitchClassesRef,
    (newPitchClasses) => {
      if (!newPitchClasses || newPitchClasses.size < 2) {
        // Недостаточно нот для аккорда — сбрасываем
        chordHistory.length = 0
        currentChord.value = null
        chordCandidates.value = []
        isChordDetected.value = false
        detectedStrings.value = []
        return
      }

      // Ищем аккорды
      const chromagram = chromagramRef?.value || null
      const candidates = lookupChord(newPitchClasses, chromagram, 3)

      if (candidates.length === 0 || (candidates[0]?.score ?? 0) < 0.3) {
        chordHistory.length = 0
        currentChord.value = null
        chordCandidates.value = []
        isChordDetected.value = false
        detectedStrings.value = []
        return
      }

      const bestCandidate = candidates[0]!

      // Стабилизация: добавляем в историю
      chordHistory.push(bestCandidate.displayName)
      if (chordHistory.length > STABILIZATION_FRAMES) {
        chordHistory.shift()
      }

      // Проверяем стабильность: все фреймы одинаковые
      if (chordHistory.length >= STABILIZATION_FRAMES) {
        const allSame = chordHistory.every((c) => c === chordHistory[0])
        if (allSame) {
          currentChord.value = bestCandidate
          chordCandidates.value = candidates.slice(1)
          isChordDetected.value = true
          detectedStrings.value = mapPitchClassesToStrings(newPitchClasses)
        }
      }
    },
    { deep: true }
  )

  return {
    currentChord,
    chordCandidates,
    isChordDetected,
    detectedStrings
  }
}
