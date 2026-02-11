import { ref, watch } from 'vue'

const MAX_HISTORY = 50

export function useChordHistory(currentChord, detectedNote, detectionMode, isChordDetected, pitchConfidence) {
  const chordHistory = ref([])

  function getDisplayName() {
    if (detectionMode.value === 'chord' && isChordDetected.value && currentChord.value) {
      return { displayName: currentChord.value.displayName, type: 'chord' }
    }
    if (detectionMode.value === 'single' && detectedNote.value?.note && pitchConfidence.value >= 0.3) {
      const note = detectedNote.value
      return { displayName: note.note + note.octave, type: 'note' }
    }
    return null
  }

  watch(
    () => {
      const entry = getDisplayName()
      return entry ? entry.displayName : null
    },
    (newName, oldName) => {
      if (!newName || newName === oldName) return

      const last = chordHistory.value[0]
      if (last && last.displayName === newName) return

      chordHistory.value.unshift({
        displayName: newName,
        type: getDisplayName().type,
        timestamp: Date.now(),
      })

      if (chordHistory.value.length > MAX_HISTORY) {
        chordHistory.value.length = MAX_HISTORY
      }
    },
  )

  function clearHistory() {
    chordHistory.value = []
  }

  return { chordHistory, clearHistory }
}
