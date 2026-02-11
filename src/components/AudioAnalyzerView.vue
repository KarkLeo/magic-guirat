<template>
  <div class="audio-analyzer-view">
    <!-- Background layer (particles, nebulae, gradient) -->
    <BackgroundLayer :rms-level="audioLevel" />

    <!-- Audio capture button -->
    <AudioCaptureButton
      :is-capturing="isCapturing"
      :is-requesting-permission="isRequestingPermission"
      :has-error="hasError"
      @toggle-capture="toggleCapture"
    />

    <!-- Guitar strings visualization — ALWAYS render (avoid Three.js recreation) -->
    <GuitarStringsVisualization
      :active-string-indices="isCapturing ? activeStringIndices : []"
      :string-intensities="isCapturing ? stringIntensities : {}"
      :detection-mode="detectionMode"
      :is-active="isCapturing"
      :rms-level="audioLevel"
      :analyser-node="analyserNode"
    />

    <!-- Chord / note display -->
    <transition name="fade">
      <ChordNameDisplay
        v-if="isCapturing"
        :chord="currentChord"
        :candidates="chordCandidates"
        :detected-note="detectedNote"
        :pitch-confidence="pitchConfidence"
        :detection-mode="detectionMode"
        :is-active="hasActiveDetection"
        :has-history="chordHistory.length > 0"
        :last-chord="lastDetected"
      />
    </transition>

    <!-- Chord history — always visible while capturing -->
    <div v-if="isCapturing && chordHistory.length > 1" class="chord-history">
      <span v-for="(item, i) in chordHistory.slice(1)" :key="item.timestamp" class="history-item">
        <span v-if="i > 0" class="history-separator">&middot;</span>
        <span class="history-name">{{ item.displayName }}</span>
      </span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, watchEffect } from 'vue'
import { useAudioCapture } from '@/composables/useAudioCapture'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'
import { useChromaAnalyzer } from '@/composables/useChromaAnalyzer'
import { useChordRecognition } from '@/composables/useChordRecognition'
import { useSettings } from '@/composables/useSettings'
import { useChordHistory } from '@/composables/useChordHistory'
import { getActiveString, GUITAR_STRINGS } from '@/utils/guitarMapping'
import { noteNameToPitchClass } from '@/utils/noteUtils'
import AudioCaptureButton from './AudioCaptureButton.vue'
import BackgroundLayer from './BackgroundLayer.vue'
import GuitarStringsVisualization from './GuitarStringsVisualization.vue'
import ChordNameDisplay from './ChordNameDisplay.vue'

// Settings
const { selectedDeviceId, noiseThreshold } = useSettings()

// Use composable for audio processing
const {
  isCapturing,
  isRequestingPermission,
  audioLevel,
  hasError,
  startCapture,
  stopCapture,
  switchDevice,
  getAnalyserNode,
} = useAudioCapture()

// Get AnalyserNode for visualizer
const analyserNode = computed(() => isCapturing.value ? getAnalyserNode() : null)

// Use frequency analyzer for pitch detection (YIN)
const frequencyAnalyzer = computed(() => {
  const node = analyserNode.value
  return node ? useFrequencyAnalyzer(node, { noiseThreshold: noiseThreshold.value }) : null
})

// Use chroma analyzer for chords
const chromaAnalyzer = computed(() => {
  const node = analyserNode.value
  return node ? useChromaAnalyzer(node) : null
})

// Chord recognition
const activePitchClassesRef = computed(() => chromaAnalyzer.value?.activePitchClasses.value || new Set())
const chromagramRef = computed(() => chromaAnalyzer.value?.chromagram.value || null)
const { currentChord, chordCandidates, isChordDetected, detectedStrings } =
  useChordRecognition(activePitchClassesRef, chromagramRef)

// Destructuring FFT data for pitch detection
const detectedPitch = computed(() => frequencyAnalyzer.value?.dominantFrequency.value || 0)
const detectedNote = computed(() => {
  if (!frequencyAnalyzer.value || !detectedPitch.value) {
    return { note: '', octave: 0, cents: 0 }
  }
  return frequencyAnalyzer.value.frequencyToNote(detectedPitch.value)
})

// Confidence from YIN algorithm
const pitchConfidence = computed(() => frequencyAnalyzer.value?.pitchConfidence.value || 0)

// Detection mode: 'chord' or 'single'
const detectionMode = computed(() => {
  if (isChordDetected.value && detectedStrings.value.length >= 2) {
    return 'chord'
  }
  return 'single'
})

// Determine active string for single mode
const singleActiveStringIndex = computed(() => {
  const note = detectedNote.value
  const pitch = detectedPitch.value
  const confidence = pitchConfidence.value

  if (!note.note || pitch === 0 || confidence < 0.3) {
    return null
  }

  const activeString = getActiveString({
    note: note.note,
    octave: note.octave,
    frequency: pitch,
  })

  return activeString ? activeString.string.index : null
})

// Active string indices (Array)
const activeStringIndices = computed(() => {
  if (detectionMode.value === 'chord') {
    return detectedStrings.value
  }
  const idx = singleActiveStringIndex.value
  return idx !== null ? [idx] : []
})

// String intensities from chromagram
const stringIntensities = computed(() => {
  const intensities = {}
  const chromagram = chromagramRef.value

  if (detectionMode.value === 'chord' && chromagram) {
    for (const gs of GUITAR_STRINGS) {
      const pc = noteNameToPitchClass(gs.note)
      intensities[gs.index] = pc >= 0 ? (chromagram[pc] || 0) : 0
    }
  } else {
    const idx = singleActiveStringIndex.value
    const confidence = pitchConfidence.value
    const level = audioLevel.value || 0

    for (const gs of GUITAR_STRINGS) {
      if (gs.index === idx) {
        intensities[gs.index] = confidence >= 0.5 ? confidence : Math.max(confidence, level * 0.8)
      } else {
        intensities[gs.index] = 0
      }
    }
  }

  return intensities
})

// Chord/note history
const { chordHistory } = useChordHistory(
  currentChord,
  detectedNote,
  detectionMode,
  isChordDetected,
  pitchConfidence,
)

// Track active detection state
const hasActiveDetection = computed(() => isChordDetected.value || !!detectedNote.value.note)

// Last detected chord/note — stays visible when nothing is playing
const lastDetected = ref(null)

watch(hasActiveDetection, (active) => {
  if (active) {
    const entry = detectionMode.value === 'chord' && currentChord.value
      ? { displayName: currentChord.value.displayName, rootName: currentChord.value.rootName, type: currentChord.value.type, mode: 'chord' }
      : detectedNote.value?.note
        ? { displayName: detectedNote.value.note + detectedNote.value.octave, note: detectedNote.value.note, octave: detectedNote.value.octave, mode: 'single' }
        : null
    if (entry) lastDetected.value = entry
  }
})

// Also update lastDetected on chord/note changes while active
watch([currentChord, detectedNote, detectionMode], () => {
  if (!hasActiveDetection.value) return
  if (detectionMode.value === 'chord' && currentChord.value) {
    lastDetected.value = { displayName: currentChord.value.displayName, rootName: currentChord.value.rootName, type: currentChord.value.type, mode: 'chord' }
  } else if (detectedNote.value?.note) {
    lastDetected.value = { displayName: detectedNote.value.note + detectedNote.value.octave, note: detectedNote.value.note, octave: detectedNote.value.octave, mode: 'single' }
  }
})

// S8-T1: Export RMS level via CSS custom property for audio-reactive UI
watchEffect(() => {
  document.documentElement.style.setProperty('--rms-level', String(audioLevel.value || 0))
})

// Toggle capture state
const toggleCapture = async () => {
  if (isCapturing.value) {
    stopCapture()
    if (frequencyAnalyzer.value) {
      frequencyAnalyzer.value.stopAnalysis()
    }
    if (chromaAnalyzer.value) {
      chromaAnalyzer.value.stopAnalysis()
    }
  } else {
    await startCapture(selectedDeviceId.value)
  }
}

// Switch microphone when device changes in settings
watch(selectedDeviceId, async (newDeviceId) => {
  if (isCapturing.value) {
    if (frequencyAnalyzer.value) frequencyAnalyzer.value.stopAnalysis()
    if (chromaAnalyzer.value) chromaAnalyzer.value.stopAnalysis()
    await switchDevice(newDeviceId)
  }
})

// Start frequency and chroma analysis when capture is active
watch(
  () => isCapturing.value,
  async (capturing) => {
    if (capturing) {
      setTimeout(() => {
        frequencyAnalyzer.value?.startAnalysis()
        chromaAnalyzer.value?.startAnalysis()
      }, 100)
    }
  },
)

// Cleanup on component unmount
onUnmounted(() => {
  if (isCapturing.value) {
    stopCapture()
  }
  if (frequencyAnalyzer.value?.isAnalyzing.value) {
    frequencyAnalyzer.value.stopAnalysis()
  }
  if (chromaAnalyzer.value?.isAnalyzing.value) {
    chromaAnalyzer.value.stopAnalysis()
  }
})
</script>

<style scoped>
.audio-analyzer-view {
  position: fixed;
  inset: 0;
}

/* Transition for overlay elements appearance/disappearance */
.fade-enter-active {
  transition: opacity 0.4s ease;
}

.fade-leave-active {
  transition: opacity 2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Chord history — fixed position */
.chord-history {
  position: fixed;
  top: 9rem;
  left: 1.5rem;
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
  max-width: calc(100vw - 200px);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, white 60%, transparent 100%);
  mask-image: linear-gradient(to right, white 60%, transparent 100%);
}

.history-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.history-separator {
  color: rgba(192, 132, 252, 0.25);
  font-size: 0.9rem;
  margin: 0 0.4rem;
}

.history-name {
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.75), rgba(240, 147, 251, 0.55));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  filter: drop-shadow(0 1px 4px rgba(192, 132, 252, 0.2));
}

@media (max-width: 768px) {
  .chord-history {
    top: 7.5rem;
    left: 1rem;
    max-width: calc(100vw - 120px);
  }

  .history-name {
    font-size: 0.9rem;
  }
}
</style>
