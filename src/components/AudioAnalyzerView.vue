<template>
  <div class="audio-analyzer-view">
    <!-- Кнопка захвата звука -->
    <AudioCaptureButton
      :is-capturing="isCapturing"
      :is-requesting-permission="isRequestingPermission"
      :error="error"
      :has-error="hasError"
      :audio-level="audioLevel"
      @toggle-capture="toggleCapture"
    />

    <!-- Отображение аккорда -->
    <transition name="fade">
      <ChordNameDisplay
        v-if="isCapturing && isChordDetected"
        :chord="currentChord"
        :candidates="chordCandidates"
      />
    </transition>

    <!-- Визуализация струн гитары -->
    <transition name="fade">
      <GuitarStringsVisualization
        v-if="isCapturing"
        :active-string-indices="activeStringIndices"
        :string-intensities="stringIntensities"
        :detection-mode="detectionMode"
        :is-active="isCapturing"
      />
    </transition>

    <!-- Визуализатор спектра (показывается только при активном захвате) -->
    <transition name="fade">
      <FrequencySpectrumVisualizer
        v-if="isCapturing && analyserNode"
        :analyser-node="analyserNode"
        :is-active="isCapturing"
        :detected-pitch="detectedPitch"
        :pitch-confidence="pitchConfidence"
        :detected-note="detectedNote"
        :is-essentia-loaded="false"
      />
    </transition>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue'
import { useAudioCapture } from '@/composables/useAudioCapture'
import { useFrequencyAnalyzer } from '@/composables/useFrequencyAnalyzer'
import { useChromaAnalyzer } from '@/composables/useChromaAnalyzer'
import { useChordRecognition } from '@/composables/useChordRecognition'
import { useSettings } from '@/composables/useSettings'
import { getActiveString, GUITAR_STRINGS } from '@/utils/guitarMapping'
import { noteNameToPitchClass } from '@/utils/noteUtils'
import AudioCaptureButton from './AudioCaptureButton.vue'
import GuitarStringsVisualization from './GuitarStringsVisualization.vue'
import FrequencySpectrumVisualizer from './FrequencySpectrumVisualizer.vue'
import ChordNameDisplay from './ChordNameDisplay.vue'

// Настройки
const { selectedDeviceId, noiseThreshold } = useSettings()

// Используем composable для работы с аудио
const {
  isCapturing,
  isRequestingPermission,
  error,
  audioLevel,
  hasError,
  startCapture,
  stopCapture,
  switchDevice,
  getAnalyserNode,
} = useAudioCapture()

// Получаем AnalyserNode для визуализатора
// Зависимость от isCapturing нужна для реактивности: getAnalyserNode() возвращает
// не-реактивную переменную, поэтому без isCapturing computed не обновится.
const analyserNode = computed(() => isCapturing.value ? getAnalyserNode() : null)

// Используем frequency analyzer для pitch detection (YIN)
const frequencyAnalyzer = computed(() => {
  const node = analyserNode.value
  return node ? useFrequencyAnalyzer(node, { noiseThreshold: noiseThreshold.value }) : null
})

// Используем chroma analyzer для аккордов
const chromaAnalyzer = computed(() => {
  const node = analyserNode.value
  return node ? useChromaAnalyzer(node) : null
})

// Chord recognition
const activePitchClassesRef = computed(() => chromaAnalyzer.value?.activePitchClasses.value || new Set())
const chromagramRef = computed(() => chromaAnalyzer.value?.chromagram.value || null)
const { currentChord, chordCandidates, isChordDetected, detectedStrings } =
  useChordRecognition(activePitchClassesRef, chromagramRef)

// Деструктуризация FFT данных для pitch detection
const detectedPitch = computed(() => frequencyAnalyzer.value?.dominantFrequency.value || 0)
const detectedNote = computed(() => {
  if (!frequencyAnalyzer.value || !detectedPitch.value) {
    return { note: '', octave: 0, cents: 0 }
  }
  return frequencyAnalyzer.value.frequencyToNote(detectedPitch.value)
})

// Confidence из YIN алгоритма
const pitchConfidence = computed(() => frequencyAnalyzer.value?.pitchConfidence.value || 0)

// Режим определения: 'chord' или 'single'
const detectionMode = computed(() => {
  if (isChordDetected.value && detectedStrings.value.length >= 2) {
    return 'chord'
  }
  return 'single'
})

// Определение активной струны для single mode (как раньше)
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

// Активные индексы струн (Array) — для chord и single mode
const activeStringIndices = computed(() => {
  if (detectionMode.value === 'chord') {
    return detectedStrings.value
  }
  // Single mode
  const idx = singleActiveStringIndex.value
  return idx !== null ? [idx] : []
})

// Интенсивности струн из chromagram
const stringIntensities = computed(() => {
  const intensities = {}
  const chromagram = chromagramRef.value

  if (detectionMode.value === 'chord' && chromagram) {
    for (const gs of GUITAR_STRINGS) {
      const pc = noteNameToPitchClass(gs.note)
      intensities[gs.index] = pc >= 0 ? (chromagram[pc] || 0) : 0
    }
  } else {
    // Single mode — интенсивность на основе pitchConfidence и audioLevel
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

// Переключение состояния захвата
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

// Переключение микрофона при смене устройства в настройках
watch(selectedDeviceId, async (newDeviceId) => {
  if (isCapturing.value) {
    if (frequencyAnalyzer.value) frequencyAnalyzer.value.stopAnalysis()
    if (chromaAnalyzer.value) chromaAnalyzer.value.stopAnalysis()
    await switchDevice(newDeviceId)
  }
})

// Запускаем frequency analysis и chroma analysis когда захват активен
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

// Очистка при размонтировании компонента
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
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 900px;
}

/* Transition для появления спектра */
.fade-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.6, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
}

/* Responsive */
@media (max-width: 768px) {
  .audio-analyzer-view {
    gap: 1.5rem;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .audio-analyzer-view {
    gap: 1rem;
  }
}
</style>
