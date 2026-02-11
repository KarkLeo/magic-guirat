<template>
  <div class="audio-analyzer-view">
    <!-- Фоновый слой (частицы, туманности, градиент) -->
    <BackgroundLayer :rms-level="audioLevel" />

    <!-- Кнопка захвата звука -->
    <AudioCaptureButton
      :is-capturing="isCapturing"
      :is-requesting-permission="isRequestingPermission"
      :has-error="hasError"
      @toggle-capture="toggleCapture"
    />

    <!-- Визуализация струн гитары — ВСЕГДА рендерим (избегаем пересоздания Three.js) -->
    <GuitarStringsVisualization
      :active-string-indices="isCapturing ? activeStringIndices : []"
      :string-intensities="isCapturing ? stringIntensities : {}"
      :detection-mode="detectionMode"
      :is-active="isCapturing"
      :rms-level="audioLevel"
      :analyser-node="analyserNode"
    />

    <!-- Отображение аккорда / ноты -->
    <transition name="fade">
      <ChordNameDisplay
        v-if="isCapturing && showChordDisplay"
        :chord="currentChord"
        :candidates="chordCandidates"
        :detected-note="detectedNote"
        :pitch-confidence="pitchConfidence"
        :detection-mode="detectionMode"
      />
    </transition>

    <!-- История аккордов — всегда видна пока идёт захват -->
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

// Настройки
const { selectedDeviceId, noiseThreshold } = useSettings()

// Используем composable для работы с аудио
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

// Получаем AnalyserNode для визуализатора
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

// Определение активной струны для single mode
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

// Активные индексы струн (Array)
const activeStringIndices = computed(() => {
  if (detectionMode.value === 'chord') {
    return detectedStrings.value
  }
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

// История аккордов/нот
const { chordHistory } = useChordHistory(
  currentChord,
  detectedNote,
  detectionMode,
  isChordDetected,
  pitchConfidence,
)

// Задержка скрытия дисплея аккордов (3 секунды после последнего детекта)
const hasActiveDetection = computed(() => isChordDetected.value || !!detectedNote.value.note)
const showChordDisplay = ref(false)
let hideTimeout = null

watch(hasActiveDetection, (active) => {
  if (active) {
    clearTimeout(hideTimeout)
    showChordDisplay.value = true
  } else {
    hideTimeout = setTimeout(() => {
      showChordDisplay.value = false
    }, 3000)
  }
})

// S8-T1: Экспорт RMS уровня через CSS custom property для audio-reactive UI
watchEffect(() => {
  document.documentElement.style.setProperty('--rms-level', String(audioLevel.value || 0))
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
  clearTimeout(hideTimeout)
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

/* Transition для появления/исчезновения overlay элементов */
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

/* История аккордов — фиксированная позиция */
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
  font-size: 1.1rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.6), rgba(240, 147, 251, 0.4));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
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
