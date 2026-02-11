import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { lookupChord } from '@/data/chordDatabase'
import { GUITAR_STRINGS } from '@/utils/guitarMapping'
import { noteNameToPitchClass } from '@/utils/noteUtils'
import type { ChordCandidate, UseChordRecognitionReturn } from '@/types'

/**
 * Composable for chord recognition from chromagram data
 * Includes stabilization (3 frames) to prevent flickering
 */
export function useChordRecognition(
  activePitchClassesRef: Ref<Set<number>>,
  chromagramRef: Ref<Float32Array | null>
): UseChordRecognitionReturn {
  const currentChord = ref<ChordCandidate | null>(null)
  const chordCandidates = ref<ChordCandidate[]>([])
  const isChordDetected = ref<boolean>(false)
  const detectedStrings = ref<number[]>([])

  // Stabilization: buffer of last frames
  const STABILIZATION_FRAMES = 3
  const chordHistory: string[] = []

  /**
   * Maps pitch classes to guitar strings
   * @param pitchClasses - Set of pitch classes (0-11)
   * @returns Array of string indices (1-6)
   */
  const mapPitchClassesToStrings = (pitchClasses: Set<number>): number[] => {
    const stringIndices: number[] = []
    for (const gs of GUITAR_STRINGS) {
      const openPC = noteNameToPitchClass(gs.note)
      for (const pc of pitchClasses) {
        // Расстояние от открытой ноты до pitch class (вверх по ладам)
        const dist = ((pc - openPC) % 12 + 12) % 12
        if (dist <= 7) {
          stringIndices.push(gs.index)
          break
        }
      }
    }
    return stringIndices
  }

  // Watch for changes in activePitchClasses
  watch(
    activePitchClassesRef,
    (newPitchClasses) => {
      if (!newPitchClasses || newPitchClasses.size < 2) {
        // Not enough notes for chord — reset
        chordHistory.length = 0
        currentChord.value = null
        chordCandidates.value = []
        isChordDetected.value = false
        detectedStrings.value = []
        return
      }

      // Look for chords
      const chromagram = chromagramRef?.value || null
      const candidates = lookupChord(newPitchClasses, chromagram, 3)

      if (candidates.length === 0 || (candidates[0]?.score ?? 0) < 0.45) {
        chordHistory.length = 0
        currentChord.value = null
        chordCandidates.value = []
        isChordDetected.value = false
        detectedStrings.value = []
        return
      }

      const bestCandidate = candidates[0]!

      // Сброс стабилизации при смене аккорда — ускоряет отклик
      const lastInHistory = chordHistory.length > 0 ? chordHistory[chordHistory.length - 1] : null
      if (lastInHistory && lastInHistory !== bestCandidate.displayName) {
        chordHistory.length = 0
      }

      // Stabilization: add to history
      chordHistory.push(bestCandidate.displayName)
      if (chordHistory.length > STABILIZATION_FRAMES) {
        chordHistory.shift()
      }

      // Check stability: all frames same
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
