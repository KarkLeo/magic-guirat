import { ref, watch } from 'vue'
import { lookupChord } from '@/data/chordDatabase'
import { GUITAR_STRINGS } from '@/utils/guitarMapping'
import { noteNameToPitchClass } from '@/utils/noteUtils'

/**
 * Composable для распознавания аккордов из chromagram данных
 * Включает стабилизацию (3 фрейма) для предотвращения мерцания
 */
export function useChordRecognition(activePitchClassesRef, chromagramRef) {
  const currentChord = ref(null)
  const chordCandidates = ref([])
  const isChordDetected = ref(false)
  const detectedStrings = ref([])

  // Стабилизация: буфер последних фреймов
  const STABILIZATION_FRAMES = 3
  const chordHistory = []

  /**
   * Маппит pitch classes на гитарные струны
   * @param {Set<number>} pitchClasses
   * @returns {number[]} Массив индексов струн (1-6)
   */
  const mapPitchClassesToStrings = (pitchClasses) => {
    const stringIndices = []
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

      if (candidates.length === 0 || candidates[0].score < 0.3) {
        chordHistory.length = 0
        currentChord.value = null
        chordCandidates.value = []
        isChordDetected.value = false
        detectedStrings.value = []
        return
      }

      const bestCandidate = candidates[0]

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
    { deep: true },
  )

  return {
    currentChord,
    chordCandidates,
    isChordDetected,
    detectedStrings,
  }
}
